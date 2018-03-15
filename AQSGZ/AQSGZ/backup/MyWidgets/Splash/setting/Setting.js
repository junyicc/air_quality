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
    "dojo/_base/lang",
    'dojo/_base/html',
    'dojo/on',
    'dojo/aspect',
    'dojo/cookie',
    'dojo/sniff',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/Editor',
    'jimu/BaseWidgetSetting',
    "jimu/dijit/CheckBox",
    'dijit/_editor/plugins/LinkDialog',
    'dijit/_editor/plugins/ViewSource',
    'dijit/_editor/plugins/FontChoice',
    'dojox/editor/plugins/Preview',
    'dijit/_editor/plugins/TextColor',
    'dojox/editor/plugins/ToolbarLineBreak',
    'dijit/ToolbarSeparator',
    'dojox/editor/plugins/FindReplace',
    'dojox/editor/plugins/PasteFromWord',
    'dojox/editor/plugins/InsertAnchor',
    'dojox/editor/plugins/Blockquote',
    'dojox/editor/plugins/UploadImage',
    './ChooseImage'
  ],
  function(
    declare,
    lang,
    html,
    on,
    aspect,
    cookie,
    has,
    _WidgetsInTemplateMixin,
    Editor,
    BaseWidgetSetting,
    CheckBox) {
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
      //these two properties is defined in the BaseWidget
      baseClass: 'jimu-widget-splash-setting',

      postCreate: function() {
        this.requireConfirm = new CheckBox({
          label: this.nls.requireConfirm,
          checked: false
        }, this.requireConfirm);
        this.requireConfirm.startup();
        // this.initEditor();

        this.own(on(
          this.requireConfirm.domNode,
          'click',
          lang.hitch(this, 'onRequireConfirmChange')
        ));
        this.own(aspect.before(this, 'getConfig', lang.hitch(this, this._beforeGetConfig)));
      },

      startup: function() {
        this.inherited(arguments);
        if (!this.config.splash) {
          this.config.splash = {};
        }
        this.initEditor();

        this.setConfig(this.config);
      },

      initEditor: function() {
        this.editor = new Editor({
          plugins: [
            'bold', 'italic', 'underline', 'foreColor', 'hiliteColor',
            '|', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull',
            '|', 'insertOrderedList', 'insertUnorderedList', 'indent', 'outdent'
          ],
          extraPlugins: [
            '|', 'createLink', 'unlink', 'pastefromword', '|', 'undo', 'redo',
            '|', 'chooseImage', 'uploadImage', 'toolbarlinebreak',
            'fontName', 'fontSize', 'formatBlock'
          ]
        }, this.editor);
        html.setStyle(this.editor.domNode, {
          width: '100%',
          height: '100%'
        });
        this.editor.startup();

        if (has('ie') !== 8) {
          this.editor.resize({
            w: '100%',
            h: '100%'
          });
        } else {
          var box = html.getMarginBox(this.editorContainer);
          this.editor.resize({
            w: box.w,
            h: box.h
          });
        }
      },

      setConfig: function(config) {
        this.config = config;

        this.editor.set('value', config.splash.splashContent || this.nls.defaultContent);
        if (config.splash.requireConfirm) {
          this.requireConfirm.setValue(config.splash.requireConfirm);
          html.setStyle(this.confirmContainer, 'display', 'block');
        } else {
          html.setStyle(this.confirmContainer, 'display', 'none');
        }
        html.setAttr(
          this.confirmText,
          'value',
          config.splash.confirmText || this.nls.defaultConfirmText
        );
      },

      onRequireConfirmChange: function() {
        var checked = this.requireConfirm.getValue();
        if (checked) {
          html.setStyle(this.confirmContainer, 'display', 'block');
        } else {
          html.setStyle(this.confirmContainer, 'display', 'none');
        }
      },

      _beforeGetConfig: function() {
        cookie('isfirst', true, {
          expires: 1000,
          path: '/'
        });
      },

      getConfig: function() {
        this.config.splash.splashContent = this.editor.get('value');
        this.config.splash.requireConfirm = this.requireConfirm.getValue();
        if (this.requireConfirm.getValue()) {
          this.config.splash.confirmText = this.confirmText.value || this.nls.defaultConfirmText;
        } else {
          this.config.splash.confirmText = this.nls.defaultConfirmText;
        }

        return this.config;
      }
    });
  });