///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/_base/array',
  'dojo/_base/html',
  'dijit/_WidgetBase',
  'dojo/topic',
  'dojo/on',
  'dojo/dom-construct',
  'dojo/dom-geometry',
  'dojo/Deferred',
  'dojo/promise/all',
  'require',
  './WidgetManager',
  './PanelManager',
  './MapManager',
  './utils',
  './PreloadWidgetIcon',
  './WidgetPlaceholder',
  './dijit/LoadingShelter'
],

function(declare, lang, array, html, _WidgetBase, topic, on,  domConstruct, domGeometry,
  Deferred, all, require, WidgetManager, PanelManager,
  MapManager, utils, PreloadWidgetIcon, WidgetPlaceholder, LoadingShelter) {
  var instance = null, clazz;

  clazz = declare([_WidgetBase], {
    constructor: function(options, domId) {
      /*jshint unused: false*/
      this.widgetManager = WidgetManager.getInstance();
      this.panelManager = PanelManager.getInstance();

      this.own(topic.subscribe("appConfigLoaded", lang.hitch(this, this.onAppConfigLoaded)));
      this.own(topic.subscribe("appConfigChanged", lang.hitch(this, this.onAppConfigChanged)));

      this.own(topic.subscribe("mapLoaded", lang.hitch(this, this.onMapLoaded)));
      this.own(topic.subscribe("mapChanged", lang.hitch(this, this.onMapChanged)));
      this.own(topic.subscribe("beforeMapDestory", lang.hitch(this, this.onBeforeMapDestory)));

      this.own(topic.subscribe("builder/actionTriggered",
        lang.hitch(this, this.onActionTriggered)));

      this.widgetPlaceholders = [];
      this.preloadWidgetIcons = []; //preload widgets that in panel
      this.preloadGroupPanels = [];

      this.invisibleWidgetIds = [];

      this.own(on(window, 'resize', lang.hitch(this, this.resize)));

      this.id = domId;
    },

    postCreate: function(){
      this.containerNode = this.domNode;
    },

    map: null,
    mapId: 'map',
    hlDiv: null,

    animTime: 500,

    resize: function() {
      //resize widgets. the panel's resize is called by the panel manager.
      //widgets which is in panel is resized by panel
      array.forEach(this.widgetManager.getAllWidgets(), function(w){
        if(w.inPanel === false){
          w.resize();
        }
      }, this);
    },

    onAppConfigLoaded: function(config){
      this.appConfig = lang.clone(config);
      if(this.appConfig.theme){
        this._loadTheme(this.appConfig.theme);
      }
      this._loadMap();
    },

    onAppConfigChanged: function(appConfig, reason, changeData){
      appConfig = lang.clone(appConfig);
      //deal with these reasons only
      switch(reason){
      case 'themeChange':
        this._onThemeChange(appConfig);
        break;
      case 'styleChange':
        this._onStyleChange(appConfig);
        break;
      case 'layoutChange':
        this._onLayoutChange(appConfig);
        break;
      case 'widgetChange':
        this._onWidgetChange(appConfig, changeData);
        break;
      case 'groupChange':
        this._onGroupChange(appConfig, changeData);
        break;
      case 'widgetPoolChange':
        this._onWidgetPoolChange(appConfig);
        break;
      case 'resetConfig':
        this._onResetConfig(appConfig);
        break;
      }
      this.appConfig = appConfig;
    },

    onMapLoaded: function(map) {
      this.map = map;
      this.panelManager.setMap(map);
      this._loadPreloadWidgets(this.appConfig);
    },

    onMapChanged: function(map){
      this.map = map;
      this.panelManager.map = map;

      this._loadPreloadWidgets(this.appConfig);
    },

    onBeforeMapDestory: function(){
      //when map changed, use destroy and then create to simplify the widget development
      //destroy widgets before map, because the widget may use map in thire destory method
      this.panelManager.destroyAllPanels();
      this._destroyPreloadPanelessWidgets();
      this._destroyWidgetPlaceholders();
      this._destroyPreloadWidgetIcons();
    },

    onActionTriggered: function(info){
      if(info.action === 'highLight'){
        array.forEach(this.widgetPlaceholders, function(placehoder){
          if(placehoder.configId === info.elementId){
            this._highLight(placehoder);
          }
        }, this);
        array.forEach(this.preloadWidgetIcons, function(widgetIcon){
          if (widgetIcon.configId === info.elementId){
            this._highLight(widgetIcon);
          }
        }, this);
        array.forEach(this.widgetManager.getPreloadPanelessWidgets(), function(panelessWidget){
          if (panelessWidget.configId === info.elementId){
            this._highLight(panelessWidget);
          }
        }, this);
      }
      if(info.action === 'removeHighLight'){
        this._removeHighLight();
      }
    },

    _highLight: function(dijit){
      if(!dijit.domNode){
        //the dijit may be destroyed
        return;
      }
      if (this.hlDiv){
        this._removeHighLight(dijit);
      }
      var position = domGeometry.getMarginBox(dijit.domNode);
      var hlStyle = {
        position: 'absolute',
        left: position.l + 'px',
        top: position.t + 'px',
        width: position.w + 'px',
        height: position.h + 'px'
      };
      this.hlDiv = domConstruct.create('div', {
        "style": hlStyle,
        "class": 'icon-highlight'
      }, dijit.domNode, 'before');
    },

    _removeHighLight: function(){
      if (this.hlDiv){
        domConstruct.destroy(this.hlDiv);
        this.hlDiv = null;
      }
    },

    _onWidgetChange: function(appConfig, widgetConfig){
      widgetConfig = appConfig.getConfigElementById(widgetConfig.id);
      if(widgetConfig.isController){
        this._reloadControllerWidget(appConfig);
        return;
      }
      array.forEach(this.widgetPlaceholders, function(placeholder){
        if(placeholder.configId === widgetConfig.id){
          placeholder.destroy();
          this._loadPreloadWidget(widgetConfig);
        }
      }, this);
      this._removeDestroyed(this.widgetPlaceholders);

      array.forEach(this.preloadWidgetIcons, function(icon){
        if(icon.configId === widgetConfig.id){
          var state = icon.state;
          icon.destroy();
          this._loadPreloadWidget(widgetConfig).then(function(iconNew){
            if(state === 'opened'){
              iconNew.onClick();
            }
          });
        }
      }, this);
      this._removeDestroyed(this.preloadWidgetIcons);

      array.forEach(this.widgetManager.getPreloadPanelessWidgets(), function(widget){
        if(widget.configId === widgetConfig.id){
          widget.destroy();
          if(widgetConfig.visible === false){
            if(this.invisibleWidgetIds.indexOf(widgetConfig.id) < 0){
              this.invisibleWidgetIds.push(widgetConfig.id);
            }
            return;
          }
          this._loadPreloadWidget(widgetConfig);
        }
      }, this);

      array.forEach(this.preloadGroupPanels, function(panel){
        panel.reloadWidget(widgetConfig);
      }, this);

      this._updatePlaceholder(appConfig);

      //if widget change visible from invisible, it's not exist in preloadPanelessWidgets
      //so, load it here
      array.forEach(this.invisibleWidgetIds, function(widgetId){
        if(widgetId === widgetConfig.id && widgetConfig.visible !== false){
          this._loadPreloadWidget(widgetConfig);
          var i = this.invisibleWidgetIds.indexOf(widgetConfig.id);
          this.invisibleWidgetIds.splice(i, 1);
        }
      }, this);

      if(!widgetConfig.isPreload){
        this._reloadControllerWidget(appConfig);
      }
    },

    _onGroupChange: function(appConfig, groupConfig){
      groupConfig = appConfig.getConfigElementById(groupConfig.id);
      //for now, we support group label change only.
      array.forEach(this.panelManager.panels, function(panel){
        if(panel.config.id === groupConfig.id){
          panel.updateConfig(groupConfig);
        }
      }, this);

      if(!groupConfig.isPreload){
        this._reloadControllerWidget(appConfig);
      }
    },

    _updatePlaceholder: function (appConfig) {
      array.forEach(this.widgetPlaceholders, function(placehoder){
        placehoder.setIndex(appConfig.getConfigElementById(placehoder.configId).placeholderIndex);
      }, this);
    },

    _onWidgetPoolChange: function(appConfig){
      this._reloadControllerWidget(appConfig);
    },

    _reloadControllerWidget: function(appConfig){
      /*jshint unused:false*/
      //destroy controller widget
      //for now, support only one controller

      var controllerWidget = this.widgetManager.getControllerWidgets().length > 0?
       this.widgetManager.getControllerWidgets()[0]: null;
      if(controllerWidget){
        //get old info
        var openedIds = controllerWidget.getOpenedIds();
        var windowState = controllerWidget.windowState;
        var widgetConfig = this.appConfig.getConfigElementById(controllerWidget.id);

        //destory all panels controlled by the controller.
        //we can't destroy the opened only, because some panels are closed but the
        //instance is still exists

        //we use this.appConfig(the old app config) here
        this.appConfig.visitElement(lang.hitch(this, function(element, info){
          if(info.isOnScreen){
            return;
          }
          //we support only one controller, so all pool widgets will be reload
          this.panelManager.destroyPanel(element.id + '_panel');
        }));
        this.widgetManager.destroyWidget(controllerWidget);
      }

      //load widget
      var newWidgetConfig;
      appConfig.visitElement(lang.hitch(this, function(element, info){
        if(element.isController){
          ////we support only one controller
          newWidgetConfig = element;
          return;
        }
      }));
      if(newWidgetConfig.visible === false){
        return;
      }
      this._loadPreloadWidget(newWidgetConfig).then(lang.hitch(this, function(widget){
        this.widgetManager.changeWindowStateTo(widget, windowState);
        if(openedIds){
          widget.setOpenedIds(openedIds);
        }
      }));
    },

    _removeDestroyed: function(_array){
      var willBeDestroyed = [];
      array.forEach(_array, function(e){
        if(e._destroyed){
          willBeDestroyed.push(e);
        }
      });
      array.forEach(willBeDestroyed, function(e){
        var i = _array.indexOf(e);
        _array.splice(i, 1);
      });
    },

    _destroyPreloadWidgetIcons: function(){
      array.forEach(this.preloadWidgetIcons, function(icon){
        icon.destroy();
      }, this);
      this.preloadWidgetIcons = [];
    },

    _destroyPreloadPanelessWidgets: function(){
      array.forEach(this.widgetManager.getPreloadPanelessWidgets(), function(widget){
        this.widgetManager.destroyWidget(widget);
      }, this);
    },

    _destroyWidgetPlaceholders: function(){
      array.forEach(this.widgetPlaceholders, function(placeholder){
        placeholder.destroy();
      }, this);
      this.widgetPlaceholders = [];
    },

    _destroyPreloadGroupPanels: function(){
      array.forEach(this.preloadGroupPanels, function(panel){
        this.panelManager.destroyPanel(panel);
      }, this);
      this.preloadGroupPanels = [];
    },

    _changeMapPosition: function(appConfig){
      var style;
      if(!this.map){
        return;
      }
      style = utils.getPositionStyle(appConfig.map.position);
      html.setStyle(this.mapId, style);
      this.map.resize();
      return;
    },

    _onThemeChange: function(appConfig){
      this._destroyPreloadWidgetIcons();
      this._destroyWidgetPlaceholders();
      this._destroyPreloadPanelessWidgets();

      this.panelManager.destroyAllPanels();

      this._updateCommonStyle(appConfig);
      this._onStyleChange(appConfig);
      this._changeMapPosition(appConfig);
      this._loadPreloadWidgets(appConfig);
    },

    _onResetConfig: function(appConfig){
      if(appConfig.map.itemId !== this.appConfig.map.itemId){
        topic.publish('appConfigChanged', appConfig, 'mapChange', appConfig);
        this._updateCommonStyle(appConfig);
        this._onStyleChange(appConfig);
        this._changeMapPosition(appConfig);
      }else{
        this._onThemeChange(appConfig);
      }
    },

    _updateCommonStyle : function(appConfig){
      var currentTheme = this.appConfig.theme;

      // remove old theme name
      html.removeClass(this.domNode, currentTheme.name);

      html.destroy(this._getThemeCommonStyleId(currentTheme));
      this._loadThemeCommonStyle(appConfig.theme);
    },

    _onStyleChange: function(appConfig){
      var currentTheme = this.appConfig.theme;
      if(currentTheme.styles !== appConfig.theme.styles){
        // remove old style name if not equal
        if (currentTheme.styles[0] !== appConfig.theme.styles[0]){
          html.removeClass(this.domNode, currentTheme.styles[0]);
        }
        html.destroy(this._getThemeCurrentStyleId(currentTheme));

        this._loadThemeCurrentStyle(appConfig.theme);
      }
    },

    _onLayoutChange: function(appConfig){
      var style = utils.getPositionStyle(appConfig.map.position);
      html.setStyle(this.mapId, style);
      this.map.resize();

      //relayout placehoder
      array.forEach(this.widgetPlaceholders, function(placeholder){
        placeholder.moveTo(appConfig.getConfigElementById(placeholder.configId).panel.position);
      }, this);

      //relayout icons
      array.forEach(this.preloadWidgetIcons, function(icon){
        icon.moveTo(appConfig.getConfigElementById(icon.configId).panel.position);
      }, this);

      //relayout paneless widget
      array.forEach(this.widgetManager.getPreloadPanelessWidgets(), function(widget){
        var position = appConfig.getConfigElementById(widget.id).panel.position;
        style = utils.getPositionStyle(position);
        html.setStyle(widget.domNode, style);
        //because change the position style of the widget will make the widget's dimension
        //will not conform the widget state,
        //so, change state here

        // if(widget.defaultState){
        //   this.widgetManager.changeWindowStateTo(widget, widget.defaultState);
        // }else{
        //   widget.resize();
        // }

        widget.onPositionChange(position);

      }, this);

      //relayout groups
      array.forEach(this.preloadGroupPanels, function(panel){
        style = utils.getPositionStyle(
          appConfig.getConfigElementById(panel.config.id).panel.position);
        html.setStyle(panel.domNode, style);
        panel.resize();
      }, this);
    },

    _loadTheme: function(theme) {
    //summary:
    //    load theme style, including common and current style(the first)
      require(['themes/' + theme.name + '/main'], lang.hitch(this, function(){
        this._loadThemeCommonStyle(theme);
        this._loadThemeCurrentStyle(theme);
      }));
    },

    _loadThemeCommonStyle: function(theme) {
      utils.loadStyleLink(this._getThemeCommonStyleId(theme),
        'themes/' + theme.name + '/common.css');
      // append theme name for better selector definition
      html.addClass(this.domNode, theme.name);
    },

    _loadThemeCurrentStyle: function(theme) {
      utils.loadStyleLink(this._getThemeCurrentStyleId(theme),
        'themes/' + theme.name + '/styles/' + theme.styles[0] + '/style.css');
      // append theme style name for better selector definitions
      html.addClass(this.domNode, theme.styles[0]);
    },

    _getThemeCommonStyleId: function(theme){
      return 'theme_' + theme.name + '_style_common';
    },

    _getThemeCurrentStyleId: function(theme){
      return 'theme_' + theme.name + '_style_' + theme.styles[0];
    },

    _loadMap: function() {
      var mapDiv = html.create('div', {
        id: this.mapId,
        style: lang.mixin({
          position: 'absolute',
          backgroundColor: '#EEEEEE',
          overflow: 'hidden',
          minWidth:'1px',
          minHeight:'1px'
        }, utils.getPositionStyle(this.appConfig.map.position))
      });

      html.place(mapDiv, this.id);

      MapManager.getInstance(this.appConfig, this.mapId).showMap();
    },

    _createPreloadWidgetPlaceHolder: function(widgetConfig){
      var pid;
      if(widgetConfig.panel.positionRelativeTo === 'map'){
        pid = this.mapId;
      }else{
        pid = this.id;
      }
      var cfg = lang.clone(widgetConfig);

      cfg.position.width = 40;
      cfg.position.height = 40;
      var style = utils.getPositionStyle(cfg.position);
      var phDijit = new WidgetPlaceholder({
        index: cfg.placeholderIndex,
        configId: widgetConfig.id
      });
      html.setStyle(phDijit.domNode, style);
      html.place(phDijit.domNode, pid);
      this.widgetPlaceholders.push(phDijit);
      return phDijit;
    },

    _createPreloadWidgetIcon: function(widgetConfig){
      var iconDijit = new PreloadWidgetIcon({
        panelManager: this.panelManager,
        widgetConfig: widgetConfig,
        configId: widgetConfig.id,
        map: this.map
      });

      if(widgetConfig.panel.positionRelativeTo === 'map'){
        html.place(iconDijit.domNode, this.mapId);
      }else{
        html.place(iconDijit.domNode, this.id);
      }
      //icon position doesn't use width/height in config
      html.setStyle(iconDijit.domNode, utils.getPositionStyle({
        top: widgetConfig.position.top,
        left: widgetConfig.position.left,
        right: widgetConfig.position.right,
        bottom: widgetConfig.position.bottom,
        width: 40,
        height: 40
      }));
      iconDijit.startup();

      if(!this.openAtStartWidget && widgetConfig.openAtStart){
        iconDijit.switchToOpen();
        this.openAtStartWidget = widgetConfig.name;
      }

      this.preloadWidgetIcons.push(iconDijit);
      return iconDijit;
    },

    _loadPreloadWidgets: function(appConfig) {
      console.time('Load widgetOnScreen');
      var loading = new LoadingShelter(), defs = [];
      loading.placeAt(this.id);
      loading.startup();
      //load widgets
      array.forEach(appConfig.widgetOnScreen.widgets, function(widgetConfig) {
        if(widgetConfig.visible === false){
          this.invisibleWidgetIds.push(widgetConfig.id);
          return;
        }
        defs.push(this._loadPreloadWidget(widgetConfig));
      }, this);

      //load groups
      array.forEach(appConfig.widgetOnScreen.groups, function(groupConfig) {
        defs.push(this._loadPreloadGroup(groupConfig));
      }, this);

      all(defs).then(lang.hitch(this, function(){
        if(loading){
          loading.destroy();
          loading = null;
        }
        console.timeEnd('Load widgetOnScreen');
        topic.publish('preloadWidgetsLoaded');
        this._doPostLoad();
      }), lang.hitch(this, function(){
        if(loading){
          loading.destroy();
          loading = null;
        }
        //if error when load widget, let the others continue
        console.timeEnd('Load widgetOnScreen');
        topic.publish('preloadWidgetsLoaded');
        this._doPostLoad();
      }));

      // setTimeout(function(){
      //   if(loading){
      //     loading.destroy();
      //     loading = null;
      //   }
      // }, jimuConfig.timeout);
    },


    _doPostLoad: function(){
      //load somethings that may be used later.
      //let it load behind the stage.
      require(['dynamic-modules/postload']);
    },

    _loadPreloadWidget: function(widgetConfig) {
      var def = new Deferred();

      if(this.appConfig.mode === 'config' && !widgetConfig.uri){
        var placeholder = this._createPreloadWidgetPlaceHolder(widgetConfig);
        def.resolve(placeholder);
        return def;
      }else if(!widgetConfig.uri){
        //in run mode, when no uri, do nothing
        def.resolve(null);
        return def;
      }

      var iconDijit;
      if(widgetConfig.inPanel){
        iconDijit = this._createPreloadWidgetIcon(widgetConfig);
        def.resolve(iconDijit);
      }else{
        this.widgetManager.loadWidget(widgetConfig).then(lang.hitch(this, function(widget){
          if(widget.panel.positionRelativeTo === 'map'){
            html.place(widget.domNode, this.mapId);
          }else{
            html.place(widget.domNode, this.id);
          }
          html.setStyle(widget.domNode, utils.getPositionStyle(widget.position));
          html.setStyle(widget.domNode, 'position', 'absolute');
          try{
            widget.startup();
          }catch(err){
            console.log(console.error('fail to startup widget ' + widget.name + '. ' + err.stack));
          }

          widget.configId = widgetConfig.id;
          def.resolve(widget);
        }), function(err){
          def.reject(err);
        });
      }

      return def;
    },

    _loadPreloadGroup: function(groupConfig) {
      var def = new Deferred();
      this.panelManager.showPanel(groupConfig).then(lang.hitch(this, function(panel){
        this.preloadGroupPanels.push(panel);
        def.resolve(panel);
      }), function(err){
        def.reject(err);
      });
      return def;
    }
  });

  clazz.getInstance = function(options, domId) {
    if (instance === null) {
      instance = new clazz(options, domId);
    }
    return instance;
  };
  return clazz;
});