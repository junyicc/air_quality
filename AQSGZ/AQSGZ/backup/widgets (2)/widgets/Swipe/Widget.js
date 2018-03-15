define([
	'dojo/_base/declare',
	'dojo/_base/array',
	'dojo/_base/lang',
	'dojo/_base/html',
	'dojo/on',
	'jimu/BaseWidget',
	'jimu/LayerInfos/LayerInfos',
	'dijit/_WidgetsInTemplateMixin',
	'esri/dijit/LayerSwipe',
	'dijit/form/Select'
], function(declare, array, lang, html, on, BaseWidget, LayerInfos,
	_WidgetsInTemplateMixin, LayerSwipe) {
	return declare([BaseWidget, _WidgetsInTemplateMixin], {
		baseClass: 'jimu-widget-swipe',

		loaded: false,
		swipeDijit: null,
		layerInfosObj: null,
		open: false,

		postCreate: function() {
			this.inherited(arguments);

			this.own(on(this.swipeLayers, 'Change', lang.hitch(this, this.onSwipeLayersChange)));
			this.own(on(
				this.swipeLayers.dropDown.domNode,
				'mouseenter',
				lang.hitch(this, this.onDropMouseEnter)
			));
			this.own(on(
				this.swipeLayers.dropDown.domNode,
				'mouseleave',
				lang.hitch(this, this.onDropMouseLeave)
			));
			this.own(on(this.map, 'layer-add', lang.hitch(this, this._onMainMapBasemapChange)));

			LayerInfos.getInstance(this.map, this.map.itemInfo)
				.then(lang.hitch(this, function(layerInfosObj) {
					this.layerInfosObj = layerInfosObj;
					this.own(layerInfosObj.on(
						'layerInfosChanged',
						lang.hitch(this, this.onLayerInfosChanged)));
					var infos = layerInfosObj.getLayerInfoArray();

					if (this.config.style === 'scope') {
						this.hintNode.innerHTML = this.nls.spyglassText;
					} else {
						this.hintNode.innerHTML = this.nls.swipeText;
					}

					this._setOptionsOfSwipeLayers(infos);

					this._loadSwipeDijit(infos);
					var layerId = this.swipeDijit.layers[0].id;
					this.swipeLayers.set('value', layerId);
					html.setStyle(
						this.swipeImg,
						'backgroundImage',
						'url("' + this.folderUrl + 'css/images/icon.png")'
					);


					this.loaded = true;
				}));
		},

		_setOptionsOfSwipeLayers: function(layerInfos) {
			var data = array.map(layerInfos, function(info) {
				return {
					label: info.title,
					value: info.id
				};
			});
			this.swipeLayers.set('options', data);
		},

		_loadSwipeDijit: function(layerInfos) {
			var config = lang.clone(this.config);
			if (!config.style) {
				config.style = 'vertical';
			}
			var isBasemap = false;
			var layer = this.map.getLayer(config.layer);
			if (!layer) {
				var layerId = null;
				if (layerInfos.length > 0) {
					layerId = layerInfos[0].id;
				} else {
					isBasemap = true;
				}
				config.layer = layerId;
			}

			this.createSwipeDijit(config.style, config.layer, this.open, isBasemap);
		},

		onIconClick: function() {
			if (!this.loaded || !this.swipeDijit) {
				return;
			}

			if (!this.swipeDijit.enabled) {
				this.swipeDijit.enable();
				html.setStyle(this.swipeLayersMenu, 'display', 'block');
				html.setAttr(this.swipeIcon, 'title', this.nls.disableTips);
				html.addClass(this.swipeIcon, 'swipe-icon-enable');
				this.open = true;
			} else {
				this.swipeDijit.disable();
				html.setStyle(this.swipeLayersMenu, 'display', 'none');
				html.setAttr(this.swipeIcon, 'title', this.nls.enableTips);
				html.removeClass(this.swipeIcon, 'swipe-icon-enable');
				this.open = false;
			}
		},

		onMouseEnter: function(evt) {
			if (this.loaded && this.swipeDijit && this.swipeDijit.enabled) {
				html.setStyle(this.swipeLayersMenu, 'display', 'block');
			}
			evt.preventDefault();
			evt.stopPropagation();
		},

		onPressSwipeImg: function(evt) {
			evt.preventDefault();
		},

		onDropMouseEnter: function(evt) {
			this._mouseOnDropDown = true;
			this.onMouseEnter(evt);
		},

		onDropMouseLeave: function() {
			this._mouseOnDropDown = false;
			this.onMouseLeave();
			this.swipeLayers.dropDown.onCancel();
		},

		onMouseLeave: function() {
			if (this._mouseOnDropDown) {
				return;
			}

			if (this.loaded) {
				html.setStyle(this.swipeLayersMenu, 'display', 'none');
			}
		},

		onSwipeLayersChange: function() {
			if (!this.swipeDijit) {
				return;
			}
			var open = this.swipeDijit.enabled;
			this.destroySwipeDijit();

			var layerId = this.swipeLayers.get('value');
			this.createSwipeDijit(this.config.style || 'vertical', layerId, open);
			html.setStyle(this.swipeLayersMenu, 'display', 'none');
		},

		createSwipeDijit: function(style, layerId, open, isBasemap) {
			var layerParams = this._getLayerParams(layerId, isBasemap);
			this.swipeDijit = new LayerSwipe({
				enabled: !!open,
				type: style,
				map: this.map,
				layers: layerParams
			}, this.layerSwipe);
			this.swipeDijit.startup();
			html.place(this.swipeDijit.domNode, this.map.root, 'before');
		},

		_getLayerParams: function(layerId, isBasemap) {
			var info = this.layerInfosObj.getLayerInfoById(layerId);
			var layerParams = [];
			if (isBasemap) {
				var basemaps = this.layerInfosObj.getBasemapLayers();
				array.forEach(basemaps, lang.hitch(this, function(basemap) {
					layerParams.push(this.map.getLayer(basemap.id));
				}));
			} else {
				info.traversal(lang.hitch(this, function(_info) {
					var layer = this.map.getLayer(_info.id);
					if (layer) {
						layerParams.push(layer);
					}
				}));
			}

			return layerParams;
		},

		destroySwipeDijit: function() {
			if (this.swipeDijit && this.swipeDijit.destroy) {
				this.swipeDijit.destroy();
				this.swipeDijit = null;

				this.layerSwipe = html.create('div', {}, this.swipeLayersMenu, 'after');
			}
		},

		onLayerInfosChanged: function(layerInfo, changedType, layerInfoSelf) {
			if (!this.swipeDijit) {
				return;
			}

			var infos = this.layerInfosObj.getLayerInfoArray();
			this._setOptionsOfSwipeLayers(infos || layerInfo);
			if (changedType === 'removed') {
				var layerId = this.swipeDijit.layers[0].id;
				if (layerId === layerInfoSelf.id) {
					this.destroySwipeDijit();
					this._loadSwipeDijit(infos);
				}
			}
			var newLayerId = this.swipeDijit.layers[0].id;
			this.swipeLayers.set('value', newLayerId);
		},

		_onMainMapBasemapChange: function(evt) {
			if (!(evt.layer && evt.layer._basemapGalleryLayerType)) {
				return;
			}
			var options = this.swipeLayers.get('options');
			if (options && options.length > 0) {
				return;
			} else if (this.loaded) {
				var open = this.swipeDijit.enabled;
				this.destroySwipeDijit();

				this.createSwipeDijit(this.config.style || 'vertical', null, open, true);
				html.setStyle(this.swipeLayersMenu, 'display', 'none');
			}
		},

		destroy: function() {
			this.destroySwipeDijit();
			this.inherited(arguments);
		}
	});
});