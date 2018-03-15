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
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dojo/_base/lang',
    'dojo/_base/html',
    'dojo/on',
    'dojo/text!./templates/ImageChooser.html',
    'dojo/sniff',
    'esri/lang',
    '../utils',
    'jimu/tokenUtils',
    'jimu/dijit/Message'
  ],
  function(declare, _WidgetBase, _TemplatedMixin, lang, html,
    on, template, has, esriLang, utils, tokenUtils, Message) {
    /*global testLoad*/
    var fileAPIJsStatus = 'unload'; // unload, loading, loaded

    function _loadFileAPIJs(prePath, cb) {
      prePath = prePath || "";
      var loaded = 0,
        completeCb = function() {
          loaded++;
          if (loaded === tests.length) {
            cb();
          }
        },
        tests = [{
          test: window.File && window.FileReader && window.FileList && window.Blob ||
            !utils.file.isEnabledFlash(),
          failure: [
            prePath + "libs/polyfills/fileAPI/FileAPI.js"
          ],
          callback: function() {
            completeCb();
          }
        }];

      for (var i = 0; i < tests.length; i++) {
        testLoad(tests[i]);
      }
    }
    //summary:
    //  popup the image file chooser dialog, when choose an image file,
    //  display the image file and return the image's base64 code
    return declare([_WidgetBase, _TemplatedMixin], {
      templateString: template,
      declaredClass: "jimu.dijit.ImageChooser",

      displayImg: null,
      displayCss: null,
      showSelfImg: false,
      selfImg: null,

      postMixInProperties: function() {
        this.inherited(arguments);
        this.nls = window.jimuNls.imageChooser;
        this.nls.readError = this.nls.readError || "Failed to read the file.";
      },

      postCreate: function() {
        this._initial();
        if (!utils.file.supportHTML5() && !has('safari') && utils.file.isEnabledFlash()) {
          if (fileAPIJsStatus === 'unload') {
            var prePath = tokenUtils.isInBuilderWindow() ? 'stemapp/' : "";
            window.FileAPI = {
              debug: false,
              flash: true,
              staticPath: prePath + 'libs/polyfills/fileAPI/',
              flashUrl: prePath + 'libs/polyfills/fileAPI/FileAPI.flash.swf',
              flashImageUrl: prePath + 'libs/polyfills/fileAPI/FileAPI.flash.image.swf'
            };

            _loadFileAPIJs(prePath, lang.hitch(this, function() {
              html.setStyle(this.mask, 'zIndex', 1); // prevent mask hide file input
              fileAPIJsStatus = 'loaded';
            }));
            fileAPIJsStatus = 'loading';
          }else {
            html.setStyle(this.mask, 'zIndex', 1); // prevent mask hide file input
          }
        }
      },

      _initial: function() {
        this._setupPosition();
        this._porcessMaskClick();
        this._setupFileInput();
        this._processTip();
      },

      _porcessMaskClick: function() {
        html.setStyle(this.mask, {
          'position': 'absolute',
          'top': 0,
          'bottom': 0,
          'left': 0,
          'right': 0,
          'zIndex': 10,
          'background': '#000',
          'cursor': 'pointer'
        });
        this.own(on(this.mask, 'click', lang.hitch(this, function(evt) {
          evt.stopPropagation();
          if (has('safari') && has('safari') < 7) {
            new Message({
              message: this.nls.unsupportReaderAPI
            });
            return;
          }
          if (!utils.file.supportHTML5()) {
            if (!utils.file.isEnabledFlash()) {
              var errContent = html.create('a', {
                href: 'http://helpx.adobe.com/flash-player.html',
                innerHTML: this.nls.enableFlash,
                target: '_blank'
              });

              new Message({
                message: errContent
              });
              return;
            }
            if (!utils.file.supportFileAPI()) {
              new Message({
                message: this.nls.unsupportReaderAPI
              });
              return;
            }
          }
          this.fileInput.click();
        })));
      },

      _processTip: function() {
        var obj = {
          width: this.goldenWidth || 40,
          height: this.goldenHeight || 40
        };
        var tip = esriLang.substitute(obj, this.nls.toolTip);
        html.setAttr(this.domNode, 'title', tip);
      },

      _setupPosition: function() {
        if (this.displayClass) {
          html.addClass(this.domNode, this.displayCss);
        }
        html.setStyle(this.domNode, {
          'opacity': 0,
          'visibility': 'visible',
          'float': 'left',
          'zIndex': 9999,
          'overflow': 'hidden',
          'position': 'absolute'
        });
        html.setStyle(this.fileInput, {
          'width': '100%',
          'height': '100%',
          'position': 'absolute',
          'left': 0,
          'top': 0,
          'zIndex': 9
        });
      },

      _setupFileInput: function() {
        var maxSize = has('ie') < 9 ? 23552 : 1048576; //ie8:21k others:1M
        this.own(on(this.fileInput, 'change', lang.hitch(this, function(evt) {
          utils.file.readFile(
            evt,
            'image/*',
            maxSize,
            lang.hitch(this, function(err, fileName, fileData) {
              /*jshint unused: false*/
              if (err) {
                var message = this.nls[err.errCode];
                if (err.errCode === 'exceed') {
                  message = message.replace('1024', maxSize / 1024);
                }
                new Message({
                  'message': message
                });
                return;
              }
              this.onImageChange(fileData);
              if (this.displayImg) {
                html.setAttr(this.displayImg, 'src', fileData);
              }
              if (this.showSelfImg) {
                if (this.selfImg) {
                  html.setAttr(this.selfImg, 'src', fileData);
                } else {
                  var contentBox = html.getContentBox(this.domNode);
                  this.selfImg = html.create('img', {
                    src: fileData,
                    style: {
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: 0,
                      right: 0,
                      width: contentBox.w + 'px',
                      height: contentBox.h + 'px',
                      zIndex: 8
                    }
                  }, this.domNode);
                }
              }
            }));
        })));
      },

      onImageChange: function(fileData) {
        this.imageData = fileData;
      }

    });
  });