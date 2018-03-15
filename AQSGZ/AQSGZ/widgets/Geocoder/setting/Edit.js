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
define(
  ["dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/on",
    "dijit/_WidgetsInTemplateMixin",
    "jimu/BaseWidgetSetting",
    "jimu/dijit/Message",
    "jimu/dijit/GeocodeServiceChooser",
    "dojo/text!./Edit.html",
    "dijit/form/ValidationTextBox"
  ],
  function(
    declare,
    lang,
    on,
    _WidgetsInTemplateMixin,
    BaseWidgetSetting,
    Message,
    GeocodeServiceChooser,
    template) {
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
      baseClass: "jimu-geocoder-Edit",
      singleLineFieldName: null,
      validService: false,
      templateString: template,

      postCreate: function() {
        this.inherited(arguments);

        this.serviceChooser = new GeocodeServiceChooser({
          url: this.config.url || ""
        }).placeAt(this.serviceChooser);

        this.own(on(this.geocodeName, 'Change', lang.hitch(this, '_onGeocodeNameChange')));
        this.own(on(this.serviceChooser, 'ok', lang.hitch(this, '_onServiceChooserOk')));

        this._setConfig(this.config);
      },

      startup: function() {
        this.inherited(arguments);

        this.serviceChooser.startup();
      },

      _setConfig: function(config) {
        if (config.url) {
          this.validService = true;
        }
        if (config.name) {
          this.geocodeName.set('value', config.name);
        }
        if (config.singleLineFieldName) {
          this.singleLineFieldName = config.singleLineFieldName;
        }
        if (config.placeholder) {
          this.geocodePlaceholder.set('value', config.placeholder);
        }
      },

      getConfig: function() {
        var geocode = {
          url: this.serviceChooser.getUrl(),
          name: this.geocodeName.get('value'),
          singleLineFieldName: this.singleLineFieldName,
          placeholder: this.geocodePlaceholder.get('value')
        };
        return geocode;
      },

      _onGeocodeNameChange: function() {
        this._checkRequiredField();
      },

      _onServiceChooserOk: function(evt) {
        var definition = evt.definition;
        if (definition &&
          definition.singleLineAddressField &&
          definition.singleLineAddressField.name) {
          this.singleLineFieldName = definition.singleLineAddressField.name;
          this.validService = true;
        } else {
          new Message({
            message: this.nls.warning
          });
          this.singleLineFieldName = "";
          this.validService = false;
        }
        this._checkRequiredField();
      },

      _checkRequiredField: function() {
        if (!this.validService || !this.geocodeName.get('value')) {
          if (this.popup) {
            this.popup.disableButton(0);
          }
        } else {
          if (this.popup) {
            this.popup.enableButton(0);
          }
        }
      }
    });
  });