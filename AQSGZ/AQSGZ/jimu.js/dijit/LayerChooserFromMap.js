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

define(['dojo/_base/declare',
  './_BasicLayerChooserFromMap',
  'jimu/dijit/_Tree',
  'dojo/store/Memory',
  'dojo/Deferred',
  'dojo/store/Observable',
  'dijit/tree/ObjectStoreModel',
  'dojo/promise/all',
  'dojo/_base/lang',
  'dojo/_base/html',
  'dojo/_base/array',
  'jimu/utils'
],
function(declare, _BasicLayerChooserFromMap,
  JimuTree, Memory, Deferred, Observable, ObjectStoreModel, all,
  lang, html, array, jimuUtils) {

  var _Tree = declare([JimuTree],{
    postCreate: function(){
      this.inherited(arguments);
    },

    isLeafItem: function(item){
      if(item && item.layerInfo && item.layerInfo.getSubLayers().length > 0) {
        return false;
      } else {
        return true;
      }
    }
  });

  var LayerChooserFromMap = declare([_BasicLayerChooserFromMap], {
    templateString:'<div style="width:100%;height:100%">' +
      '<div class="error-tip-section">' +
        '<span class="error-icon"></span>' +
        '<span class="error-tip" data-dojo-attach-point="errTip">${nls.noLayersTip}</span>' +
      '</div>' +
    '</div>',

    //constructor options:
    createMapResponse: null,//The response of method createMap.
    multiple: true,
    //supports layers:
    //    "FeatureLayer"
    //    "FeatureCollection"
    //    "ArcGISDynamicMapServiceLayer"
    //    "ArcGISTiledMapServiceLayer"
    //    "GeoRSSLayer"
    //    "KMLLayer"
    //    "WMSLayer"
    //    "WTMSLayer"
    //Show all layers if does not init showLayerTypes.
    //such as ['FeatureLayer',]
    showLayerTypes: [],
    //filter geometry type if layer is FeatureLayer.
    //Show all FeatureLayers if does not init showLayerTypes.
    //such as ['esriGeometryPoint', 'esriGeometryPolyline']
    geometryTypes: [],
    
    //public methods:
    //  getSelectedItems

    postCreate: function(){
      this.inherited(arguments);
    },

    _onLayerInfosChanged: function(layerInfo, changedType){
      /*jshint unused: false*/
      this._buildTree(this.layerInfosObj);
    },

    _isLayerTypeSupported: function(layerInfo){
      /*jshint unused: false*/
      return true;
    },

    _isLayerTypeSupportedForSublayers: function(layerInfo){
      var defRet = new Deferred();
      var layerTypeDefs = [];

      layerInfo.traversal(function(layerInfo) {
        layerTypeDefs.push(layerInfo.getLayerType());
      });

      while(layerInfo) {
        layerTypeDefs.push(layerInfo.getLayerType());
        layerInfo = layerInfo.parentLayerInfo;
      }

      all(layerTypeDefs).then(lang.hitch(this, function(layerTypes){
        // show all layers if do not init showLayerTypes.
        if(!this.showLayerTypes || this.showLayerTypes.length === 0) {
          defRet.resolve(true);
          return;
        }
        for(var i = 0; i < layerTypes.length; i++) {
          for(var j = 0; j < this.showLayerTypes.length; j++) {
            if(layerTypes[i] === this.showLayerTypes[j]) {
              defRet.resolve(true);
              return;
            }
          }
        }
        defRet.resolve(false);
      }));
      return defRet;
    },

    _isLayerTypeSupportedForParentsLayers: function(layerInfo) {
      var defRet = new Deferred();
      var layerTypeDefs = [];
      while(!layerInfo) {
        layerTypeDefs.push(layerInfo.getLayerType());
        layerInfo = layerInfo.parentLayerInfo;
      }
      all(layerTypeDefs).then(lang.hitch(this, function(layerTypes) {
        for(var i = 0; i < layerTypes.length; i++) {
          for(var j = 0; j < this.showLayerTypes.length; j++) {
            if(layerTypes[i] === this.showLayerTypes[j]) {
              defRet.resolve(true);
            }
          }
        }
        defRet.resolve(false);
      }));
      return defRet;
    },

    _isGeoTypeSupported: function(layerInfo, layerType) {
      var layerObject = layerInfo.layerObject;
      if(layerType === 'FeatureLayer' && this.geometryTypes.length > 0){
        //geoType = jimuUtils.getTypeByGeometryType(layerObject.geometryType);
        return (array.indexOf(this.geometryTypes, layerObject.geometryType) >= 0);
      } else {
        return true;
      }
    },

    _validateBeforeAddItem: function(layerInfo){
      /*jshint unused: false*/
      var defRet = new Deferred();
      // var layerObject = layerInfo.layerObject;
      // layerInfo.getLayerType().then(lang.hitch(this, function(layerType) {
      //   if(layerType === 'FeatureLayer' && this.geometryTypes.length > 0){
      //     //geoType = jimuUtils.getTypeByGeometryType(layerObject.geometryType);
      //     defRet.resolve(array.indexOf(this.geometryTypes,
      //                                  layerObject.geometryType) >= 0);
      //   } else {
      //     defRet.resolve(true);
      //   }
      // }), function() {
      //   // return true if can not get layer type.
      //   defRet.resolve(true);
      // });
      defRet.resolve(true);
      return defRet;
    },

    _mayHaveChildren: function(item){
      if(item.type === 'root') {
        return true;
      } else if(item.layerInfo && item.layerInfo.getSubLayers().length > 0){
        return true;
      } else {
        return false;
      }
    },

    // _addDirectLayerInfo: function(layerInfo){
    //   if(!layerInfo){
    //     return;
    //   }
    //   var layerObjectDef = layerInfo.getLayerObject();
    //   var isLayerTypeSupportedDef = this._isLayerTypeSupportedForSublayers(layerInfo);
    //   all({
    //     layerObject: layerObjectDef,
    //     isLayerTypeSupported: isLayerTypeSupportedDef
    //   }).then(lang.hitch(this, function(result){
    //     if(result.isLayerTypeSupported){
    //       this._addItem('root', layerInfo);
    //     }
    //   }),lang.hitch(this, function(err){
    //     console.error(err);
    //   }));
    // },


    _addItem: function(parentId, layerInfo){
      var item = null;
      var layerTypeDef = layerInfo.getLayerType();
      //var isLayerTypeSupportedDef = this._isLayerTypeSupportedForParentsLayers(layerInfo);
      var isLayerTypeSupportedDef = this._isLayerTypeSupportedForSublayers(layerInfo);
      var validDef = this._validateBeforeAddItem(layerInfo);
      all({
        layerType: layerTypeDef,
        isLayerTypeSupported: isLayerTypeSupportedDef,
        valid: validDef
      }).then(lang.hitch(this, function(result){
        if( result.isLayerTypeSupported &&
            result.valid &&
            this._isGeoTypeSupported(layerInfo, result.layerType)){
          this._id++;
          item = {
            name: layerInfo.title,
            parent: parentId,
            layerInfo: layerInfo,
            type: result.layerType,
            layerClass: layerInfo.layerObject.declaredClass,
            id: this._id.toString()
          };
          this._store.add(item);
        }
        
      }));
      return item;
    },

    _createTree:function(){
      var rootItem = this._getRootItem();
      var myMemory = new Memory({
        data: [rootItem],
        getChildren: function(object){
          return this.query({parent: object.id});
        }
      });

      // Wrap the store in Observable so that updates to the store are reflected to the Tree
      this._store = new Observable(myMemory);

      var myModel = new ObjectStoreModel({
        store: this._store,
        query: { id: "root" },
        mayHaveChildren: lang.hitch(this, this._mayHaveChildren)
      });

      this.tree = new _Tree({
        multiple: this.multiple,
        model: myModel,
        showRoot: false,
        leafType: this._leafType,
        style:{
          width: "100%"
        },
        onOpen: lang.hitch(this, function(item, node){
          if(item.id === 'root'){
            return;
          }
          this._onTreeOpen(item, node);
        }),
        onClick: lang.hitch(this, function(item, node, evt){
          this._onTreeClick(item, node, evt);
          this.emit('tree-click', item, node, evt);
        }),
        getIconStyle:lang.hitch(this,function(item, opened){
          var icon = null;
          if (!item || item.id === 'root') {
            return null;
          }
          var a = {
            width: "20px",
            height: "20px",
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center center',
            backgroundImage: ''
          };
          var baseUrl = window.location.protocol + "//" +
           window.location.host + require.toUrl("jimu");
          var imageName = this._getIconImageName(item, opened);
          if(imageName){
            a.backgroundImage = "url("+baseUrl+"/css/images/" + imageName + ")";
            icon = a;
          }
          return icon;
        })
      });
      html.addClass(this.tree.domNode, this._treeClass);
      this.tree.placeAt(this.shelter.domNode, 'before');
    },

    _getIconImageName: function(item, opened) {
      var imageName = '';

      if(item.type === 'ArcGISDynamicMapServiceLayer' ||
                item.type === 'ArcGISTiledMapServiceLayer'){
        if (opened) {
          imageName = 'mapserver_open.png';
        } else {
          imageName = 'mapserver_close.png';
        }
      } else if(item.type === 'GroupLayer'){
        if(opened){
          imageName = 'group_layer2.png';
        }
        else{
          imageName = 'group_layer1.png';
        }
      }else if(item.type === 'FeatureLayer'){
        var geoType = jimuUtils.getTypeByGeometryType(item.layerInfo.layerObject.geometryType);
        if(geoType === 'point'){
          imageName = 'point_layer1.png';
        }
        else if(geoType === 'polyline'){
          imageName = 'line_layer1.png';
        }
        else if(geoType === 'polygon'){
          imageName = 'polygon_layer1.png';
        }
      } else {
        if (opened) {
          imageName = 'mapserver_open.png';
        } else {
          imageName = 'mapserver_close.png';
        }
      }
      return imageName;
    },

    _onTreeOpen: function(item, node){/*jshint unused: false*/
      var layerInfo = item.layerInfo;
      var subLayerInfos = [];
      var defs = [];
      subLayerInfos = layerInfo.getSubLayers();
      if(item.checked){
        return;
      }
      this.shelter.show();
      defs = array.map(subLayerInfos, lang.hitch(this, function(subLayerInfo){
        return subLayerInfo.getLayerObject();
      }));


      all(defs).then(lang.hitch(this, function(){
        if(!this.domNode){
          return;
        }
        array.forEach(subLayerInfos, lang.hitch(this, function(subLayerInfo){
          this._addItem(item.id, subLayerInfo);
        }));
        item.checked = true;
        this.shelter.hide();
      }),lang.hitch(this, function(err){
        console.error(err);
        this.shelter.hide();
        if(!this.domNode){
          return;
        }
      }));
    }

  });

  return LayerChooserFromMap;
});