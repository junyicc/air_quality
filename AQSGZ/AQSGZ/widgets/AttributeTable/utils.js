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

define(['dojo/_base/lang',
  'dojo/_base/array',
  'jimu/LayerInfos/LayerInfos',
  'dojo/Deferred',
  'dojo/promise/all'
], function(lang, array, LayerInfos, Deferred, all) {
  var mo = {};

  mo.readLayerInfosObj = function(map){
    return LayerInfos.getInstance(map, map.itemInfo);
  };

  mo.readLayerInfosFromMap = function(map) {
    var def = new Deferred();
    LayerInfos.getInstance(map, map.itemInfo).then(lang.hitch(this, function(layerInfosObj) {
      var layerInfos = [];
      layerInfosObj.traversal(lang.hitch(this, function(layerInfo) {
        layerInfos.push(layerInfo);
      }));
      var tableInfos = layerInfosObj.getTableInfoArray();
      layerInfos = layerInfos.concat(tableInfos);

      def.resolve(layerInfos);
    }), lang.hitch(this, function(err) {
      console.error(err);
      def.reject(err);
    }));

    return def.promise;
  };

  mo.readLayerObjectsFromMap = function(map) {
    var def = new Deferred(),
      defs = [];
    this.readLayerInfosFromMap(map).then(lang.hitch(this, function(layerInfos) {
      array.forEach(layerInfos, lang.hitch(this, function(layerInfo) {
        defs.push(layerInfo.getLayerObject());
      }));

      all(defs).then(lang.hitch(this, function(layerObjects) {
        def.resolve(layerObjects);
      }), lang.hitch(this, function(err) {
        def.reject(err);
        console.error(err);
      }));
    }), lang.hitch(this, function(err) {
      def.reject(err);
    }));

    return def.promise;
  };

  mo.readSupportTableInfoFromLayerInfos = function(layerInfos){
    var def = new Deferred();
    var defs = [];
    array.forEach(layerInfos, lang.hitch(this, function(layerInfo){
      defs.push(layerInfo.getSupportTableInfo());
    }));

    all(defs).then(lang.hitch(this, function(tableInfos){
      var _tInfos = lang.clone(tableInfos);
      array.forEach(_tInfos, function(tInfo, idx){
        tInfo.id = layerInfos[idx].id;
      });
      def.resolve(_tInfos);
    }), function(err){
      def.reject(err);
    });

    return def.promise;
  };

  mo.readConfigLayerInfosFromMap = function(map) {
    var def = new Deferred(),
      defs = [];
    this.readLayerInfosFromMap(map).then(lang.hitch(this, function(layerInfos) {
      var ret = [];
      array.forEach(layerInfos, function(layerInfo) {
        defs.push(layerInfo.getSupportTableInfo());
      });

      all(defs).then(lang.hitch(this, function(tableInfos) {
        array.forEach(tableInfos, lang.hitch(this, function(tableInfo, i) {
          if (tableInfo.isSupportedLayer) {
            layerInfos[i].name = layerInfos[i].title;
            ret.push(layerInfos[i]);
          }
        }));
        fixDuplicateNames(ret);

        def.resolve(ret);
      }), lang.hitch(this, function(err) {
        def.reject(err);
      }));
    }), lang.hitch(this, function(err) {
      def.reject(err);
    }));

    return def.promise;
  };

  mo.getConfigInfosFromLayerInfos = function(layerInfos) {
    return array.map(layerInfos, function(layerInfo) {
      return mo.getConfigInfoFromLayerInfo(layerInfo);
    });
  };

  mo.getConfigInfoFromLayerInfo = function(layerInfo) {
    var json = {};
    json.name = layerInfo.name || layerInfo.title;
    json.id = layerInfo.id;
    json.show = layerInfo.isShowInMap();
    json.layer = {
      url: layerInfo.getUrl() || (layerInfo.layerObject && layerInfo.layerObject.url)
    };

    var popupInfo = layerInfo.getPopupInfo();
    if (popupInfo && !popupInfo.description) {
      json.layer.fields = array.map(popupInfo.fieldInfos, function(fieldInfo) {
        return {
          name: fieldInfo.fieldName,
          alias: fieldInfo.label.toLowerCase(),
          show: fieldInfo.visible
        };
      });
    }

    return json;
  };

  function fixDuplicateNames(layerObjects) {
    var titles = [],
      duplicateLayers = [];
    array.forEach(layerObjects, function(layerObject) {
      if (titles.indexOf(layerObject.name) < 0) {
        titles.push(layerObject.name);
      } else {
        duplicateLayers.push(layerObject);
      }
    });
    array.forEach(duplicateLayers, function(layerObject) {
      layerObject.name = layerObject.name + '-' + layerObject.id;
    });
  }
  return mo;
});