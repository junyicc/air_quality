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
    'dojo/_base/html',
    'dijit/_WidgetsInTemplateMixin',
    'jimu/BaseWidget',
    'dijit/layout/TabContainer',
    "dijit/layout/ContentPane",
    'jimu/utils',
    'jimu/dijit/Message',
    "dgrid/OnDemandGrid",
    "dgrid/Selection",
    "dojo/store/Cache",
    "dojo/store/Memory",
    "dojo/store/Observable",
    "dgrid/extensions/ColumnHider",
    "dgrid/extensions/ColumnResizer",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/dom-attr",
    "dojo/dom-class",
    "dojo/Deferred",
    "esri/config",
    "esri/main",
    "esri/request",
    "esri/tasks/RelationParameters",
    "esri/layers/GraphicsLayer",
    "esri/layers/FeatureLayer",
    "esri/tasks/QueryTask",
    "esri/tasks/query",
    "esri/tasks/RelationshipQuery",
    "esri/tasks/ProjectParameters",
    "esri/graphic",
    "esri/geometry/Point",
    "esri/geometry/Multipoint",
    "esri/geometry/Polyline",
    "esri/geometry/Polygon",
    "esri/symbols/SimpleLineSymbol",
    "esri/symbols/SimpleFillSymbol",
    "esri/Color",
    "esri/geometry/normalizeUtils",
    'dojo/_base/lang',
    "dojo/on",
    'dojo/touch',
    'dojo/topic',
    'dojo/aspect',
    "dojo/_base/array",
    "dojo/has",
    "dojo/query",
    "dojo/_base/window",
    "dijit/Toolbar",
    "dijit/form/Button",
    "dijit/DropDownMenu",
    "dijit/MenuItem",
    "dijit/CheckedMenuItem",
    "dijit/form/DropDownButton",
    'jimu/dijit/LoadingIndicator',
    './FeatureLayerQueryStore',
    './utils',
    './PopupHandler'
  ],
  function(
    declare,
    html,
    _WidgetsInTemplateMixin,
    BaseWidget,
    TabContainer,
    ContentPane,
    utils,
    Message,
    OnDemandGrid,
    Selection,
    Cache,
    Memory,
    Observable,
    ColumnHider,
    ColumnResizer,
    domConstruct,
    domStyle,
    domAttr,
    domClass,
    Deferred,
    esriConfig,
    esri,
    esriRequest,
    RelationParameters,
    GraphicsLayer,
    FeatureLayer,
    QueryTask,
    Query,
    RelationshipQuery,
    ProjectParameters,
    Graphic,
    Point,
    Multipoint,
    Polyline,
    Polygon,
    SimpleLineSymbol,
    SimpleFillSymbol,
    Color,
    normalizeUtils,
    lang,
    on,
    touch,
    topic,
    aspect,
    array,
    has,
    domQuery,
    win,
    Toolbar,
    Button,
    DropDownMenu,
    MenuItem,
    CheckedMenuItem,
    DropDownButton,
    LoadingIndicator,
    FeatureLayerQueryStore,
    attrUtils,
    PopupHandler) {
    var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {
      /* global apiUrl, jimuConfig */
      name: 'AttributeTable',
      baseClass: 'jimu-widget-attributetable',
      normalHeight: 0,
      _defaultFeatureCount: 2000,
      _defaultBatchCount: 25,
      _batchCount: 0,
      // TODO: layerType: FeatureLayer, ImageLayer, Table, RelationshipTable
      _layerTypes: {
        FEATURELAYER: 'FeatureLayer',
        IMAGELAYER: 'ImageLayer',
        TABLE: 'Table',
        RELATIONSHIPTABLE: 'RelationshipTable'
      },

      postMixInProperties: function() {
        this.nls.features = this.nls.features || 'features';
      },

      startup: function() {
        this.inherited(arguments);
        utils.loadStyleLink("dgrid", apiUrl + "dgrid/css/dgrid.css");
        this.AttributeTableDiv = null;
        this.layers = [];
        this.loadings = [];
        this.configLayerInfos = []; // keep pace with this.config.layers
        this._delayedLayerInfos = [];
        this._allLayerInfos = [];
        this.grids = [];
        this.gridFooters = [];

        // one layer may be have multiple relationships, so we use key-value to store relationships
        this.relationshipsSet = {};
        this.relationLoadingSet = {};
        this.relationGridsSet = {};
        this.relationGridFootersSet = {};
        this.relationTabPagesSet = {};
        this.relationSelectedRowsLabelDivsSet = {};
        this.currentRelationshipKey = null;

        this.selections = [];
        this.selectedRowsLabelDivs = [];
        this.toolbarDiv = null;
        this.tabContainer = null;
        this.layerTabPages = [];

        this.tableDiv = null;
        this.zoomButton = null;
        this.exportButton = null;
        this.selectionMenu = null;
        this.refreshButton = null;
        this.moveMaskDiv = null;
        this.moveMode = false;
        this.moveY = 0;
        this.previousDomHeight = 0;
        this.previousGridHeight = 0;
        this.noGridHeight = 0;
        this.toolbarHeight = 0;
        this.bottomPosition = 0;
        this.matchingCheckBox = null;
        this.layersIndex = -1;
        this.matchingMap = false;

        this.showing = true;
        this.graphicsLayers = [];

        this.isFirst = true;
        this.currentHeight = 0;
        this.setInitialPosition();
        this.openHeight = this.normalHeight;

        // event handlers on draging
        this._dragingHandlers = [];

        this.own(topic.subscribe('changeMapPosition', lang.hitch(this, this._onMapPositionChange)));

        attrUtils.readLayerInfosObj(this.map).then(lang.hitch(this, function(layerInfosObj) {
          this.own(on(
            layerInfosObj,
            'layerInfosIsShowInMapChanged',
            lang.hitch(this, this.onLayerInfosIsShowInMapChanged)));
          this.own(layerInfosObj.on(
            'layerInfosChanged',
            lang.hitch(this, this.onLayerInfosChanged)));
          this._createBar();
          this._closeTable();
        }));

        // create PopupHandler
        this.popupHandler = new PopupHandler({
          map: this.map,
          attrWidget: this,
          nls: this.nls
        });
      },

      _createBar: function() {
        this.arrowDiv = domConstruct.create("div");
        domClass.add(this.arrowDiv, "jimu-widget-attributetable-move");
        html.create('div', {
          'class': "jimu-widget-attributetable-thumb"
        }, this.arrowDiv);
        this.bar = domConstruct.create("div");
        domClass.add(this.bar, "jimu-widget-attributetable-bar");
        domConstruct.place(this.bar, this.domNode);
        domConstruct.place(this.arrowDiv, this.domNode);

        this.moveMaskDiv = domConstruct.create("div", {
          style: "opacity:0; width:100%; height:100%;" +
            "position:absolute; z-index:999; display:none;cursor: ns-resize",
          'class': 'jimu-widget-attributetable-mask'
        });
        domConstruct.place(this.moveMaskDiv, win.body(), "first");

        this.own(on(this.arrowDiv, 'mousedown', lang.hitch(this, this._onDragStart)));
        this.own(on(this.arrowDiv, touch.press, lang.hitch(this, this._onDragStart)));
        this.own(on(this.bar, 'click', lang.hitch(this, this._switchTable)));
      },

      _switchTable: function() {
        if (this.currentHeight === 0) {
          this._openTable();
        } else {
          this._closeTable();
        }
      },

      _openTable: function() {
        var def = new Deferred();
        if (this.isFirst) { // first open
          this.currentHeight = this.normalHeight;
          this.isFirst = false;
          if (!this.loading) {
            this.loading = new LoadingIndicator();
          }
          this.loading.placeAt(this.domNode);
          this.loading.show();

          attrUtils.readConfigLayerInfosFromMap(this.map)
            .then(lang.hitch(this, function(layerInfos) {
              if (this.config.layerInfos.length === 0) {
                var configLayerInfos = attrUtils.getConfigInfosFromLayerInfos(layerInfos);
                this.config.layerInfos = array.filter(configLayerInfos, function(layer) {
                  return layer.show;
                });
              } else {
                this.config.layerInfos = array.filter(
                  lang.clone(this.config.layerInfos),
                  function(layer) {
                    return layer.show;
                  });
              }

              this._allLayerInfos = layerInfos;
              this._processDelayedLayerInfos();

              this._init();
              this.showRefreshing(false);
              def.resolve();
            }), lang.hitch(this, function(err) {
              console.error(err);
            }));
        } else {
          def.resolve();
        }
        domClass.remove(this.bar, 'close');
        domClass.add(this.bar, 'open');
        this._changeLeftPostion();
        this._changeHeight(this.openHeight);
        domAttr.set(this.bar, 'title', this.nls.closeTableTip);
        return def;
      },

      _closeTable: function() {
        domClass.remove(this.bar, 'open');
        domClass.add(this.bar, 'close');
        this._changeHeight(0);
        this.showRefreshing(false);
        domAttr.set(this.bar, 'title', this.nls.openTableTip);
      },

      _init: function() {
        this.initConfigLayerInfos();
        this.initDiv();
        this.resize();

        this.own(on(this.map, "extent-change", lang.hitch(this, this.onExtentChange)));
        this.own(on(this.map, "layer-remove", lang.hitch(this, this.onRemoveLayer)));
        this.own(on(this.map, "resize", lang.hitch(this, this.onMapResize)));
        this.own(on(window.document, "mouseup", lang.hitch(this, this._onDragEnd)));
        this.own(on(window.document, "mousemove", lang.hitch(this, this._onDraging)));
        this.own(on(window.document, touch.move, lang.hitch(this, this._onDraging)));
        this.own(on(window.document, touch.release, lang.hitch(this, this._onDragEnd)));
      },

      _processDelayedLayerInfos: function() { // must be invoke after initialize this._layerInfos
        if (this._delayedLayerInfos.length > 0) {
          array.forEach(this._delayedLayerInfos, lang.hitch(this, function(delayedLayerInfo) {
            if (!this._getLayerInfoById(delayedLayerInfo.id)) {
              this._allLayerInfos.push(delayedLayerInfo);
            }
          }));

          this._delayedLayerInfos = [];
        }
      },

      onLayerInfosIsShowInMapChanged: function() {
        this.checkMapInteractiveFeature();
      },

      onLayerInfosChanged: function(layerInfo, changeType, layerInfoSelf) {
        if ('added' !== changeType || !layerInfoSelf || !layerInfo) {
          return;
        }
        layerInfoSelf.getSupportTableInfo().then(lang.hitch(this, function(supportTableInfo) {
          if (supportTableInfo.isSupportedLayer) {
            if (this._allLayerInfos.length === 0) {
              this._delayedLayerInfos.push(layerInfoSelf);
            } else if (this._allLayerInfos.length > 0 &&
              !this._getLayerInfoById(layerInfoSelf.id)) {
              this._allLayerInfos.push(layerInfoSelf); // _allLayerInfos read from map
              this.initConfigLayerInfos();

              if (this.getExistLayerTabPage(layerInfoSelf.id)) {
                var tabId = layerInfoSelf.id;
                this._startQueryOnLayerTab(tabId);

                this.onMapResize();
                this.resetButtonStatus();
              }
            }
          }
        }));
      },

      destroy: function() {
        var len, i;
        len = this.layerTabPages.length;
        for (i = 0; i < len; i++) {
          this.layerTabPages[i].destroy();
        }
        this.layerTabPages = null;
        for (var p in this.relationTabPagesSet) {
          if (this.relationTabPagesSet[p]) {
            this.relationTabPagesSet[p].destroy();
          }
        }
        if (this.tabContainer) {
          this.tabContainer.destroy();
        }

        this.layers = null;
        this.grids = null;
        this.selectedRowsLabelDivs = null;
        this._allLayerInfos = null;
        this.configLayerInfos = null;
        this.layersIndex = -1;
        this.tableDiv = null;
        this.zoomButton = null;
        this.exportButton = null;
        if (this.moveMaskDiv) {
          domConstruct.destroy(this.moveMaskDiv);
          this.moveMaskDiv = null;
        }
        if (this.selectionMenu) {
          this.selectionMenu.destroy();
        }
        this.selectionMenu = null;
        this.refreshButton = null;
        if (this.AttributeTableDiv) {
          domConstruct.empty(this.AttributeTableDiv);
          this.AttributeTableDiv = null;
        }

        len = this.graphicsLayers.length;
        for (i = 0; i < len; i++) {
          if (this.graphicsLayers[i]) {
            this.map.removeLayer(this.graphicsLayers[i]);
          }
        }
        this.popupHandler.destroy();
        this.inherited(arguments);
      },

      onOpen: function() {
        if (!this.config.layerInfos.length) {
          this.onClose();
        } else {
          domStyle.set(this.domNode, "display", "");
          this.showing = true;
          this.onMapResize();
        }
      },

      onClose: function() {
        //domStyle.set(this.domNode, "display", "none");
        //this.showing = false;

        // if (popup) {
        //   this.popupMessage(this.nls.closeMessage);
        // }
      },

      _changeHeight: function(h) {
        domStyle.set(this.domNode, "height", h + "px");
        if (this.tabContainer && this.tabContainer.domNode && (h - this.toolbarHeight >= 0)) {
          domStyle.set(this.tabContainer.domNode, "height", (h - this.toolbarHeight) + "px");
        }

        var len = this.grids.length;
        for (var i = 0; i < len; i++) {
          if (this.grids[i] && (h - this.noGridHeight >= 0)) {
            domStyle.set(this.grids[i].domNode, "height", (h - this.noGridHeight) + "px");
          }
        }

        for (var p in this.relationGridsSet) {
          var rGrid = this.relationGridsSet[p];
          if (rGrid && (h - this.noGridHeight >= 0)) {
            domStyle.set(rGrid.domNode, "height", (h - this.noGridHeight) + "px");
          }
        }

        this.refreshGridHeight();
        if (this.positionRelativeTo === 'browser') {
          topic.publish('changeMapPosition', {
            bottom: h + this.bottomPosition
          });
        }

        this.currentHeight = h;
        if (h !== 0) {
          this.openHeight = h;

          html.setStyle(this.arrowDiv, 'display', 'block');
        } else {
          html.setStyle(this.arrowDiv, 'display', 'none');
        }
      },

      _changeLeftPostion: function() {
        var layoutBox = html.getMarginBox(jimuConfig.layoutId);
        var mapBox = html.getMarginBox(this.map.root);
        var left = layoutBox.w - mapBox.w;
        if (left > 0) {
          if (window.isRTL) {
            html.setStyle(this.domNode, 'right', left + 'px');
          } else {
            html.setStyle(this.domNode, 'left', left + 'px');
          }
        }
      },

      _onMapPositionChange: function(pos) {
        if (pos && isFinite(pos.left)) {
          if (window.isRTL) {
            html.setStyle(this.domNode, 'right', (pos.left || 0) + 'px');
          } else {
            html.setStyle(this.domNode, 'left', (pos.left || 0) + 'px');
          }

          if (this.tabContainer) {
            this.tabContainer.resize();
          }
        }
      },

      onMapResize: function() {
        var contents = domQuery(".dgrid-content");
        var width = domStyle.get(this.domNode, "width");

        array.forEach(contents, lang.hitch(this, function(content) {
          content.style.width = (width - 33) + "px";
        }));

        if (this.layersIndex > -1) {
          var tab = domQuery(".dijitTabPaneWrapper");
          if (tab && tab[0]) {
            tab[0].style.width = (width - 5) + "px";
          }

          var len = this.layerTabPages.length;
          for (var i = 0; i < len; i++) {
            domStyle.set(this.layerTabPages[i].domNode, "width", (width - 18) + "px");
            if (this.grids[i]) {
              domStyle.set(this.grids[i].domNode, "width", (width - 18) + "px");
            }
          }
          if (this.grids[this.layersIndex]) {
            this.grids[this.layersIndex].resize();
          }
        }

        for (var p in this.relationshipsSet) {
          if (!this.relationshipsSet[p]) {
            continue;
          }
          if (this.relationTabPagesSet[p]) {
            domStyle.set(this.relationTabPagesSet[p].domNode, 'width', (width - 18) + "px");
          }
          if (this.relationGridsSet[p]) {
            domStyle.set(this.relationGridsSet[p].domNode, "width", (width - 18) + "px");

            this.relationGridsSet[p].resize();
          }
        }
      },

      onPositionChange: function(position) {
        this.position = position;
        this.setInitialPosition();
        this._changeHeight(0);
        var height = domStyle.get(this.domNode, "height");
        if (this.layersIndex > -1) {
          var len = this.grids.length;
          for (var i = 0; i < len; i++) {
            if (this.grids[i]) {
              domStyle.set(this.grids[i].domNode, "height", (height - this.noGridHeight) + "px");
            }
          }
        }
        this.refreshGridHeight();
        this.showRefreshing(false);
      },

      onRemoveLayer: function(params) {
        var len = this.layers.length;
        for (var i = 0; i < len; i++) {
          if (this.getLayerInfoId(this.configLayerInfos[i]) === this.getLayerInfoId(params.layer)) {
            this.layerTabPageClose(this.layerTabPages[i].id, true);
            break;
          }
        }
      },

      initConfigLayerInfos: function() {
        var len = this.config.layerInfos.length;
        this.configLayerInfos = [];
        if (len > 0) {
          for (var i = 0; i < len; i++) {
            var layerInfo = this._getLayerInfoById(this.config.layerInfos[i].id);
            this.configLayerInfos[i] = layerInfo;
          }
        }
      },

      initSelectedLayer: function(layerObject, layersIndex) {
        if (!this.layers[layersIndex]) {
          this.layers[layersIndex] = layerObject;
          this.graphicsLayers[layersIndex] = new GraphicsLayer();
          this.map.addLayer(this.graphicsLayers[layersIndex]);
          // this.own(on(
          //   layerObject,
          //   "click",
          //   lang.hitch(this, this.onGraphicClick, layersIndex)
          // ));
        }
      },

      _getLayerInfoByName: function(name) {
        for (var i = 0; i < this._allLayerInfos.length; i++) {
          if (this._allLayerInfos[i].name === name) {
            return this._allLayerInfos[i];
          }
        }
      },

      _getLayerInfoById: function(layerId) {
        for (var i = 0, len = this._allLayerInfos.length; i < len; i++) {
          if (this._allLayerInfos[i].id === layerId) {
            return this._allLayerInfos[i];
          }
        }
      },

      _getRelationShipsByLayer: function(layer) {
        var ships = [];
        var _relships = layer.relationships;
        for (var p in this.relationshipsSet) {
          for (var i = 0, len = _relships.length; i < len; i++) {
            if (p === _relships[i]._relKey) {
              ships.push(_relships[i]);
            }
          }
        }

        return ships;
      },

      onGraphicClick: function(index, event) {
        if (!this.showing || index !== this.layersIndex) {
          return;
        }
        var id = event.graphic.attributes[this.layers[this.layersIndex].objectIdField] + "";
        this.highlightRow(id);
        this.selectFeatures("mapclick", [event.graphic]);
      },

      highlightRow: function(id) {
        if (!this.showing) {
          return;
        }
        var store = this.grids[this.layersIndex].store;
        var row = -1;
        for (var i in store.index) {
          if (i === id) {
            row = store.index[i];
            break;
          }
        }
        if (row > -1) {
          var rowsPerPage = this.grids[this.layersIndex].get("rowsPerPage");
          var pages = parseInt(row / rowsPerPage, 10);
          pages++;

          this.grids[this.layersIndex].gotoPage(pages);
          this.grids[this.layersIndex].clearSelection();
          this.grids[this.layersIndex].select(id);
          this.resetButtonStatus();
        }
      },

      _clipValidFields: function(sFields, rFields) {
        if (!(sFields && sFields.length)) {
          return rFields || [];
        }
        if (!(rFields && rFields.length)) {
          return sFields;
        }
        var validFields = [];
        for (var i = 0, len = sFields.length; i < len; i++) {
          var sf = sFields[i];
          for (var j = 0, len2 = rFields.length; j < len2; j++) {
            var rf = rFields[j];
            if (rf.name === sf.name) {
              validFields.push(sf);
              break;
            }
          }
        }
        return validFields;
      },

      _getLayerIndexById: function(infoId) {
        var i = 0;
        var len = this.config.layerInfos.length;
        for (i = 0; i < len; i++) {
          if (this.configLayerInfos[i] &&
            this.getLayerInfoId(this.configLayerInfos[i]) === infoId) {
            return i;
          }
        }

        return -1;
      },

      _collectRelationShips: function(layerObject, layerInfo) {
        var ships = layerObject.relationships;
        var infoLabel = layerInfo.tilte || layerInfo.name;
        if (ships && ships.length > 0) {
          for (var i = 0, len = ships.length; i < len; i++) {
            var relKey = layerInfo.id + '_' + ships[i].name + '_' + ships[i].id;
            ships[i]._relKey = relKey;
            ships[i]._unionName = infoLabel + '_' + ships[i].name;
            ships[i]._layerInfoId = layerInfo.id;
            if (!this.relationshipsSet[relKey]) {
              this.relationshipsSet[relKey] = ships[i];
              this.relationshipsSet[relKey].objectIdField = layerObject.objectIdField;
            }
          }
        }
      },

      _startQueryOnLayerTab: function(tabId) {
        this.layersIndex = this._getLayerIndexById(tabId);

        if (this.layersIndex > -1 && this.configLayerInfos[this.layersIndex]) {
          this.configLayerInfos[this.layersIndex].getLayerObject()
            .then(lang.hitch(this, function(layerObject) {
              // persist relationships
              this._collectRelationShips(layerObject, this.config.layerInfos[this.layersIndex]);

              this.configLayerInfos[this.layersIndex].getSupportTableInfo()
                .then(lang.hitch(this, function(tableInfo) {
                  if (tableInfo.isSupportQuery) {
                    this.initSelectedLayer(layerObject, this.layersIndex);
                    this.checkMapInteractiveFeature();
                    var configFields = this.config.layerInfos[this.layersIndex].layer.fields;
                    var layerFields = this.layers[this.layersIndex].fields;
                    // remove fields not exist in layerObject.fields
                    this.config.layerInfos[this.layersIndex].layer.fields = this._clipValidFields(
                      configFields,
                      layerFields
                    );

                    if (!this.config.layerInfos[this.layersIndex].opened) {
                      if (this.matchingMap) {
                        this.startQuery(this.layersIndex, this.map.extent);
                      } else {
                        this.config.layerInfos[this.layersIndex].opened = true;
                        this.startQuery(this.layersIndex);
                      }
                    } else {
                      if (this.matchingMap) {
                        this.startQuery(this.layersIndex, this.map.extent);
                      } else {
                        var grid = this.grids[this.layersIndex];
                        if (grid && grid.store && grid.store.data && this.exportButton) {
                          this.exportButton.set('disabled', false);
                        } else if (this.exportButton) {
                          this.exportButton.set('disabled', true);
                        }
                      }
                    }
                  } else {
                    var tip = html.toDom('<div>' + this.nls.unsupportQueryWarning + '</div>');
                    html.empty(this.layerTabPages[this.layersIndex].content);
                    domConstruct.place(tip, this.layerTabPages[this.layersIndex].content);

                    this.refreshGridHeight();
                  }
                }), lang.hitch(this, function(err) {
                  new Message({
                    message: err.message || err
                  });
                }));
            }), lang.hitch(this, function(err) {
              new Message({
                message: err.message || err
              });
            }));
        }
      },

      _startQueryOnRelationTab: function(relationShipKey, selectedIds, layersIndex) {
        var ship = this.relationshipsSet[relationShipKey];
        // var selectedIds = this.getSelectedRows();
        if (ship && !ship.opened && selectedIds && selectedIds.length > 0) {
          // this.showRefreshing(true);
          this.showRelationLoading(relationShipKey, true);
          var relatedQuery = new RelationshipQuery();
          relatedQuery.objectIds = selectedIds;
          relatedQuery.outFields = ['*'];
          relatedQuery.relationshipId = ship.id;
          relatedQuery.returnGeometry = false;

          var hasLayerUrl = this.layers[layersIndex].url &&
            this.config.layerInfos[layersIndex].layer.url;
          if (hasLayerUrl) {
            var layerUrl = this.layers[layersIndex].url;
            var parts = layerUrl.split('/');
            parts[parts.length - 1] = ship.relatedTableId;
            var relatedTableUrl = parts.join('/');

            var tableInfoDef = esriRequest({
              url: relatedTableUrl,
              content: {
                f: 'json'
              },
              hangleAs: 'json',
              callbackParamName: 'callback'
            });

            tableInfoDef.then(lang.hitch(this, function(response) {
              var _fLayer = this.layers[layersIndex];
              _fLayer.queryRelatedFeatures(
                relatedQuery,
                lang.hitch(this, function(relatedFeatures) {
                  var results = {
                    displayFieldName: this.relationshipsSet[relationShipKey].objectIdField,
                    fields: response.fields,
                    features: [],
                    fieldAliases: null
                  };

                  for (var p in relatedFeatures) {
                    var _set = relatedFeatures[p];
                    if (_set.features && _set.features.length > 0) {
                      results.features = results.features.concat(_set.features);
                    }
                  }

                  if (results.features.length > 0) {
                    // createRelationTable
                    this.createRelationTable(relationShipKey, response, results);
                    if (this.exportButton) {
                      this.exportButton.set('disabled', false);
                    }
                  } else {
                    var tip = html.toDom('<div>' + this.nls.noRelatedRecords + '</div>');
                    html.empty(this.relationTabPagesSet[relationShipKey].content);
                    domConstruct.place(tip, this.relationTabPagesSet[relationShipKey].content);
                  }

                  ship.opened = true;
                  this.refreshGridHeight();
                  this.showRelationLoading(relationShipKey, false);
                }), lang.hitch(this, function(err) {
                  console.error(err);
                  var tip = html.toDom('<div>' + this.nls.noRelatedRecords + '</div>');
                  html.empty(this.relationTabPagesSet[relationShipKey].content);
                  domConstruct.place(tip, this.relationTabPagesSet[relationShipKey].content);
                  this.showRelationLoading(relationShipKey, false);
                }));
            }), lang.hitch(this, function(err) {
              console.error(err);
              this.showRelationLoading(relationShipKey, false);
            }));
          }
        } else {
          var grid = this.relationGridsSet[relationShipKey];
          if (grid && grid.store && grid.store.data && this.exportButton) {
            this.exportButton.set('disabled', false);
          } else if (this.exportButton) {
            this.exportButton.set('disabled', true);
          }
          this.showRelationLoading(relationShipKey, false);
        }
      },

      createRelationTable: function(relationShipKey, tableInfo, featureSet) {
        var data = array.map(featureSet.features, lang.hitch(this, function(feature) {
          return feature.attributes;
        }));
        var store = this._generateMemoryStore(data, featureSet.displayFieldName);

        var _typeIdField = tableInfo.typeIdField;
        var _types = tableInfo.types;
        var columns = this._generateColumnsFromFields(featureSet.fields, _typeIdField, _types);

        if (this.relationGridsSet[relationShipKey]) {
          this.relationGridsSet[relationShipKey].set('store', store);
          this.relationGridsSet[relationShipKey].refresh();
        } else {
          var json = {
            'columns': columns,
            'store': store
          };

          var grid = new(declare(
            [OnDemandGrid, Selection, /*Pagination, */ ColumnHider, ColumnResizer]
          ))(json, domConstruct.create("div"));
          domConstruct.place(grid.domNode, this.relationTabPagesSet[relationShipKey].content);
          grid.startup();
          grid.__pk = featureSet.displayFieldName;
          grid.__outFields = featureSet.fields;

          this.relationGridsSet[relationShipKey] = grid;
          this.own(on(grid, 'click', lang.hitch(this, this.onRelationGridRowClick)));
          var height = domStyle.get(this.domNode, "height");
          domStyle.set(
            this.relationGridsSet[relationShipKey].domNode,
            "height", (height - this.noGridHeight) + "px"
          );
        }

        if (this.relationGridFootersSet[relationShipKey]) {
          html.empty(this.relationGridFootersSet[relationShipKey]);
        } else {
          this.relationGridFootersSet[relationShipKey] = html.create(
            'div', null, this.relationTabPagesSet[relationShipKey].content
          );
        }
        var _footer = this.relationGridFootersSet[relationShipKey];
        var countLabel = html.create('div', {
          'class': 'dgrid-status self-footer',
          'innerHTML': data.length + '&nbsp;' + this.nls.features + '&nbsp;'
        }, _footer);
        this.relationSelectedRowsLabelDivsSet[relationShipKey] = html.create('div', {
          'class': 'dgrid-status self-footer',
          'innerHTML': 0 + '&nbsp;' + this.nls.selected + '&nbsp;'
        }, countLabel, 'after');
      },

      tabChanged: function() {
        if (this.exportButton) {
          this.exportButton.set('disabled', true);
        }
        if (this.tabContainer && this.tabContainer.selectedChildWidget) {
          var layerType = this.tabContainer.selectedChildWidget.params.layerType;
          if (layerType === this._layerTypes.FEATURELAYER) {
            var tabId = this.tabContainer.selectedChildWidget.params.id;
            this.currentRelationshipKey = null;
            this._startQueryOnLayerTab(tabId);
          } else if (layerType === this._layerTypes.RELATIONSHIPTABLE) {
            var params = this.tabContainer.selectedChildWidget.params;
            var _relKey = params.id;
            var selectIds = params.oids;
            var layersIndex = params.layersIndex;
            this.currentRelationshipKey = _relKey;
            var currentShip = this.relationshipsSet[_relKey];
            if (currentShip) {
              this._startQueryOnRelationTab(_relKey, selectIds, layersIndex);
            }
          }

          this.onMapResize();
        }
        this.resetButtonStatus();
      },

      checkMapInteractiveFeature: function() {
        var currentLayerInfo = this.configLayerInfos[this.layersIndex];
        if (!currentLayerInfo) {
          return;
        }

        if (currentLayerInfo.isShowInMap()) {
          html.setStyle(this.zoomButton.domNode, 'display', 'inline-block');
        } else {
          html.setStyle(this.zoomButton.domNode, 'display', 'none');
        }
        for (var i = 0, len = this.configLayerInfos.length; i < len; i++) {
          if (this.graphicsLayers[i] && this.configLayerInfos[i].isShowInMap()) {
            this.graphicsLayers[i].show();
          } else if (this.graphicsLayers[i]) {
            this.graphicsLayers[i].hide();
          }
        }
      },

      resetButtonStatus: function() {
        if (this.tabContainer && this.tabContainer.selectedChildWidget) {
          var layerType = this.tabContainer.selectedChildWidget.params.layerType;
          if (layerType === this._layerTypes.FEATURELAYER) {
            var selectionRows = this.getSelectedRows();
            if (selectionRows && selectionRows.length) {
              this.showSelectedRecords.set('disabled', false);
              this.zoomButton.set('disabled', false);
              var _layer = this.layers[this.layersIndex];
              if (_layer.relationships && _layer.relationships.length > 0) {
                this.showRelatedRecords.set('disabled', false);
              }
            } else {
              this.showSelectedRecords.set('disabled', true);
              this.zoomButton.set('disabled', true);
              this.showRelatedRecords.set('disabled', true);
            }

            if (this.config.layerInfos && this.config.layerInfos.length === 0) {
              this.selectionMenu.set('disabled', true);
              this.refreshButton.set('disabled', true);
              this.matchingCheckBox.set('disabled', true);
            } else {
              this.selectionMenu.set('disabled', false);
              this.refreshButton.set('disabled', false);
              this.matchingCheckBox.set('disabled', false);
            }

            this.setSelectedNumber();
          } else if (layerType === this._layerTypes.RELATIONSHIPTABLE) {
            this.showRelatedRecords.set('disabled', true);
            this.matchingCheckBox.set('disabled', true);
            this.zoomButton.set('disabled', true);
          }
        }
      },

      createTable: function(columns, store, index, recordCounts) {
        if (this.grids[index]) {
          this.grids[index].set("store", store);
          this.grids[index].refresh();
        } else {
          this.config.layerInfos[index].loaded = true;
          var json = {};
          json.columns = columns;
          json.store = store;
          json.keepScrollPosition = true;
          json.pagingDelay = 1000;

          var grid = new(declare(
            [OnDemandGrid, Selection, /*Pagination, */ ColumnHider, ColumnResizer]
          ))(json, domConstruct.create("div"));
          domConstruct.place(grid.domNode, this.layerTabPages[index].content);
          grid.startup();
          // private preperty in grid
          // _clickShowSelectedRecords, _clickFilterByExtent,
          // when these value is true doesn't execute dgrid-deselect
          grid._clickShowSelectedRecords = false;
          grid._clickRefreshButton = false;
          grid._clickFilterByExtent = false;
          this.grids[index] = grid;
          this.own(on(grid, "click", lang.hitch(this, this.onLayerGridRowClick)));
          this.own(on(grid, "dblclick", lang.hitch(this, function() {
            if (this.configLayerInfos[this.layersIndex].isShowInMap()) {
              this.onZoomButton();
            }
          })));
          this.own(on(grid, 'dgrid-select', lang.hitch(this, this._onLayerDgridSelect)));
          this.own(on(grid, 'dgrid-deselect', lang.hitch(this, this._onLayerDgridDeselect)));
          this.own(on(grid, 'dgrid-refresh-complete', lang.hitch(
            this, this._onLayerDgridRefreshComplete
          )));

          var height = domStyle.get(this.domNode, "height");
          domStyle.set(this.grids[index].domNode, "height", (height - this.noGridHeight) + "px");
          this.refreshGridHeight();
          if (this.grids.length === 1) {
            this.onMapResize();
          }
        }

        if (this.gridFooters[index]) {
          html.empty(this.gridFooters[index]);
        } else {
          this.gridFooters[index] = html.create('div', null, this.layerTabPages[index].content);
        }
        var _footer = this.gridFooters[index];
        var countLabel = html.create('div', {
          'class': 'dgrid-status self-footer',
          'innerHTML': recordCounts + '&nbsp;' + this.nls.features + '&nbsp;'
        }, _footer);
        this.selectedRowsLabelDivs[index] = html.create('div', {
          'class': 'dgrid-status self-footer',
          'innerHTML': 0 + '&nbsp;' + this.nls.selected + '&nbsp;'
        }, countLabel, 'after');
        this.showLoading(index, false);
      },

      showRefreshing: function(refresh) {
        if (!this.loading) {
          return;
        }

        if (refresh) {
          this.loading.show();
        } else {
          this.loading.hide();
        }
      },

      showLoading: function(index, refresh) {
        if (!this.loadings[index]) {
          return;
        }

        if (refresh) {
          this.loadings[index].show();
        } else {
          this.loadings[index].hide();
        }
      },

      showRelationLoading: function(relKey, refresh) {
        if (!this.relationLoadingSet[relKey]) {
          return;
        }

        if (refresh) {
          this.relationLoadingSet[relKey].show();
        } else {
          this.relationLoadingSet[relKey].hide();
        }
      },

      _doQuery: function(index, normalizedExtent) {
        var selectionRows = this.getSelectedRows();
        var pk = this.layers[index].objectIdField; // primary key always be display
        var hasLayerUrl = this.layers[index].url && this.config.layerInfos[index].layer.url;
        var isCSVLayer = this.layers[index].declaredClass === "esri.layers.CSVLayer";

        // Does not support queries that need to be performed on the server
        if (hasLayerUrl && !isCSVLayer) {
          this._queryToServer(index, normalizedExtent, pk, selectionRows);
        } else if (!hasLayerUrl || isCSVLayer) {
          this._queryOnClient(index, normalizedExtent, pk, selectionRows);
        }
      },

      _queryToServer: function(index, normalizedExtent, pk, selectionRows) {
        this._getFeatureCount(index, normalizedExtent)
          .then(lang.hitch(this, function(recordCounts) {
            var currentLayer = this.layers[index];
            var maxCount = esri.isDefined(currentLayer.maxRecordCount) ?
              currentLayer.maxRecordCount : 1000;
            this._batchCount = Math.min(maxCount, this._defaultBatchCount);
            if (recordCounts < maxCount) {
              this._queryFeatureLayer(
                index, normalizedExtent, pk,
                selectionRows, recordCounts, false
              );
            } else {
              this._getFeatureIds(index, normalizedExtent)
                .then(lang.hitch(this, function(objectIds) {
                  this.layers[index]._objectIds = objectIds;
                  var oFields = this._getOutFieldsFromLayerInfos(index, pk);
                  var results = {
                    fields: this.layers[index].fields
                  };
                  this.queryExecute(selectionRows, index, oFields, recordCounts, true, results);
                }));
            }
          }));
      },

      // Purpose:
      // -- Queries the Feature Layer for Features
      _queryFeatureLayer: function(index, normalizedExtent, pk, selectionRows,
        recordCounts, exceededLimit) {
        // function body
        var qt = new QueryTask(this.config.layerInfos[index].layer.url);
        var query = new Query();
        // query.where = this.layers[index].getDefinitionExpression() || "1 = 1";
        query.where = this._getLayerFilterExpression(this.layers[index]);
        var oFields = this._getOutFieldsFromLayerInfos(index, pk);
        if (oFields.length > 0) {
          var oNames = array.map(oFields, function(field) {
            return field.name;
          });
          query.outFields = oNames;
        } else {
          query.outFields = ["*"];
        }
        if (normalizedExtent) {
          query.geometry = normalizedExtent;
          query.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;
          this.config.layerInfos[index].opened = false;
        }
        query.outSpatialReference = {
          wkid: this.map.spatialReference.wkid
        };
        this.config.layerInfos[index].extent = normalizedExtent;

        query.returnGeometry = false;
        qt.execute(
          query,
          lang.hitch(this, this.queryExecute,
            selectionRows, index, oFields, recordCounts, exceededLimit
          ),
          lang.hitch(this, this.errorQueryTask, index)
        );
      },

      _getOutFieldsFromLayerInfos: function(index, pk) {
        var fields = this.config.layerInfos[index].layer.fields;
        var oFields = [];
        if (fields) {
          array.forEach(fields, lang.hitch(this, function(field) {
            if (field.show === undefined) { // first open
              field.show = true;
            }
            if (field.name === pk) {
              field._pk = true;
            }
            if (field.show || field._pk) {
              oFields.push(field);
            }
          }));
        }
        return oFields;
      },

      _getFeatureCount: function(index, normalizedExtent) {
        var def = new Deferred();
        var query = new Query();
        query.returnGeometry = false;
        // query.where = this.layers[index].getDefinitionExpression() || "1 = 1";
        query.where = this._getLayerFilterExpression(this.layers[index]);

        if (normalizedExtent) {
          query.geometry = normalizedExtent;
        }

        this.layers[index].queryCount(query).then(lang.hitch(this, function(count) {
          def.resolve(count);
        }), lang.hitch(this, function(err) {
          console.error(err);
          console.log("Could not get feature count. Defaulting to 2000 features");
          def.resolve(this._defaultFeatureCount);
        }));

        return def;
      },

      _getFeatureIds: function(index, normalizedExtent) {
        var def = new Deferred();
        var query = new Query();
        query.returnGeometry = false;
        query.returnIdsOnly = true;
        // query.where = this.layers[index].getDefinitionExpression() || "1 = 1";
        query.where = this._getLayerFilterExpression(this.layers[index]);

        if (normalizedExtent) {
          query.geometry = normalizedExtent;
        }

        this.layers[index].queryIds(query).then(lang.hitch(this, function(objectIds) {
          def.resolve(objectIds);
        }), lang.hitch(this, function(err) {
          console.error(err);
          console.log("Could not get feature Ids");
          def.resolve([]);
        }));

        return def;
      },

      _queryOnClient: function(index, normalizedExtent, pk, selectionRows) {
        var json = {};
        json.features = this.layers[index].graphics;
        var lFields = this.layers[index].fields;
        var liFields = this.config.layerInfos[index].layer.fields;

        if (liFields) {
          json.fields = array.filter(liFields, lang.hitch(this, function(field) {
            if (field.show === undefined) { // first open
              field.show = true;
            }
            if (field.name === pk) {
              field._pk = true;
            }
            for (var i = 0, len = lFields.length; i < len; i++) {
              if (lFields[i].name === field.name) {
                field.type = lFields[i].type;
              }
            }
            return field.show || field._pk;
          }));
        } else {
          json.fields = array.filter(lFields, lang.hitch(this, function(field) {
            if (field.show === undefined) { // first open
              field.show = true;
            }
            if (field.name === pk) {
              field._pk = true;
            }
            return field.show || field._pk;
          }));
        }

        json.selectionRows = selectionRows;
        if (normalizedExtent && esriConfig.defaults.geometryService) {
          var geometries = [];
          var len = json.features.length;
          for (var i = 0; i < len; i++) {
            geometries.push(json.features[i].geometry);
          }
          var params = new RelationParameters();
          params.geometries1 = geometries;
          params.geometries2 = [normalizedExtent];
          params.relation = RelationParameters.SPATIAL_REL_INTERSECTION;

          esriConfig.defaults.geometryService.relation(
            params,
            lang.hitch(this, function(json, pairs) {
              var n = pairs.length;
              var gs = [];
              for (var m = 0; m < n; m++) {
                gs.push(json.features[pairs[m].geometry1Index]);
              }
              json.features = gs;
              this.queryExecute(
                selectionRows, index,
                json.fields, json.features.length, false, json
              );
            }, json), lang.hitch(this, this.errorGeometryServices, index));
        } else {
          this.queryExecute(
            selectionRows, index,
            json.fields, json.features.length, false, json
          );
        }
      },

      startQuery: function(index, extent) {
        if (!this.config.layerInfos || this.config.layerInfos.length === 0) {
          return;
        }

        // this.showRefreshing(true);
        this.showLoading(index, true);
        if (extent && extent.spatialReference && extent.spatialReference.isWebMercator()) {
          normalizeUtils.normalizeCentralMeridian(
            [extent], null, lang.hitch(this, function(normalizedGeo) {
              var _extent = normalizedGeo[0];
              this._doQuery(index, _extent);
            }), lang.hitch(this, function(err) {
              this.popupMessage(index, err.message || err);
            }));
        } else {
          this._doQuery(index, extent);
        }
      },

      errorGeometryServices: function(index, params) {
        this.popupMessage(index, params.message);
      },

      errorQueryTask: function(index, params) {
        this.popupMessage(index, params.message);
      },

      onExtentChange: function(params) {
        if (this.matchingMap) {
          this.startQuery(this.layersIndex, params.extent);
        }
      },

      _processExecuteFields: function(rFields, oFields) {
        if (rFields && rFields.length > 0) {
          var outFields = [];
          if (!oFields.length) {
            return rFields;
          }
          for (var i = 0, len = oFields.length; i < len; i++) {
            for (var j = 0; j < rFields.length; j++) {
              if (oFields[i].name === rFields[j].name) {
                rFields[j] = lang.mixin(rFields[j], oFields[i]);
                outFields.push(rFields[j]);
              }
            }
          }
          return outFields;
        } else {
          return oFields;
        }

        return rFields;
      },

      _generateColumnsFromFields: function(fields, typeIdField, types, exceededLimit) {
        var columns = {};
        array.forEach(fields, lang.hitch(this, function(_field, i) {
          var techFieldName = "field" + i;
          var isDomain = !!_field.domain;
          var isDate = _field.type === "esriFieldTypeDate";
          var isTypeIdField = typeIdField && (_field.name === typeIdField);
          columns[techFieldName] = {
            label: _field.alias || _field.name,
            className: techFieldName,
            hidden: !_field.show && _field.show !== undefined,
            unhidable: !_field.show && _field.show !== undefined && _field._pk,
            field: _field.name
          };

          columns[techFieldName].sortable = exceededLimit ? false : true;

          if (fields[i].type === "esriFieldTypeString") {
            columns[techFieldName].formatter = lang.hitch(this, this.urlFormatter);
          } else if (fields[i].type === "esriFieldTypeDate") {
            columns[techFieldName].formatter = lang.hitch(this, this.dateFormatter);
          } else if (fields[i].type === "esriFieldTypeDouble" ||
            fields[i].type === "esriFieldTypeSingle" ||
            fields[i].type === "esriFieldTypeInteger" ||
            fields[i].type === "esriFieldTypeSmallInteger") {
            columns[techFieldName].formatter = lang.hitch(this, this.numberFormatter);
          }

          if (isDomain) {
            columns[techFieldName].get = lang.hitch(this, function(field, obj) {
              return this.getCodeValue(field.domain, obj[field.name]);
            }, _field);
          } else if (!isDomain && !isDate && !isTypeIdField) {
            // Not A Date, Domain or Type Field
            // Still need to check for codedType value 
            columns[techFieldName].get = lang.hitch(this,
              function(field, typeIdField, types, obj) {
                var codeValue = null;
                if (typeIdField && types && types.length > 0) {
                  var typeCheck = array.filter(types, lang.hitch(this, function(item) {
                    // value of typeIdFild has been changed above
                    return item.name === obj[typeIdField];
                  }));

                  if (typeCheck && typeCheck.domains &&
                    typeCheck.domains[field.name] && typeCheck.domains[field.name].codedValues) {
                    codeValue = this.getCodeValue(
                      typeCheck.domains[field.name],
                      obj[field.name]
                    );
                  }
                }
                var _value = codeValue !== null ? codeValue : obj[field.name];
                return _value || isFinite(_value) ? _value : "";
              }, _field, typeIdField, types);
          }
        }));

        return columns;
      },

      _generateCacheStore: function(_layer, recordCounts) {
        var qtStore = new FeatureLayerQueryStore({
          layer: _layer,
          objectIds: _layer._objectIds || null,
          totalCount: recordCounts,
          batchCount: this._batchCount,
          where: _layer && _layer.getDefinitionExpression() || "1=1",
          orderByFields: ""
        });

        var mStore = new Memory();
        return (new Cache(qtStore, mStore, {}));
      },

      _generateMemoryStore: function(data, idProperty) {
        return (new Observable(new Memory({
          "data": data || [],
          "idProperty": idProperty
        })));
      },

      queryExecute: function(selectionRows, index, oFields, recordCounts, exceededLimit, results) {
        var data = [];
        var store = null;
        var columns = {};
        if (!this.domNode) {
          return;
        }
        // this.showRefreshing(true);
        this.showLoading(index, true);
        // mixin porperty of field from result.fields
        results.fields = this._processExecuteFields(results.fields, oFields);
        if (exceededLimit) {
          store = this._generateCacheStore(this.layers[index], recordCounts);
        } else {
          array.map(results.features, lang.hitch(this, function(feature) {
            var value = '';
            for (var attr in feature.attributes) {
              value = feature.attributes[attr];
              // process subtype
              if (attr === this.layers[index].typeIdField && this.layers[index].types) {
                value = this.getTypeName(value, this.layers[index].types);
                feature.attributes[attr] = value;
              }
            }
            data.push(feature.attributes);
          }));

          store = this._generateMemoryStore(data, this.layers[index].objectIdField);
        }

        if (!this.config.layerInfos[index].loaded && results.fields) {
          var _typeIdFild = this.layers[index].typeIdField;
          var _types = this.layers[index].types;
          // AttributeTable does not work
          //when column name contains special character such as "." and "()"
          columns = this._generateColumnsFromFields(
            results.fields, _typeIdFild, _types, exceededLimit
          );
        }
        this.createTable(columns, store, index, recordCounts);
        if (selectionRows && selectionRows.length) {
          for (var id in selectionRows) {
            this.grids[index].select(selectionRows[id]);
          }
          // it seems that grid.select(id) is not always emitting dgrid-select,
          // so persist the selection ids.
          this.selections[index] = selectionRows;
          this.resetButtonStatus();
          this.setSelectedNumber();
        }

        if (this.exportButton) {
          this.exportButton.set('disabled', false);
        }
      },

      getCodeValue: function(domain, v) {
        for (var i = 0, len = domain.codedValues.length; i < len; i++) {
          var cv = domain.codedValues[i];
          if (v === cv.code) {
            return cv.name;
          }
        }
        return null;
      },

      urlFormatter: function(str) {
        if (str) {
          var s = str.indexOf('http:');
          if (s === -1) {
            s = str.indexOf('https:');
          }
          if (s > -1) {
            if (str.indexOf('href=') === -1) {
              var e = str.indexOf(' ', s);
              if (e === -1) {
                e = str.length;
              }
              var link = str.substring(s, e);
              str = str.substring(0, s) +
                '<A href="' + link + '" target="_blank">' + link + '</A>' +
                str.substring(e, str.length);
            }
          }
        }
        return str || "";
      },

      dateFormatter: function(str) {
        if (str) {
          var sDateate = new Date(str);
          str = utils.localizeDate(sDateate, {
            fullYear: true
          });
        }
        return str || "";
      },

      numberFormatter: function(num) {
        if (typeof num === 'number') {
          var decimalStr = num.toString().split('.')[1] || "",
            decimalLen = decimalStr.length;
          num = utils.localizeNumber(num, {
            places: decimalLen
          });
          return '<span class="jimu-numeric-value">' + (num || "") + '</span>';
        }
        return num;
      },

      getTypeName: function(value, types) {
        var len = types.length;
        for (var i = 0; i < len; i++) {
          if (value === types[i].id) {
            return types[i].name;
          }
        }
        return "";
      },

      getFieldType: function(name, fields) {
        if (fields && fields.length > 0) {
          var len = fields.length;
          for (var i = 0; i < len; i++) {
            if (name === fields[i].name) {
              return fields[i].type;
            }
          }
        }

        return "";
      },

      onLayerGridRowClick: function(zoomIds) {
        var ids = [];
        var selection = this.grids[this.layersIndex].selection;
        for (var id in selection) {
          if (selection[id]) {
            ids.push(id);
          }
        }

        if (ids.length) {
          this.showSelectedRecords.set('disabled', false);
          this.zoomButton.set('disabled', false);
          var _layer = this.layers[this.layersIndex];
          if (_layer.relationships && _layer.relationships.length > 0) {
            this.showRelatedRecords.set('disabled', false);
          } else {
            this.showRelatedRecords.set('disabled', true);
          }
          if (this.layers[this.layersIndex].url) {
            this._queryFeaturesByIds(ids, 'rowclick');
          } else {
            if (zoomIds && !zoomIds.type && zoomIds.length) {
              this.selectFeatures(
                "zoom",
                this.getGraphicsFromLocalFeatureLayer(this.layersIndex, ids)
              );
            } else {
              this.selectFeatures(
                "rowclick",
                this.getGraphicsFromLocalFeatureLayer(this.layersIndex, ids)
              );
            }
          }
        } else {
          this.zoomButton.set('disabled', true);
          this.showSelectedRecords.set('disabled', true);
          this.showRelatedRecords.set('disabled', true);
          this.graphicsLayers[this.layersIndex].clear();
        }
      },

      onRelationGridRowClick: function() {
        var ids = [];
        var selection = this.relationGridsSet[this.currentRelationshipKey].selection;
        for (var id in selection) {
          if (selection[id]) {
            ids.push(id);
          }
        }

        this.resetButtonStatus();
        this.setSelectedNumber();
      },

      errorSelectFeatures: function(index, params) {
        this.popupMessage(index, params.message);
      },

      getGraphicsFromLocalFeatureLayer: function(index, ids) {
        var gs = [],
          id;
        var len = ids.length;
        var n = this.layers[index].graphics.length;
        var objectid = this.layers[index].objectIdField;
        for (var i = 0; i < len; i++) {
          for (var m = 0; m < n; m++) {
            id = this.layers[index].graphics[m].attributes[objectid] + "";
            if (id === ids[i]) {
              gs.push(this.layers[index].graphics[m]);
              break;
            }
          }
        }
        return gs;
      },

      getExtent: function(result) {
        var def = new Deferred();

        var extent, points;
        var len = result.length;
        if (len === 1 && result[0].geometry && result[0].geometry.type === "point") {
          extent = result[0].geometry;
        } else if (len === 1 && !result[0].geometry) {
          def.reject(new Error('AttributeTable.getExtent:: extent was not projected.'));
          return def;
        } else {
          for (var i = 0; i < len; i++) {
            if (!result[i].geometry) {
              console.error('unable to get geometry of the reocord: ', result[i]);
              continue;
            }
            if (result[i].geometry.type === "point") {
              if (!points) {
                points = new Multipoint(result[i].geometry.spatialReference);
                points.addPoint(result[i].geometry);
              } else {
                points.addPoint(result[i].geometry);
              }
              if (i === (len - 1)) {
                extent = points.getExtent();
              }
            } else {
              if (!extent) {
                extent = result[i].geometry.getExtent();
              } else {
                extent = extent.union(result[i].geometry.getExtent());
              }
            }
          }
        }

        if (!extent || !extent.spatialReference) {
          def.reject(new Error("AttributeTable.getExtent:: extent was not projected."));
          return def;
        }

        // convert to map sr
        var sr = this.map.spatialReference;
        if (extent.spatialReference.wkid === sr.wkid) {
          def.resolve(extent);
        } else {
          var parameter = new ProjectParameters();
          parameter.geometries = [extent];
          parameter.outSR = sr;

          esriConfig.defaults.geometryService.project(
            parameter,
            lang.hitch(this, function(geometries) {
              if (geometries && geometries.length) {
                def.resolve(geometries[0]);
              } else {
                def.reject(new Error("AttributeTable.getExtent:: extent was not projected."));
              }
            }), lang.hitch(this, function(err) {
              // projection error
              if (!err) {
                err = new Error("AttributeTable.getExtent:: extent was not projected.");
              }
              def.reject(err);
            }));
        }
        return def;
      },

      addGraphics: function(result) {
        var symbol, graphic;
        var len = result.length;
        this.graphicsLayers[this.layersIndex].clear();
        var outlineSymbol = new SimpleLineSymbol(
          SimpleLineSymbol.STYLE_SOLID,
          new Color([0, 255, 255]),
          2
        );

        for (var i = 0; i < len; i++) {
          var geometry = null;
          if (!result[i].geometry) {
            console.error('unable to get geometry of the reocord: ', result[i]);
            continue;
          } else if (result[i].geometry.spatialReference.wkid !== this.map.spatialReference.wkid) {
            console.warn('unable to draw graphic result in different wkid from map');
          }
          if (result[i].geometry.type === "point") {
            geometry = new Point(result[i].geometry.toJson());
            symbol = lang.clone(this.map.infoWindow.markerSymbol);
          } else if (result[i].geometry.type === "multipoint") {
            geometry = new Multipoint(result[i].geometry.toJson());
            symbol = lang.clone(this.map.infoWindow.markerSymbol);
          } else if (result[i].geometry.type === "polyline") {
            geometry = new Polyline(result[i].geometry.toJson());
            symbol = outlineSymbol;
          } else if (result[i].geometry.type === "polygon") {
            geometry = new Polygon(result[i].geometry.toJson());
            symbol = new SimpleFillSymbol(
              SimpleFillSymbol.STYLE_SOLID,
              outlineSymbol,
              new Color([255, 255, 255, 0.25])
            );
          }
          graphic = new Graphic(geometry, symbol, result[i].attributes, result[i].infoTemplate);
          this.graphicsLayers[this.layersIndex].add(graphic);
        }
      },

      setSelectedNumber: function() {
        if (this.tabContainer && this.tabContainer.selectedChildWidget) {
          var layerType = this.tabContainer.selectedChildWidget.params.layerType;
          if (layerType === this._layerTypes.FEATURELAYER) {
            if (this.selectedRowsLabelDivs && this.selectedRowsLabelDivs[this.layersIndex] &&
              this.layersIndex < this.grids.length && this.grids[this.layersIndex]) {
              var _ids = this.getSelectedRows();
              this.selectedRowsLabelDivs[this.layersIndex].innerHTML = "&nbsp;&nbsp;" +
                _ids.length + " " + this.nls.selected + "&nbsp;&nbsp;";
            }
          } else if (layerType === this._layerTypes.RELATIONSHIPTABLE) {
            var labelDiv = this.relationSelectedRowsLabelDivsSet[this.currentRelationshipKey];
            if (labelDiv) {
              var selection = this.relationGridsSet[this.currentRelationshipKey].selection;
              var ids = [];
              if (selection) {
                for (var id in selection) {
                  if (selection[id]) {
                    ids.push(id);
                  }
                }
              }
              labelDiv.innerHTML = "&nbsp;&nbsp;" +
                ids.length + " " + this.nls.selected + "&nbsp;&nbsp;";
            }
          }
        }
      },

      _getLayerFilterExpression: function(layer) {
        var filter = layer.getDefinitionExpression();
        if (filter) {
          return filter;
        }

        var _layerInfo = this._getLayerInfoById(layer.id);
        filter = _layerInfo && _layerInfo.originOperLayer &&
          _layerInfo.originOperLayer.layerDefinition &&
          _layerInfo.originOperLayer.layerDefinition.definitionExpression;

        return filter || "1=1";
      },

      _queryFeaturesByIds: function(ids, mode) {
        var query = new Query();
        query.objectIds = ids;
        query.returnGeometry = true;
        query.outSpatialReference = this.map.spatialReference;
        query.outFields = ['*'];
        var _layer = this.layers[this.layersIndex];
        var isCSVLayer = _layer.declaredClass === "esri.layers.CSVLayer";
        if (_layer.url && !isCSVLayer) {
          //we always select feature from server if layer has url
          var queryTask = new QueryTask(_layer.url);
          queryTask.execute(
            query,
            lang.hitch(this, function(fset) {
              this.selectFeatures(mode, fset.features);
            }),
            lang.hitch(this, this.errorSelectFeatures, this.layersIndex)
          );
        } else { // FeatureCollection do query on client
          this.layers[this.layersIndex].selectFeatures(
            query,
            FeatureLayer.SELECTION_NEW,
            lang.hitch(this, this.selectFeatures, mode),
            lang.hitch(this, this.errorSelectFeatures, this.layersIndex)
          );
        }

      },

      selectFeatures: function(method, result) {
        if (result && result.length > 0) {
          if (method === "mapclick") {
            this.addGraphics(result, true);
            if (this.config.layerInfos[this.layersIndex].isDynamicLayer) {
              var id = result[0].attributes[this.grids[this.layersIndex].store.idProperty] + "";
              this.highlightRow(id);
            }
          } else if (method === "rowclick" || method === "selectall") {
            this.addGraphics(result, true);
          } else if (method === "zoom") {
            this.getExtent(result).then(lang.hitch(this, function(gExtent) {
              if (gExtent) {
                if (gExtent.type === "point") {
                  this.map.centerAndZoom(gExtent, 15);
                } else {
                  this.map.setExtent(gExtent.expand(1.1));
                }
              }
            }), lang.hitch(this, function(err) {
              console.error(err);
            }));
          }
          this.setSelectedNumber();
        } else {
          var popup = new Message({
            message: this.nls.dataNotAvailable,
            buttons: [{
              label: this.nls.ok,
              onClick: lang.hitch(this, function() {
                popup.close();
              })
            }]
          });
        }
      },

      _onDragStart: function(evt) {
        this.moveMode = true;
        this.moveY = evt.clientY;
        this.previousDomHeight = domStyle.get(this.domNode, "height");
        this.previousArrowTop = domStyle.get(this.arrowDiv, "top");
        // if (this.grids.length) {
        //   this.previousGridHeight = domStyle.get(this.grids[0].domNode, "height");
        // }
        domStyle.set(this.arrowDiv, "background-color", "gray");
        domStyle.set(this.moveMaskDiv, "display", "");

        this._dragingHandlers = this._dragingHandlers.concat([
          on(this.ownerDocument, 'dragstart', function(e) {
            e.stopPropagation();
            e.preventDefault();
          }),
          on(this.ownerDocumentBody, 'selectstart', function(e) {
            e.stopPropagation();
            e.preventDefault();
          })
        ]);
      },

      _onDraging: function(evt) {
        if (this.moveMode) {
          var y = this.moveY - evt.clientY;
          this._changeHeight(y + this.previousDomHeight);
        }
      },

      _onDragEnd: function() {
        this.moveMode = false;
        domStyle.set(this.arrowDiv, "background-color", "");
        domStyle.set(this.moveMaskDiv, "display", "none");

        var h = this._dragingHandlers.pop();
        while (h) {
          h.remove();
          h = this._dragingHandlers.pop();
        }
      },

      refreshGridHeight: function() {
        var tab = domQuery(".dijitTabPaneWrapper");
        if (tab && tab.length) {
          domStyle.set(tab[0], "height", "100%"); //larger than grid 40px
        }
      },

      setInitialPosition: function() {
        var h, b;
        if (this.position.height) {
          h = this.position.height;
        } else {
          h = document.body.clientHeight;
          h = h / 3;
        }
        if (this.position.bottom) {
          b = this.position.bottom;
        } else {
          b = 0;
        }
        this.bottomPosition = b;
        this.normalHeight = h;
        domStyle.set(this.domNode, "top", "auto");
        domStyle.set(this.domNode, "left", "0px");
        domStyle.set(this.domNode, "right", "0px");
        domStyle.set(this.domNode, "bottom", this.bottomPosition + "px");
        domStyle.set(this.domNode, "position", "absolute");
      },

      initDiv: function() {
        this.AttributeTableDiv = domConstruct.create("div", {}, this.domNode);
        domClass.add(this.AttributeTableDiv, "jimu-widget-attributetable-main");

        var toolbarDiv = domConstruct.create("div");
        this.toolbarDiv = toolbarDiv;
        var toolbar = new Toolbar({}, domConstruct.create("div"));

        var menus = new DropDownMenu();

        this.showSelectedRecords = new MenuItem({
          label: this.nls.showSelectedRecords,
          iconClass: "esriAttributeTableSelectPageImage",
          onClick: lang.hitch(this, this._showSelectedRecords)
        });
        menus.addChild(this.showSelectedRecords);

        this.showRelatedRecords = new MenuItem({
          label: this.nls.showRelatedRecords,
          iconClass: "esriAttributeTableSelectAllImage",
          onClick: lang.hitch(this, this._showRelatedRecords)
        });
        menus.addChild(this.showRelatedRecords);

        this.matchingCheckBox = new CheckedMenuItem({
          checked: false,
          // style: "margin-left:10px;margin-right:10px;",
          label: this.nls.filterByExtent,
          onChange: lang.hitch(this, function(status) {
            this.matchingMap = status;
            if (status) {
              if (this.grids[this.layersIndex]) {
                this.grids[this.layersIndex]._clickFilterByExtent = true;
              }
              this.startQuery(this.layersIndex, this.map.extent);
            } else {
              if (this.grids[this.layersIndex]) {
                this.grids[this.layersIndex]._clickFilterByExtent = false;
              }
              this.startQuery(this.layersIndex);
            }
          })
        });
        menus.addChild(this.matchingCheckBox);

        var columns = new MenuItem({
          label: this.nls.columns,
          iconClass: "esriAttributeTableColumnsImage",
          onClick: lang.hitch(this, this.toggleColumns)
        });
        menus.addChild(columns);

        if (!this.config.hideExportButton) {
          // always set exportButton to true
          this.exportButton = new MenuItem({
            label: this.nls.exportFiles,
            showLabel: true,
            iconClass: "esriAttributeTableExportImage",
            onClick: lang.hitch(this, this.onExportButton)
          });
          menus.addChild(this.exportButton);
        }

        this.selectionMenu = new DropDownButton({
          label: this.nls.options,
          iconClass: "esriAttributeTableOptionsImage",
          dropDown: menus
        });
        toolbar.addChild(this.selectionMenu);

        this.zoomButton = new Button({
          label: this.nls.zoomto,
          iconClass: "esriAttributeTableZoomImage",
          onClick: lang.hitch(this, this.onZoomButton)
        });
        toolbar.addChild(this.zoomButton);

        var clearSelectionButton = new Button({
          label: this.nls.clearSelection,
          iconClass: "esriAttributeTableClearImage",
          onClick: lang.hitch(this, this._clearSelection, false)
        });
        toolbar.addChild(clearSelectionButton);

        this.refreshButton = new Button({
          label: this.nls.refresh,
          showLabel: true,
          iconClass: "esriAttributeTableRefreshImage",
          onClick: lang.hitch(this, this.onClickRefreshButton)
        });
        toolbar.addChild(this.refreshButton);

        this.closeButton = new Button({
          title: this.nls.closeMessage,
          iconClass: "esriAttributeTableCloseImage",
          onClick: lang.hitch(this, this._closeTable)
        });
        html.addClass(this.closeButton.domNode, 'jimu-float-trailing');
        toolbar.addChild(this.closeButton);

        domConstruct.place(toolbar.domNode, toolbarDiv);

        var tabDiv = domConstruct.create("div");
        this.tableDiv = domConstruct.create("div");
        domConstruct.place(this.tableDiv, tabDiv);
        domConstruct.place(toolbarDiv, this.AttributeTableDiv);
        domConstruct.place(tabDiv, this.AttributeTableDiv);

        var height = domStyle.get(toolbarDiv, "height");
        this.toolbarHeight = height;
        // tabTitle and padding top about 50px, grid footer is 15px
        this.noGridHeight = 50 + height + 15;

        this.tabContainer = new TabContainer({
          style: "width: 100%;"
        }, tabDiv);
        html.setStyle(this.tabContainer.domNode, 'height', (this.normalHeight - height) + 'px');
        var len = this.config.layerInfos.length;
        for (var j = 0; j < len; j++) {
          if (this.config.layerInfos[j].show) {
            var json = lang.clone(this.config.layerInfos[j]);
            var div = domConstruct.create("div");

            json.id = json.id;
            json.title = json.name;
            json.content = div;
            json.layerType = this._layerTypes.FEATURELAYER;
            json.style = "height: 100%; width: 100%; overflow: visible;";
            var cp = new ContentPane(json);
            this.layerTabPages[j] = cp;
            this.tabContainer.addChild(cp);
            if (!this.loadings[j]) {
              this.loadings[j] = new LoadingIndicator();
            }
            this.loadings[j].placeAt(cp);
            this.loadings[j].show();
          }
        }
        this.tabContainer.startup();
        utils.setVerticalCenter(this.tabContainer.domNode);
        this.tabChanged();
        this.own(aspect.after(this.tabContainer, "selectChild", lang.hitch(this, this.tabChanged)));
      },

      getLayerInfoLabel: function(layerInfo) {
        var label = layerInfo.name || layerInfo.title;
        return label;
      },

      getLayerInfoId: function(layerInfo) {
        return layerInfo && layerInfo.id || "";
      },

      toggleColumns: function() {
        if (this.layersIndex > -1 && this.grids[this.layersIndex]) {
          this.grids[this.layersIndex]._toggleColumnHiderMenu();
        }
      },

      onClickRefreshButton: function() {
        if (this.tabContainer && this.tabContainer.selectedChildWidget) {
          var layerType = this.tabContainer.selectedChildWidget.params.layerType;
          if (layerType === this._layerTypes.FEATURELAYER) {
            if (this.layersIndex > -1) {
              if (this.grids[this.layersIndex]) {
                this.grids[this.layersIndex].clearSelection();
              }
              if (this.graphicsLayers[this.layersIndex]) {
                this.graphicsLayers[this.layersIndex].clear();
              }

              this.setSelectedNumber();
              if (this.config.layerInfos[this.layersIndex]) {
                this.config.layerInfos[this.layersIndex].loaded = false;
                this.startQuery(this.layersIndex, this.config.layerInfos[this.layersIndex].extent);
              }
            }
          } else if (layerType === this._layerTypes.RELATIONSHIPTABLE) {
            if (this.currentRelationshipKey) {
              if (this.relationGridsSet[this.currentRelationshipKey]) {
                this.relationGridsSet[this.currentRelationshipKey].clearSelection();
              }

              this.setSelectedNumber();
              if (this.relationshipsSet[this.currentRelationshipKey]) {
                this.relationshipsSet[this.currentRelationshipKey].opened = false;
                this._startQueryOnRelationTab(this.currentRelationshipKey);
              }
            }
          }
        }
      },

      addNewLayerTab: function(params) {
        var layerInfo = this._getLayerInfoById(params.layer.id) ||
          this._getLayerInfoByName(params.layer.name);
        var infoId = this.getLayerInfoId(layerInfo);
        var page = this.getExistLayerTabPage(infoId);
        if (page) {
          this.onOpen();
          this.tabContainer.selectChild(page);
          this.tabChanged();
        } else {
          var info = attrUtils.getConfigInfoFromLayerInfo(layerInfo);
          this.config.layerInfos.push({
            name: info.name,
            layer: {
              url: info.layer.url,
              fields: info.layer.fields
            }
          });
          this.configLayerInfos.push(layerInfo);
          var g = new GraphicsLayer();
          this.graphicsLayers.push(g);
          this.map.addLayer(g);
          this.onOpen();

          var div = domConstruct.create("div");
          var json = {};
          json.name = this.getLayerInfoLabel(layerInfo);
          json.id = this.getLayerInfoId(layerInfo);
          json.content = div;
          json.closable = true;
          json.layerType = this._layerTypes.FEATURELAYER;
          json.style = "height: 100%; width: 100%; overflow: visible";
          var cp = new ContentPane(json);
          this.layerTabPages.push(cp);
          var _loading = new LoadingIndicator();
          _loading.placeAt(cp);
          this.loadings.push(_loading);

          cp.set("title", json.name);
          this.own(on(cp, "close", lang.hitch(this, this.layerTabPageClose, json.id)));
          this.tabContainer.addChild(cp);
          this.tabContainer.selectChild(cp);
        }
      },

      addNewRelationTab: function(oids, relationShip, layersIndex) {
        var page = this.getExistRelationTabPage(relationShip._relKey);

        if (page) {
          page.onClose();
        }

        var div = domConstruct.create("div");
        var json = {};
        json.oids = oids;
        json.name = relationShip._unionName;
        json.id = relationShip._relKey;
        json.content = div;
        json.layersIndex = layersIndex;
        json.closable = true;
        json.layerType = this._layerTypes.RELATIONSHIPTABLE;
        json.style = "height: 100%; width: 100%; overflow: visible";
        var cp = new ContentPane(json);
        this.relationTabPagesSet[relationShip._relKey] = cp;
        var _loading = new LoadingIndicator();
        _loading.placeAt(cp);
        this.relationLoadingSet[relationShip._relKey] = _loading;
        cp.set("title", json.name);
        this.own(on(cp, "close", lang.hitch(this, this.relationTabPageClose, json.id)));
        this.tabContainer.addChild(cp);
        this.tabContainer.selectChild(cp);
      },

      onReceiveData: function(name, source, params) {
        /*jshint unused:vars*/
        if (params && params.target === "AttributeTable") {
          if (this.currentHeight === 0) {
            this._openTable().then(lang.hitch(this, this._addLayerToTable, params));
          } else {
            attrUtils.readConfigLayerInfosFromMap(this.map)
              .then(lang.hitch(this, function(layerInfos) {
                this._allLayerInfos = layerInfos;
                this._processDelayedLayerInfos();
                this._addLayerToTable(params);
              }));
          }
        }
      },

      _addLayerToTable: function(params) {
        var layer = null;
        params.layer.getLayerObject().then(lang.hitch(this, function(layerObject) {
          if (layerObject) {
            layerObject.id = params.layer.id;
            if (layerObject.loaded) {
              this.addNewLayerTab({
                layer: layerObject
              });
            } else {
              this.own(on(layerObject, "load", lang.hitch(this, this.addNewLayerTab)));
            }
          } else if (params.url) {
            layer = new FeatureLayer(params.url);
            this.own(on(layer, "load", lang.hitch(this, this.addNewLayerTab)));
          }
        }), lang.hitch(this, function(err) {
          new Message({
            message: err.message || err
          });
        }));
      },

      getExistLayerTabPage: function(id) {
        var len = this.layerTabPages.length;
        for (var i = 0; i < len; i++) {
          if (this.layerTabPages[i].get('id') === id) {
            return this.layerTabPages[i];
          }
        }
        return null;
      },

      getExistRelationTabPage: function(name) {
        return this.relationTabPagesSet[name];
      },

      layerTabPageClose: function(id, isRemoveChild) {
        var len = this.layerTabPages.length;
        for (var i = 0; i < len; i++) {
          if (this.layerTabPages[i].id === id) {
            if (this.loadings && this.loadings[i]) {
              this.loadings[i].destroy();
              this.loadings.splice(i, 1);
            }

            if (isRemoveChild === true) {
              this.tabContainer.removeChild(this.layerTabPages[i]);
            }
            if (this.grids && this.grids[i]) {
              this.grids[i].destroy();
              this.grids.splice(i, 1);
            }
            if (this.layerTabPages && this.layerTabPages[i]) {
              this.layerTabPages[i].destroyDescendants();
              this.layerTabPages.splice(i, 1);
            }
            if (this.config && this.config.layerInfos && this.config.layerInfos[i]) {
              this.config.layerInfos.splice(i, 1);
              this.configLayerInfos.splice(i, 1);
            }
            if (this.layers && this.layers[i]) {
              this.layers.splice(i, 1);
              this._allLayerInfos.splice(i, 1);
            }
            if (this.graphicsLayers && this.graphicsLayers[i]) {
              this.map.removeLayer(this.graphicsLayers[i]);
              this.graphicsLayers.splice(i, 1);
            }
            if (this.selectedRowsLabelDivs && this.selectedRowsLabelDivs[i]) {
              this.selectedRowsLabelDivs.splice(i, 1);
            }
            if (this.gridFooters && this.gridFooters[i]) {
              this.gridFooters.splice(i, 1);
            }
            if (len === 1) {
              this.layersIndex = -1;
              this.onClose();
              return;
            } else {
              if (i < this.layersIndex) {
                this.layersIndex--;
              } else if (i === this.layersIndex) {
                if (len > 1) {
                  this.layersIndex = len - 2;
                  this.tabContainer.selectChild(this.layerTabPages[this.layersIndex]);
                  this.tabChanged();
                } else {
                  this.layersIndex = 0;
                }
              }
            }
            break;
          }
        }
        setTimeout(lang.hitch(this, function() {
          this.refreshGridHeight();
        }), 10);
      },

      relationTabPageClose: function(relationShipKey) {
        var page = this.getExistRelationTabPage(relationShipKey);
        if (!page) {
          return;
        }

        this.tabContainer.removeChild(page);
        if (this.relationLoadingSet[relationShipKey]) {
          this.relationLoadingSet[relationShipKey].destroy();
          this.relationLoadingSet[relationShipKey] = null;
        }
        if (this.relationGridsSet[relationShipKey]) {
          this.relationGridsSet[relationShipKey].destroy();
          this.relationGridsSet[relationShipKey] = null;
        }

        if (page) {
          page.destroyDescendants();
          page.destroy();
          this.relationTabPagesSet[relationShipKey] = null;
        }

        if (this.relationGridFootersSet[relationShipKey]) {
          this.relationGridFootersSet[relationShipKey] = null;
        }

        if (this.relationSelectedRowsLabelDivsSet[relationShipKey]) {
          this.relationSelectedRowsLabelDivsSet[relationShipKey] = null;
        }

        this.currentRelationshipKey = null;
        this.relationshipsSet[relationShipKey].opened = false;
        setTimeout(lang.hitch(this, function() {
          this.refreshGridHeight();
        }), 10);
      },

      _clearSelection: function() {
        if (this.tabContainer && this.tabContainer.selectedChildWidget) {
          var layerType = this.tabContainer.selectedChildWidget.params.layerType;
          if (layerType === this._layerTypes.FEATURELAYER) {
            this.grids[this.layersIndex].clearSelection();
            this.selections[this.layersIndex] = [];
            this.grids[this.layersIndex].set('query', {});
            this.graphicsLayers[this.layersIndex].clear();
          } else if (layerType === this._layerTypes.RELATIONSHIPTABLE) {
            this.relationGridsSet[this.currentRelationshipKey].clearSelection();
            this.relationGridsSet[this.currentRelationshipKey].set('query', {});
          }
        }

        this.resetButtonStatus();
      },

      _showSelectedRecords: function() {
        var grid = null;
        var oid = null;
        if (this.tabContainer && this.tabContainer.selectedChildWidget) {
          var layerType = this.tabContainer.selectedChildWidget.params.layerType;
          if (layerType === this._layerTypes.FEATURELAYER) {
            grid = this.grids[this.layersIndex];
            oid = this.layers[this.layersIndex].objectIdField;
            grid._clickShowSelectedRecords = true;
          } else if (layerType === this._layerTypes.RELATIONSHIPTABLE) {
            grid = this.relationGridsSet[this.currentRelationshipKey];
            oid = this.relationshipsSet[this.currentRelationshipKey].objectIdField;
          }
        }
        var ids = [];
        var selection = grid.selection;
        for (var id in selection) {
          if (selection[id]) {
            if (isFinite(id)) {
              ids.push(parseInt(id, 10));
            } else {
              ids.push(id);
            }
          }
        }

        if (ids.length > 0 && grid) {
          // when refresh completed select these rows.
          // this.grids[this.layersIndex]._clickShowSelectedRecords = true;

          // var oid = this.layers[this.layersIndex].objectIdField;
          grid.set('query', lang.hitch(this, function(item) {
            if (typeof item === 'number' && ids.indexOf(item) > -1) {
              return true;
            } else if (ids.indexOf(item[oid]) > -1) {
              return true;
            }
            return false;
          }));
        }
      },

      _showRelatedRecords: function() {
        var objIds = this.getSelectedRows();
        var _layer = this.layers[this.layersIndex];
        var ships = _layer.relationships;

        for (var i = 0, len = ships.length; i < len; i++) {
          this.addNewRelationTab(objIds, ships[i], this.layersIndex);
        }
      },

      _processRelatedRecordsFromPopup: function(layerInfo, featureIds) {
        var layersIndex = this._getLayerIndexById(layerInfo.id);

        if (layersIndex > -1 && this.configLayerInfos[layersIndex]) {
          this.configLayerInfos[layersIndex].getLayerObject()
            .then(lang.hitch(this, function(layerObject) {
              this.initSelectedLayer(layerObject, layersIndex);
              this._collectRelationShips(layerObject, layerInfo);
              var ships = layerObject.relationships;
              for (var i = 0, len = ships.length; i < len; i++) {
                this.addNewRelationTab(featureIds, ships[i], layersIndex);
              }
            }));
        }
      },

      showRelatedRecordsFromPopup: function(layerInfo, featureIds) {
        if (this.currentHeight === 0) {
          this._openTable()
            .then(lang.hitch(this, this._processRelatedRecordsFromPopup, layerInfo, featureIds));
        } else {
          attrUtils.readConfigLayerInfosFromMap(this.map)
            .then(lang.hitch(this, function(layerInfos) {
              this._allLayerInfos = layerInfos;
              this._processDelayedLayerInfos();
              this._processRelatedRecordsFromPopup(layerInfo, featureIds);
            }));
        }

      },

      _onLayerDgridSelect: function(evt) {
        // grid.select(id) is emitting dgrid-select.
        if (this.grids[this.layersIndex]._clickShowSelectedRecords) {
          return;
        }

        var ids = [];
        var selection = evt.grid.selection;
        for (var id in selection) {
          if (selection[id]) {
            if (isFinite(id)) {
              ids.push(parseInt(id, 10));
            } else {
              ids.push(id);
            }
          }
        }
        this.selections[this.layersIndex] = ids;
      },

      _onLayerDgridDeselect: function(evt) {
        if (this.grids[this.layersIndex]._clickShowSelectedRecords ||
          this.grids[this.layersIndex]._clickFilterByExtent) {
          return;
        }

        var selectedIds = this.selections[this.layersIndex];
        var selectIds = array.filter(selectedIds, lang.hitch(this, function(selectedId) {
          return !array.some(evt.rows, lang.hitch(this, function(row) {
            return selectedId.toString() === row.id.toString();
          }));
        }));
        this.selections[this.layersIndex] = selectIds;
      },

      _onLayerDgridRefreshComplete: function(evt) {
        if (evt.grid._clickShowSelectedRecords) {
          var selectedIds = this.selections[this.layersIndex];
          array.forEach(selectedIds, lang.hitch(this, function(id) {
            evt.grid.select(id);
          }));

          evt.grid._clickShowSelectedRecords = false;

          if (this.layers[this.layersIndex].url) {
            this._queryFeaturesByIds(selectedIds, 'selectall');
          } else {
            this.selectFeatures(
              "selectall",
              this.getGraphicsFromLocalFeatureLayer(this.layersIndex, selectedIds)
            );
          }
        }
      },

      exportToCSV: function() {
        if (this.tabContainer && this.tabContainer.selectedChildWidget) {
          var params = this.tabContainer.selectedChildWidget.params;
          this.showRefreshing(true);
          this._getExportData(params)
            .then(lang.hitch(this, function(result) {
              this._createCSVStr(result.data, result.outFields, result.pk, result.types)
                .then(lang.hitch(this, function(content) {
                  this.download(params.name + ".csv", content);
                }));
            })).always(lang.hitch(this, function() {
              this.showRefreshing(false);
            }));
        }

        return;
      },

      _getExportData: function(params) {
        var def = new Deferred();

        var layerType = params.layerType;
        var _outFields = null;
        var pk = null;
        var types = null;
        var data = this.getSelectedRowsData();
        if (layerType === this._layerTypes.FEATURELAYER) {
          if (!this.config.layerInfos || this.config.layerInfos.length === 0) {
            return;
          }
          _outFields = this._getOutFieldsFromLayerInfos(
            this.layersIndex,
            this.layers[this.layersIndex].objectIdField
          );
          _outFields = this._processExecuteFields(
            this.layers[this.layersIndex].fields,
            _outFields
          );
          pk = this.layers[this.layersIndex].objectIdField;
          types = this.layers[this.layersIndex].types;
        } else if (layerType === this._layerTypes.RELATIONSHIPTABLE) {
          var _key = params.id;
          _outFields = this.relationGridsSet[_key].__outFields;
          pk = this.relationGridsSet[_key].__pk;
        }

        if (data && data.length > 0) {
          def.resolve({
            'data': data,
            'outFields': _outFields,
            'pk': pk,
            'types': types
          });
        } else { //export all features if no selected rows
          // get data directly from store if the store is Memory Store,
          // get all data from server if the store is FeatureLayerQueryStore
          if (layerType === this._layerTypes.FEATURELAYER) {
            var store = this.grids[this.layersIndex].store;
            if (store instanceof Memory) {
              data = store.data;
              def.resolve({
                'data': data,
                'outFields': _outFields,
                'pk': pk,
                'types': types
              });
            } else {
              this._getExportDataFromServer(this.layersIndex, _outFields)
                .then(lang.hitch(this, function(data) {
                  def.resolve({
                    'data': data,
                    'outFields': _outFields,
                    'pk': pk,
                    'types': types
                  });
                }));
            }
          } else if (layerType === this._layerTypes.RELATIONSHIPTABLE) {
            data = this.relationGridsSet[params.id].store.data;
            def.resolve({
              'data': data,
              'outFields': _outFields,
              'pk': pk,
              'types': types
            });
          } else {
            def.resolve({
              'data': [],
              'outFields': _outFields,
              'pk': pk,
              'types': types
            });
          }
        }

        return def;
      },

      _getExportDataFromServer: function(index, outFields) {
        var def = new Deferred();
        var currentLayer = this.layers[index];
        var qt = new QueryTask(currentLayer.url);
        var query = new Query();
        query.where = this._getLayerFilterExpression(currentLayer);
        var oFields = outFields;
        if (oFields.length > 0) {
          var oNames = array.map(oFields, function(field) {
            return field.name;
          });
          query.outFields = oNames;
        } else {
          query.outFields = ["*"];
        }
        query.outSpatialReference = {
          wkid: this.map.spatialReference.wkid
        };

        query.returnGeometry = false;
        qt.execute(query, lang.hitch(this, function(results) {
          var data = array.map(results.features, function(feature) {
            return feature.attributes;
          });
          def.resolve(data);
        }), lang.hitch(this, function(err) {
          console.error(err);
          def.resolve([]);
        }));

        return def;
      },

      _createCSVStr: function(data, _outFields, pk, types) {
        var def = new Deferred();
        var textField = '"';
        var content = "";
        var len = 0,
          n = 0,
          comma = "",
          value = "";
        try {
          array.forEach(_outFields, function(_field) {
            content = content + comma + (_field.alias || _field.name);
            comma = ",";
          });

          content = content + "\r\n";
          len = data.length;
          n = _outFields.length;
          for (var i = 0; i < len; i++) {
            comma = "";
            for (var m = 0; m < n; m++) {
              var _field = _outFields[m];
              value = this._getExportValue(data[i][_field.name], _field, pk, data[i][pk], types);
              if (!value && typeof value !== "number") {
                value = "";
              }
              if (value && /[",]/g.test(value)) {
                value = textField + value.replace(/(")/g, '""') + textField;
              }
              content = content + comma + value;
              comma = ",";
            }
            content = content + "\r\n";
          }
          def.resolve(content);
        } catch (err) {
          console.error(err);
          def.resolve("");
        }

        return def;
      },

      _getExportValue: function(data, field, pk, pkData, types) {
        var isDomain = !!field.domain;
        var isDate = field.type === "esriFieldTypeDate";
        var isTypeIdField = pk && (field.name === pk);

        if (isDate) {
          return this.dateFormatter(data);
        }
        if (isDomain) {
          return this.getCodeValue(field.domain, data);
        }
        if (!isDomain && !isDate && !isTypeIdField) {
          var codeValue = null;
          if (pk && types && types.length > 0) {
            var typeCheck = array.filter(types, lang.hitch(this, function(item) {
              // value of typeIdFild has been changed above
              return item.name === pkData;
            }));

            if (typeCheck && typeCheck.domains &&
              typeCheck.domains[field.name] && typeCheck.domains[field.name].codedValues) {
              codeValue = this.getCodeValue(
                typeCheck.domains[field.name],
                data
              );
            }
          }
          return codeValue !== null ? codeValue : data;
        }

        return data;
      },

      getSelectedRowsData: function() {
        if (this.tabContainer && this.tabContainer.selectedChildWidget) {
          var layerType = this.tabContainer.selectedChildWidget.params.layerType;
          var store = null;
          var data = null;
          var selectedIds = null;
          var rows = [];
          var oid = null;
          if (layerType === this._layerTypes.FEATURELAYER) {
            if (!this.grids.length) {
              return null;
            }
            if (!this.grids[this.layersIndex]) {
              return null;
            }
            oid = this.layers[this.layersIndex].objectIdField;
            store = this.grids[this.layersIndex].store;
            data = store._entityData || store.data;
            selectedIds = this.getSelectedRows();

            rows = array.map(selectedIds, lang.hitch(this, function(id) {
              for (var i = 0, len = data.length; i < len; i++) {
                if (data[i] && data[i][oid] === id) {
                  return data[i];
                }
              }
              return [];
            }));
          } else if (layerType === this._layerTypes.RELATIONSHIPTABLE) {
            var _key = this.tabContainer.selectedChildWidget.params.id;
            oid = this.relationshipsSet[_key].objectIdField;
            if (!this.relationGridsSet[_key]) {
              return null;
            }

            store = this.relationGridsSet[_key].store;
            data = this.relationGridsSet[_key].store.data;
            var ids = [];
            var selection = this.relationGridsSet[_key].selection;
            for (var id in selection) {
              if (selection[id]) {
                if (isFinite(id)) {
                  ids.push(parseInt(id, 10));
                } else {
                  ids.push(id);
                }
              }
            }
            selectedIds = ids;

            rows = array.map(selectedIds, lang.hitch(this, function(id) {
              for (var i = 0, len = data.length; i < len; i++) {
                if (data[i][oid] === id) {
                  return data[i];
                }
              }
              return {};
            }));
          }

          return rows || [];
        }

        return null;
      },

      getSelectedRows: function() {
        return this.selections[this.layersIndex] || [];
      },

      _isIE11: function() {
        var iev = 0;
        var ieold = (/MSIE (\d+\.\d+);/.test(navigator.userAgent));
        var trident = !!navigator.userAgent.match(/Trident\/7.0/);
        var rv = navigator.userAgent.indexOf("rv:11.0");

        if (ieold) {
          iev = Number(RegExp.$1);
        }
        if (navigator.appVersion.indexOf("MSIE 10") !== -1) {
          iev = 10;
        }
        if (trident && rv !== -1) {
          iev = 11;
        }

        return iev === 11;
      },

      download: function(filename, text) {
        if (has("ie") || this._isIE11()) { // has module unable identify ie11
          var oWin = window.top.open("about:blank", "_blank");
          oWin.document.write(text);
          oWin.document.close();
          oWin.document.execCommand('SaveAs', true, filename);
          oWin.close();
        } else {
          var link = domConstruct.create("a", {
            href: 'data:attachment/csv;charset=utf-8,' + encodeURIComponent(text),
            target: '_blank',
            download: filename
          }, this.domNode);
          if (has('safari')) {
            // # First create an event
            var click_ev = document.createEvent("MouseEvents");
            // # initialize the event
            click_ev.initEvent("click", true /* bubble */ , true /* cancelable */ );
            // # trigger the evevnt/
            link.dispatchEvent(click_ev);
          } else {
            link.click();
          }

          domConstruct.destroy(link);
        }
      },

      onExportButton: function() {
        if (!this.config.layerInfos || this.config.layerInfos.length === 0) {
          return;
        }
        var popup = new Message({
          message: this.nls.exportMessage,
          titleLabel: this.nls.exportFiles,
          autoHeight: true,
          buttons: [{
            label: this.nls.ok,
            onClick: lang.hitch(this, function() {
              this.exportToCSV();
              popup.close();
            })
          }, {
            label: this.nls.cancel,
            onClick: lang.hitch(this, function() {
              popup.close();
            })
          }]
        });
      },

      onZoomButton: function() {
        if (!this.config.layerInfos || this.config.layerInfos.length === 0) {
          return;
        }
        var ids = [];
        var selection = this.grids[this.layersIndex].selection;
        for (var id in selection) {
          if (selection[id]) {
            ids.push(id);
          }
        }
        if (ids.length === 0) {
          // var extent = this.layers[this.layersIndex].fullExtent;
          // if (extent) {
          //   this.map.setExtent(extent);
          // }
          return;
        } else {
          if (this.layers[this.layersIndex].url) {
            this._queryFeaturesByIds(ids, 'zoom');
          } else {
            this.onLayerGridRowClick(ids);
          }
        }
      },

      popupMessage: function(index, message) {
        var popup = new Message({
          message: message,
          buttons: [{
            label: this.nls.ok,
            onClick: lang.hitch(this, function() {
              popup.close();
            })
          }]
        });

        // this.showRefreshing(false);
        this.showLoading(index, false);
      }
    });

    clazz.inPanel = false;
    clazz.hasUIFile = false;
    return clazz;
  });