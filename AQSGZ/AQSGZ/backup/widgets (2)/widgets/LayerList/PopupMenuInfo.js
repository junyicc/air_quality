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
  'dojo/_base/array',
  'dojo/_base/lang',
  'dojo/Deferred',
  'dojo/promise/all',
  'jimu/portalUrlUtils',
  'jimu/WidgetManager',
  './NlsStrings'
], function(declare, array, lang, Deferred, all, portalUrlUtils, WidgetManager, NlsStrings) {
  var clazz = declare([], {

    _candidateMenuItems: null,
    //_deniedItems: null,
    _displayItems: null,
    _layerInfo: null,
    _layerType: null,
    _appConfig: null,

    constructor: function(layerInfo, displayItemInfos, layerType, appConfig) {
      this.nls = NlsStrings.value;
      this._layerInfo = layerInfo;
      this._layerType = layerType;
      this._appConfig = appConfig;
      this._initCandidateMenuItems();
      this._initDisplayItems(displayItemInfos);
    },

    _getATagLabel: function() {
      var url;
      var label;
      var itemLayerId = this._layerInfo._isItemLayer && this._layerInfo._isItemLayer();

      if(itemLayerId) {
        url = portalUrlUtils.
              getItemDetailsPageUrl(portalUrlUtils.getStandardPortalUrl(this._appConfig.portalUrl),
                                    itemLayerId);
        label = this.nls.itemShowItemDetails;
      } else if(this._layerInfo.layerObject &&
                this._layerInfo.layerObject.url &&
                (this._layerType === "CSVLayer" || this._layerType === "KMLLayer")) {
        url = this._layerInfo.layerObject.url;
        label = this.nls.itemDownload;
      } else if(this._layerInfo.layerObject && this._layerInfo.layerObject.url) {
        url = this._layerInfo.layerObject.url;
        label = this.nls.itemDesc;
      } else {
        url = '';
        label = this.nls.itemDesc;
      }

      return '<a class="menu-item-description" target="_blank" href="' +
        url + '">' + label + '</a>';
    },


    _initCandidateMenuItems: function() {
      //descriptionTitle: NlsStrings.value.itemDesc,
      // var layerObjectUrl = (this._layerInfo.layerObject && this._layerInfo.layerObject.url) ?
      //                       this._layerInfo.layerObject.url :
      //                       '';
      this._candidateMenuItems = [{
        key: 'separator',
        label: ''
      },{
        key: 'empty',
        label: this.nls.empty
      },{
        key: 'zoomto',
        label: this.nls.itemZoomTo
      },{
        key: 'transparency',
        label: this.nls.itemTransparency
      },{
        key: 'moveup',
        label: this.nls.itemMoveUp
      },{
        key: 'movedown',
        label: this.nls.itemMoveDown
      },{
        key: 'table',
        label: this.nls.itemToAttributeTable
      },{
        key: 'controlPopup',
        label: this.nls.removePopup
      },{
        key: 'url',
        label: this._getATagLabel()
      }];
    },

    _initDisplayItems: function(displayItemInfos) {
      this._displayItems = [];
      // according to candidate itmes to init displayItems
      array.forEach(displayItemInfos, function(itemInfo) {
        array.forEach(this._candidateMenuItems, function(item){
          if(itemInfo.key === item.key) {
            this._displayItems.push(lang.clone(item));
            if(itemInfo.onClick) {
              this._displayItem.onClick = itemInfo.onClick;
            }
          }
        }, this);
      }, this);
    },

    getDeniedItems: function() {
      var defRet = new Deferred();
      var dynamicDeniedItems = [];

      if (this._layerInfo.isFirst) {
        dynamicDeniedItems.push('moveup');
      } else if (this._layerInfo.isLast) {
        dynamicDeniedItems.push('movedown');
      }

      if(!this._layerInfo.layerObject || !this._layerInfo.layerObject.url) {
        dynamicDeniedItems.push('url');
      }

      var loadInfoTemplateDef = this._layerInfo.loadInfoTemplate();
      var getSupportTableInfoDef = this._layerInfo.getSupportTableInfo();

      all({
        infoTemplate: loadInfoTemplateDef,
        supportTableInfo: getSupportTableInfoDef
      }).then(lang.hitch(this._layerInfo, function(result){

        // deny controlPopup
        if(!result.infoTemplate) {
          dynamicDeniedItems.push('controlPopup');
        }

        // deny table.
        var supportTableInfo = result.supportTableInfo;
        var attributeTableWidgets = WidgetManager.getInstance().getWidgetsByName("AttributeTable");
        var hasAttributeTable = attributeTableWidgets.length > 0 &&
                                attributeTableWidgets[0].visible;
        if (!hasAttributeTable ||
            !supportTableInfo.isSupportedLayer ||
            !supportTableInfo.isSupportQuery) {
          dynamicDeniedItems.push('table');
        }
        defRet.resolve(dynamicDeniedItems/*this.***.deniedItems.concat(dynamicDeniedItems)*/);
      }), function() {
        defRet.resolve(dynamicDeniedItems/*this.***.deniedItems.concat(dynamicDeniedItems)*/);
      });

      return defRet;
    },

    getDisplayItems: function() {
      return this._displayItems;
    },

    onPopupMenuClick: function(evt) {
      var result = {
        closeMenu: true
      };
      switch (evt.itemKey) {
      case 'zoomto'/*this.nls.itemZoomTo'Zoom to'*/:
        this._onItemZoomToClick(evt);
        break;
      case 'moveup'/*this.nls.itemMoveUp'Move up'*/:
        this._onMoveUpItemClick(evt);
        break;
      case 'movedown'/*this.nls.itemMoveDown'Move down'*/:
        this._onMoveDownItemClick(evt);
        break;
      case 'table'/*this.nls.itemToAttributeTable'Open attribute table'*/:
        this._onTableItemClick(evt);
        break;
      case 'transparencyChanged':
        this._onTransparencyChanged(evt);
        result.closeMenu = false;
        break;
      case 'controlPopup':
        this._onControlPopup();
        break;

      }
      return result;
    },

    /**********************************
     * Respond events respectively.
     *
     * event format:
      // evt = {
      //   itemKey: item key
      //   extraData: estra data,
      //   layerListWidget: layerListWidget,
      //   layerListView: layerListView
      // }, result;
     **********************************/
    _onItemZoomToClick: function(evt) {
      /*jshint unused: false*/
      //this.map.setExtent(this.getExtent());
      this._layerInfo.getExtent().then(lang.hitch(this, function(geometries) {
        this._layerInfo.map.setExtent(geometries[0]);
      }));
    },

    _onMoveUpItemClick: function(evt) {
      if (!this._layerInfo.isFirst) {
        evt.layerListView.moveUpLayer(this._layerInfo.id);
      }
    },

    _onMoveDownItemClick: function(evt) {
      if (!this._layerInfo.isLast) {
        evt.layerListView.moveDownLayer(this._layerInfo.id);
      }
    },

    _onTableItemClick: function(evt) {
      // new version, send layerInfo object.
      this._layerInfo.getLayerType().then(lang.hitch(this, function(layerType){
        if (this._layerInfo._getLayerTypesOfSupportTable().indexOf(layerType) >= 0) {
          evt.layerListWidget.publishData({
            'target': 'AttributeTable',
            'layer': this._layerInfo
          });
        }
      }));
    },

    _onTransparencyChanged: function(evt) {
      this._layerInfo.setOpacity(1 - evt.extraData.newTransValue);
    },

    _onControlPopup: function(evt) {
      /*jshint unused: false*/
      if(this._layerInfo.controlPopupInfo.enablePopup) {
        this._layerInfo.disablePopup();
      } else {
        this._layerInfo.enablePopup();
      }
      this._layerInfo.map.infoWindow.hide();
    }
  });

  clazz.create = function(layerInfo, appConfig) {
    var retDef = new Deferred();
    var isRootLayer = layerInfo.isRootLayer();
    var defaultItemInfos = [{
        key: 'url',
        onClick: null
      }];

    var itemInfoCategoreList = {
      'RootLayer': [{
        key: 'zoomto'
      },{
        key: 'transparency'
      },{
        key:'separator'
      },{
        key: 'moveup'
      },{
        key: 'movedown'
      },{
        key:'separator'
      },{
        key: 'url'
      }],
      'RootLayerAndFeatureLayer': [{
        key: 'zoomto'
      }, {
        key: 'transparency'
      }, {
        key:'separator'
      },{
        key: 'controlPopup'
      }, {
        key:'separator'
      },{
        key: 'moveup'
      }, {
        key: 'movedown'
      }, {
        key:'separator'
      }, {
        key: 'table'
      }, {
        key:'separator'
      },{
        key: 'url'
      }],
      'FeatureLayer': [{
        key: 'controlPopup'
      }, {
        key:'separator'
      }, {
        key: 'table'
      }, {
        key:'separator'
      }, {
        key: 'url'
      }],
      'GroupLayer': [{
        key: 'url'
      }],
      'Table': [{
        key: 'table'
      }, {
        key:'separator'
      }, {
        key: 'url'
      }],
      'default': defaultItemInfos
    };

    layerInfo.getLayerType().then(lang.hitch(this, function(layerType){
      var itemInfoCategory = "";
      if(isRootLayer && (layerType === "FeatureLayer" ||
                         layerType === "CSVLayer" ||
                         layerType ==="ArcGISImageServiceLayer")) {
        itemInfoCategory = "RootLayerAndFeatureLayer";
      } else if(isRootLayer ) {
        itemInfoCategory = "RootLayer";
      } else if(layerType === "FeatureLayer" || layerType === "CSVLayer") {
        itemInfoCategory = "FeatureLayer";
      } else if(layerType === "GroupLayer") {
        itemInfoCategory = "GroupLayer";
      } else if(layerType === "Table") {
        itemInfoCategory = "Table";
      } else {
        //default condition
        itemInfoCategory = "default";
      }
      retDef.resolve(new clazz(layerInfo,
                               itemInfoCategoreList[itemInfoCategory],
                               layerType,
                               appConfig));
    }), lang.hitch(this, function() {
      //return default popupmenu info.
      retDef.resolve(new clazz(layerInfo, [{key:'empty'}]));
    }));
    return retDef;
  };


  return clazz;
});