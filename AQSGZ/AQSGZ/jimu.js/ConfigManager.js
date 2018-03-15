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
  'dojo/topic',
  'dojo/Deferred',
  './utils',
  './WidgetManager',
  './shared/AppVersionManager',
  './shared/utils',
  './ConfigLoader',
  './tokenUtils',
  'esri/config',
  'esri/tasks/GeometryService'
],
function (declare, lang, array, topic, Deferred, jimuUtils, WidgetManager,
  AppVersionManager, sharedUtils, ConfigLoader, tokenUtils, esriConfig, GeometryService) {
  var instance = null, clazz;

  clazz = declare(null, {
    urlParams: null,
    appConfig: null,
    configFile: null,
    _configLoaded: false,
    portalSelf: null,

    constructor: function (urlParams) {
      this.urlParams = urlParams || {};
      this.listenBuilderEvents();
      this.isRunInPortal = false;
      this.versionManager = new AppVersionManager();
      this.widgetManager = WidgetManager.getInstance();
      this.configLoader = ConfigLoader.getInstance(this.urlParams, {
        versionManager: this.versionManager
      });

      if(this.urlParams.mode === 'config' && window.parent.setConfigViewerTopic &&
        lang.isFunction(window.parent.setConfigViewerTopic)){
        window.parent.setConfigViewerTopic(topic);
      }
      if(this.urlParams.mode === 'preview' && window.parent.setPreviewViewerTopic &&
        lang.isFunction(window.parent.setPreviewViewerTopic)){
        window.parent.setPreviewViewerTopic(topic);
      }
    },

    listenBuilderEvents: function(){
      //whatever(app, map, widget, widgetPoolChanged) config changed, publish this event.
      //*when app changed, the id is "app", the data is app's properties, like title, subtitle.
      //*when map changed, the id is "map", the data is itemId
      //*when widget that is in preloadwidget/widgetpool changed, the id is widget's id,
      //  the data is widget's setting
      //*when anything in the widget pool changed, the id is "widgetPool", the data is
      //  widgets and groups

      topic.subscribe('builder/widgetChanged', lang.hitch(this, this._onWidgetChanged));
      topic.subscribe('builder/groupChanged', lang.hitch(this, this._onGroupChanged));
      topic.subscribe('builder/widgetPoolChanged', lang.hitch(this, this._onWidgetPoolChanged));

      topic.subscribe('builder/mapChanged', lang.hitch(this, this._onMapChanged));
      topic.subscribe('builder/mapOptionsChanged', lang.hitch(this, this._onMapOptionsChanged));
      topic.subscribe('builder/appAttributeChanged', lang.hitch(this, this._onAppAttributeChanged));

      //actionTriggered event is proccessed by layout manager.
      // topic.subscribe('builder/actionTriggered', lang.hitch(this, this._onConfigChanged));

      topic.subscribe('builder/setAppConfig', lang.hitch(this, this._onAppConfigSet));

      topic.subscribe('builder/themeChanged', lang.hitch(this, this._onThemeChanged));
      topic.subscribe('builder/layoutChanged', lang.hitch(this, this._onLayoutChanged));
      topic.subscribe('builder/styleChanged', lang.hitch(this, this._onStyleChanged));

      topic.subscribe('builder/syncExtent', lang.hitch(this, this._onSyncExtent));
    },

    loadConfig: function(){
      if(this.urlParams.mode === 'preview' ||
        this.urlParams.mode === 'config'){
        //in preview/config mode, the config is set by the builder.
        return;
      }
      return this.configLoader.loadConfig().then(lang.hitch(this, function(appConfig){
        this.portalSelf = this.configLoader.portalSelf;
        this.appConfig = this._addDefaultValues(appConfig);
        console.timeEnd('Load Config');
        topic.publish("appConfigLoaded", this.getConfig());
        return this.getConfig();
      }), function(err){
        console.error(err);
      });
    },

    getConfig: function () {
      var c = lang.clone(this.appConfig);

      c.getConfigElementById = function(id){
        return sharedUtils.getConfigElementById(this, id);
      };

      c.getCleanConfig = function(){
        return getCleanConfig(this);
      };

      c.visitElement = function(cb){
        sharedUtils.visitElement(this, cb);
      };
      return c;
    },

    _onWidgetChanged: function(_newJson){
      // transfer obj to another iframe may cause problems on IE8
      var newJson = jimuUtils.reCreateObject(_newJson);
      var oldJson = sharedUtils.getConfigElementById(this.appConfig, _newJson.id);
      //for now, we can add/update property only
      for(var p in newJson){
        oldJson[p] = newJson[p];
      }

      this.configLoader.addNeedValues(this.appConfig);
      this._addDefaultValues(this.appConfig);
      topic.publish('appConfigChanged', this.getConfig(), 'widgetChange', newJson);
    },

    _onGroupChanged: function(_newJson){
      // transfer obj to another iframe may cause problems on IE8
      var newJson = jimuUtils.reCreateObject(_newJson);
      var oldJson = sharedUtils.getConfigElementById(this.appConfig, _newJson.id);
      //for now, we can add/update property only
      for(var p in newJson){
        oldJson[p] = newJson[p];
      }

      this.configLoader.addNeedValues(this.appConfig);
      this._addDefaultValues(this.appConfig);
      topic.publish('appConfigChanged', this.getConfig(), 'groupChange', newJson);
    },

    _onWidgetPoolChanged: function(_newJson){
      // transfer obj to another iframe may cause problems on IE8
      var newJson = jimuUtils.reCreateObject(_newJson);
      //TODO we support only one controller for now, so we don't do much here
      this.appConfig.widgetPool.widgets = newJson.widgets;
      this.appConfig.widgetPool.groups = newJson.groups;

      this.configLoader.addNeedValues(this.appConfig);
      this._addDefaultValues(this.appConfig);
      topic.publish('appConfigChanged', this.getConfig(), 'widgetPoolChange', newJson);
    },

    _onAppAttributeChanged: function(_newJson){
      // transfer obj to another iframe may cause problems on IE8
      var newJson = jimuUtils.reCreateObject(_newJson);

      lang.mixin(this.appConfig, newJson);

      this.configLoader.processProxy(this.appConfig);

      this.configLoader.addNeedValues(this.appConfig);
      this._addDefaultValues(this.appConfig);
      topic.publish('appConfigChanged', this.getConfig(), 'attributeChange', newJson);
    },

    _onMapChanged: function(_newJson){
      // transfer obj to another iframe may cause problems on IE8
      var newJson = jimuUtils.reCreateObject(_newJson);

      if(newJson.itemId && newJson.itemId !== this.appConfig.map.itemId){
        //delete initial extent and lods when change map
        if(this.appConfig.map.mapOptions){
          delete this.appConfig.map.mapOptions.extent;
          delete this.appConfig.map.mapOptions.lods;
          delete this.appConfig.map.mapOptions.center;
          delete this.appConfig.map.mapOptions.scale;
          delete this.appConfig.map.mapOptions.zoom;
        }
      }
      lang.mixin(this.appConfig.map, newJson);

      this.configLoader.addNeedValues(this.appConfig);
      this._addDefaultValues(this.appConfig);
      topic.publish('appConfigChanged', this.getConfig(), 'mapChange', newJson);
    },

    _onMapOptionsChanged: function(_newJson){
      // transfer obj to another iframe may cause problems on IE8
      var newJson = jimuUtils.reCreateObject(_newJson);
      if(!this.appConfig.map.mapOptions){
        this.appConfig.map.mapOptions = {};
      }
      lang.mixin(this.appConfig.map.mapOptions, newJson);
      topic.publish('appConfigChanged', this.getConfig(), 'mapOptionsChange', newJson);
    },

    _onThemeChanged: function(theme){
      this._getAppConfigFromTheme(theme).then(lang.hitch(this, function(config){
        this.appConfig = config;
        topic.publish('appConfigChanged', this.getConfig(), 'themeChange', theme.getName());
      }));
    },

    _onLayoutChanged: function(layout){
      //summary:
      //    layouts in the same theme should have the same:
      //      1. count of preload widgets, count of widgetOnScreen groups
      //        (if not same, we just ignore the others)
      //      2. app properties (if not same, we just ignore the new layout properties)
      //      3. map config (if not same, we just ignore the new layout properties)
      //    can only have these differrences:
      //      1. panel, 2. position, 3, predefined widgets
      var layoutConfig = layout.layoutConfig;
      var layoutConfigScreenSection = layoutConfig.widgetOnScreen;
      var thisConfigScreenSection = this.appConfig.widgetOnScreen;
      if(layoutConfigScreenSection){
        //copy preload widget panel
        if(layoutConfigScreenSection.panel && layoutConfigScreenSection.panel.uri){
          thisConfigScreenSection.panel.uri = layoutConfigScreenSection.panel.uri;
        }

        //copy preload widget position
        array.forEach(layoutConfigScreenSection.widgets, function(widget, i){
          if(thisConfigScreenSection.widgets[i] && widget){
            if(widget.position){
              thisConfigScreenSection.widgets[i].position = widget.position;
            }
            if(widget.positionRelativeTo){
              thisConfigScreenSection.widgets[i].positionRelativeTo = widget.positionRelativeTo;
            }

            thisConfigScreenSection.widgets[i].panel = {
              uri: thisConfigScreenSection.panel.uri,
              position: thisConfigScreenSection.widgets[i].position,
              positionRelativeTo: thisConfigScreenSection.widgets[i].positionRelativeTo
            };
          }
        }, this);
        //copy preload group panel
        array.forEach(layoutConfigScreenSection.groups, function(group, i){
          if(thisConfigScreenSection.groups[i] && group && group.panel){
            thisConfigScreenSection.groups[i].panel = group.panel;
          }
        }, this);
      }

      if(layoutConfig.map){
        //copy map position
        this.appConfig.map.position = layoutConfig.map.position;
      }

      if(layoutConfig.widgetPool){
        //copy pool widget panel
        if(layoutConfig.widgetPool.panel){
          this.appConfig.widgetPool.panel = layoutConfig.widgetPool.panel;
        }
        //copy pool group panel
        array.forEach(layoutConfig.widgetPool.groups, function(group, i){
          if(this.appConfig.widgetPool.groups[i] && group && group.panel){
            this.appConfig.widgetPool.groups[i].panel = group.panel;
          }
        }, this);
      }

      topic.publish('appConfigChanged', this.getConfig(), 'layoutChange', layout.name);
    },

    _onStyleChanged: function(style){
      this.appConfig.theme.styles = this._genStyles(this.appConfig.theme.styles, style.name);
      topic.publish('appConfigChanged', this.getConfig(), 'styleChange', style.name);
    },

    _onSyncExtent: function(map){
      topic.publish('syncExtent', map);
    },

    _genStyles: function(allStyle, currentStyle){
      var styles = [];
      styles.push(currentStyle);
      array.forEach(allStyle, function(_style){
        if(styles.indexOf(_style) < 0){
          styles.push(_style);
        }
      });
      return styles;
    },

    /**************************************
    Keep the following same between themes:
    1. map config excluding map's position
    2. widget pool config excluding pool panel config
    ***************************************/
    _getAppConfigFromTheme: function(theme){
      var def = new Deferred();
      var config, styles = [];
      var currentConfig = this.getConfig().getCleanConfig();

      currentConfig.mode = this.urlParams.mode;

      //because we don't allow user config panel for group,
      //and group's panel should be different between differrent theme
      //so, we delete group panel
      array.forEach(currentConfig.widgetPool.groups, function(group){
        delete group.panel;
      }, this);
      //theme has already appConfig object, use it but keep something
      if(theme.appConfig){
        config = lang.clone(theme.appConfig);
        config.map = currentConfig.map;
        config.map.position = theme.appConfig.map.position;
        if(currentConfig.widgetPool.widgets){
          config.widgetPool.widgets = currentConfig.widgetPool.widgets;
        }
        if(currentConfig.widgetPool.groups){
          config.widgetPool.groups = currentConfig.widgetPool.groups;
        }
        if (currentConfig.links){
          config.links = currentConfig.links;
        }
      }else{
        //use layout and style to create a new appConfig, which may contain some place holders
        var layout = theme.getCurrentLayout();
        var style = theme.getCurrentStyle();

        config = lang.clone(currentConfig);

        config.widgetOnScreen = layout.layoutConfig.widgetOnScreen;
        if(layout.layoutConfig.widgetPool && layout.layoutConfig.widgetPool.panel){
          config.widgetPool.panel = layout.layoutConfig.widgetPool.panel;
        }
        if(layout.layoutConfig.map && layout.layoutConfig.map.position){
          config.map.position = layout.layoutConfig.map.position;
        }

        //put all styles into the style array, and the current style is the first element
        styles = this._genStyles(array.map(theme.getStyles(), function(style){
          return style.name;
        }), style.name);
        config.theme = {
          name: theme.getName(),
          styles: styles,
          version: theme.getVersion()
        };
      }

      this.configLoader.addNeedValues(config);
      this._addDefaultValues(config);
      this.configLoader.loadWidgetsManifest(config).then(function(){
        def.resolve(config);
      });
      return def;
    },

    _onAppConfigSet: function(c){
      //summary:
      //  this method may be called by builder or UT
      c = jimuUtils.reCreateObject(c);

      this.configLoader.processProxy(c);

      this.configLoader.addNeedValues(c);
      this._addDefaultValues(c);

      tokenUtils.setPortalUrl(c.portalUrl);

      if(this.appConfig){
        //delete initial extent when change map
        if(c.map.itemId && c.map.itemId !== this.appConfig.map.itemId){
          if(c.map.mapOptions){
            delete c.map.mapOptions.extent;
          }
        }
        this.appConfig = c;
        topic.publish('appConfigChanged', this.getConfig(), 'resetConfig', c);
      }else{
        this.appConfig = c;
        topic.publish("appConfigLoaded", this.getConfig());
      }
    },

    /**********************************************
    * Add default values
    ************************************************/
    _addDefaultValues: function(config) {
      this._addDefaultPortalUrl(config);
      this._addDefaultGeometryService(config);
      this._addDefaultStyle(config);
      this._addDefaultMap(config);
      this._addDefaultVisible(config);

      //preload widgets
      if(typeof config.widgetOnScreen === 'undefined'){
        config.widgetOnScreen = {};
      }

      if(typeof config.widgetPool === 'undefined'){
        config.widgetPool = {};
      }

      this._addDefaultPanelAndPosition(config);
      this._addDefaultOfWidgetGroup(config);
      //if the first widget or first group doesn't have index property, we add it
      if(config.widgetPool.widgets && config.widgetPool.widgets.length > 0 &&
        config.widgetPool.widgets[0].index === undefined ||
        config.widgetPool.groups && config.widgetPool.groups.length > 0 &&
        config.widgetPool.groups[0].index === undefined){
        this._addIndexForWidgetPool(config);
      }
      return config;
    },

    _addDefaultPortalUrl: function(config){
      if(typeof config.portalUrl === 'undefined'){
        config.portalUrl = 'http://www.arcgis.com/';
      }
      if(config.portalUrl && config.portalUrl.substr(config.portalUrl.length - 1) !== '/'){
        config.portalUrl += '/';
      }
    },

    _addDefaultGeometryService: function(appConfig){
      var geoServiceUrl = appConfig && appConfig.geometryService;
      var validGeoServiceUrl = geoServiceUrl && typeof geoServiceUrl === 'string' &&
      lang.trim(geoServiceUrl);
      if(validGeoServiceUrl){
        geoServiceUrl = lang.trim(geoServiceUrl);
      }
      else{
        //TODO this.portalSelf is null if app is loaded in builder.
        //but we can ensure appConfig.geometryService is not null if app is created by builder,
        //so this line will not be executed.
        geoServiceUrl = this.portalSelf.helperServices.geometry.url;
      }
      appConfig.geometryService = geoServiceUrl;
      esriConfig.defaults.geometryService = new GeometryService(appConfig.geometryService);
    },

    _addDefaultStyle: function(config){
      if(config.theme){
        if(!config.theme.styles || config.theme.styles.length === 0){
          config.theme.styles = ['default'];
        }
      }
    },

    _addDefaultMap: function(config){
      config.map.id = 'map';

      if(typeof config.map['3D'] === 'undefined' && typeof config.map['2D'] === 'undefined'){
        config.map['2D'] = true;
      }

      if(typeof config.map.position === 'undefined'){
        config.map.position = {
          left: 0,
          right: 0,
          top: 0,
          bottom: 0
        };
      }

      if(typeof config.map.portalUrl === 'undefined'){
        config.map.portalUrl = config.portalUrl;
      }
    },

    _addDefaultVisible: function(config){
      sharedUtils.visitElement(config, function(e){
        if(e.visible === undefined){
          e.visible = true;
        }
      });
    },

    _addDefaultPanelAndPosition: function(config){
      var i, j, screenSectionConfig = config.widgetOnScreen, poolSectionConfig = config.widgetPool;
      //panel
      if(typeof screenSectionConfig.panel === 'undefined' ||
        typeof screenSectionConfig.panel.uri === 'undefined'){
        screenSectionConfig.panel = {uri: 'jimu/PreloadWidgetIconPanel', positionRelativeTo: 'map'};
      }else if(typeof screenSectionConfig.panel.positionRelativeTo === 'undefined'){
        screenSectionConfig.panel.positionRelativeTo = 'map';
      }

      if(typeof poolSectionConfig.panel === 'undefined' ||
        typeof poolSectionConfig.panel.uri === 'undefined'){
        poolSectionConfig.panel = {uri: 'jimu/PreloadWidgetIconPanel', positionRelativeTo: 'map'};
      }else if(typeof poolSectionConfig.panel.positionRelativeTo === 'undefined'){
        poolSectionConfig.panel.positionRelativeTo = 'map';
      }

      if(screenSectionConfig.widgets){
        for(i = 0; i < screenSectionConfig.widgets.length; i++){
          if(!screenSectionConfig.widgets[i].position){
            screenSectionConfig.widgets[i].position = {
              left: 0,
              top: 0
            };
          }
          if(!screenSectionConfig.widgets[i].positionRelativeTo){
            screenSectionConfig.widgets[i].positionRelativeTo = 'map';
          }
          if(!screenSectionConfig.widgets[i].panel){
            screenSectionConfig.widgets[i].panel = lang.clone(screenSectionConfig.panel);
            screenSectionConfig.widgets[i].panel.position = screenSectionConfig.widgets[i].position;
            screenSectionConfig.widgets[i].panel.positionRelativeTo =
            screenSectionConfig.widgets[i].positionRelativeTo;
          }
        }
      }

      if(screenSectionConfig.groups){
        for(i = 0; i < screenSectionConfig.groups.length; i++){
          if(!screenSectionConfig.groups[i].position){
            screenSectionConfig.groups[i].position = {
              left: 0,
              top: 0
            };
          }

          if(!screenSectionConfig.groups[i].panel){
            screenSectionConfig.groups[i].panel = screenSectionConfig.panel;
          }

          for(j = 0; j < screenSectionConfig.groups[i].widgets.length; j++){
            screenSectionConfig.groups[i].widgets[j].panel = screenSectionConfig.groups[i].panel;
          }
        }
      }

      if(poolSectionConfig){
        if(poolSectionConfig.groups){
          for(i = 0; i < poolSectionConfig.groups.length; i++){
            if(!poolSectionConfig.groups[i].panel){
              poolSectionConfig.groups[i].panel = poolSectionConfig.panel;
            }else if(!poolSectionConfig.groups[i].panel.positionRelativeTo){
              poolSectionConfig.groups[i].panel.positionRelativeTo = 'map';
            }

            for(j = 0; j < poolSectionConfig.groups[i].widgets.length; j++){
              poolSectionConfig.groups[i].widgets[j].panel = poolSectionConfig.groups[i].panel;
            }
          }
        }

        if(poolSectionConfig.widgets){
          for(i = 0; i < poolSectionConfig.widgets.length; i++){
            if(!poolSectionConfig.widgets[i].panel){
              poolSectionConfig.widgets[i].panel = config.widgetPool.panel;
            }
          }
        }
      }
    },

    _addDefaultOfWidgetGroup: function(config){
      //group/widget labe, icon
      sharedUtils.visitElement(config, lang.hitch(this, function(e, info){
        e.isPreload = info.isOnScreen;
        if(e.widgets){
          //it's group
          e.gid = e.id;
          if(e.widgets.length === 1){
            if(!e.label){
              e.label = e.widgets[0].label? e.widgets[0].label: 'Group';
            }
            if(!e.icon){
              if(e.widgets[0].uri){
                e.icon = this._getDefaultIconFromUri(e.widgets[0].uri);
              }else{
                e.icon = 'jimu.js/images/group_icon.png';
              }
            }
          }else{
            e.icon = e.icon? e.icon: 'jimu.js/images/group_icon.png';
            e.label = e.label? e.label: 'Group_' + info.index;
          }
        }else{
          e.gid = info.groupId;
          if(e.uri){
            jimuUtils.processWidgetSetting(e);
          }
        }
      }));
    },

    _getDefaultIconFromUri: function(uri){
      var segs = uri.split('/');
      segs.pop();
      return segs.join('/') + '/images/icon.png';
    },

    _addIndexForWidgetPool: function(config){
      //be default, widgets are in front
      var index = 0, i, j;
      if(config.widgetPool.widgets){
        for(i = 0; i < config.widgetPool.widgets.length; i++){
          config.widgetPool.widgets[i].index = index;
          index ++;
        }
      }

      if(config.widgetPool.groups){
        for(i = 0; i < config.widgetPool.groups.length; i++){
          config.widgetPool.groups[i].index = index;
          index ++;
          for(j = 0; j < config.widgetPool.groups[i].widgets.length; j++){
            config.widgetPool.groups[i].widgets[j].index = j;
          }
        }
      }
    }

  });

  clazz.getInstance = function (urlParams) {
    if(instance === null) {
      instance = new clazz(urlParams);
    }else{
      instance.urlParams = urlParams;
    }

    window.getAppConfig = lang.hitch(instance, instance.getConfig);
    return instance;
  };

  function getCleanConfig(config){
    //delete the properties that framework add
    var newConfig = lang.clone(config);
    var properties = jimuUtils.widgetProperties;

    delete newConfig.mode;
    sharedUtils.visitElement(newConfig, function(e, info){
      if(e.widgets){
        delete e.isPreload;
        delete e.gid;
        if(e.icon === 'jimu.js/images/group_icon.png'){
          delete e.icon;
        }
        delete e.openType;
        if(info.isOnScreen){
          if(e.panel && jimuUtils.isEqual(e.panel, newConfig.widgetOnScreen.panel)){
            delete e.panel;
          }
        }
        return;
      }

      if(e.icon && e.icon === e.amdFolder + 'images/icon.png'){
        delete e.icon;
      }

      delete e.panel;
      delete e.folderUrl;
      delete e.amdFolder;
      delete e.thumbnail;
      delete e.configFile;
      delete e.gid;
      delete e.isPreload;

      properties.forEach(function(p){
        delete e[p];
      });


      if(e.visible){
        delete e.visible;
      }
      delete e.manifest;
    });
    delete newConfig.rawAppConfig;
    //the _ssl property is added by esriRequest
    delete newConfig._ssl;
    //delete all of the methods
    delete newConfig.getConfigElementById;
    delete newConfig.processNoUriWidgets;
    delete newConfig.addElementId;
    delete newConfig.getCleanConfig;
    delete newConfig.visitElement;

    delete newConfig.agolConfig;
    delete newConfig._itemData;
    delete newConfig.oldWabVersion;

    return newConfig;
  }

  return clazz;
});
