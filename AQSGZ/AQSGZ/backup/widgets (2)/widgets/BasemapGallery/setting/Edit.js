define(
  ["dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    'dojo/_base/html',
    "dojo/on",
    "dojo/dom-attr",
    "dojo/query",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/registry",
    "jimu/BaseWidgetSetting",
    'jimu/dijit/ImageChooser',
    "dojo/text!./Edit.html",
    "jimu/dijit/ServiceURLInput",
    "jimu/SpatialReference/wkidUtils",
    'jimu/utils',
    "../utils"
  ],
  function(
    declare,
    lang,
    array,
    html,
    on,
    domAttr,
    query,
    _WidgetsInTemplateMixin,
    registry,
    BaseWidgetSetting,
    ImageChooser,
    template,
    ServiceURLInput,
    SRUtils,
    jimuUtils,
    utils){
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
      baseClass: "jimu-basemapgallery-Edit",
      ImageChooser: null,
      templateString: template,
      validUrl: false,
      mapName: null,
      subLayerUrlNum:  0,
      urlInputS: [],
      baseMapSRID: null,
      spatialReference: null,

      postCreate: function(){
        this.inherited(arguments);

        this.imageChooser = new ImageChooser({
          displayImg: this.showImageChooser,
          goldenWidth: 84,
          goldenHeight: 67
        });

        html.addClass(this.imageChooser.domNode, 'img-chooser');
        html.place(this.imageChooser.domNode, this.imageChooserBase);

        this.own(on(this.url, 'Change', lang.hitch(this, '_onServiceUrlChange')));
        this.title.proceedValue = false;
        this.own(on(this.title, 'Change', lang.hitch(this, '_onBaseMapTitleChange')));
        this.url.proceedValue = false;
        this.url.setProcessFunction(lang.hitch(this, '_onServiceFetch', this.url),
                                    lang.hitch(this, '_onServiceFetchError'));
      },

      startup: function(){
        var thumbnailUrl;
        if (this.basemap && this.basemap.title){
          this.title.set('value', this.basemap.title);
        }
        if (this.basemap && this.basemap.thumbnailUrl){
          if (this.basemap.thumbnailUrl.indexOf('//') === 0) {
            thumbnailUrl = this.basemap.thumbnailUrl + this.token;
          } else {
            thumbnailUrl = jimuUtils.processUrlInWidgetConfig(this.basemap.thumbnailUrl,
                                                              this.folderUrl);
          }
        } else {
          thumbnailUrl = this.folderUrl + "images/default.jpg";
        }
        domAttr.set(this.showImageChooser, 'src', thumbnailUrl);
        this.imageChooser.imageData = thumbnailUrl;

        if (this.basemap && this.basemap.layers){
          if(utils.isNoUrlLayerMap(this.basemap)) {
            html.destroy(this.urlPart);
            html.setStyle(this.secondTable, 'display', 'none');
            html.setStyle(this.settingContentDiv, 'height', '150px');
          } else {
            var numLayer = this.basemap.layers.length;
            if(this.basemap.layers[0] && this.basemap.layers[0].url) {
              this.url.set('value', this.basemap.layers[0].url);
            }
            for (var j = 1; j < numLayer; j++){
              this.addLayerUrl(this.basemap.layers[j].url);
            }
          }
        }
      },

      _onServiceUrlChange: function(){
        this.popup.disableButton(0);
      },

      _checkTitle: function(title) {
        var validTitle = true;
        for(var i = 0; i < this.basemaps.length; i++) {
          if (this.basemaps[i].title === title) {
            if (this.basemap && this.basemap.title === title) {
              validTitle = true;
            } else {
              validTitle = false;
            }
          }
        }
        return validTitle;
      },

      _onBaseMapTitleChange: function(title){
        // this._checkRequiredField();
        var validTitle = this._checkTitle(title);
        var errorMessage = null;
        if (!title) {
          this.title.proceedValue = false;
        } else if (validTitle) {
          this.title.proceedValue = true;
        } else {
          this.title.proceedValue = false;
          errorMessage = this.nls.invalidTitle1 + title + this.nls.invalidTitle2;
        }
        this._checkProceed(errorMessage);
      },

      _checkProceed: function(errorMessage) {
        var canProceed = true;
        var urlDijits = [];
        html.setAttr(this.errorMassage, 'innerHTML', '');
        if (this.title.proceedValue) {
          urlDijits = this._getUrlDijits();
          for(var i = 0; i < urlDijits.length; i++) {
            canProceed = canProceed && urlDijits[i].proceedValue;
          }
        } else {
          canProceed = false;
        }
        if (canProceed) {
          this.popup.enableButton(0);
        } else {
          this.popup.disableButton(0);
          if (errorMessage) {
            html.setAttr(this.errorMassage, 'innerHTML', errorMessage);
          }
        }
      },

      _onServiceFetch: function(urlDijit, evt){
        var result = false;
        var errorMessage = null;
        var url = evt.url.replace(/\/*$/g, '');
        if (this._isStringEndWith(url, '/MapServer') ||
            this._isStringEndWith(url, '/ImageServer')) {
          var curMapSpatialRefObj = this.map.spatialReference;
          var basemapSpatialRefObj = evt.data.spatialReference ||
                                     evt.data.extent.spatialReference ||
                                     evt.data.initialExtent.spatialReference ||
                                     evt.data.fullExtent.spatialReference;
          if (curMapSpatialRefObj &&
              basemapSpatialRefObj &&
              SRUtils.isSameSR(curMapSpatialRefObj.wkid, basemapSpatialRefObj.wkid)) {
            urlDijit.proceedValue = true;
            result = true;
          } else {
            urlDijit.proceedValue = false;
            result = false;
            errorMessage = this.nls.invalidBasemapUrl2;
          }
        } else {
          urlDijit.proceedValue = false;
          result = false;
          errorMessage = this.nls.invalidBasemapUrl1;
        }

        this._checkProceed(errorMessage);
        return result;
      },

      _isStringEndWith: function(s,endS){
        return (s.lastIndexOf(endS) + endS.length === s.length);
      },

      _onServiceFetchError: function(){
      },

      onAddLayerUrl: function(){
        this.addLayerUrl();
      },

      addLayerUrl: function(url) {
        /*jshint unused: false*/
        var urlTrDom = html.create('tr', {}, this.body);
        var urlFirstTdDom = html.create('td', {
          'class': 'first'
        }, urlTrDom);
        var urlSecondTdDom = html.create('td', {
          'class': 'second'
        }, urlTrDom);

        var urlThirdTdDom = html.create('td', {
          'class': 'third'
        }, urlTrDom);

        var urlInput = new ServiceURLInput({
            placeHolder: this.nls.urlPH,
            required: true,
            proceedValue: 0,
            style:{width:"100%"}
          }).placeAt(urlSecondTdDom);
        html.addClass(urlInput.domNode, "url_field_dom");

        if (url) {
          urlInput.set('value', url);
        }

        var deleteSpanDom = html.create('span', {
          'class': 'delete-layer-url-icon'
        }, urlThirdTdDom);

        urlInput.setProcessFunction(lang.hitch(this, '_onServiceFetch', urlInput),
                                    lang.hitch(this, '_onServiceFetchError'));
        this.own(on(deleteSpanDom, 'click', lang.hitch(this, '_onDeleteClick', urlTrDom)));
        this._checkProceed();
      },

      _onDeleteClick:function(urlTrDom){
        html.destroy(urlTrDom);
        this._checkProceed();
      },

      _getUrlDijits: function() {
        var urlDijits = [];
        query(".url_field_dom", this.firstTable).forEach(lang.hitch(this, function(urlDom){
          urlDijits.push(registry.byNode(urlDom));
        }));
        return urlDijits;
      },

      _getEditedBaseMap: function() {
        var basemap = {
          title: this.title.value,
          thumbnailUrl: utils.getStanderdUrl(this.imageChooser.imageData),
          layers: [],
          spatialReference: (this.basemap && this.basemap.spatialReference) ||
                            this.map.spatialReference
        };

        // do not update basmaps if map is bingMap or openstreetMap
        if(utils.isNoUrlLayerMap(this.basemap)) {
          basemap.layers = this.basemap.layers;
        } else {
          array.forEach(this._getUrlDijits(), function(urlDijit) {
            basemap.layers.push({url: urlDijit.value});
          }, this);
        }

        return basemap;
      },

      _onEditOk: function(settingWidget) {
        if(this.basemap) {
          //this.basemap = this._getEditedBaseMap();
          settingWidget.basemaps[settingWidget._findBaseMapByTitle(this.basemap.title)]=
            this._getEditedBaseMap();
        } else {
          settingWidget.basemaps.push(this._getEditedBaseMap());
        }
        settingWidget.popup.close();

        settingWidget.refreshMapGallary();
      },

      _onEditClose: function(settingWidget) {
        if (settingWidget.popup) {
          settingWidget.popup.close();
        }
        this.destroy();
      }

    });
  });