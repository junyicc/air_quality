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
    'dojo/dnd/move',
    'dijit/_TemplatedMixin',
    'jimu/BaseWidgetPanel',
    'dojox/layout/ResizeHandle'
  ],
  function(
    declare, lang, html, on, Move,
    _TemplatedMixin, BaseWidgetPanel, ResizeHandle
  ) {
    /* global jimuConfig */
    return declare([BaseWidgetPanel, _TemplatedMixin], {
      baseClass: 'jimu-widget-panel jimu-preload-widget-icon-panel',
      _positionInfoBox: null,
      _originalBox: null,
      widgetIcon: null,
      _resizeOnOpen: true,

      templateString: '<div data-dojo-attach-point="boxNode">' +
        '<div class="title" data-dojo-attach-point="titleNode">' +
        '<div class="title-label jimu-vcenter-text jimu-float-leading jimu-leading-margin1"' +
        'data-dojo-attach-point="titleLabelNode">${label}</div>' +
        '<div class="close-btn jimu-vcenter jimu-float-trailing" ' +
        'data-dojo-attach-point="closeNode"' +
        'data-dojo-attach-event="onclick:_onCloseBtnClicked"></div>' +
        '<div class="foldable-btn jimu-vcenter jimu-float-trailing" ' +
        'data-dojo-attach-point="foldableNode"' +
        'data-dojo-attach-event="onclick:_onFoldableBtnClicked"></div>' +
        '</div>' +
        '<div class="jimu-container" data-dojo-attach-point="containerNode"></div>' +
        '</div>',

      _onFoldableBtnClicked: function() {
        var posInfo = this._getPositionInfo();
        if (posInfo.isFull) {
          var isShow = html.getStyle(this.containerNode, 'display') === 'block' ? true : false;
          if (isShow) {
            //hide container
            html.setStyle(this.containerNode, 'display', 'none');
            html.removeClass(this.foldableNode, 'fold-down');
            html.addClass(this.foldableNode, 'fold-up');
            html.setStyle(this.domNode, {
              position: 'absolute',
              top: 'auto',
              bottom: 0,
              left: 0,
              right: 0,
              height: 'auto'
            });
            this.panelManager.minimizePanel(this);
          } else {
            //show container
            html.setStyle(this.containerNode, 'display', 'block');
            html.removeClass(this.foldableNode, 'fold-up');
            html.addClass(this.foldableNode, 'fold-down');
            html.setStyle(this.domNode, {
              position: 'absolute',
              right: 0,
              left: 0,
              top: 0,
              width: '100%',
              height: '100%'
            });
          }
          this.panelManager.maximizePanel(this);
        }
      },

      _onCloseBtnClicked: function() {
        html.setStyle(this.domNode, 'display', 'none');
        this.panelManager.closePanel(this);
      },

      _normalizePositionObj: function(position) {
        var layoutBox = this._getLayoutBox();
        position.left = position.left || layoutBox.w - position.right;
        position.top = position.top || layoutBox.h - position.bottom;

        delete position.right;
        delete position.bottom;
        this.position = lang.mixin(lang.clone(this.position), position);
      },

      makePositionInfoBox: function() {
        this._positionInfoBox = {
          w: this.position.width || 400,
          h: this.position.height || 400,
          l: this.position.left || 0,
          t: this.position.top || 0
        };
      },

      _makeOriginalBox: function() {
        this._originalBox = {
          w: this.position.width || 400,
          h: this.position.height || 410,
          l: this.position.left || 0,
          t: this.position.top || 0
        };
      },

      makeResizable: function() {
        this.disableResizable();
        this.resizeHandle = new ResizeHandle({
          targetId: this,
          minWidth: this._originalBox.w,
          minHeight: this._originalBox.h,
          activeResize: false
        }).placeAt(this.domNode);
        this.resizeHandle.startup();
      },

      disableResizable: function() {
        if (this.resizeHandle) {
          this.resizeHandle.destroy();
          this.resizeHandle = null;
        }
      },

      makeMoveable: function(handleNode, width, tolerance) {
        this.disableMoveable();
        var containerBox = html.getMarginBox(jimuConfig.layoutId);
        containerBox.l = containerBox.l - width + tolerance;
        containerBox.w = containerBox.w + 2 * (width - tolerance);

        this.moveable = new Move.boxConstrainedMoveable(this.domNode, {
          box: containerBox,
          handle: handleNode || this.titleNode,
          within: true
        });
        this.own(on(this.moveable, 'Moving', lang.hitch(this, this.onMoving)));
        this.own(on(this.moveable, 'MoveStop', lang.hitch(this, this.onMoveStop)));
      },

      disableMoveable: function() {
        if (this.moveable) {
          this.moveable.destroy();
          this.moveable = null;
        }
      },

      createHandleNode: function() {
        return this.titleNode;
      },

      startup: function() {
        this.inherited(arguments);

        this._normalizePositionObj(this.position);
        this._makeOriginalBox();
        this.makePositionInfoBox();
        var handleNode = this.createHandleNode();
        this.makeMoveable(handleNode, this._positionInfoBox.w, this._positionInfoBox.w * 0.25);
      },

      onOpen: function() {
        if (this._resizeOnOpen) {
          this.resize();
          this._resizeOnOpen = false;
        }

        this.inherited(arguments);
      },

      _switchToFullUI: function() {
        this.closeNode.style.marginTop = '0px';
        html.removeClass(this.titleNode, 'title-normal');
        html.addClass(this.titleNode, 'title-full');
        html.setStyle(this.foldableNode, 'display', 'block');
        var isShow = html.getStyle(this.containerNode, 'display') === 'block' ? true : false;
        if (isShow) {
          html.removeClass(this.foldableNode, 'fold-up');
          html.addClass(this.foldableNode, 'fold-down');
        }
      },

      _switchToNormalUI: function() {
        this.closeNode.style.marginTop = '0px';
        html.removeClass(this.titleNode, 'title-full');
        html.addClass(this.titleNode, 'title-normal');
        html.setStyle(this.foldableNode, 'display', 'none');
      },

      resize: function(tmp) {
        var posInfo = this._getPositionInfo();
        var _pos = {
          left: posInfo.position.left,
          top: posInfo.position.top,
          width: this._positionInfoBox.w,
          height: this._positionInfoBox.h
        };
        if (tmp) {
          tmp.t = this.domNode.offsetTop;
          _pos.left = tmp.l ? tmp.l : _pos.left;
          _pos.top = tmp.t ? tmp.t : _pos.top;
          _pos.width = tmp.w ? tmp.w : _pos.width;
          _pos.height = tmp.h ? tmp.h : _pos.height;

          this._normalizePositionObj(lang.clone(_pos));
          this.makePositionInfoBox();

          _pos.width = this._positionInfoBox.w;
          _pos.height = this._positionInfoBox.h;
        }
        posInfo.position = _pos;

        this._onResponsible(posInfo);
        this.inherited(arguments);
      },

      _onResponsible: function(posInfo) {
        if (posInfo.isFull) {
          this._fullPosition();
          this.disableMoveable();
          this.disableResizable();
          this._switchToFullUI();
        } else {
          this._normalPosition(posInfo.position);
          this.makeResizable();
          this.makeMoveable();
          this._switchToNormalUI();
        }
      },

      onPositionChange: function(position) {
        this._normalizePositionObj(position);
        this.makePositionInfoBox();

        var posInfo = this._getPositionInfo();
        this._onResponsible(posInfo);
      },

      destroy: function() {
        this.widgetIcon = null;
        this.inherited(arguments);
      },

      _getLayoutBox: function() {
        var pid = jimuConfig.layoutId;
        if (this.positionRelativeTo === 'map') {
          pid = jimuConfig.mapId;
        } else {
          pid = jimuConfig.layoutId;
        }
        return html.getMarginBox(pid);
      },

      _getPositionInfo: function() {
        var result = {
          isFull: false,
          position: {
            left: 0,
            top: 5
          }
        };
        var layoutBox = this._getLayoutBox();
        //judge width
        var leftBlankWidth = this._positionInfoBox.l;
        if (layoutBox.w > jimuConfig.widthBreaks[0]) {
          if (window.isRTL) {
            result.position.left = layoutBox.w - leftBlankWidth;
          } else {
            result.position.left = leftBlankWidth;
          }
        } else {
          result.isFull = true;
          return result;
        }

        //judge height
        // preloadIcon height is 40px, tolerance is 3px
        var topBlankHeight = this._positionInfoBox.t;
        var bottomBlankHeight = layoutBox.h - topBlankHeight;
        if (topBlankHeight >= bottomBlankHeight) {
          if (topBlankHeight >= this._positionInfoBox.h) { // preloadIcon height is 40px
            result.position.top = this._positionInfoBox.t - this._positionInfoBox.h - 40 - 3;
          }
        } else {
          if (bottomBlankHeight >= this._positionInfoBox.h) {
            result.position.top = this._positionInfoBox.t + 40 + 3; // preloadIcon height is 40px
          }
        }

        if (!result.isFull) {
          if ((result.position.left + this._positionInfoBox.w) > layoutBox.w) {
            result.position.left -= this._positionInfoBox.w;
          }
        }

        return result;
      },

      _fullPosition: function() {
        html.place(this.domNode, jimuConfig.layoutId);
        var isShowContainer = html.getStyle(this.containerNode, 'display') === 'block';
        if (!isShowContainer) {
          html.setStyle(this.containerNode, 'display', 'block');
        }
        html.setStyle(this.domNode, {
          left: 0,
          width: '100%',
          top: 0,
          bottom: 0,
          height: '100%'
        });
      },

      _normalPosition: function(position) {
        html.place(this.domNode, jimuConfig.mapId);
        html.setStyle(this.containerNode, 'display', 'block');

        html.setStyle(this.domNode, {
          left: position.left + 'px',
          right: 'auto',
          top: position.top + 'px',
          width: position.width + 'px',
          height: position.height + 'px'
        });
      },

      onMoving: function(mover) {
        html.setStyle(mover.node, 'opacity', 0.9);
      },

      onMoveStop: function(mover) {
        html.setStyle(mover.node, 'opacity', 1);
        var panelBox = html.getMarginBox(mover.node);
        var _pos = {
          left: panelBox.l,
          top: panelBox.t,
          width: panelBox.w,
          height: panelBox.h
        };

        this._normalizePositionObj(lang.clone(_pos));
        this.makePositionInfoBox();
      }
    });
  });