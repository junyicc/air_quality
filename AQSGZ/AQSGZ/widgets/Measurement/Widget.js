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
    'dojo/_base/lang',
    'dojo/aspect',
    'dojo/Deferred',
    'dijit/_WidgetsInTemplateMixin',
    'jimu/BaseWidget',
    'jimu/portalUtils',
    'jimu/dijit/Message',
    'esri/units',
    'esri/dijit/Measurement',
    "esri/symbols/jsonUtils"
  ],
  function(
    declare,
    lang,
    aspect,
    Deferred,
    _WidgetsInTemplateMixin,
    BaseWidget,
    PortalUtils,
    Message,
    esriUnits,
    Measurement,
    jsonUtils) {
    var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {

      name: 'Measurement',
      measurement: null,

      startup: function() {
        this.inherited(arguments);

        var json = this.config.measurement;
        json.map = this.map;
        if (json.lineSymbol) {
          json.lineSymbol = jsonUtils.fromJson(json.lineSymbol);
        }
        if (json.pointSymbol) {
          json.pointSymbol = jsonUtils.fromJson(json.pointSymbol);
        }

        this._processConfig(json).then(lang.hitch(this, function(measurementJson) {
          this.measurement = new Measurement(measurementJson, this.measurementDiv);
          aspect.after(this.measurement, 'setTool', lang.hitch(this, function() {
            if (this.measurement.activeTool) {
              this.disableWebMapPopup();
            } else {
              this.enableWebMapPopup();
            }
          }));

          this.measurement.startup();
        }), lang.hitch(this, function(err) {
          new Message({
            message: err.message || err
          });
        }));
      },

      _processConfig: function(configJson) {
        var def = new Deferred();
        if (configJson.defaultLengthUnit && configJson.defaultAreaUnit) {
          def.resolve(configJson);
        } else {
          PortalUtils.getUnits(this.appConfig.portalUrl).then(lang.hitch(this, function(units) {
            configJson.defaultAreaUnit = units === 'english' ?
              esriUnits.SQUARE_MILES : esriUnits.SQUARE_KILOMETERS;
            configJson.defaultLengthUnit = units === 'english' ?
              esriUnits.MILES : esriUnits.KILOMETERS;
            def.resolve(configJson);
          }));
        }

        return def.promise;
      },

      disableWebMapPopup: function() {
        this.map.setInfoWindowOnClick(false);
      },

      enableWebMapPopup: function() {
        this.map.setInfoWindowOnClick(true);
      },

      onClose: function() {
        if (this.measurement && this.measurement.activeTool) {
          this.measurement.clearResult();
          this.measurement.setTool(this.measurement.activeTool, false);
        }
      },

      destroy: function() {
        if (this.measurement) {
          this.measurement.destroy();
        }
        this.inherited(arguments);
      }
    });
    return clazz;
  });