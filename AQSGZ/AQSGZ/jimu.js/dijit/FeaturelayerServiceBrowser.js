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
  './_BasicServiceBrowser',
  'dojo/_base/lang',
  'dojo/_base/array',
  'dojo/Deferred',
  'dojo/promise/all',
  'jimu/utils'
],
function(declare, _BasicServiceBrowser, lang, array, Deferred, all, jimuUtils) {
  return declare([_BasicServiceBrowser], {
    baseClass: 'jimu-featurelayer-service-browser',
    declaredClass: 'jimu.dijit.FeaturelayerServiceBrowser',
    
    _leafType: 'layer',
    _serviceTypes: ['MapServer','FeatureServer'],

    //options:
    url: '',
    multiple: false,
    types: null,//available values:point,polyline,polygon

    //public methods:
    //setUrl
    //getSelectedItems return [{name,url,definition}]

    //test url:
    //base url: http://sampleserver1.arcgisonline.com/ArcGIS/rest/services
    //folder url:  http://sampleserver1.arcgisonline.com/ArcGIS/rest/services/Demographics
    //service url: http://tryitlive.arcgis.com/arcgis/rest/services/GeneralPurpose/MapServer
    //group layer url: http://tryitlive.arcgis.com/arcgis/rest/services/GeneralPurpose/MapServer/0
    //group layer url: http://tryitlive.arcgis.com/arcgis/rest/services/GeneralPurpose/MapServer/1
    //layer url: http://tryitlive.arcgis.com/arcgis/rest/services/GeneralPurpose/MapServer/2

    postMixInProperties:function(){
      this.inherited(arguments);
      this._initTypes();
    },

    getSelectedItems: function(){
      var items = this.inherited(arguments);
      items = array.map(items, lang.hitch(this, function(item){
        return {
          name: item.name,
          url: item.url,
          definition: item.definition
        };
      }));
      return items;
    },

    _initTypes: function(){
      var allTypes = ['point','polyline','polygon'];
      if(this.types && this.types.length > 0){
        this.types = array.filter(this.types,lang.hitch(this,function(type){
          return allTypes.indexOf(type) >= 0;
        }));
        if(this.types.length === 0){
          this.types = allTypes;
        }
      }
      else{
        this.types = allTypes;
      }
    },

    _validateEsriGeometryType:function(esriType){
      var type = jimuUtils.getTypeByGeometryType(esriType);
      return this.types.indexOf(type) >= 0;
    },

    //override, must return a deffered
    _searchServiceUrlCallback: function(serviceUrl, serviceItem, serviceMeta){
      //http://resources.arcgis.com/en/help/arcgis-rest-api/#/Map_Service/02r3000000w2000000/
      //currentVersion of MapService is added from 10.0 SP1
      //tables of MapService is added from 10.0
      var resultDef = new Deferred();

      var directLayers = array.filter(serviceMeta.layers, lang.hitch(this, function(layer){
        var a = layer.parentLayerId >= 0;
        return !a;
      }));

      if(directLayers.length > 0){
        var isMapServer = serviceUrl.toLowerCase().indexOf("/mapserver") >= 0;
        var currentVersion = 0;
        if(serviceMeta.currentVersion){
          currentVersion = parseFloat(serviceMeta.currentVersion);
        }

        //only MapService of more than 10 supports 'layers' operation
        var supportAllLayers = isMapServer &&
                               (currentVersion >=10 || serviceMeta.hasOwnProperty('tables'));

        if(supportAllLayers){
          resultDef = this._searchServiceUrlGreaterEqual10(serviceUrl,
                                                           serviceItem,
                                                           serviceMeta,
                                                           directLayers);
        }
        else{
          resultDef = this._searchServiceUrlLessThan10(serviceUrl,
                                                       serviceItem,
                                                       serviceMeta,
                                                       directLayers);
        }
      }
      else{
        setTimeout(lang.hitch(this, function(){
          resultDef.resolve();
        }), 0);
      }

      return resultDef;
    },

    //must return a deffered
    _searchServiceUrlLessThan10: function(serviceUrl, serviceItem, serviceMeta, directLayers){
      /*jshint unused: false*/
      var resultDef = new Deferred();

      var defs = array.map(directLayers, lang.hitch(this, function(layer) {
        var def = new Deferred();
        var type = layer.subLayerIds ? 'group' : 'layer';
        var layerUrl = serviceItem.url + '/' + layer.id;
        if (type === 'group') {
          var itemGroupLayer = {
            name: layer.name,
            type: type,
            url: layerUrl,
            parent: serviceItem.id
          };
          itemGroupLayer.layerId = layer.id;
          itemGroupLayer.subLayerIds = layer.subLayerIds;
          itemGroupLayer.parentLayerId = layer.parentLayerId;
          this._addItem(itemGroupLayer);
          setTimeout(lang.hitch(this, function() {
            def.resolve();
          }), 0);
        } else {
          def = this._searchLayerUrl(layerUrl, serviceItem, false);
        }
        return def;
      }));
      all(defs).then(lang.hitch(this, function() {
        resultDef.resolve();
      }), lang.hitch(this, function() {
        resultDef.reject();
      }));

      return resultDef;
    },

    //must return a deffered
    _searchServiceUrlGreaterEqual10: function(serviceUrl, serviceItem, serviceMeta, directLayers){
      /*jshint unused: false*/
      var resultDef = new Deferred();

      var urlAllLayers = serviceUrl + '/layers';
      this._getRestInfo(urlAllLayers).then(lang.hitch(this, function(response){
        //{layers,tables}
        serviceItem.allLayerDefinitions = response.layers;
        var allLayerDefinitions = response.layers;
        if(allLayerDefinitions && allLayerDefinitions.length > 0){
          var defs = array.map(directLayers, lang.hitch(this, function(briefLyrMeta){
            var def = new Deferred();

            var type = briefLyrMeta.subLayerIds ? 'group' : 'layer';
            var layerId = briefLyrMeta.id;
            var definition = allLayerDefinitions[layerId];
            var layerUrl = serviceUrl + '/' + layerId;

            if(type === 'group'){
              var itemGroupLayer = {
                name: briefLyrMeta.name,
                type: type,
                url: layerUrl,
                parent: serviceItem.id
              };
              itemGroupLayer.layerId = layerId;
              itemGroupLayer.subLayerIds = briefLyrMeta.subLayerIds;
              itemGroupLayer.parentLayerId = briefLyrMeta.parentLayerId;
              itemGroupLayer.definition = definition;
              itemGroupLayer.allLayerDefinitions = allLayerDefinitions;

              this._addItem(itemGroupLayer);
              setTimeout(lang.hitch(this, function() {
                def.resolve();
              }), 0);
            }
            else{
              def = this._searchLayerUrl(layerUrl, serviceItem, false, definition);
            }

            return def;
          }));
          all(defs).then(lang.hitch(this, function(){
            resultDef.resolve();
          }), lang.hitch(this, function(){
            resultDef.reject();
          }));
        }
        else{
          resultDef.resolve();
        }
      }), lang.hitch(this, function(){
        resultDef.reject();
      }));

      return resultDef;
    },

    //override
    _searchChildResource: function(url, parent){
      return this._searchLayerUrl(url, parent, true);
    },

    _getServiceUrlByLayerUrl: function(layerUrl){
      var serviceUrl = '';
      for(var i = 0; i < this._serviceTypes.length; i++){
        var serviceType = this._serviceTypes[i].toLowerCase();
        var lastIndex = layerUrl.toLowerCase().lastIndexOf('/'+serviceType+'/');
        if(lastIndex >= 0){
          serviceUrl = layerUrl.slice(0, lastIndex + serviceType.length + 1);
          return serviceUrl;
        }
      }
      return serviceUrl;
    },

    _searchLayerUrl:function(layerUrl, parent, /* optional */ showError, /* optional */ definition){
      //group layer url: http://tryitlive.arcgis.com/arcgis/rest/services/GeneralPurpose/MapServer/1
      //layer url: http://tryitlive.arcgis.com/arcgis/rest/services/GeneralPurpose/MapServer/2
      //10.0 service: http://sampleserver3.arcgisonline.com/ArcGIS/rest/services/SanFrancisco/...
      //group layer: http://tryitlive.arcgis.com/arcgis/rest/services/GeneralPurpose/MapServer/0
      var resultDef = new Deferred();

      var layerCallback = lang.hitch(this, function(definition){
        if(!this.domNode){
          return;
        }
        this.shelter.hide();
        
        var type = definition.type === 'Group Layer' ? 'group' : 'layer';

        if(type === 'layer'){
          if(definition.type !== 'Feature Layer'){
            resultDef.resolve();
            return;
          }
          var isGeoTypeValid = this._validateEsriGeometryType(definition.geometryType);
          if(!isGeoTypeValid){
            resultDef.resolve();
            return;
          }
        }
        definition.url = layerUrl;
        var itemLayerOrGroup = {
          name: definition.name,
          type: type,
          url: layerUrl,
          parent: parent.id,
          definition: definition
        };
        itemLayerOrGroup.layerId = definition.id;
        itemLayerOrGroup.allLayerDefinitions = parent.allLayerDefinitions;
        if(definition.subLayers){
          itemLayerOrGroup.subLayerIds = array.map(definition.subLayers,
            lang.hitch(this,function(subLayer){
            return subLayer.id;
          }));
        }
        //definition.parentLayer : null or {id: 0, name: "Campus"}
        if(definition.parentLayer){
          itemLayerOrGroup.parentLayerId = definition.parentLayer.id;
        }
        else{
          itemLayerOrGroup.parentLayerId = -1;
        }
        this._addItem(itemLayerOrGroup);
        resultDef.resolve();
      });

      var serviceUrl = this._getServiceUrlByLayerUrl(layerUrl);
      this.shelter.show();
      this._getRestInfo(serviceUrl).then(lang.hitch(this, function(serviceMeta){
        if(!this.domNode){
          return;
        }
        var supportQuery = false;
        var isFeatureService = (/\/featureserver\//gi).test(layerUrl);
        var isMapService = (/\/mapserver\//gi).test(layerUrl);
        var capabilities = serviceMeta.capabilities||'';
        capabilities = capabilities.toLowerCase();

        if(isFeatureService){
          supportQuery = capabilities.indexOf('query') >= 0;
        }
        else if(isMapService){
          supportQuery = capabilities.indexOf('data') >= 0;
        }

        if(supportQuery){
          if(definition){
            setTimeout(lang.hitch(this, function() {
              layerCallback(definition);
            }), 0);
          }else{
            this._getRestInfo(layerUrl).then(layerCallback, lang.hitch(this, function(err) {
              console.error(err);
              if (!this.domNode) {
                return;
              }
              this.shelter.hide();
              if (showError) {
                var errObj = {
                  errorCode: 'NETWORK_ERROR',
                  error: err
                };
                resultDef.reject(errObj);
              } else {
                resultDef.reject(err);
              }
            }));
          }
        }
        else{
          this.shelter.hide();
          resultDef.resolve();
        }
      }), lang.hitch(this, function(err){
        console.error(err);
        if (!this.domNode) {
          return;
        }
        this.shelter.hide();
        if(showError){
          var errObj = {
            errorCode: 'NETWORK_ERROR',
            error: err
          };
          resultDef.reject(errObj);
        }
        else{
          resultDef.reject(err);
        }
      }));

      return resultDef;
    },

    //override
    _mayHaveChildren: function(item){
      if (item.type === 'group') {
        return item.subLayerIds && item.subLayerIds.length > 0;
      } else {
        return item.type !== 'layer';
      }
    },

    //override
    _getIconImageName: function(item, opened){
      var imageName = '';
      if (this._isServiceTypeSupported(item.type)) {
        if(opened){
          imageName = 'mapserver_open.png';
        }
        else{
          imageName = 'mapserver_close.png';
        }
      } else if (item.type === 'group') {
        if(opened){
          imageName = 'group_layer2.png';
        }
        else{
          imageName = 'group_layer1.png';
        }
      } else if (item.type === 'layer') {
        var esriType = item.definition && item.definition.geometryType;
        var geoType = jimuUtils.getTypeByGeometryType(esriType);
        if (geoType === 'point') {
          imageName = 'point_layer1.png';
        } else if (geoType === 'polyline') {
          imageName = 'line_layer1.png';
        } else if (geoType === 'polygon') {
          imageName = 'polygon_layer1.png';
        }
      }
      else if(item.type === 'root'){
        if(this._currentUrl){
          var isMapFeatureServer = array.some(this._serviceTypes,
            lang.hitch(this, function(serviceType){
            return this._isStringEndWith(this._currentUrl, '/' + serviceType);
          }));

          if(isMapFeatureServer){
            if(opened){
              imageName = 'mapserver_open.png';
            }
            else{
              imageName = 'mapserver_close.png';
            }
          }
        }
      }

      return imageName;
    },

    //override
    _onTreeOpen:function(item, node){
      var allLayerDefinitions = item.allLayerDefinitions;//may be null
      var children = this._store.query({parent:item.id});
      if(children.length > 0){
        return;
      }
      if(node.item.checking || node.item.checked){
        return;
      }
      if(this._isServiceTypeSupported(item.type)){//type:MapServer,FeatureServer
        //url:http://tryitlive.arcgis.com/arcgis/rest/services/GeneralPurpose/MapServer
        item.checking = true;

        var serviceUrl = item.url.replace(/\/*$/g, '');

        var def = this._getRestInfo(serviceUrl);
        def.then(lang.hitch(this, function(serviceMeta){
          item.checking = false;
          item.checked = true;
          if(!this.domNode){
            return;
          }
          var serviceItem = item;
          serviceMeta.url = serviceUrl;
          this._searchServiceUrlCallback(serviceUrl, serviceItem, serviceMeta);
        }),lang.hitch(this,function(error){
          console.error(error);
          item.checking = false;
          item.checked = true;
        }));
      }
      else if(item.type === 'group'){
        var subLayerIds = item.subLayerIds;
        var valid = subLayerIds && subLayerIds.length > 0;
        if(!valid){
          return;
        }
        item.checking = true;
        var defs = array.map(subLayerIds, lang.hitch(this, function(layerId) {
          layerId = parseInt(layerId, 10);
          var count = 1 + item.layerId.toString().length;
          var serviceUrl = item.url.slice(0,item.url.length-count);
          var layerUrl = serviceUrl + '/' + layerId;
          var definition = null;
          if(allLayerDefinitions){
            definition = allLayerDefinitions[layerId];
          }
          return this._searchLayerUrl(layerUrl, item, false, definition);
        }));
        all(defs).then(lang.hitch(this,function(){
          item.checking = false;
          item.checked = true;
        }),lang.hitch(this,function(err){
          item.checking = false;
          item.checked = true;
          console.error(err);
        }));
      }
    }

  });
});