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
    'dojo/_base/html',
    'dojo/on',
    'dojo/query',
    'dojo/cookie',
    'dijit/_WidgetsInTemplateMixin',
    'jimu/BaseWidget',
    'jimu/dijit/CheckBox',
    'jimu/tokenUtils'
  ],
  function(declare, lang, html, on, query, cookie, _WidgetsInTemplateMixin, BaseWidget,
    CheckBox, TokenUtils) {
    var criticality = jimuConfig.widthBreaks[0];
    /* global jimuConfig */
    function isFullWindow() {
      var layoutBox = html.getMarginBox(jimuConfig.layoutId);
      if (layoutBox.w <= criticality) {
        return true;
      } else {
        return false;
      }
    }

    var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {
      baseClass: 'jimu-widget-splash',
      clasName: 'esri.widgets.Splash',

      _hasContent: null,
      _requireCinfirm: null,
      _isClosed: false,

      postCreate: function() {
        this.inherited(arguments);
        this._hasContent = this.config.splash && this.config.splash.splashContent;
        this._requireCinfirm = this.config.splash && this.config.splash.requireConfirm;
        if (this._hasContent) {
          this.customContentNode.innerHTML = this.config.splash.splashContent;
        }

        var hint = this.nls.notShowAgain;
        if (this._requireCinfirm) {
          hint = this.config.splash.confirmText;
          html.addClass(this.okNode, 'enable-btn');
        } else {
          hint = this.nls.notShowAgain;
        }

        this.confirmCheck = new CheckBox({
          label: hint,
          checked: false
        }, this.confirmCheck);
        this.own(on(this.confirmCheck.domNode, 'click', lang.hitch(this, this.onCheckBoxClick)));
        html.setAttr(this.confirmCheck.domNode, 'title', hint);
        this.confirmCheck.startup();
      },

      startup: function() {
        this.inherited(arguments);

        this._normalizeDomNodePosition();
        this.resize();
        if (this._requireCinfirm) {
          html.addClass(this.okNode, 'disable-btn');
          html.removeClass(this.okNode, 'enable-btn');
        }

        this.own(on(window, 'resize', lang.hitch(this, function() {
          this.resize();
        })));

        if (!TokenUtils.isInConfigOrPreviewWindow()) {
          var isfirst = cookie('isfirst');
          if (isfirst === 'false') {
            this.close();
          }
        }

        this._resizeContentImg();
      },

      _normalizeDomNodePosition: function(){
        html.setStyle(this.domNode, 'top', 0);
        html.setStyle(this.domNode, 'left', 0);
        html.setStyle(this.domNode, 'right', 0);
        html.setStyle(this.domNode, 'bottom', 0);
      },

      resize: function() {
        this._changeStatus();
      },

      _resizeContentImg: function() {
        var customBox = html.getContentBox(this.customContentNode);

        if (this._hasContent && !this._isClosed) {
          html.empty(this.customContentNode);

          var splashContent = html.toDom(this.config.splash.splashContent);
          // DocumentFragment or single node
          if (splashContent.nodeType &&
            (splashContent.nodeType === 11 || splashContent.nodeType === 1)) {
            var contentImgs = query('img', splashContent);
            if (contentImgs && contentImgs.length) {
              contentImgs.style({
                maxWidth: (customBox.w - 20) + 'px' // prevent x scroll
              });
            }else if (splashContent.nodeName.toUpperCase() === 'IMG'){
              html.setStyle(splashContent, 'maxWidth', (customBox.w - 20) + 'px');
            }
          }
          html.place(splashContent, this.customContentNode);
        }
      },

      _changeStatus: function() {
        if (isFullWindow()) {
          html.addClass(this.domNode, 'jimu-widget-splash-mobile');
          html.removeClass(this.domNode, 'jimu-widget-splash-desktop');
        } else {
          html.addClass(this.domNode, 'jimu-widget-splash-desktop');
          html.removeClass(this.domNode, 'jimu-widget-splash-mobile');
        }

        if (html.hasClass(this.domNode, 'jimu-widget-splash-desktop')) {
          html.setStyle(this.customContentNode, 'marginTop', '20px');
          html.setStyle(this.customContentNode, 'height', 'auto');

          // this._moveToMiddle();
          var box = html.getContentBox(this.splashContainerNode);
          if (box && box.w > 0) {
            html.setStyle(this.envelopeNode, 'width', box.w + 'px');
          }
          if (box && box.h > 0){
            html.setStyle(this.envelopeNode, 'height', box.h + 'px');
          }
        } else {
          html.setStyle(this.splashContainerNode, 'top', 0);
          html.setStyle(this.splashContainerNode, 'left', 0);
          html.setStyle(this.envelopeNode, 'width', 'auto');
          html.setStyle(this.envelopeNode, 'height', 'auto');

          this._moveContentToMiddle();
          this.fixedContentHeight();
        }
        this._resizeContentImg();
      },

      _moveToMiddle: function() { // desktop
        // var envelopeBox = html.getContentBox(this.envelopeNode);
        // var containerBox = html.getContentBox(this.splashContainerNode);
        // var top = (envelopeBox.h - containerBox.h) / 2;
        // var left = (envelopeBox.w - containerBox.w) / 2;
        // if (typeof top === 'number' && top > 0) {
        //   html.setStyle(this.splashContainerNode, 'top', top + 'px');
        // }
        // if (typeof left === 'number' && left > 0) {
        //   html.setStyle(this.splashContainerNode, 'left', left + 'px');
        // }
      },

      _moveContentToMiddle: function() { // mobile
        var containerBox = html.getMarginBox(this.splashContainerNode);
        var customContentNode = html.getMarginBox(this.customContentNode);
        var footerBox = html.getMarginBox(this.footerNode);
        var mTop = (containerBox.h - footerBox.h - customContentNode.h) / 2;
        if (typeof mTop === 'number' && mTop > 10) { // when customContentNode.h < containerBox.h
          html.setStyle(this.customContentNode, 'marginTop', mTop + 'px');
        } else { // when customContentNode.h > containerBox.h
          html.setStyle(this.customContentNode, 'marginTop', '10px');
        }
      },

      fixedContentHeight: function() {
        var containerContent = html.getContentBox(this.splashContainerNode);
        var footerBox = html.getMarginBox(this.footerNode);
        var customContentHeight = containerContent.h - footerBox.h - 10; // margin-bottom:20px
        if (typeof customContentHeight === 'number' && customContentHeight > 0) {
          html.setStyle(this.customContentNode, 'height', customContentHeight + 'px');
        }
      },

      onCheckBoxClick: function() {
        if (this.config.splash && this.config.splash.requireConfirm) {
          if (this.confirmCheck.getValue()) {
            html.addClass(this.okNode, 'enable-btn');
            html.removeClass(this.okNode, 'disable-btn');
          } else {
            html.addClass(this.okNode, 'disable-btn');
            html.removeClass(this.okNode, 'enable-btn');
          }
        }
      },

      onOkClick: function() {
        if (this._requireCinfirm) {
          if (!this.confirmCheck.getValue()) {
            return;
          } else {
            if (!TokenUtils.isInConfigOrPreviewWindow()) {
              cookie('isfirst', false, {
                expires: 1000,
                path: '/'
              });
            }
            this.close();
          }
        } else {
          if (this.confirmCheck.getValue()) {
            if (!TokenUtils.isInConfigOrPreviewWindow()) {
              cookie('isfirst', false, {
                expires: 1000,
                path: '/'
              });
            }
          }
          this.close();
        }
      },

      close: function() {
        html.setStyle(this.domNode, 'display', 'none');
        this._isClosed = true;
      }
    });
    return clazz;
  });