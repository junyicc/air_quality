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
    'dojo/_base/html',
    'dojo/_base/array',
    'dojo/on',
    'dojo/aspect',
    'jimu/BaseWidget',
    'esri/dijit/OverviewMap',
    'jimu/utils',
    "dojo/dom-style"
  ],
  function(
    declare,
    lang,
    html,
    array,
    on,
    aspect,
    BaseWidget,
    OverviewMap,
    utils,
    domStyle) {
    var clazz = declare([BaseWidget], {

      name: 'OverviewMap',
      overviewMapDijit: null,
      _showDijit: false,
      _handles: null,

      startup: function() {
        this._handles = [];
        this.inherited(arguments);
        this.createOverviewMap();

        if (this.map) {
          this.own(on(this.map, 'layer-add', lang.hitch(this, this._onMainMapBasemapChange)));
          this.own(on(this.map, 'resize', lang.hitch(this, this._onMainMapResize)));
        }
      },

      _processAttachTo: function(config, position) {
        if (!config.attachTo && position) {
          if (position.top !== undefined && position.left !== undefined) {
            config.attachTo = !window.isRTL ? "top-left" : "top-right";
          } else if (position.top !== undefined && position.right !== undefined) {
            config.attachTo = !window.isRTL ? "top-right" : "top-left";
          } else if (position.bottom !== undefined && position.left !== undefined) {
            config.attachTo = !window.isRTL ? "bottom-left" : "bottom-right";
          } else if (position.bottom !== undefined && position.right !== undefined) {
            config.attachTo = !window.isRTL ? "bottom-right" : "bottom-left";
          }
        }
      },

      _updateDomPosition: function(attachTo) {
        var style = {
          left: 'auto',
          right: 'auto',
          top: 'auto',
          bottom: 'auto',
          width: 'auto'
        };
        var _position = this._getOverviewPositionByAttach(attachTo);
        lang.mixin(style, _position);
        domStyle.set(this.domNode, utils.getPositionStyle(style));
        domStyle.set(this.overviewMapDijit.domNode, utils.getPositionStyle(style));
      },

      createOverviewMap: function(visible) {
        var json = lang.clone(this.config.overviewMap);
        json.map = this.map;
        if (visible !== undefined) {
          json.visible = visible;
        }
        this._processAttachTo(json, this.position);

        // overviewMap dijit has bug in IE8
        var _isShow = json.visible;
        json.visible = false;

        var _hasMaximizeButton = 'maximizeButton' in json;
        json.maximizeButton = _hasMaximizeButton ? json.maximizeButton : true;

        this.overviewMapDijit = new OverviewMap(json);
        this._handles.push(aspect.after(
          this.overviewMapDijit,
          'show',
          lang.hitch(this, '_afterOverviewShow')
        ));
        this._handles.push(aspect.after(
          this.overviewMapDijit,
          'hide',
          lang.hitch(this, '_afterOverviewHide')
        ));
        this.overviewMapDijit.startup();

        this._updateDomPosition(json.attachTo);
        this.domNode.appendChild(this.overviewMapDijit.domNode);
        if (_isShow) {
          this.overviewMapDijit.show();
        }
      },

      _getOverviewPositionByAttach: function(attachTo) {
        var _position = {};
        if (attachTo === 'top-left') {
          _position.left = 0;
          _position.top = 0;
        } else if (attachTo === 'top-right') {
          _position.right = 0;
          _position.top = 0;
        } else if (attachTo === 'bottom-left') {
          _position.bottom = 0;
          _position.left = 0;
        } else if (attachTo === 'bottom-right') {
          _position.bottom = 0;
          _position.right = 0;
        }

        if (window.isRTL) {
          if (isFinite(_position.left)) {
            _position.right = _position.left;
            delete _position.left;
          } else {
            _position.left = _position.right;
            delete _position.right;
          }
        }

        return _position;
      },

      _onMainMapBasemapChange: function(evt) {
        if (!(evt.layer && evt.layer._basemapGalleryLayerType)) {
          return;
        }

        this._destroyOverviewMap();
        this.createOverviewMap(this._showDijit);
      },

      onPositionChange: function() {
        this.inherited(arguments);
        
        var json = lang.clone(this.config.overviewMap);
        json.map = this.map;

        if (json.attachTo) {
          this._updateDomPosition(json.attachTo);
        } else {
          this._destroyOverviewMap();
          this.createOverviewMap(this._showDijit);
        }
      },

      _destroyOverviewMap: function() {
        array.forEach(this._handles, function(handle) {
          if (handle && typeof handle.remove === 'function') {
            handle.remove();
          }
        });
        if (this.overviewMapDijit && this.overviewMapDijit.destroy) {
          this.overviewMapDijit.destroy();
          html.empty(this.domNode);
        }
      },

      _onMainMapResize: function() {
        this._destroyOverviewMap();
        this.createOverviewMap(this._showDijit);
      },

      onReceiveData: function(name) {
        if (name !== "BasemapGallery") {
          return;
        }

        this._destroyOverviewMap();
        this.createOverviewMap(this._showDijit);
      },

      onClose: function() {
        this.overviewMapDijit.destroy();
      },

      _afterOverviewHide: function() {
        this._showDijit = false;
        domStyle.set(this.domNode, {
          width: "auto",
          height: "auto"
        });
      },

      _afterOverviewShow: function() {
        this._showDijit = true;
        domStyle.set(this.domNode, {
          width: this.overviewMapDijit.width + 'px',
          height: this.overviewMapDijit.height + 'px'
        });
      }
    });

    return clazz;
  });