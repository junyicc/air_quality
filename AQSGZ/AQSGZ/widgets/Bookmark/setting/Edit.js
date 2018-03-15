define(
  ["dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    'dojo/_base/html',
    "dojo/on",
    "dojo/dom-style",
    "dojo/dom-attr",
    "dojo/query",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/registry",
    "jimu/BaseWidgetSetting",
    "jimu/dijit/Message",
    'esri/SpatialReference',
    'esri/geometry/Extent',
    'jimu/dijit/ImageChooser',
    'jimu/dijit/ExtentChooser',
    'jimu/utils',
    "dojo/text!./Edit.html"
  ],
  function(
    declare,
    lang,
    array,
    html,
    on,
    domStyle,
    domAttr,
    query,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    registry,
    BaseWidgetSetting,
    Message,
    SpatialReference,
    Extent,
    ImageChooser,
    ExtentChooser,
    utils,
    template
    ){
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
      baseClass: "jimu-Bookmark-Edit",
      ImageChooser: null,
      templateString: template,
      extent:  {},
      portalUrl: null,
      itemId: null,

      postCreate: function(){
        this.inherited(arguments);
        this.imageChooser = new ImageChooser({
          displayImg: this.showImageChooser,
          goldenWidth: 155,
          goldenHeight: 95
        });
        this.own(on(this.name, 'Change', lang.hitch(this, '_onNameChange')));
        html.addClass(this.imageChooser.domNode, 'img-chooser');
        html.place(this.imageChooser.domNode, this.imageChooserBase, 'replace');
        domAttr.set(this.showImageChooser, 'src', this.folderUrl + "images/thumbnail_default.png");
      },

      setConfig: function(bookmark){
        if (bookmark.name){
          this.name.set('value', bookmark.name);
        }
        if (bookmark.thumbnail){
          var thumbnailValue = utils.processUrlInWidgetConfig(bookmark.thumbnail, this.folderUrl);
          html.setAttr(this.showImageChooser, 'src', thumbnailValue);
        }
        if (bookmark.extent){
          this.extentChooser = new ExtentChooser({
            portalUrl : this.portalUrl,
            itemId: this.itemId,
            initExtent: new Extent(bookmark.extent)
          }, this.extentChooserNode);
        }else{
          this.extentChooser = new ExtentChooser({
            portalUrl : this.portalUrl,
            itemId: this.itemId
          }, this.extentChooserNode);
        }

        this.own(on(this.extentChooser, 'extentChange', lang.hitch(this, this._onExtentChange)));
      },

      getConfig: function(){
        var bookmark = {
          name: this.name.get("value"),
          extent: this.extentChooser.getExtent(),
          thumbnail: this.imageChooser.imageData
        };
        return bookmark;
      },
      
      _onNameChange: function(){
        this._checkRequiredField();
      },

      _onExtentChange: function(extent){
        this.currentExtent = extent;
      },

      _checkRequiredField: function(){
        if (!this.name.get('value')){
          if (this.popup){
            this.popup.disableButton(0);
          }
        }else{
          if (this.popup){
            this.popup.enableButton(0);
          }
        }
      }
    });
  });