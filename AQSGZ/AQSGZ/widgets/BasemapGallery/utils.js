
/*
Copyright ©2014 Esri. All rights reserved.
 
TRADE SECRETS: ESRI PROPRIETARY AND CONFIDENTIAL
Unpublished material - all rights reserved under the
Copyright Laws of the United States and applicable international
laws, treaties, and conventions.
 
For additional information, contact:
Attn: Contracts and Legal Department
Environmental Systems Research Institute, Inc.
380 New York Street
Redlands, California, 92373
USA
 
email: contracts@esri.com
*/

define([
  'dojo/_base/lang',
  'dojo/Deferred',
  'dojo/_base/array',
  'dojo/promise/all',
  'jimu/portalUtils',
  'jimu/SpatialReference/wkidUtils',
  'jimu/shared/basePortalUrlUtils',
  'esri/request'
], function (lang, Deferred, array, all, portalUtils, SRUtils, basePortalUrlUtils, esriRequest) {

  var mo = {};
  mo._loadPortalBaseMaps = function(portalUrl, curMapSpatialRefObj){
    // map.spatial
    //var curMapSpatialRefObj = this.map.spatialReference;
    var defRet = new Deferred();
    var deferreds = [];
    getWebMapsFromBasemapGalleryGroup(portalUrl).then(function(response) {
      var basemapItems = response.results;
      array.forEach(basemapItems, function(basemapItem){
        var def = new Deferred();
        deferreds.push(def);
        basemapItem.getItemData().then(function(basemapItemData) {
          _getBasemapSpatialReference(basemapItem, basemapItemData)
          .then(lang.hitch(this, function(basemapSpatialRef) {
            var basemapLayers = [];
            if (curMapSpatialRefObj &&
                basemapSpatialRef   &&
                SRUtils.isSameSR(curMapSpatialRefObj.wkid, basemapSpatialRef.wkid)) {
              basemapLayers = array.map(basemapItemData.baseMap.baseMapLayers, function(layerData){
                //return {url: layerData.url};
                return layerData;
              });
              // var thumbnailUrl = null;
              // if (basemapItem.thumbnailUrl) {
              //   var queryIndex = basemapItem.thumbnailUrl.indexOf('?');
              //   if (queryIndex !== -1) {
              //     thumbnailUrl = basemapItem.thumbnailUrl.slice(0, queryIndex);
              //   } else {
              //     thumbnailUrl = basemapItem.thumbnailUrl;
              //   }
              // }
              var thumbnailUrl = _getStanderdUrl(basemapItem.thumbnailUrl);

              def.resolve({
                layers: basemapLayers,
                title: basemapItem.title,
                thumbnailUrl: thumbnailUrl,
                spatialReference: basemapSpatialRef
              });
            }else {
              def.resolve({});
            }
          }));
        });
      });

      all(deferreds).then(function(basemaps) {
        var filteredBasemaps = array.filter(basemaps, function(basemap) {
          if(basemap && basemap.title) {
            return true;
          } else {
            return false;
          }
        }, this);
        defRet.resolve(filteredBasemaps);
      });
    }, function(err){
      defRet.reject(err);
    });
    return defRet;
  };

  mo.compareSameBasemap = function(basemap1, basemap2) {
    var basemap1Layers = basemap1.layers, basemap2Layers = basemap2.layers;
    var basemap1UrlStr = '', basemap2UrlStr = '';
    basemap1UrlStr = _allLayersUrlStr(basemap1Layers);
    basemap2UrlStr = _allLayersUrlStr(basemap2Layers);
    return (basemap1UrlStr === basemap2UrlStr);
  };

  mo.compareSameBasemapByOrder = function(basemap1, basemap2) {
    var basemap1Layers = basemap1.layers, basemap2Layers = basemap2.layers;
    if (basemap1Layers.length !== basemap2Layers.length) {
      return false;
    }
    for(var i = 0; i < basemap1Layers.length; i++) {
      // compare type;
      if(!basemap1Layers[i].type) {
        basemap1Layers[i].type = null;
      }
      if(!basemap2Layers[i].type) {
        basemap2Layers[i].type = null;
      }

      if(basemap1Layers[i].type !== basemap2Layers[i].type) {
        return false;
      } else if(!basemap1Layers[i].type && !basemap1Layers[i].type) {
        // two layers do not have type property;
        // compare url;
        if(!basemap1Layers[i].url) {
          basemap1Layers[i].url = null;
        }
        if(!basemap2Layers[i].url) {
          basemap2Layers[i].url = null;
        }

        if(_getStanderdUrl(basemap1Layers[i].url) !== _getStanderdUrl(basemap2Layers[i].url)) {
          return false;
        }
      }
    }
    return true;
  };

  mo.isBingMap = function(basemap) {
    if(!basemap || !basemap.layers) {
      return false;
    }
    for(var i = 0; i < basemap.layers.length; i++) {
      if (basemap.layers[i].type === "BingMapsAerial" ||
          basemap.layers[i].type === "BingMapsRoad"   ||
          basemap.layers[i].type === "BingMapsHybrid") {
        return true;
      }
    }
    return false;
  };

  mo.isNoUrlLayerMap = function(basemap) {
    if(!basemap || !basemap.layers) {
      return false;
    }
    for(var i = 0; i < basemap.layers.length; i++) {
      if (basemap.layers[i].type === "BingMapsAerial" ||
          basemap.layers[i].type === "BingMapsRoad"   ||
          basemap.layers[i].type === "BingMapsHybrid" ||
          basemap.layers[i].type === "OpenStreetMap") {
        return true;
      }
    }
    return false;
  };

  mo.getToken = function(portalUrl) {
    var portal = portalUtils.getPortal(portalUrl);
    portal.updateCredential();
    return portal.credential ? "?token=" + portal.credential.token : "";
  };

  mo.removeUrlQuery = function(url) {
    return _removeUrlQurey(url);
  };

  mo.getStanderdUrl = function(url) {
    return _getStanderdUrl(url);
  };

  // remove url query and delete the last '/'.
  function _removeUrlQurey(url) {
    if(!url){
      return null;
    }
    var queryIndex = url.indexOf('?');
    var httpIndex  = url.search(/http|\/\//);
    if (httpIndex === 0 && queryIndex !== -1) {
      return url.slice(0, queryIndex).replace(/\/*$/g, '');
    } else {
      return url;
    }
  }

  // standerd url
  //   * no protocol
  //   * no query
  function _getStanderdUrl(url) {
    if(!url) {
      return null;
    } else {
      return basePortalUrlUtils.removeProtocol(_removeUrlQurey(url));
    }
  }

  function _allLayersUrlStr(layers) {
    var urlArray = [];
    array.forEach(layers, function(layer) {
      urlArray.push(layer.url);
    });
    urlArray.sort();
    var allLayersUrlStr = '';
    var i = 0;
    for(i = 0; i < urlArray.length; i++) {
      var queryIndex = urlArray[i].indexOf('?');
      var url = '';
      if (queryIndex !== -1) {
        url = urlArray[i].slice(0, queryIndex);
      } else {
        url = urlArray[i];
      }
      allLayersUrlStr += url;
    }
    return allLayersUrlStr.replace(/\ /, '');
  }

  function _isBasemapLayersHasTypeProperty(basemapLayers) {
    var hasTypeProperty = false;
    if(basemapLayers) {
      for(var i = 0; i < basemapLayers.length; i++) {
        if (basemapLayers[i].type) {
          hasTypeProperty = true;
          break;
        }
      }
    }
    return hasTypeProperty;
  }

  function _getBasemapSpatialReference(basemapItem, basemapItemData) {
    var basemapSpatialRef = null;
    var spatialRefDef = new Deferred();
    if (basemapItemData.spatialReference || basemapItem.spatialReference) {
      basemapSpatialRef = basemapItemData.spatialReference || basemapItem.spatialReference;
      spatialRefDef.resolve(basemapSpatialRef);
    } else if(basemapItem.owner && basemapItem.owner.indexOf("esri_") === 0) {
      spatialRefDef.resolve({wkid: "102100"});
    } else if(_isBasemapLayersHasTypeProperty(basemapItemData.baseMap.baseMapLayers)) {
      spatialRefDef.resolve({wkid: "102100"});
    } else if(basemapItemData.baseMap.baseMapLayers && basemapItemData.baseMap.baseMapLayers[0]) {
      esriRequest({
        url: basemapItemData.baseMap.baseMapLayers[0].url,
        content: {
          f: 'json'
        },
        handleAs: 'json',
        callbackParamName: 'callback'
      }).then(lang.hitch(this, function(res) {
        if(res.spatialReference) {
          basemapSpatialRef = res.spatialReference;
        } else {
          basemapSpatialRef = null;
        }
        spatialRefDef.resolve(basemapSpatialRef);
      }), lang.hitch(this, function() {
        // return null if can not get spatialReference;
        spatialRefDef.resolve(null);
      }));
    } else {
      // return null if can not get spatialReference;
      spatialRefDef.resolve(null);
    }
    return spatialRefDef;
  }

  function getWebMapsFromBasemapGalleryGroup(portalUrl) {
    var def = new Deferred();
    //var portalUrl = this.appConfig.portalUrl;
    portalUtils.getPortalSelfInfo(portalUrl).then(lang.hitch(this, function(portalSelf) {
      var portal = portalUtils.getPortal(portalUrl);
      //title:"ArcGIS Online Basemaps" AND owner:esri_en
      var groupQueryString = portalSelf.basemapGalleryGroupQuery;
      var ownerIndex = groupQueryString.indexOf('esri_');
      if (ownerIndex >= 0) {
        /*global dojoConfig*/
        var oldOwner = groupQueryString.slice(ownerIndex, ownerIndex + 7);
        var newOwner = 'esri_' + dojoConfig.locale.slice(0, 2);
        groupQueryString = groupQueryString.replace(oldOwner, newOwner);
      }
      portal.queryGroups({
        f: 'json',
        q: groupQueryString
      }).then(lang.hitch(this, function(response) {
        if (response.results.length > 0) {
          var group = response.results[0];
          var queryStr = portalUtils.webMapQueryStr;
          group.queryItems({
            start: 1,
            num: 100,
            f: 'json',
            q: queryStr
          }).then(lang.hitch(this, function(searchResponse) {
            def.resolve(searchResponse);
          }), lang.hitch(this, function() {
            def.reject();
          }));
        } else {
          def.reject();
        }
      }), lang.hitch(this, function() {
        def.reject();
      }));
    }), lang.hitch(this, function() {
      def.reject();
    }));
    return def;
  }


  return mo;
});
