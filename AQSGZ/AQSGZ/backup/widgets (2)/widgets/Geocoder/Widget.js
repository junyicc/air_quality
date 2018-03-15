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
    'jimu/BaseWidget',
    "esri/dijit/Geocoder",
    'dojo/_base/html',
    'dojo/on',
    'dojo/query',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/Deferred',
    "dojo/promise/all",
    'jimu/portalUtils',
    'jimu/dijit/Message',
    'jimu/LayerInfos/LayerInfos',
    "libs/usng/usng",
    "esri/request",
    "esri/lang",
    "esri/dijit/Popup",
    "./utils"
  ],
  function(
    declare, BaseWidget, Geocoder,
    html, on, query, lang, array, Deferred, all,
    portalUtils, Message, LayerInfos, usng, esriRequest, esriLang, esriPopup, utils) {
    var clazz = declare([BaseWidget], {

      name: 'Geocoder',
      baseClass: 'jimu-widget-geocoder',
      lastMgrsResult: null,

      searchResults: null,
      geocodeInfoWindow: null,
      geocoderDijit: null,
      miscHandles: null,
      hardcodeRegExp: /geocode(.){0,3}\.arcgis.com\/arcgis\/rest\/services\/World\/GeocodeServer/g,

      postCreate: function() {
        this.inherited(arguments);
      },

      startup: function() {
        this.inherited(arguments);
        this._initGeocoder();
      },

      _initGeocoder: function() {
        LayerInfos.getInstance(this.map, this.map.itemInfo)
          .then(lang.hitch(this, function(layerInfosObj) {
            this.layerInfosObj = layerInfosObj;
            this._getGeocoders(this.appConfig.portalUrl).then(lang.hitch(this, function() {
              if (!this.domNode) {
                return;
              }
              this.config.geocoder.arcgisGeocoder = this.config.geocoder.geocoders.length === 0 ?
                true : false;
              var json = this.config.geocoder;
              json.map = this.map;

              this.geocoderDijit = new Geocoder(json);
              this.own(on(this.geocoderDijit, 'select', lang.hitch(this, "showResults")));
              this.own(on(this.geocoderDijit, "auto-complete", lang.hitch(this, "onAutoComplete")));
              this.own(on(this.geocoderDijit, "find-results", lang.hitch(this, "onFindResults")));
              html.place(this.geocoderDijit.domNode, this.domNode);
              this.geocoderDijit.startup();

              this.miscHandles = [];
            }), lang.hitch(this, function(err) {
              console.error(err);
            }));
          }));
      },

      _getGeocodeName: function(geocodeUrl) {
        if (typeof geocodeUrl !== "string") {
          return "geocoder";
        }
        var strs = geocodeUrl.split('/');
        return strs[strs.length - 2] || "geocoder";
      },

      _getSingleLine: function(geocode) {
        var def = new Deferred();

        if (geocode.singleLineFieldName) {
          def.resolve(geocode);
        } else if (this.hardcodeRegExp.test(geocode.url)) {
          geocode.singleLineFieldName = 'SingleLine';
          def.resolve(geocode);
        } else {
          esriRequest({
            url: geocode.url,
            content: {
              f: "json"
            },
            handleAs: "json",
            callbackParamName: "callback"
          }).then(lang.hitch(this, function(response) {
            if (response.singleLineAddressField && response.singleLineAddressField.name) {
              geocode.singleLineFieldName = response.singleLineAddressField.name;
              def.resolve(geocode);
            } else {
              console.warn(geocode.url + "has no singleLineFieldName");
              def.resolve(null);
            }
          }), lang.hitch(this, function(err) {
            console.error(err);
            def.resolve(null);
          }));
        }

        return def;
      },

      _getQueryTypeGeocoder: function(item, layerInfosObj) {
        var def = new Deferred();
        var layer = this.map.getLayer(item.id);
        var url = null;
        var _layerInfo = null;
        var _layerId = null;
        if (esriLang.isDefined(item.subLayer)) {
          _layerId = item.id + '_' + item.subLayer;
        } else {
          _layerId = item.id;
        }
        var isInMap = layerInfosObj.traversal(function(layerInfo) {
          if (layerInfo.id === _layerId) {
            _layerInfo = layerInfo;
            return true;
          }
          return false;
        });

        if (layer && isInMap && _layerInfo) {
          if (esriLang.isDefined(item.subLayer)) {
            url = _layerInfo.url || (layer.url + '/' + item.subLayer);
          }else{
            url = _layerInfo.url || layer.url;
          }

          var geocoder = {
            name: _layerInfo.title,
            url: url,
            field: item.field.name,
            outFields: '*',
            type: 'query',
            placeholder: item.hintText,
            exactMatch: item.field.exactMatch || false,
            layerId: item.id,
            subLayerId: parseInt(item.subLayer, 10)
          };

          def.resolve(geocoder);
        } else {
          def.resolve(null);
        }

        return def;
      },

      _getGeocoders: function(portalUrl) {
        var geoDef = new Deferred();

        var defs = [];
        var search = null;
        if (utils.searchLayer(this.map)) {
          search = this.map.itemInfo.itemData.applicationProperties.viewing.search;
          array.forEach(search.layers, lang.hitch(this, function(_layer) {
            _layer.hintText = search.hintText;
            defs.push(this._getQueryTypeGeocoder(_layer, this.layerInfosObj));
          }));
        }

        if (utils.isConfigured(this.config)) {
          if (defs.length > 0) { // read feature geocoder from webmap
            all(defs).then(lang.hitch(this, function(results) {
              var querys = [];
              array.forEach(results, function(item) {
                if (item) {
                  querys.push(item);
                }
              });

              this.config.geocoder.geocoders = this.config.geocoder.geocoders.concat(querys);
              geoDef.resolve('success');
            }));
          } else {
            geoDef.resolve('success');
          }
        } else {
          portalUtils.getPortalSelfInfo(portalUrl).then(lang.hitch(this, function(response) {
            var geocoders = response.helperServices && response.helperServices.geocode;
            var portalGeocoders = [];

            if (geocoders && geocoders.length > 0) {
              for (var i = 0, len = geocoders.length; i < len; i++) {
                var geocoder = geocoders[i];
                if (geocoder) {
                  defs.splice(i, 0, this._getSingleLine(geocoder));
                }
              }

              all(defs).then(lang.hitch(this, function(results) {
                for (var i = 0; i < results.length; i++) {
                  var geocode = results[i];
                  if (!geocode) {
                    continue;
                  } else if (geocode && geocode.type === 'query') {
                    portalGeocoders.push(geocode);
                  } else {
                    var json = {
                      name: geocode.name || this._getGeocodeName(geocode.url),
                      url: geocode.url,
                      singleLineFieldName: geocode.singleLineFieldName,
                      placeholder: geocode.placeholder ||
                        geocode.name || this._getGeocodeName(geocode.url)
                    };
                    portalGeocoders.push(json);
                  }
                }
                this.config.geocoder.geocoders = portalGeocoders;
                geoDef.resolve('success');
              }));
            } else {
              this.config.geocoder.arcgisGeocoder = true;
              console.error("portal doesn't configure geocode, use arcgisGeocoder instead");
              geoDef.resolve('success');
            }
          }), lang.hitch(this, function(err) {
            new Message({
              message: this.nls.portalConnectionError
            });
            geoDef.reject('error');
            console.error(err);
          }));
        }

        return geoDef;
      },

      /**
       * Looks up an MGRS or USNG string and returns a result object with text,
       * latitude, and longitude properties, or null if the string is not a valid
       * MGRS or USNG string.
       */
      lookupMgrs: function(mgrs) {
        var result = null;
        try {
          var latLon = [];
          usng.USNGtoLL(mgrs, latLon);
          if (2 <= latLon.length && !isNaN(latLon[0]) && !isNaN(latLon[1])) {
            result = {
              text: mgrs.toUpperCase(),
              latitude: latLon[0],
              longitude: latLon[1]
            };
          } else {
            result = null;
          }
        } catch (err) {
          //Not an MGRS/USNG string; that's fine; swallow
          result = null;
        }
        return result;
      },

      onAutoComplete: function() {
        this.hideGeocodeInfoWindow();
        this.searchResults = null;
      },

      hideGeocodeInfoWindow: function() {
        if (this.geocodeInfoWindow) {
          this.geocodeInfoWindow.hide();
          this.geocodeInfoWindow.destroy();
          this.geocodeInfoWindow = null;
        }

        this.map.infoWindow.hide();
      },

      onFindResults: function(sResults) {
        if (sResults.results && sResults.results.results && sResults.results.results.length) {
          this.searchResults = sResults.results.results;
        } else {
          var _message = "";
          if (typeof sResults.results === 'string') {
            _message = sResults.results;
          } else {
            _message = esriLang.substitute({
              "LOCATION": sResults.results.value || ""
            }, this.nls.notFound);
          }
          new Message({
            message: _message
          });
        }
      },

      showResults: function(response, pos) {
        var geocoder = this.geocoderDijit;
        geocoder.autoNavigate = true;
        var feature = null;
        var extent = null;
        var content = null;

        var zoomExtent = null;
        var anchorPoint = null;

        if (response && response.result) {
          //Use the actual geocode result
          feature = response.result.feature;
          extent = response.result.extent;
          content = response.result.name;
        }
        if (feature) {
          var resultGeometry = feature.geometry;
          if (resultGeometry.type === 'point') {
            anchorPoint = resultGeometry;
            zoomExtent = this.map.extent.centerAt(anchorPoint).expand(0.0625);
          } else if (resultGeometry.type === 'polyline') {
            anchorPoint = resultGeometry.getPoint(0, 0);
            zoomExtent = resultGeometry.getExtent().expand(1.1);
          } else if (resultGeometry.type === 'polygon') {
            anchorPoint = resultGeometry.getCentroid();
            zoomExtent = resultGeometry.getExtent().expand(1.1);
          } else if (resultGeometry.type === 'mulitpoint') {
            anchorPoint = resultGeometry.getPoint(0);
            zoomExtent = resultGeometry.getExtent().expand(1.1);
          } else {
            anchorPoint = resultGeometry;
            zoomExtent = this.map.extent;
          }

          var activeGeocoder = geocoder.get('activeGeocoder');
          if (activeGeocoder.type === 'query') {
            var _layer = this.map.getLayer(activeGeocoder.layerId);
            feature.infoTemplate = _layer.infoTemplate ||
              (activeGeocoder.subLayerId && _layer.infoTemplates &&
                _layer.infoTemplates[activeGeocoder.subLayerId.toString()] &&
                _layer.infoTemplates[activeGeocoder.subLayerId.toString()].infoTemplate) || null;
            if (feature.infoTemplate) {
              this.map.infoWindow.setFeatures([feature]);
              this.map.infoWindow.show(anchorPoint);
              this.map.setExtent(zoomExtent);
            } else {
              this.map.infoWindow.setTitle(this.nls.locationTitle);
              this.map.infoWindow.setContent(content || null);
              this.map.infoWindow.show(anchorPoint);
              this.map.setExtent(zoomExtent);
            }
            return;
          }

          if (!esriLang.isDefined(pos)) {
            pos = 0;
          }
          var geocodeResult = response.result;
          this.setupInfoWindowAndZoom(
            geocodeResult.name, anchorPoint,
            geocodeResult.extent, geocodeResult, pos
          );

        } else if (extent) {
          this.map.setExtent(extent);
        } else {
          new Message({
            message: esriLang.substitute({
              "LOCATION": content
            }, this.nls.notFound)
          });
        }
      },

      _generateInfoContent: function(content, pos) {
        var currentLocationName = content;
        var attr = '';
        attr = this.searchResults[pos].feature.attributes;
        content = "<div id='geocodeCurrentResult' style='display:none;'>" +
          "<span style='font-weight:bold;'>";
        content += this.nls.currentLocation;
        content += "</span></div>";
        content += "<span>";
        if (!attr.Match_addr) {
          content += currentLocationName;
        } else {
          content += attr.Match_addr;
          if (attr.Addr_type === "POI" && attr.StAddr) {
            if (attr.City) {
              content += " - " + attr.StAddr + ", " + attr.City;
            } else {
              content += " - " + attr.StAddr;
            }
          }
        }
        content += "</span>";
        content += "<div id='geocodeWantOtherResults'>";
        // content += "<A href='JavaScript:window.showOtherResults();'>";
        content += "<A showOther='true' href='JavaScript:void(0);'>";
        content += this.nls.notWhatYouWanted;
        content += "</A>";
        content += "</div>";
        content += "<div id='geocodeOtherResults' style='display:none;'>" +
          "<span style='font-weight:bold;'>";
        content += this.nls.selectAnother;
        content += "</span><br/>";
        for (var i = 0; i < this.searchResults.length; i++) {
          if (i !== pos) {
            var result = this.searchResults[i];
            attr = result.feature.attributes;
            // content += "<A href='JavaScript:window.selectAnotherResult(" + i + ");'>";
            content += "<A href='JavaScript:void(0)' idx = '" + i + "'>";
            if (!attr.Match_addr) {
              content += result.name;
            } else {
              content += attr.Match_addr;
              if (attr.Addr_type === "POI" && attr.StAddr) {
                if (attr.City) {
                  content += " - " + attr.StAddr + ", " + attr.City;
                } else {
                  content += " - " + attr.StAddr;
                }
              }
            }
            content += "</A><br/>";
          }
        }
        content += "</div>";

        return content;
      },

      _processInfoWindowContent: function(content, geocodeResult, pos) {
        var isQueryGeocode = false;
        var _geocode = this.geocoderDijit.get('activeGeocoder');
        if (_geocode.type === 'query') {
          isQueryGeocode = true;
        }
        var attr = '';
        var more = false;
        if (!isQueryGeocode && this.searchResults && this.searchResults.length > 1) {
          // ask the user if he wants to see more
          content = this._generateInfoContent(content, pos);
          more = true;
        } else {
          attr = geocodeResult.feature.attributes;
          if (attr.Match_addr) {
            content = attr.Match_addr;
            if (attr.Addr_type === "POI" && attr.StAddr) {
              if (attr.City) {
                content += " - " + attr.StAddr + ", " + attr.City;
              } else {
                content += " - " + attr.StAddr;
              }
            }
          }
        }

        var contentDom = html.toDom(content);
        if (this.miscHandles && this.miscHandles.length > 0) {
          array.forEach(this.miscHandles, function(h) {
            if (h && h.remove) {
              h.remove();
            }
          });
          this.miscHandles = [];
        }
        if (more) {
          query('a', contentDom).forEach(lang.hitch(this, function(a) {
            this.miscHandles.push(on(a, 'click', lang.hitch(this, function(evt) {
              var node = evt.target;
              if (esriLang.isDefined(html.getAttr(node, 'showOther'))) {
                this.showOtherResults();
              } else if (esriLang.isDefined(html.getAttr(node, 'idx'))) {
                this.selectAnotherResult(parseInt(html.getAttr(node, 'idx'), 10));
              }
            })));
          }));
        }

        return contentDom;
      },

      setupInfoWindowAndZoom: function(content, geocodeLocation, newExtent, geocodeResult, pos) {
        if (!this.geocodeInfoWindow) {
          this.geocodeInfoWindow = new esriPopup(null, html.create('div', {
            'class': 'blueTheme'
          }, this.map.root));
          this.geocodeInfoWindow.resize(400, 400);

          query('.zoomTo', this.geocodeInfoWindow.domNode).forEach(function(node) {
            html.setStyle(node, 'display', 'none');
          });

          this.geocodeInfoWindow.map = this.map;
        }

        this.geocodeInfoWindow.setTitle(this.nls.locationTitle);

        var contentDom = this._processInfoWindowContent(content, geocodeResult, pos);

        this.geocodeInfoWindow.setContent(contentDom);
        var handle = on(this.map, 'extent-change', lang.hitch(this, function() {
          this.geocodeInfoWindow.show(geocodeLocation);
          handle.remove();
        }));
        this.map.setExtent(newExtent);
      },

      showOtherResults: function() {
        html.setStyle(html.byId("geocodeWantOtherResults"), "display", "none");
        html.setStyle(html.byId("geocodeCurrentResult"), "display", "block");
        html.setStyle(html.byId("geocodeOtherResults"), "display", "block");
      },

      selectAnotherResult: function(pos) {
        this.showResults({
          result: this.searchResults[pos]
        }, pos);
      },

      destroy: function() {
        if (this.geocodersDef && !this.geocodersDef.isFulfilled() &&
          !this.geocodersDef.isCanceled()) {
          this.geocodersDef.cancel();
        }
        if (this.geocodeInfoWindow && this.geocodeInfoWindow.destroy) {
          this.geocodeInfoWindow.destroy();
        }

        this.inherited(arguments);
      }
    });
    return clazz;
  });