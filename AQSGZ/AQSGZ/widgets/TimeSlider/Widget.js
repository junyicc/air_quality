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
    'dojo/_base/array',
    'dojo/_base/fx',
    'dojo/on',
    'dojo/sniff',
    'dojo/Deferred',
    'jimu/LayerInfos/LayerInfos',
    'jimu/BaseWidget',
    'jimu/utils',
    'esri/lang',
    'esri/TimeExtent',
    'esri/dijit/TimeSlider'
  ],
  function(declare, lang, html, array, baseFx, on, has, Deferred,
    LayerInfos, BaseWidget, utils, esriLang, TimeExtent, TimeSlider) {
    /* globals jimuConfig */
    var criticality = jimuConfig.widthBreaks[0];

    var clazz = declare([BaseWidget], {
      baseClass: 'jimu-widget-timeslider',
      clasName: 'esri.widgets.TimeSlider',
      _showed: false,
      _enabled: true,
      _timeHandles: null,
      layerInfosObj: null,

      postCreate: function() {
        this.inherited(arguments);
        html.setAttr(this.timeIconInner, 'src', this.folderUrl + 'images/icon.png');

        this._timeHandles = [];
        this.getTimeSliderProps(this.map).then(lang.hitch(this, function(props) {
          if (!props) {
            this._disableTimeIcon();
            return;
          }

          LayerInfos.getInstance(this.map, this.map.itemInfo)
            .then(lang.hitch(this, function(layerInfosObj) {
              this.layerInfosObj = layerInfosObj;
              // should check whether is timeInfo layer.
              this.own(on(
                layerInfosObj,
                'layerInfosIsShowInMapChanged',
                lang.hitch(this, this._onLayerInfosIsShowInMapChanged)));
              this.own(layerInfosObj.on(
                'layerInfosChanged',
                lang.hitch(this, this._onLayerInfosChanged)));

              this.processTimeDisableLayer();

              if (this.hasVisibleTemporalLayer()) {
                this._enableTimeIcon();
              } else {
                this._disableTimeIcon();
              }
            }));
        }));

        this.own(on(this.timeIconNode, 'click', lang.hitch(this, this.onTimeIconClick)));
      },

      startup: function() {
        this.inherited(arguments);
        this.own(on(this.map, 'resize', lang.hitch(this, this._onMapResize)));
      },

      _isTimeTemporalLayer: function(layer, mustVisible) {
        var _hasValidTime = layer && layer.timeInfo && layer.useMapTime;
        var _layerInfo = this.layerInfosObj.getLayerInfoById(layer.id);
        var timeAnimation = _layerInfo && _layerInfo.originOperLayer &&
          (_layerInfo.originOperLayer.timeAnimation !== false);
        var condition = _hasValidTime && timeAnimation && (mustVisible ? layer.visible : true);

        if (condition) {
          var layerType = layer.declaredClass;
          if (layerType === "esri.layers.KMLLayer") {
            var internalLayers = layer.getLayers();
            var some = array.some(internalLayers, function(kLayer) {
              if (kLayer.timeInfo && kLayer.timeInfo.timeExtent) {
                return true;
              }
              return false;
            });
            if (some) {
              return true;
            }
          } else if (layer.timeInfo && layer.timeInfo.timeExtent) {
            return true;
          }
        }

        return false;
      },

      _processTimeUpdate: function(layer) {
        var _layerInfo = null;
        var timeAnimation = true;
        _layerInfo = this.layerInfosObj.getLayerInfoById(layer.id);
        timeAnimation = _layerInfo && _layerInfo.originOperLayer &&
          (_layerInfo.originOperLayer.timeAnimation !== false);
        if (!timeAnimation && 'setUseMapTime' in layer) {
          layer.setUseMapTime(false);
        }
      },

      processTimeDisableLayer: function() {
        var i = 0, len, layer, layerId;
        for (i = 0, len = this.map.layerIds.length; i < len; i++) {
          layerId = this.map.layerIds[i];
          layer = this.map.getLayer(layerId);

          this._processTimeUpdate(layer);
        }

        for (i = 0, len = this.map.graphicsLayerIds.length; i < len; i++) {
          layerId = this.map.graphicsLayerIds[i];
          layer = this.map.getLayer(layerId);

          this._processTimeUpdate(layer);
        }
      },

      hasVisibleTemporalLayer: function() {
        var i = 0,
          len, layer, layerId;
        for (i = 0, len = this.map.layerIds.length; i < len; i++) {
          layerId = this.map.layerIds[i];
          layer = this.map.getLayer(layerId);

          if (this._isTimeTemporalLayer(layer, true)) {
            return true;
          }
        }

        for (i = 0, len = this.map.graphicsLayerIds.length; i < len; i++) {
          layerId = this.map.graphicsLayerIds[i];
          layer = this.map.getLayer(layerId);

          if (this._isTimeTemporalLayer(layer, true)) {
            return true;
          }
        }

        return false;
      },

      _onLayerInfosIsShowInMapChanged: function(changedLayerInfos) {
        var timeTemporalLayerChanged = array.some(
          changedLayerInfos,
          lang.hitch(this, function(layerInfo) {
            var _layer = null;
            while (!_layer) {
              _layer = this.map.getLayer(layerInfo.id);
              layerInfo = layerInfo.parentLayerInfo;
            }

            return this._isTimeTemporalLayer(_layer);
          }));

        if (timeTemporalLayerChanged) {
          this._onTimeTemportalLayerChanged();
        }
      },

      _onLayerInfosChanged: function(layerInfo, changedType, layerInfoSelf) {
        /* jshint unused:true */
        if (changedType === 'added') {
          var _layer = this.map.getLayer(layerInfoSelf.id);
          var visibleTimeTemporalLayerChanged = this._isTimeTemporalLayer(_layer, true);
  
          if (visibleTimeTemporalLayerChanged) {
            this._onTimeTemportalLayerChanged();
          }
        } else if (changedType === 'removed') {
          this._onTimeTemportalLayerChanged();
        }
      },

      _onTimeTemportalLayerChanged: function() {
        if (!this._showed) {
          if (this.hasVisibleTemporalLayer()) {
            this._enableTimeIcon();
          } else {
            this._disableTimeIcon();
          }
        } else {
          if (this.hasVisibleTemporalLayer()) {
            if (this.timeSlider) {
              this.updateLayerLabel();
            } else {
              this.createTimeSlider();
            }
          } else {
            if (this.timeSlider) {
              this.closeTimeSlider();
            }
            this._disableTimeIcon();
          }
        }
      },

      _enableTimeIcon: function() {
        this._enabled = true;
        html.removeClass(this.timeIconNode, 'disable-time-icon');
        html.addClass(this.timeIconNode, 'enable-time-icon');
        html.setAttr(this.timeIconNode, 'title', this.nls.enableTips);
      },

      _disableTimeIcon: function() {
        this._enabled = false;
        html.removeClass(this.timeIconNode, 'enable-time-icon');
        html.addClass(this.timeIconNode, 'disable-time-icon');
        html.setAttr(this.timeIconNode, 'title', this.nls.disableTips);
      },

      onTimeIconClick: function() {
        if (!this._enabled) {
          return;
        }

        if (!this._showed) {
          this.showTimeSlider();
        }
      },

      _onCloseClick: function() {
        if (this._showed) {
          this.closeTimeSlider();
        }
      },

      _isRunInMobile: function() {
        var box = html.getMarginBox(this.map.root);
        return box.w < criticality;
      },

      showTimeSlider: function() {
        this.createTimeSlider();
        this._showed = true;
        html.setStyle(this.timeContentNode, 'display', 'block');
        html.addClass(this.domNode, 'show-time-slider');
        html.setStyle(this.timeIconNode, 'display', 'none');

        if (has('ie') === 8) {
          html.setStyle(this.timeContentNode, 'background', '#000');
        }
        baseFx.animateProperty({
          node: this.timeContentNode,
          properties: {
            opacity: {
              start: 0,
              end: has('ie') === 8 ? 0.4 : 1
            }
          },
          duration: 500
        }).play();
      },

      closeTimeSlider: function() {
        baseFx.animateProperty({
          node: this.timeContentNode,
          properties: {
            opacity: {
              start: 1,
              end: 0
            }
          },
          onEnd: lang.hitch(this, function() {
            this.removeTimeSlider();
            this._showed = false;
            html.removeClass(this.domNode, 'mobile-time-slider');
            html.removeClass(this.timeContentNode, 'mobile');

            html.setStyle(this.timeContentNode, 'display', 'none');
            html.removeClass(this.domNode, 'show-time-slider');
            html.setStyle(this.timeIconNode, 'display', 'block');
          }),
          duration: 500
        }).play();
      },

      getTimeSliderProps: function(map) {
        var def = new Deferred();
        var itemInfo = map && map.itemInfo;
        if (itemInfo && itemInfo.itemData && itemInfo.itemData.widgets &&
          itemInfo.itemData.widgets.timeSlider && itemInfo.itemData.widgets.timeSlider.properties) {
          def.resolve(itemInfo.itemData.widgets.timeSlider.properties);
        } else {
          def.resolve(null);
        }

        return def;
      },

      createTimeSlider: function() {
        if (!this.timeSlider) {
          this.getTimeSliderProps(this.map).then(lang.hitch(this, function(props) {
            this.timeSlider = new TimeSlider({}, this.sliderNode);
            this._adaptResponsive();
            this.map.setTimeSlider(this.timeSlider);
            var fromTime = new Date(props.startTime);
            var endTime = new Date(props.endTime);

            var timeExtent = new TimeExtent(fromTime, endTime);
            this.timeSlider.setThumbCount(props.thumbCount);
            if (props.numberOfStops) {
              this.timeSlider.createTimeStopsByCount(timeExtent, (props.numberOfStops + 1));
            } else {
              this.timeSlider.createTimeStopsByTimeInterval(
                timeExtent,
                props.timeStopInterval.interval,
                props.timeStopInterval.units
              );
            }
            this.timeSlider.setThumbMovingRate(props.thumbMovingRate);

            if (this.timeSlider.timeStops.length > 25) {
              this.timeSlider.setTickCount(0);
            }
            if (this.timeSlider.thumbCount === 2) {
              this.timeSlider.setThumbIndexes([0, 1]);
            }

            this.timeSlider.setLoop(true);
            this.timeSlider.startup();
            html.addClass(this.timeSlider.domNode, 'jimu-float-leading');

            this.updateLayerLabel();
            this.updateTimeExtentLabel();

            this._timeHandles.push(on(
              this.timeSlider,
              'time-extent-change',
              lang.hitch(this, this.updateTimeExtentLabel)
            ));
          }));
        }
      },

      _onSelectSpeedItem: function(evt) {
        if (evt.target) {
          var rate = html.getAttr(evt.target, 'speed');
          this.getTimeSliderProps(this.map).then(lang.hitch(this, function(props) {
            if (props && rate) {
              rate = parseFloat(rate);
              this.timeSlider.setThumbMovingRate(props.thumbMovingRate / rate);
              this.speedLabelNode.innerHTML = evt.target.innerHTML;
            }
            html.setStyle(this.speedMenu, 'display', 'none');
          }));
        }
      },

      _onSpeedLabelClick: function() {
        html.setStyle(this.speedMenu, 'display', 'block');
      },

      _onMouseEnterSpeedContainer: function() {
        html.setStyle(this.speedMenu, 'display', 'block');
      },

      _onMouseLeaveSpeedContainer: function() {
        html.setStyle(this.speedMenu, 'display', 'none');
      },

      updateTimeSlider: function() {
        if (this.timeSlider) {
          var isPlaying = this.timeSlider.playing;
          this.removeTimeSlider();
          this.createTimeSlider();
          if (isPlaying) {
            this.timeSlider.play();
          }
        }
      },

      removeTimeSlider: function() {
        array.forEach(this._timeHandles, function(handle) {
          if (handle && handle.remove) {
            handle.remove();
          }
        });
        this.timeSlider.destroy();
        this.timeSlider = null;
        if (this.map) {
          this.map.setTimeExtent(null);
        }
        this.sliderNode = html.create('div', {}, this.speedContainerNode, 'before');
      },

      updateLayerLabel: function() {
        if (this.config.showLabels) {
          html.setStyle(this.layerLabelsNode, 'display', 'block');
          var label = this.nls.layers;
          var names = this._getVisibleTemporalLayerNames();
          label = label + names.join(',');
          this.layerLabelsNode.innerHTML = label;
          html.setAttr(this.layerLabelsNode, 'title', label);
        } else {
          html.setStyle(this.layerLabelsNode, 'display', 'none');
        }
      },

      _getVisibleTemporalLayerNames: function() {
        var i = 0,
          len, layer, layerId;
        var ids = [];
        for (i = 0, len = this.map.layerIds.length; i < len; i++) {
          layerId = this.map.layerIds[i];
          layer = this.map.getLayer(layerId);

          if (this._isTimeTemporalLayer(layer, true)) {
            ids.push(layer.id);
          }
        }

        for (i = 0, len = this.map.graphicsLayerIds.length; i < len; i++) {
          layerId = this.map.graphicsLayerIds[i];
          layer = this.map.getLayer(layerId);

          if (this._isTimeTemporalLayer(layer, true)) {
            ids.push(layer.id);
          }
        }

        var names = array.map(ids, lang.hitch(this, function(id) {
          var info = this.layerInfosObj.getLayerInfoById(id);
          return info.title || "";
        }));

        return names;
      },

      updateTimeExtentLabel: function(timeExtent) {
        var label = this.nls.timeExtent;
        var start = null;
        var end = null;

        if (!timeExtent) {
          if (this.timeSlider.thumbCount === 2) {
            start = this.timeSlider.timeStops[0];
            end = this.timeSlider.timeStops[1];
          } else {
            start = this.timeSlider.timeStops[0];
          }
        } else {
          start = timeExtent.startTime;
          if (timeExtent.endTime.getTime() - timeExtent.startTime.getTime() > 0) {
            end = timeExtent.endTime;
          }
        }

        if (end) {
          label = esriLang.substitute({
            FROMTIME: utils.localizeDate(start),
            ENDTIME: utils.localizeDate(end)
          }, label);
        } else {
          label = utils.localizeDate(start);
        }

        this.timeExtentLabelNode.innerHTML = label;
      },

      _adaptResponsive: function() {
        var _w = null;
        var box = html.getMarginBox(this.map.root);
        if (box.w < criticality) {
          html.addClass(this.timeContentNode, 'mobile');
          html.addClass(this.domNode, 'mobile-time-slider');
          _w = box.w - 40 - 15;
        } else {
          html.removeClass(this.timeContentNode, 'mobile');
          html.removeClass(this.domNode, 'mobile-time-slider');
          _w = 600;
        }
        html.setStyle(this.timeSlider.domNode, 'width', _w + 'px');
      },

      _onMapResize: function() {
        if (!this._showed) {
          return;
        }

        this._adaptResponsive();
      },

      destroy: function() {
        if (this.map) {
          this.map.setTimeExtent(null);
        }
        this.inherited(arguments);
      }
    });
    return clazz;
  });