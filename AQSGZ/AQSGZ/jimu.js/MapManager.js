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
  'dojo/_base/lang',
  'dojo/_base/array',
  'dojo/_base/html',
  'dojo/topic',
  'dojo/on',
  'dojo/aspect',
  'dojo/keys',
  'esri/dijit/InfoWindow',
  "esri/dijit/PopupMobile",
  'esri/InfoTemplate',
  'esri/request',
  'esri/geometry/Extent',
  'esri/geometry/Point',
  'require',
  './utils',
  './dijit/LoadingShelter'
], function(declare, lang, array, html, topic, on, aspect, keys, InfoWindow,
  PopupMobile, InfoTemplate, esriRequest, Extent, Point, require,
  jimuUtils, LoadingShelter) {
  /* global jimuConfig */
  var instance = null,
    clazz = declare(null, {
      appConfig: null,
      mapDivId: '',
      map: null,
      previousInfoWindow: null,
      mobileInfoWindow: null,
      isMobileInfoWindow: false,

      constructor: function( /*Object*/ appConfig, mapDivId) {
        this.appConfig = appConfig;
        this.mapDivId = mapDivId;
        this.id = mapDivId;
        topic.subscribe("appConfigChanged", lang.hitch(this, this.onAppConfigChanged));
        topic.subscribe("changeMapPosition", lang.hitch(this, this.onChangeMapPosition));
        topic.subscribe("syncExtent", lang.hitch(this, this.onSyncExtent));

        on(window, 'resize', lang.hitch(this, this.onWindowResize));
      },

      showMap: function() {
        // console.timeEnd('before map');
        this._showMap(this.appConfig);
      },

      _showMap: function(appConfig) {
        // console.timeEnd('before map');
        console.time('Load Map');
        this.loading = new LoadingShelter();
        this.loading.placeAt(this.mapDivId);
        this.loading.startup();
        //for now, we can't create both 2d and 3d map
        if (appConfig.map['3D']) {
          if (appConfig.map.itemId) {
            this._show3DWebScene(appConfig);
          } else {
            this._show3DLayersMap(appConfig);
          }
        } else {
          if (appConfig.map.itemId) {
            this._show2DWebMap(appConfig);
          } else {
            console.log('No webmap found. Please set map.itemId in config.json.');
          }
        }
      },

      onWindowResize: function() {
        if (this.map && this.map.resize) {
          this.map.resize();
          this.resetInfoWindow(false);
        }
      },

      getMapInfoWindow: function(){
        return {
          mobile: this._mapMobileInfoWindow,
          bigScreen: this._mapInfoWindow
        };
      },

      resetInfoWindow: function(isNewMap) {
        if(isNewMap){
          this._mapInfoWindow = this.map.infoWindow;
          if(this._mapMobileInfoWindow){
            this._mapMobileInfoWindow.destroy();
          }
          this._mapMobileInfoWindow =
          new PopupMobile(null, html.create("div", null, null, this.map.root));
          this.isMobileInfoWindow = false;
        }
        var width = jimuConfig.widthBreaks[0];
        if (html.getContentBox(jimuConfig.layoutId).w < width && !this.isMobileInfoWindow) {
          this.map.infoWindow.hide();
          this.map.setInfoWindow(this._mapMobileInfoWindow);
          this.isMobileInfoWindow = true;
        } else if (html.getContentBox(jimuConfig.layoutId).w >= width &&
            this.isMobileInfoWindow) {
          this.map.infoWindow.hide();
          this.map.setInfoWindow(this._mapInfoWindow);
          this.isMobileInfoWindow = false;
        }
      },

      onChangeMapPosition: function(position) {
        var mapStyle = html.getComputedStyle(html.byId(this.map.id));
        var oldPosStyle = {
          top: mapStyle.top,
          bottom: mapStyle.bottom
        };
        if(window.isRTL){
          oldPosStyle.left = mapStyle.right;
          oldPosStyle.right = mapStyle.left;
        }else{
          oldPosStyle.left = mapStyle.left;
          oldPosStyle.right = mapStyle.right;
        }
        var pos = lang.mixin(oldPosStyle, position);
        var posStyle = jimuUtils.getPositionStyle(pos);
        html.setStyle(this.mapDivId, posStyle);
        if (this.map && this.map.resize) {
          this.map.resize();
        }
      },

      onSyncExtent: function(map){
        if(this.map){
          var extJson = map.extent;
          var ext = new Extent(extJson);
          this.map.setExtent(ext);
        }
      },

      _visitConfigMapLayers: function(appConfig, cb) {
        array.forEach(appConfig.map.basemaps, function(layerConfig, i) {
          layerConfig.isOperationalLayer = false;
          cb(layerConfig, i);
        }, this);

        array.forEach(appConfig.map.operationallayers, function(layerConfig, i) {
          layerConfig.isOperationalLayer = true;
          cb(layerConfig, i);
        }, this);
      },

      _show3DLayersMap: function(appConfig) {
        require(['esri3d/Map'], lang.hitch(this, function(Map) {
          var initCamera = appConfig.map.mapOptions.camera,
            map;
          map = new Map(this.mapDivId, {
            camera: initCamera
          });
          this._visitConfigMapLayers(appConfig, lang.hitch(this, function(layerConfig) {
            this.createLayer(map, '3D', layerConfig);
          }));
          map.usePlugin = Map.usePlugin;
          this._publishMapEvent(map);
        }));
      },

      _show3DWebScene: function(appConfig) {
        this._getWebsceneData(appConfig.map.itemId).then(lang.hitch(this, function(data) {
          require(['esri3d/Map'], lang.hitch(this, function(Map) {
            var map = new Map(this.mapDivId, appConfig.map.mapOptions);

            array.forEach(data.itemData.operationalLayers, function(layerConfig) {
              this.createLayer(map, '3D', layerConfig);
            }, this);

            array.forEach(data.itemData.baseMap.baseMapLayers, function(layerConfig) {
              layerConfig.type = "tile";
              this.createLayer(map, '3D', layerConfig);
            }, this);

            array.forEach(data.itemData.baseMap.elevationLayers, function(layerConfig) {
              layerConfig.type = "elevation";
              this.createLayer(map, '3D', layerConfig);
            }, this);

            map.toc = data.itemData.toc;
            map.bookmarks = data.itemData.bookmarks;
            map.tours = data.itemData.tours;
          }));
        }));
      },

      _publishMapEvent: function(map) {
        //add this property for debug purpose
        window._viewerMap = map;
        if (this.loading) {
          this.loading.destroy();
        }

        console.timeEnd('Load Map');
        if (this.map) {
          this.map = map;
          this.resetInfoWindow(true);
          console.log('map changed.');
          topic.publish('mapChanged', this.map);
        } else {
          this.map = map;
          this.resetInfoWindow(true);
          topic.publish('mapLoaded', this.map);
        }
      },

      _getWebsceneData: function(itemId) {
        return esriRequest({
          url: 'http://184.169.133.166/sharing/rest/content/items/' + itemId + '/data',
          handleAs: "json"
        });
      },

      _show2DWebMap: function(appConfig) {
        //should use appConfig instead of this.appConfig, because appConfig is new.
        // if (appConfig.portalUrl) {
        //   var url = portalUrlUtils.getStandardPortalUrl(appConfig.portalUrl);
        //   agolUtils.arcgisUrl = url + "/sharing/content/items/";
        // }
        if(!appConfig.map.mapOptions){
          appConfig.map.mapOptions = {};
        }
        var mapOptions = this._processMapOptions(appConfig.map.mapOptions);

        var webMapPortalUrl = appConfig.map.portalUrl;
        var webMapItemId = appConfig.map.itemId;
        var webMapOptions = {
          mapOptions: mapOptions,
          bingMapsKey: appConfig.bingMapsKey,
          usePopupManager: true
        };

        var mapDeferred = jimuUtils.createWebMap(webMapPortalUrl, webMapItemId,
          this.mapDivId, webMapOptions);

        mapDeferred.then(lang.hitch(this, function(response) {
          var map = response.map;
          // set default size of infoWindow.
          map.infoWindow.resize(270, 316);
          //var extent;
          map.itemId = appConfig.map.itemId;
          map.itemInfo = response.itemInfo;
          map.webMapResponse = response;
          // enable snapping
          var options = {
            snapKey: keys.copyKey
          };
          map.enableSnapping(options);

          this._publishMapEvent(map);
        }), lang.hitch(this, function() {
          if (this.loading) {
            this.loading.destroy();
          }
          topic.publish('mapCreatedFailed');
        }));
      },

      _processMapOptions: function(mapOptions) {
        if (!mapOptions) {
          return;
        }

        if(!mapOptions.lods){
          delete mapOptions.lods;
        }
        if(mapOptions.lods && mapOptions.lods.length === 0){
          delete mapOptions.lods;
        }

        var ret = lang.clone(mapOptions);
        if (ret.extent) {
          ret.extent = new Extent(ret.extent);
        }
        if (ret.center && !lang.isArrayLike(ret.center)) {
          ret.center = new Point(ret.center);
        }
        if (ret.infoWindow) {
          ret.infoWindow = new InfoWindow(ret.infoWindow, html.create('div', {}, this.mapDivId));
        }

        return ret;
      },

      createLayer: function(map, maptype, layerConfig) {
        var layMap = {
          '2D_tiled': 'esri/layers/ArcGISTiledMapServiceLayer',
          '2D_dynamic': 'esri/layers/ArcGISDynamicMapServiceLayer',
          '2D_image': 'esri/layers/ArcGISImageServiceLayer',
          '2D_feature': 'esri/layers/FeatureLayer',
          '2D_rss': 'esri/layers/GeoRSSLayer',
          '2D_kml': 'esri/layers/KMLLayer',
          '2D_webTiled': 'esri/layers/WebTiledLayer',
          '2D_wms': 'esri/layers/WMSLayer',
          '2D_wmts': 'esri/layers/WMTSLayer',
          '3D_tiled': 'esri3d/layers/ArcGISTiledMapServiceLayer',
          '3D_dynamic': 'esri3d/layers/ArcGISDynamicMapServiceLayer',
          '3D_image': 'esri3d/layers/ArcGISImageServiceLayer',
          '3D_feature': 'esri3d/layers/FeatureLayer',
          '3D_elevation': 'esri3d/layers/ArcGISElevationServiceLayer',
          '3D_3dmodle': 'esri3d/layers/SceneLayer'
        };

        require([layMap[maptype + '_' + layerConfig.type]], lang.hitch(this, function(layerClass) {
          var layer, infoTemplate, options = {},
            keyProperties = ['label', 'url', 'type', 'icon', 'infoTemplate', 'isOperationalLayer'];
          for (var p in layerConfig) {
            if (keyProperties.indexOf(p) < 0) {
              options[p] = layerConfig[p];
            }
          }
          if (layerConfig.infoTemplate) {
            infoTemplate = new InfoTemplate(layerConfig.infoTemplate.title,
              layerConfig.infoTemplate.content);
            options.infoTemplate = infoTemplate;

            layer = new layerClass(layerConfig.url, options);

            if (layerConfig.infoTemplate.width && layerConfig.infoTemplate.height) {
              aspect.after(layer, 'onClick', lang.hitch(this, function() {
                map.infoWindow.resize(layerConfig.infoTemplate.width,
                  layerConfig.infoTemplate.height);
              }), true);
            }
          } else {
            layer = new layerClass(layerConfig.url, options);
          }

          layer.isOperationalLayer = layerConfig.isOperationalLayer;
          layer.label = layerConfig.label;
          layer.icon = layerConfig.icon;
          map.addLayer(layer);
        }));
      },

      onAppConfigChanged: function(appConfig, reason, changedJson) {
        // jshint unused:false
        this.appConfig = appConfig;
        if(reason === 'mapChange'){
          this._recreateMap(appConfig);
        }
        else if(reason === 'mapOptionsChange'){
          if(changedJson.lods){
            this._recreateMap(appConfig);
          }
        }
      },

      _recreateMap: function(appConfig){
        if(this.map){
          topic.publish('beforeMapDestory', this.map);
          this.map.destroy();
        }
        this._showMap(appConfig);
      },

      disableWebMapPopup: function() {
        this.map.setInfoWindowOnClick(false);
      },

      enableWebMapPopup: function() {
        this.map.setInfoWindowOnClick(true);
      }

    });

  clazz.getInstance = function(appConfig, mapDivId) {
    if (instance === null) {
      instance = new clazz(appConfig, mapDivId);
    }
    return instance;
  };

  return clazz;
});