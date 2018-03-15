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
  'dojo/_base/array',
  'dojo/_base/lang',
  'dojo/Deferred',
  'dojo/json',
  'dojo/aspect',
  './LayerInfo',
  'esri/request',
  './LayerInfoFactory'
], function(declare, array, lang, Deferred, Json, aspect, LayerInfo,
esriRequest, LayerInfoFactory) {
  return declare(LayerInfo, {

    _legendInfo: null,
    _sublayerIdent: null,
    controlPopupInfo: null,

    constructor: function(operLayer, map) {
      /*jshint unused: false*/
      this.initSubLayerVisible();

      // init _subLayerIdent.
      this._sublayerIdent = {
        definitions: [],
        empty: true,
        defLoad: new Deferred()
      };
      this._sublayerIdent.definitions[this.layerObject.layerInfos.length - 1] = null;
      
      // init control popup
      this._initControlPopup();
    },

    _initControlPopup: function() {
      this.controlPopupInfo = {
        enablePopup: undefined,
        infoTemplates: lang.clone(this.layerObject.infoTemplates)
      };
      // backup infoTemplates to layer.
      this.layerObject._infoTemplates = lang.clone(this.layerObject.infoTemplates);
      aspect.after(this.layerObject, "setInfoTemplates", lang.hitch(this, function(){
        this.layerObject._infoTemplates = lang.clone(this.layerObject.infoTemplates);
        this.controlPopupInfo.infoTemplates = lang.clone(this.layerObject.infoTemplates);
        this.traversal(function(layerInfo) {
          if(layerInfo._afterSetInfoTemplates) {
            layerInfo._afterSetInfoTemplates();
          }
        });
      }));
    },

    initSubLayerVisible: function() {
      this.subLayerVisible = [];
      //the subLayerVisible has the same index width layerInfos.
      this.subLayerVisible[this.layerObject.layerInfos.length - 1] = 0;

      for (var i = 0; i < this.subLayerVisible.length; i++) {
        // if(this.layerObject.layerInfos[i].subLayerIds) {
        // // it's a group
        //   this.subLayerVisible[i] = -100000;
        // } else {
        //   this.subLayerVisible[i] = 0;
        // }
        this.subLayerVisible[i] = 0;
      }

      /*
      function makeSubLayerVisible(subLayerId){
        this.setSubLayerVisible(subLayerId, true);
      }

      
      // unvisible group and visible subLayers of group.
      for(i=0; i<this.layerObject.layerInfos.length; i++) {
        var layerInfo = this.layerObject.layerInfos[i];
        var index = array.indexOf(this.layerObject.visibleLayers, layerInfo.id);
        if(layerInfo.subLayerIds && index >= 0) {
          array.forEach(layerInfo.subLayerIds, makeSubLayerVisible, this);
          this.setSubLayerVisible(layerInfo.id, false);
          i = -1;
          continue;
        }
      }
      */
      // array.forEach(this.layerObject.visibleLayers, function(visibleId){
      //   if(visibleId >= 0) {
      //     this.subLayerVisible[visibleId]++;
      //   }
      // }, this);

      if (this.originOperLayer.visibleLayers) {
        // according to webmap info
        array.forEach(this.originOperLayer.visibleLayers, function(visibleLayer) {
          this.subLayerVisible[visibleLayer]++;
        }, this);
      } else {
        // according to mapserver info
        array.forEach(this.layerObject.layerInfos, function(layerInfo, index) {
          if (layerInfo.defaultVisibility) {
            this.subLayerVisible[index]++;
          }
        }, this);
      }
    },

    getExtent: function() {
      var extent = this.originOperLayer.layerObject.fullExtent ||
        this.originOperLayer.layerObject.initialExtent;
      return this._convertGeometryToMapSpatialRef(extent);
    },

    initVisible: function() {
      this._visible = this.originOperLayer.layerObject.visible;
    },

    _setTopLayerVisible: function(visible) {
      this.originOperLayer.layerObject.setVisibility(visible);
      this._visible = visible;
    },

    setSubLayerVisible: function(subLayerId, visible) {
      var ary = [],
        index;
      if (subLayerId !== null) {
        if (visible) {
          ary = lang.clone(this.originOperLayer.layerObject.visibleLayers);
          index = array.indexOf(ary, subLayerId);
          if (index < 0) {
            ary.push(subLayerId);
            this.originOperLayer.layerObject.setVisibleLayers(ary);
          }
        } else {
          ary = lang.clone(this.originOperLayer.layerObject.visibleLayers);
          index = array.indexOf(ary, subLayerId);
          if (index >= 0) {
            ary.splice(index, 1);
          }
          if (ary.length === 0) {
            ary.push(-1);
          }
          this.originOperLayer.layerObject.setVisibleLayers(ary);
        }
      }
    },

    //---------------new section-----------------------------------------
    obtainNewSubLayers: function() {
      var newSubLayers = [];
      var layer = this.originOperLayer.layerObject;
      var serviceLayerType = null;
      if (layer.declaredClass === 'esri.layers.ArcGISDynamicMapServiceLayer') {
        serviceLayerType = "dynamic";
      } else {
        serviceLayerType = "tiled";
      }

      array.forEach(layer.layerInfos, function(layerInfo) {
        var featureLayer = null;
        var url = layer.url + "/" + layerInfo.id;
        var featureLayerId = layer.id + "_" + layerInfo.id;

        // It is a group layer.
        if (layerInfo.subLayerIds && layerInfo.subLayerIds.length > 0) {
          /*
          newSubLayers.push({
            layerObject: featureLayer,
            title: layerInfo.name || layerInfo.id || " ",
            id: featureLayerId || " ",
            subLayers: [],
            mapService: {"layerInfo": this, "subId": layerInfo.id},
            selfType: 'mapservice_' +  serviceLayerType + '_group'
          });
          */
          // it's a fake layerObject, only has a url intent to show Descriptiong in popupMenu
          featureLayer = {
            url: url,
            empty: true
          };
          this._addNewSubLayer(newSubLayers,
                               featureLayer,
                               featureLayerId,
                               layerInfo,
                               serviceLayerType + '_group');
        } else {
          //featureLayer = new FeatureLayer(url);
          // featureLayer.on('load', lang.hitch(this,
          //                                    this._addNewSubLayer,
          //                                    newSubLayers, index,
          //                                    featureLayerId,
          //                                    layerInfo.id,
          //                                    deferreds[index],
          //                                    url,
          //                                    layerInfo));
          // featureLayer.on('error', lang.hitch(this,
          //                                     this._handleErrorSubLayer,
          //                                     newSubLayers,
          //                                     index,
          //                                     featureLayerId,
          //                                     layerInfo.id,
          //                                     deferreds[index],
          //                                     url,
          //                                     layerInfo));
          featureLayer = {
            url: url,
            empty: true
          };
          this._addNewSubLayer(newSubLayers,
                               featureLayer,
                               featureLayerId,
                               layerInfo,
                               serviceLayerType);
        }
      }, this);

      //afer load all featureLayers.
      var finalNewSubLayerInfos = [];
      //reorganize newSubLayers, newSubLayers' element now is:
      //{
      // layerObject:
      // title:
      // id:
      // subLayers:
      //}
      array.forEach(layer.layerInfos, function(layerInfo, i) {
        var parentId = layerInfo.parentLayerId;
        //if fetchs a FeatrueLayer error. does not add it;
        if (parentId !== -1
            /*&& !newSubLayers[layerInfo.id].error && !newSubLayers[parentId].error*/ ) { //****
          newSubLayers[parentId].subLayers.push(newSubLayers[i]);
        }
      });

      array.forEach(layer.layerInfos, function(layerInfo, i) {
        var subLayerInfo;
        //if fetchs a FeatrueLayer error. does not add it;
        if (layerInfo.parentLayerId === -1 /*&& !newSubLayers[layerInfo.id].error*/ ) {
          subLayerInfo = LayerInfoFactory.getInstance().create(newSubLayers[i]);
          finalNewSubLayerInfos.push(subLayerInfo);
          subLayerInfo.init();
        }
      }, this);

      return finalNewSubLayerInfos;
    },

    _addNewSubLayer: function(newSubLayers,
                              featureLayer,
                              featureLayerId,
                              layerInfo,
                              serviceLayerType) {
      newSubLayers.push({
        layerObject: featureLayer,
        title: layerInfo.name || layerInfo.id || " ",
        id: featureLayerId || " ",
        subLayers: [],
        mapService: {
          "layerInfo": this,
          "subId": layerInfo.id
        },
        selfType: 'mapservice_' + serviceLayerType,
        url: featureLayer.url,
        parentLayerInfo: this
      });
    },

    _handleErrorSubLayer: function(newSubLayers, index, layerId, subId, url, layerInfo) {
      /*jshint unused: false*/
      //newSubLayers[index] = {error: true};
      //var layer = newSubLayers[index];
      newSubLayers[index] = {
        layerObject: null,
        title: layerInfo.name || layerInfo.id || " ",
        id: layerId || " ",
        subLayers: [],
        mapService: {
          "layerInfo": this,
          "subId": subId
        }
      };
    },

    getOpacity: function() {
      if (this.layerObject.opacity) {
        return this.layerObject.opacity;
      } else {
        return 1;
      }
    },

    setOpacity: function(opacity) {
      if (this.layerObject.setOpacity) {
        this.layerObject.setOpacity(opacity);
      }
    },

    getLegendInfo: function(portalUrl) {
      var def = new Deferred();
      if (!this._legendInfo) {
        this._legendRequest(portalUrl).then(lang.hitch(this, function(results) {
          this._legendInfo = results.layers;
          def.resolve(this._legendInfo);
        }), function() {
          def.reject();
        });
      } else {
        def.resolve(this._legendInfo);
      }
      return def;
    },

    // about legend.
    _legendRequest: function(portalUrl) {
      if (this.layerObject.version >= 10.01) {
        return this._legendRequestServer();
      } else {
        return this._legendRequestTools(portalUrl);
      }
    },

    _legendRequestServer: function() {
      var url = this.layerObject.url + "/legend";
      var params = {};
      params.f = "json";
      if (this.layerObject._params.dynamicLayers) {
        params.dynamicLayers = Json.stringify(this._createDynamicLayers(this.layerObject));
        if (params.dynamicLayers === "[{}]") {
          params.dynamicLayers = "[]";
        }
      }
      var request = esriRequest({
        url: url,
        content: params,
        handleAs: 'json',
        callbackParamName: 'callback'
      });
      return request;
    },

    _legendRequestTools: function(portalUrl) {
      var url = portalUrl + "sharing/tools/legend?soapUrl=" + this.layerObject.url;
      var request = esriRequest({
        url: url,
        content: {
          f: 'json'
        },
        handleAs: 'json',
        callbackParamName: 'callback'
      });
      return request;
    },

    _createDynamicLayers: function(layer) {
      var dynLayerObjs = [],
        dynLayerObj,
        infos = layer.dynamicLayerInfos || layer.layerInfos;

      array.forEach(infos, function(info) {
        dynLayerObj = {
          id: info.id
        };
        dynLayerObj.source = info.source && info.source.toJson();

        var definitionExpression;
        if (layer.layerDefinitions && layer.layerDefinitions[info.id]) {
          definitionExpression = layer.layerDefinitions[info.id];
        }
        if (definitionExpression) {
          dynLayerObj.definitionExpression = definitionExpression;
        }
        var layerDrawingOptions;
        if (layer.layerDrawingOptions && layer.layerDrawingOptions[info.id]) {
          layerDrawingOptions = layer.layerDrawingOptions[info.id];
        }
        if (layerDrawingOptions) {
          dynLayerObj.drawingInfo = layerDrawingOptions.toJson();
        }
        dynLayerObj.minScale = info.minScale || 0;
        dynLayerObj.maxScale = info.maxScale || 0;
        dynLayerObjs.push(dynLayerObj);
      });
      return dynLayerObjs;
    },

    // about all layer and table
    _getSublayerDefinition: function(subId) {
      var def;
      if (this._sublayerIdent.definitions[subId]) {
        def = new Deferred();
        def.resolve(this._sublayerIdent.definitions[subId]);
      } else {
        def = this._layerAndTableRequest(subId);
      }
      return def;
    },

    _layerAndTableRequest: function(subId) {
      if (this.layerObject.version >= 10.11) {
        return this._allLayerAndTableServer(subId);
      } else {
        return this._allLayerAndTable(subId);
      }
    },

    _allLayerAndTableServer: function(subId) {
      var def = new Deferred();
      var url = this.originOperLayer.url + '/layers';
      if(this._sublayerIdent.empty) {
        this._sublayerIdent.empty = false;
        this._request(url).then(lang.hitch(this, function(results) {
          this._sublayerIdent.definitions = results.layers;
          this._sublayerIdent.defLoad.resolve();
          def.resolve(this._sublayerIdent.definitions[subId]);
        }), lang.hitch(this, function(err) {
          console.error(err.message || err);
          this._sublayerIdent.defLoad.reject();
          this._sublayerIdent.defLoad = new Deferred();
          this._sublayerIdent.empty = true;
          def.resolve(null);
        }));
      } else {
        this._sublayerIdent.defLoad.then(lang.hitch(this, function() {
          def.resolve(this._sublayerIdent.definitions[subId]);
        }), function(err) {
          console.error(err.message || err);
          def.resolve(null);
        });
      }
      return def;
    },

    _allLayerAndTable: function(subId) {
      var def = new Deferred();
      var url = this.originOperLayer.url + '/' + subId;
      this._request(url).then(lang.hitch(this, function(result) {
        this._sublayerIdent.definitions[subId] = result;
        def.resolve(result);
      }), function(err) {
        console.error(err.message || err);
        def.resolve(null);
      });
      return def;
    },

    _request: function(url) {
      var request = esriRequest({
        url: url,
        content: {
          f: 'json'
        },
        handleAs: 'json',
        callbackParamName: 'callback'
      });
      return request;
    }

  });
});