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
    'dijit/_WidgetsInTemplateMixin',
    "dojo/Deferred",
    'jimu/BaseWidget',
    'jimu/portalUtils',
    'jimu/PanelManager',
    "jimu/SpatialReference/wkidUtils",
    'jimu/portalUrlUtils',
    'jimu/utils',
    "esri/dijit/Basemap",
    "esri/dijit/BasemapLayer",
    'esri/dijit/BasemapGallery',
    'dojo/_base/lang',
    'dojo/_base/array',
    "dojo/_base/html",
    "dojo/query",
    'dojo/on',
    'dojo/promise/all',
    './utils'
  ],
  function(
    declare,
    _WidgetsInTemplateMixin,
    Deferred,
    BaseWidget,
    portalUtils,
    PanelManager,
    SRUtils,
    portalUrlUtils,
    jimuUtils,
    Basemap,
    BasemapLayer,
    BasemapGallery,
    lang,
    array,
    html,
    query,
    on,
    all,
    utils) {
    var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {

      name: 'BasemapGallery',
      baseClass: 'jimu-widget-basemapgallery',
      basemapGallery: null,
      spatialRef: null,

      startup: function() {
        /*jshint unused: false*/
        this.inherited(arguments);
        this.initBasemaps();
      },

      resize: function() {
        this._responsive();
      },

      _responsive: function() {
        // the default width of esriBasemapGalleryNode is 85px,
        // margin-left is 10px, margin-right is 10px;
        var paneNode = query('#' + this.id)[0];
        var width = html.getStyle(paneNode, 'width');
        var column      = parseInt(width / 105, 10);
        if (column > 0) {
          var margin      = width % 105;
          var addWidth    = parseInt(margin / column, 10);
          query('.esriBasemapGalleryNode', this.id).forEach(function(node) {
            html.setStyle(node, 'width', 85 + addWidth + 'px');
          });
        }
      },

      initBasemaps: function() {
        var basemapsDef;
        var portalSelfDef;
        var config = lang.clone(this.config.basemapGallery);

        //load form portal or config file.
        if (!config.basemaps || config.basemaps.length === 0) {
          basemapsDef = utils._loadPortalBaseMaps(this.appConfig.portalUrl,
                                                  this.map.spatialReference);
        } else {
          basemapsDef = new Deferred();
          basemapsDef.resolve(config.basemaps);
        }

        var portal = portalUtils.getPortal(this.appConfig.portalUrl);
        portalSelfDef = portal.loadSelfInfo();
        all({
          'portalSelf': portalSelfDef,
          'basemaps': basemapsDef
        }).then(lang.hitch(this, function(result) {
          var basemaps = result.basemaps;
          var basemapObjs = [];
          var i = 0;
          var webmapBasemap = this._getWebmapBasemap();

          basemaps = array.filter(basemaps, function(basemap) {
            if(!basemap || !basemap.title) {
              return false;
            }
            var bingKeyResult;
            var spatialReferenceResult;
            // first, filter bingMaps
            if(result.portalSelf.bingKey) {
              // has bingKey, can add any bing map or not;
              bingKeyResult = true;
            } else if(!utils.isBingMap(basemap)) {
              // do not have bingKey and basemap is not bingMap.
              bingKeyResult = true;
            } else {
              // do not show basemap if do not has bingKey as well as basemap is bingMap.
              bingKeyResult = false;
            }

            // second, filter spatialReference.
            // only show basemaps who has same spatialReference with current map.
            if (SRUtils.isSameSR(this.map.spatialReference.wkid,
                                  basemap.spatialReference.wkid)) {
              spatialReferenceResult = true;
            } else {
              spatialReferenceResult = false;
            }

            // basemap does not have title means basemap load failed.
            return basemap.title && bingKeyResult && spatialReferenceResult;
          }, this);

          // if basemap of current webmap is not include, so add it.
          for(i = 0; i < basemaps.length; i++) {
            if (utils.compareSameBasemapByOrder(basemaps[i], webmapBasemap)) {
              break;
            }
          }
          if(i === basemaps.length) {
            basemaps.push(webmapBasemap);
          }
          
        
          for (i = 0; i < basemaps.length; i++) {
            var n = basemaps[i].layers.length;
            var layersArray = [];
            for (var j = 0; j < n; j++) {
              layersArray.push(new BasemapLayer(basemaps[i].layers[j]));
            }
            basemaps[i].layers = layersArray;
            if (!basemaps[i].thumbnailUrl) {
              basemaps[i].thumbnailUrl = this.folderUrl + "images/default.jpg";
            } else {
              if (basemaps[i].thumbnailUrl.indexOf('//') === 0) {
                basemaps[i].thumbnailUrl = basemaps[i].thumbnailUrl +
                                           utils.getToken(this.appConfig.portalUrl);
              } else {
                basemaps[i].thumbnailUrl =
                  jimuUtils.processUrlInWidgetConfig(basemaps[i].thumbnailUrl, this.folderUrl);
              }
              // else if(basemaps[i].thumbnailUrl.startWith('/') ||
              //   basemaps[i].thumbnailUrl.startWith('data')){
              //   basemaps[i].thumbnailUrl = basemaps[i].thumbnailUrl;
              // }else{
              //   //if path is relative, relative to widget's folder
              //   basemaps[i].thumbnailUrl = this.appUrl + basemaps[i].thumbnailUrl;
              // }
            }
            basemapObjs.push(new Basemap(basemaps[i]));
          }

          config.map = this.map;
          if (this.appConfig.portalUrl) {
            config.portalUrl = this.appConfig.portalUrl;
          }
          config.basemaps = basemapObjs;
          config.showArcGISBasemaps = false;
          config.bingMapsKey = result.portalSelf.bingKey;
          this.basemapGallery = new BasemapGallery(config, this.basemapGalleryDiv);
          this.basemapGallery.startup();
          this.own(on(this.basemapGallery,
                      "selection-change",
                      lang.hitch(this, this.selectionChange)));
          this._responsive();
        }));
      },

      _getWebmapBasemap: function() {
        var thumbnailUrl;
        if (this.map.itemInfo.item.thumbnail) {
          thumbnailUrl = portalUrlUtils.getItemUrl(this.appConfig.portalUrl,
                         this.map.itemInfo.item.id) + "/info/" + this.map.itemInfo.item.thumbnail;
        } else {
          thumbnailUrl = null;
        }
        return {
          title: this.map.itemInfo.itemData.baseMap.title,
          thumbnailUrl: thumbnailUrl,
          layers: this.map.itemInfo.itemData.baseMap.baseMapLayers,
          spatialReference: this.map.spatialReference
        };
      },

      selectionChange: function() {
        // var basemap = this.basemapGallery.getSelected();
        // var layers = basemap.getLayers();
        // if (layers.length > 0) {
        //   this.publishData(layers);
        // }
        if (this.isPreload) {
          PanelManager.getInstance().closePanel(this.id + '_panel');
        }
      }

    });

    return clazz;
  });