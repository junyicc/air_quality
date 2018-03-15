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
  './LayerInfo',
  'dojox/gfx',
  'dojo/dom-construct',
  'dojo/dom-attr',
  'dojo/aspect',
  'esri/symbols/jsonUtils',
  'esri/dijit/PopupTemplate'
], function(declare, array, lang, Deferred, LayerInfo, gfx, domConstruct,
domAttr, aspect, jsonUtils, PopupTemplate) {
  var clazz = declare(LayerInfo, {
    _legendsNode: null,
    controlPopupInfo: null,
    // operLayer = {
    //    layerObject: layer,
    //    title: layer.label || layer.title || layer.name || layer.id || " ",
    //    id: layerId || " ",
    //    subLayers: [operLayer, ... ],
    //    mapService: {layerInfo: , subId: },
    //    collection: {layerInfo: }
    // };
    constructor: function() {
      /*
      this.layerLoadedDef = new Deferred(); 
      if(this.layerObject) {
        this.layerObject.on('load', lang.hitch(this, function(){
          this.layerLoadedDef.resolve();
        }));
      }
      */

      // init control popup
      this._initControlPopup();
    },

    getExtent: function() {
      return this._convertGeometryToMapSpatialRef(this.originOperLayer.layerObject.fullExtent) ||
        this._convertGeometryToMapSpatialRef(this.originOperLayer.layerObject.initialExtent);
    },

    initVisible: function() {
      /*jshint unused: false*/
      var visible = false;
      visible = this.originOperLayer.layerObject.visible;
      this._visible = visible;
    },

    _initControlPopup: function() {
      this.controlPopupInfo = {
        //enablePopup: this.originOperLayer.disablePopup ? false : true,
        enablePopup: this.layerObject.infoTemplate ? true: false,
        infoTemplate: this.layerObject.infoTemplate
      };
      // backup infoTemplate to layer.
      this.layerObject._infoTemplate = this.layerObject.infoTemplate;
      aspect.after(this.layerObject, "setInfoTemplate", lang.hitch(this, function(){
        this.layerObject._infoTemplate = this.layerObject.infoTemplate;
        this.controlPopupInfo.infoTemplate = this.layerObject.infoTemplate;
        if(!this.controlPopupInfo.enablePopup) {
          this.layerObject.infoTemplate = null;
        }
      }));
    },

    _setTopLayerVisible: function(visible) {
      if(this.originOperLayer.collection){
        //collection
        //click directly
        if(this.originOperLayer.collection.layerInfo._visible) {
          if(visible) {
            this.layerObject.show();
            this._visible = true;
          } else {
            this.layerObject.hide();
            this._visible = false;
          }
        } else {
          if(visible) {
            this.layerObject.hide();
            this._visible = true;
          } else {
            this.layerObject.hide();
            this._visible = false;
          }
        }
      } else {
        if (visible) {
          this.layerObject.show();
        } else {
          this.layerObject.hide();
        }
        this._visible = visible;
      }
    },

    setLayerVisiblefromTopLayer: function() {
      //click from top collecton
      if(this.originOperLayer.collection.layerInfo._visible) {
        if(this._visible) {
          this.layerObject.show();
        }
      } else {
        this.layerObject.hide();
      }
    },

    //---------------new section-----------------------------------------

    // obtainLegendsNode: function() {
    //   var layer = this.originOperLayer.layerObject;
    //   var legendsNode = domConstruct.create("div", {
    //     "class": "legends-div"
    //   });

    //   if (layer && layer.renderer) {
    //     this.initLegendsNode(legendsNode);
    //   } else {
    //     this.layerLoadedDef.then(lang.hitch(this, function(){
    //       this.initLegendsNode(legendsNode);
    //     }));
    //   }
    //   return legendsNode;
    // },

    createLegendsNode: function() {
      var legendsNode = domConstruct.create("div", {
        "class": "legends-div jimu-leading-margin1"
      }, document.body);
      domConstruct.create("img", {
        "class": "legends-loading-img",
        "src":  require.toUrl('jimu') + '/images/loading.gif'
      }, legendsNode);
      return legendsNode;
    },

    drawLegends: function(legendsNode) {
      this.initLegendsNode(legendsNode);
    },

    initLegendsNode: function(legendsNode) {
      var legendInfos = [];
      var layer = this.layerObject;

      if( this.layerObject &&
          !this.layerObject.empty &&
          (!this.originOperLayer.subLayer || this.originOperLayer.subLayers.length === 0)) {
        // delete loading image, this condition means the layer already loaded.
        domConstruct.empty(legendsNode);
        // layer has renderer that means the layer has loadded.
        if (layer.renderer) {
          if (layer.renderer.infos) {
            legendInfos = lang.clone(layer.renderer.infos); // todo
          } else {
            legendInfos.push({
              label: layer.renderer.label,
              symbol: layer.renderer.symbol
            });
          }

          if(layer.renderer && layer.renderer.defaultSymbol && legendInfos.length > 0) {
            legendInfos.push({
              label: layer.renderer.defaultLabel || "others",
              symbol: layer.renderer.defaultSymbol
            });
          }

          array.forEach(legendInfos, function(legendInfo) {
            legendInfo.legendDiv = domConstruct.create("div", {
              "class": "legend-div"
            }, legendsNode);

            legendInfo.symbolDiv= domConstruct.create("div", {
              "class": "legend-symbol jimu-float-leading"
            }, legendInfo.legendDiv);
            legendInfo.labelDiv= domConstruct.create("div", {
              "class": "legend-label jimu-float-leading",
              "innerHTML": legendInfo.label || " "
            }, legendInfo.legendDiv);

            if(legendInfo.symbol.type === "textsymbol") {
              domAttr.set(legendInfo.symbolDiv, "innerHTML", legendInfo.symbol.text);
            } else {
              var mySurface = gfx.createSurface(legendInfo.symbolDiv, 50, 50);
              var descriptors = jsonUtils.getShapeDescriptors(legendInfo.symbol);
              var shape = mySurface.createShape(descriptors.defaultShape)
                          .setFill(descriptors.fill).setStroke(descriptors.stroke);
              shape.setTransform(gfx.matrix.translate(25, 25));
            }
          }, this);
        }
      }
    },

    obtainNewSubLayers: function() {
      var newSubLayers = [];
      /*
      if(!this.originOperLayer.subLayers || this.originOperLayer.subLayers.length === 0) {
        //***
      } else {
      */
      if(this.originOperLayer.subLayers && this.originOperLayer.subLayers.length !== 0) {
        array.forEach(this.originOperLayer.subLayers, function(subOperLayer){
          var subLayerInfo = new clazz(subOperLayer, this.map);
          newSubLayers.push(subLayerInfo);

          subLayerInfo.init();
        }, this);
      }
      return newSubLayers;
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

    // control popup

    _getDefaultPopupTemplate: function(object) {
      var popupTemplate = null;
      if(object && object.fields) {
        var popupInfo = {
          title: object.name,
          fieldInfos:[],
          description: null,
          showAttachments: true,
          mediaInfos: []
        };
        array.forEach(object.fields, function(field){
          if(field.name !== object.objectIdField){
            popupInfo.fieldInfos.push({
              fieldName:field.name,
              visible:true,
              label:field.alias,
              isEditable:false
            });
          }
        });
        popupTemplate = new PopupTemplate(popupInfo);
      }
      return popupTemplate;
    },

    enablePopup: function() {
      this.controlPopupInfo.enablePopup = true;
      this.layerObject.infoTemplate = this.controlPopupInfo.infoTemplate;
    },

    disablePopup: function() {
      this.controlPopupInfo.enablePopup = false;
      this.layerObject.infoTemplate = null;
    },

    loadInfoTemplate: function() {
      var def = new Deferred();
      if(!this.controlPopupInfo.infoTemplate) {
        this.controlPopupInfo.infoTemplate = this._getDefaultPopupTemplate(this.layerObject);
      }
      def.resolve(this.controlPopupInfo.infoTemplate);
      return def;
    }


  });
  return clazz;
});
