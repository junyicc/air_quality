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
    'jimu/BaseWidgetSetting',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/registry',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/on',
    'dojo/query',
    'jimu/LayerInfos/LayerInfos',
    'jimu/dijit/LoadingShelter',
    'jimu/dijit/RadioBtn',
    'dijit/form/Select'
  ],
  function(
    declare,
    BaseWidgetSetting,
    _WidgetsInTemplateMixin,
    registry,
    lang,
    array,
    on,
    query,
    LayerInfos,
    LoadingShelter) {
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {

      baseClass: 'jimu-widget-swipe-setting',

      _selectedStyle: "",

      postCreate: function() {
        this.own(on(this.verticalNode, 'click', lang.hitch(this, function() {
          this._selectItem('vertical');
        })));
        this.own(on(this.horizontalNode, 'click', lang.hitch(this, function() {
          this._selectItem('horizontal');
        })));
        this.own(on(this.scopeNode, 'click', lang.hitch(this, function() {
          this._selectItem('scope');
        })));

        this.shelter = new LoadingShelter({
          hidden: true
        });
        this.shelter.placeAt(this.domNode);
        this.shelter.startup();
        this.shelter.show();

        this._getLayersFromMap(this.map).then(lang.hitch(this, function(data) {
          if (!this.domNode) {
            return;
          }
          
          this.swipeLayers.set('options', data);
        }), function(err) {
          console.log(err);
        }).always(lang.hitch(this, function() {
          this.shelter.hide();
        }));
      },

      startup: function() {
        this.inherited(arguments);
        this.setConfig(this.config);
      },

      setConfig: function(config) {
        this.config = config;
        if (this.config.style) {
          this._selectItem(this.config.style);
        } else {
          this._selectItem('vertical');
        }
        if (this.config.layer) {
          this.swipeLayers.set('value', this.config.layer);
        }
      },

      _getLayersFromMap: function(map) {
        return LayerInfos.getInstance(map, map.itemInfo)
          .then(lang.hitch(this, function(layerInfosObj) {
            var infos = layerInfosObj.getLayerInfoArray();
            var data = array.map(infos, function(info) {
              return {
                label: info.title,
                value: info.id
              };
            });

            return data;
          }));
      },

      _selectItem: function(style) {
        var _selectedNode = null;
        var _layerText = "";
        if (style === 'scope') {
          _selectedNode = this.scopeNode;
          _layerText = this.nls.spyglassText;
        } else if (style === 'horizontal') {
          _selectedNode = this.horizontalNode;
          _layerText = this.nls.layerText;
        } else {
          _selectedNode = this.verticalNode;
          _layerText = this.nls.layerText;
        }
        this.layerTextNode.innerHTML = _layerText;
        var _radio = registry.byNode(query('.jimu-radio', _selectedNode)[0]);
        _radio.check(true);

        this._selectedStyle = style;
      },

      _getSelectedStyle: function() {
        return this._selectedStyle;
      },

      getConfig: function() {
        this.config.style = this._getSelectedStyle();
        this.config.layer = this.swipeLayers.get('value');
        return this.config;
      }
    });
  });