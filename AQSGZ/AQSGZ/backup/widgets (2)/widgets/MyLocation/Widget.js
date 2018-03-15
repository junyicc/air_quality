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
    "esri/dijit/LocateButton",
    'dojo/_base/html',
    'dojo/on',
    'dojo/_base/lang',
    'jimu/dijit/Message'
  ],
  function(
    declare,
    BaseWidget,
    LocateButton,
    html,
    on,
    lang,
    Message) {
    var clazz = declare([BaseWidget], {

      name: 'MyLocation',
      baseClass: 'jimu-widget-mylocation',

      startup: function() {
        this.inherited(arguments);

        if (window.navigator.geolocation) {
          var json = this.config.locateButton;
          json.map = this.map;
          var geoLocate = new LocateButton(json);
          geoLocate.startup();
          html.place(geoLocate.domNode, this.domNode);
          this.own(on(geoLocate, "locate", lang.hitch(this, this.locate)));
        } else {
          html.create('div', {
            'class': 'place-holder',
            title: this.nls.browserError
          }, this.domNode);
        }
      },

      locate: function(parameters){
        if(parameters.error){
          console.error(parameters.error.message);
          new Message({
            message: this.nls.failureFinding
          });
        }
      }

    });
    clazz.inPanel = false;
    clazz.hasUIFile = false;
    return clazz;
  });