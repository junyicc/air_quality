//This file describes the format of the config.json.

{
  //Required
  "theme": {
    "name": "FoldableTheme",

    //This property stores all of the theme's styles. The app displays the first style by default.
    "styles": [],

    //Optional. It is the theme version.
    "version": "1.1"
  },

  //Optional. If not set, do not use proxy.
  "httpProxy": {
    //Optional. Default to true. If false all requests will not use proxy.
    //If true, if the request match proxy rule, use proxy;
    //         if the request doesn't match proxy rule but need proxy(cross domain, i.e.), use proxy url;
    //         if the request neither match proxy rule nor the request doesn't need proxy, framework will check "alwaysUseProxy";
    //            if alwaysUseProxy=true, the request uses proxy url, or the request doesn't use proxy.
    "useProxy": true,

    //Optional. Default to false. If true, all requests use proxy.
    "alwaysUseProxy": false,

    //Optional. If not empty, the url will be set to esriConfig.defaults.io.proxyUrl property.
    "url": "",
    //Optional. If not empty, these rules will be added to urlUtils proxyRule.
    "rules": [{
      "urlPrefix": "",
      "proxyUrl": ""
    }]
  },

  //Optional. The portal URL. If empty, use the URL that app is hosted.
  "portalUrl": "http://mypc.com/arcgis/",

  //Optional. Whether the portal uses webtier authentication. Default to false.
  "isWebTier": false,

  //Optional. If the portal URL is arcgis.com, the appid is required for OAuth2 signin.
  "appId": "",

  //Optional. The URL of the geometry service used by widgets and the webmap. If not set, it reads from the portal.
  "geometryService": "",

  //Provide Bing key if Bing Maps for maps or geocoding are used.
  bingMapsKey: "",

  //Optional. The logo/title/subtitle of app. Default value is default logo/"HTML5 app"/"A configurable web application".
  "logo": "",
  "title": "ArcGIS Web Application",
  "subtitle": "A configurable web application",

  //Optional. App can contain some links.
  "links":[
    {
      "url": "http://www.arcgis.com",
      "label": "ArcGIS Online"
    }
  ],

  "widgetOnScreen": {
    //Widgets(not in group) are opened in this panel.
    "panel": {
      "uri": "jimu/PanelType1"
    },

    "widgets": [{
      //Required. It is widget main class.
      "uri": "widgets/Header/Widget",

      //Optional. If not set, use the icon in widget folder.
      "icon": "",

      //optional. If not set, use widget name.
      "label": "",

      //Optional.Value can be either map or browser. If not set, default value is "map".
      "positionRelativeTo": "map",

      //Optional. If not set, default value is left=0, top=0. 
      //If panel is set, this means panel's position or widget position.
      //If widget is closeable, this means widget icon's position or widget position.
      //The framework uses 6 properties to position widget: left, top, bottom, right, width and height.
      //Four properties  should be enough to position the widget. This position method is the same as the HTML.
      "position": {
        "left": 0,
        "top": 0,
        "right": 0,
        "bottom": 30,
        "width": 100,
        "height": 100
      },

      //Optional. Whether the widget will open at app start. The default value is false.
      //Only valid for in-panel widget.
      //If more than one widget in widgetOnScreen are set to true, the first one opens.
      //If more than one widget in widget pool are set to true, it's the controller's responsibility to define how to open.
      "openAtStart": true,

      //Optional. Object or url. If object, it means widget's config object;
      //If url, it means the location of the config file.
      //if not set, the framework will check "hasConfig" property to decide the widget config.
      "config": {},

      //Optional. If not set, the value is true.
      "visible": false,

      //Required. If the following version is older than the lastest widget's version, the framework will run widget's version manager to upgrade the widget's configuration.
      "version": "1.1"
    }],

    //The group has position properties.
    "groups": [{
      //Optional. If set, all widgets in this group display in this panel.
      //If not set, all widgets in this group display in the default panel.
      "panel": {
        "uri": "jimu/PanelType1",
        "positionRelativeTo": "map",
        "position": {
          "left": 0,
          "top": 0,
          "right": 0,
          "bottom": 30,
          "width": 100,
          "height": 100
        }
      },

      //Widgets in the group have no position properties.
      "widgets": [{
        "uri": "widgets/Header/Widget",
        "icon": "",
        "label": ""
      }],

      //Optional. If not set, the value is true.
      "visible": false
    }]
  },

  "map": {
    //Optional. If both 2D and 3D are not set, a 2D map is created by default.
    //If 3D is true and 2D is false, it's a 3D app.
    //If 3D is false and 2D is true, it's a 2D app.
    //If both 3D and 2D are true, it's an app with ability of switching between 2D and 3D.
    //The default map is 2D.
    "3D": true,
    "2D": true,

    //Optional. The url where webmap is hosted. If not set, use app's portalUrl property.
    "portalUrl": "",

    //Optional. Webmap id or webscene id.
    //If set, framework will use this property and ignore basemaps.
    "itemId": "",

    //The same as widget's fix position.
    "position": {
      "left": 0,
      "top": 0,
      "right": 0,
      "bottom": 30,
      "width": 100,
      "height": 100
    },

    "mapOptions": {
      //These properties are the same as the map API.
      "extent": {
        "xmin": 20, "xmax": 30, "ymin": 40, "ymax": 50, "spatialReference" { "wkid": 4326}
      },
      "center": "",
      "level": 3
    }
  },

  //Widgets in this section are not loaded by the app, but are controlled by the widget(controller widget).
  "widgetPool": {
    //Optional. If set, widgets in the container display in this panel. Otherwise they display in the default panel.
    "panel": {
      "uri": "jimu/PanelType1",
      "positionRelativeTo": "map",
      "position": {
        "left": 0,
        "top": 0,
        "right": 0,
        "bottom": 30,
        "width": 100,
        "height": 100
      }
    },

    "groups": [{
      //Can be one or more widgets.
      "widgets": [{
        "uri": "widgets/Bookmark/Widget",
        "icon": "",
        "label": "" 
      }],

      //Optional.If only one widget, this property is ignored.
      "label": "",

      //Optional. The sequence of the group/widget.
      "index": 1,

      //Optional. If not set, use widget container's panel;
      //If set, it overrides the container's panel.
      "panel": {
        "uri": "jimu/PanelType1",
        "positionRelativeTo": "map",
        "position": {
          "left": 0,
          "top": 0,
          "right": 0,
          "bottom": 30,
          "width": 100,
          "height": 100
        }
      }
    }],

    "widgets": [{
      "index": 2,
      "uri": "widgets/Header/Widget",
      "icon": "",
      "label": ""
    }]
  },

  "wabVersion": "1.0"
}