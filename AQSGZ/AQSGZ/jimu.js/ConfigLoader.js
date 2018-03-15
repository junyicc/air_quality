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
  'dojo/_base/array',
  'dojo/_base/config',
  'dojo/cookie',
  'dojo/Deferred',
  'dojo/promise/all',
  'dojo/request/xhr',
  './utils',
  './WidgetManager',
  './shared/utils',
  './tokenUtils',
  './portalUtils',
  './portalUrlUtils',
  'esri/IdentityManager',
  'esri/config',
  'esri/urlUtils',
  'esri/geometry/Point',
  'esri/SpatialReference',
  'esri/request'
],
function (declare, lang, array, dojoConfig, cookie,
  Deferred, all, xhr, jimuUtils, WidgetManager, sharedUtils, tokenUtils,
  portalUtils, portalUrlUtils, IdentityManager, esriConfig, esriUrlUtils,
  Point, SpatialReference) {
  var instance = null, clazz;
  /* global jimuConfig */

  clazz = declare(null, {
    urlParams: null,
    appConfig: null,
    rawAppConfig: null,
    configFile: null,
    _configLoaded: false,
    portalSelf: null,

    constructor: function (urlParams, options) {
      this._removeHash(urlParams);
      this.urlParams = urlParams || {};
      this.isRunInPortal = false;
      this.widgetManager = WidgetManager.getInstance();
      lang.mixin(this, options);
    },

    /****************************************************
    * The app accept the following URL parameters:
    * ?config=<abc-config.json>, this is a config file url
    * ?id=<123>, the id is WAB app id, which is created from portal.
          URL has this parameter means open WAB app from portal.
    * ?appid=<123>, the appid is portal/AGOL app id, which is created from portal/AGOL template.
          The template is created from WAB's app.
          When URL has this parameter, we'll check whether the app is launched
          in portal/AGOL, or not in portal/AGOL.
          > IF in portal, we'll use the appid to get portal/AGOL template id and app data,
          then get WAB app id, then get WAB app config, then merge config;
          > IF NOT in portal, we'll use the appid to get app data, then merge the data
          to WAB app config.
        How to check whether the app is in portal?
          When try to load config file, if URL has no config or id parameter, we'll load
          <app>/config.json file. If the app is in XT, the portalUrl in config.json is not empty.
          If the app is in portal/AGOL, the app is stemapp indeed, which portalUrl is empty.
          So, if portal url is empty, we consider the app is in portal. However, the exception is
          launch stemapp directly. The solution is the XT builder will write "wab_portalurl" cookie
          for stemapp. So, if we find this cookie, we know the app is not in portal.
    * ?itemid=<itemid>, this webmap item will override the itemid in app config
    * ?mode=<config|preview>, this is for internal using purpose
    * ?extent=<xmin,ymin,xmax,ymax | xmin,ymin,xmax,ymax,wkid>, the default wkid is 4326
    * ?center=<long,lat> | <x,y,wkid>
    * ?scale=<4622324>
    * ?level=<8>
    ********************************************************/
    loadConfig: function () {
      console.time('Load Config');

      return this._tryLoadConfig().then(lang.hitch(this, function(appConfig) {
        var err = this.checkConfig(appConfig);
        if (err) {
          throw err;
        }
        this.rawAppConfig = lang.clone(appConfig);
        appConfig = this._upgradeAppConfig(appConfig);
        this._processAfterTryLoad(appConfig);
        this.appConfig = appConfig;

        if(this.urlParams.id){
          return this.loadWidgetsManifest(appConfig).then(lang.hitch(this, function() {
            return this._upgradeAllWidgetsConfig(appConfig);
          })).then(lang.hitch(this, function() {
            this._configLoaded = true;
            if(appConfig.title){
              document.title = appConfig.title;
            }
            return this.getConfig();
          }));
        }else{
          tokenUtils.setPortalUrl(appConfig.portalUrl);
          return this._proesssWebTierAndSignin(appConfig).then(lang.hitch(this, function() {
            if(this.urlParams.appid){
              //url has appid parameter means open app as an app created from AGOL template

              if(!this.isRunInPortal){
                return this._processNotInPortalAppProtocol(appConfig).
                then(lang.hitch(this, function(appConfig){
                  return this._getAppDataFromTemplateAppId
                  (appConfig.portalUrl, this.urlParams.appid).
                  then(lang.hitch(this, function(itemData){
                    appConfig._itemData = itemData;
                    return appConfig;
                  }));
                }));
              }else{
                return this._getAppConfigFromTemplateAppId(appConfig.portalUrl,
                this.urlParams.appid).then(lang.hitch(this, function(appConfig){
                  return this._processInPortalAppProtocol(appConfig);
                }));
              }
            }else{
              return this._processNotInPortalAppProtocol(appConfig);
            }
          })).then(lang.hitch(this, function(appConfig) {
            this._processAfterTryLoad(appConfig);
            this.appConfig = appConfig;
            if(appConfig.map.itemId){
              return appConfig;
            }else{
              return portalUtils.getDefaultWebMap(appConfig.portalUrl).then(function(itemId){
                appConfig.map.itemId = itemId;
                return appConfig;
              });
            }
          })).then(lang.hitch(this, function(appConfig) {
            return this.loadWidgetsManifest(appConfig);
          })).then(lang.hitch(this, function(appConfig) {
            //if opened from template, the appConfig will have one property:_itemData
            if(appConfig._itemData){
              appConfig.getConfigElementById = function(id){
                return sharedUtils.getConfigElementById(appConfig, id);
              };
              return this._mergeTemplateAppConfigToAppConfig(appConfig._itemData, appConfig);
            } else {
              return appConfig;
            }
          })).then(lang.hitch(this, function() {
            return this._upgradeAllWidgetsConfig(appConfig);
          })).then(lang.hitch(this, function() {
            this._configLoaded = true;
            if(appConfig.title){
              document.title = appConfig.title;
            }
            return this.getConfig();
          }));
        }
      }));
    },

    getConfig: function(){
      this.appConfig.rawAppConfig = this.rawAppConfig;
      return this.appConfig;
    },

    checkConfig: function(config){
      var repeatedId = this._getRepeatedId(config);
      if(repeatedId){
        return 'repeated id:' + repeatedId;
      }
      return null;
    },

    processProxy: function(appConfig){
      esriConfig.defaults.io.alwaysUseProxy = appConfig.httpProxy &&
      appConfig.httpProxy.useProxy && appConfig.httpProxy.alwaysUseProxy;
      esriConfig.defaults.io.proxyUrl = "";
      esriConfig.defaults.io.proxyRules = [];

      if (appConfig.httpProxy && appConfig.httpProxy.useProxy && appConfig.httpProxy.url) {
        esriConfig.defaults.io.proxyUrl = appConfig.httpProxy.url;
      }
      if (appConfig.httpProxy && appConfig.httpProxy.useProxy && appConfig.httpProxy.rules) {
        array.forEach(appConfig.httpProxy.rules, function(rule) {
          esriUrlUtils.addProxyRule(rule);
        });
      }
    },

    addNeedValues: function(appConfig){
      this._processNoUriWidgets(appConfig);
      this._addElementId(appConfig);
      this._processWidgetJsons(appConfig);
    },

    showError: function(err){
      var s = '<div class="jimu-error-code"><span>' + this.nls.errorCode + ':</span><span>' +
        err.response.status + '</span></div>' +
       '<div class="jimu-error-message"><span>' + this.nls.errorMessage + ':</span><span>' +
        err.message + '</span></div>' +
       '<div class="jimu-error-detail"><span>' + this.nls.errorDetail + ':</span><span>' +
        err.response.text + '<span></div>';
      document.body.innerHTML = s;
    },

    _tryLoadConfig: function() {
      if(this.urlParams.config) {
        this.configFile = this.urlParams.config;
        return xhr(this.configFile, {handleAs: 'json'});
      }else if(this.urlParams.id){
        //app is hosted in portal
        this.isRunInPortal = true;
        var portalUrl = portalUrlUtils.getPortalUrlFromLocation();
        var def = new Deferred();
        tokenUtils.setPortalUrl(portalUrl);
        //we don't process webtier in portal because portal has processed.
        var portal = portalUtils.getPortal(portalUrl);
        portal.loadSelfInfo().then(lang.hitch(this, function(portalSelf){
          this.portalSelf = portalSelf;
          this._processSignIn(portalUrl).then(lang.hitch(this, function(){
            //integrated in portal, open as a WAB app
            this._getAppConfigFromAppId(portalUrl, this.urlParams.id)
            .then(lang.hitch(this, function(appConfig){
              return this._processInPortalAppProtocol(appConfig);
            })).then(function(appConfig){
              def.resolve(appConfig);
            }, function(err){
              def.reject(err);
            });
          }));
        }));
        return def;
      } else{
        this.configFile = "config.json";
        return xhr(this.configFile, {handleAs: 'json'});
      }
    },

    _upgradeAppConfig: function(appConfig){
      var appVersion = window.wabVersion;
      var configVersion = appConfig.wabVersion;
      var newConfig;

      if(appVersion === configVersion){
        return appConfig;
      }
      var configVersionIndex = this.versionManager.getVersionIndex(configVersion);
      var appVersionIndex = this.versionManager.getVersionIndex(appVersion);
      if(configVersionIndex > appVersionIndex){
        throw Error('Bad version number, ' + configVersion);
      }else{
        newConfig = this.versionManager.upgrade(appConfig, configVersion, appVersion);
        newConfig.wabVersion = appVersion;
        newConfig.isUpgraded = true;
        return newConfig;
      }
    },

    _upgradeAllWidgetsConfig: function(appConfig){
      var def = new Deferred(), defs = [];
      if(!appConfig.isUpgraded){
        //app is latest, all widgets are lastest.
        def.resolve(appConfig);
        return def;
      }

      delete appConfig.isUpgraded;
      sharedUtils.visitElement(appConfig, lang.hitch(this, function(e){
        if(!e.uri){
          return;
        }
        if(e.config){
          //if widget is configured, let's upgrade it
          var upgradeDef = this.widgetManager.tryLoadWidgetConfig(e)
          .then(lang.hitch(this, function(widgetConfig){
            e.config = widgetConfig;
          }));
          defs.push(upgradeDef);
        }else{
          e.version = e.manifest.version;
        }
      }));
      all(defs).then(lang.hitch(this, function(){
        def.resolve(appConfig);
      }), function(err){
        def.reject(err);
      });
      return def;
    },

    _processAfterTryLoad: function(appConfig){
      this._setPortalUrl(appConfig);
      this._processUrlParams(appConfig);

      this.addNeedValues(appConfig);
      this.processProxy(appConfig);

      IdentityManager.tokenValidity = 60 * 24 * 7;//token is valid in 7 days
      return appConfig;
    },

    _processWidgetJsons: function(appConfig){
      sharedUtils.visitElement(appConfig, function(e, info){
        if(info.isWidget && e.uri){
          jimuUtils.processWidgetSetting(e);
        }
      });
    },

    _processNoUriWidgets: function(appConfig){
      var i = 0;
      sharedUtils.visitElement(appConfig, function(e, info){
        if(info.isWidget && !e.uri){
          i ++;
          e.placeholderIndex = i;
        }
      });
    },

    _addElementId: function (appConfig){
      var maxId = 0, i;

      sharedUtils.visitElement(appConfig, function(e){
        if(!e.id){
          return;
        }
        var li = e.id.lastIndexOf('_');
        if(li > -1){
          i = e.id.substr(li + 1);
          maxId = Math.max(maxId, i);
        }
      });

      sharedUtils.visitElement(appConfig, function(e){
        if(!e.id){
          maxId ++;
          e.id = e.uri? (e.uri + '_' + maxId): (''  + '_' + maxId);
        }
      });
    },

    _setPortalUrl: function(appConfig){
      if(appConfig.portalUrl){
        return;
      }
      //if there is no portalUrl in appConfig, try to check whether the app
      //is launched from XT version builder
      if(cookie('wab_portalurl')){
        appConfig.portalUrl = cookie('wab_portalurl');
        return;
      }

      //if not launched from XT builder and has no portalurl is set,
      //let's assume it's hosted in portal, use the browser location
      this.isRunInPortal = true;
      appConfig.portalUrl = portalUrlUtils.getPortalUrlFromLocation();
      return;
    },

    _changePortalUrlProtocol: function(appConfig, protocol){
      //if browser uses https protocol, portalUrl should also use https
      appConfig.portalUrl = portalUrlUtils.setProtocol(appConfig.portalUrl, protocol);

      if(appConfig.map.portalUrl){
        appConfig.map.portalUrl = portalUrlUtils.setProtocol(appConfig.map.portalUrl, protocol);
      }

      if(appConfig.httpProxy){
        var httpProxyUrl = appConfig.httpProxy.url;

        appConfig.httpProxy.url = portalUrlUtils.setProtocol(httpProxyUrl, protocol);

        if(appConfig.httpProxy && appConfig.httpProxy.rules){
          array.forEach(appConfig.httpProxy.rules, lang.hitch(this, function(rule){
            rule.proxyUrl = portalUrlUtils.setProtocol(rule.proxyUrl, protocol);
          }));
        }
      }
    },

    _processInPortalAppProtocol: function(appConfig){
      var def = new Deferred();
      var portalUrl = appConfig.portalUrl;
      var portal = portalUtils.getPortal(portalUrl);

      //for hosted app, we need to check allSSL property
      var handleAllSSL = lang.hitch(this, function(allSSL){
        if(window.location.protocol === 'https:'){
          this._changePortalUrlProtocol(appConfig, 'https');
        }else{
          if(allSSL){
            //keep the protocol of browser honor allSSL property
            window.location.href = portalUrlUtils.setHttpsProtocol(window.location.href);
            def.reject();
            return;
          }else{
            this._changePortalUrlProtocol(appConfig, 'http');
          }
        }
        this._checkLocale();
        def.resolve(appConfig);
      });

      //we have called checkSignInStatus in _processSignIn before come here
      portal.loadSelfInfo().then(lang.hitch(this, function(portalSelf){
        //we need to check anonymous property for orgnization first,
        if(portalSelf.access === 'private'){
          //we do not force user to sign in,
          //we just check protocol of portalUrl in appConfig as allSSL
          var isPortalHttps = appConfig.portalUrl.toLowerCase().indexOf('https://') === 0;
          handleAllSSL(isPortalHttps);
        }
        else{
          //Allow anonymous access to portal.
          handleAllSSL(portalSelf.allSSL);
        }
      }), lang.hitch(this, function(err){
        def.reject(err);
      }));
      return def;
    },

    _processNotInPortalAppProtocol: function(appConfig){
      var def = new Deferred();
      if(appConfig.portalUrl){
        var portal = portalUtils.getPortal(appConfig.portalUrl);
        portal.loadSelfInfo().then(lang.hitch(this, function(portalSelf){
          var isBrowserHttps = window.location.protocol === 'https:';
          var allSSL = !!portalSelf.allSSL;
          if(allSSL || isBrowserHttps){
            this._changePortalUrlProtocol(appConfig, 'https');
          }

          var isPortalHttps = appConfig.portalUrl.toLowerCase().indexOf('https://') === 0;
          if(isPortalHttps && !isBrowserHttps){
            //for app in configWindow and previewWindow, we should not refresh url because there is
            //a DOMException if protocol of iframe is not same as protocol of builder window
            //such as:Blocked a frame with origin "https://***" from accessing a cross-origin frame.
            if(!tokenUtils.isInConfigOrPreviewWindow()){
              //if portal uses https protocol, the browser must use https too
              window.location.href = portalUrlUtils.setHttpsProtocol(window.location.href);
              def.reject();
              return;
            }
          }
          def.resolve(appConfig);
        }), lang.hitch(this, function(err){
          def.reject(err);
        }));
      }
      else{
        def.resolve(appConfig);
      }
      return def;
    },

    //this function will be not called if app is in portal.
    _proesssWebTierAndSignin: function(appConfig){
      var def = new Deferred();
      var isWebTier = false;
      var portalUrl = appConfig.portalUrl;
      this._processWebTier(appConfig).then(lang.hitch(this, function(webTier){
        isWebTier = webTier;
        var portal = portalUtils.getPortal(portalUrl);
        return portal.loadSelfInfo();
      })).then(lang.hitch(this, function(portalSelf) {
        this.portalSelf = portalSelf;
        return this._processSignIn(portalUrl, isWebTier);
      })).then(lang.hitch(this, function() {
        def.resolve();
      }), function(err){
        def.reject(err);
      });
      return def;
    },

    _processWebTier: function(appConfig){
      var def = new Deferred();
      var portalUrl = appConfig.portalUrl;
      if(appConfig.isWebTier){
        //Although it is recommended to enable ssl for IWA/PKI portal by Esri,
        //there is no force on the client. They still can use http for IWA/PKI.
        //It is not correnct to assume web-tier authorization only works with https.
        tokenUtils.isWebTierPortal(portalUrl).then(lang.hitch(this, function(isWebTier) {
          var credential = tokenUtils.getPortalCredential(portalUrl);
          if(credential.ssl){
            //if credential.ssl, it means that the protal is allSSL enabled
            if(window.location.protocol === 'http:' && !tokenUtils.isInConfigOrPreviewWindow()){
              window.location.href = portalUrlUtils.setHttpsProtocol(window.location.href);
              return;
            }
          }
          def.resolve(isWebTier);
        }), lang.hitch(this, function(err) {
          def.reject(err);
        }));
      }else{
        def.resolve(false);
      }
      return def;
    },

    _processSignIn: function(portalUrl, isWebTier){
      var def = new Deferred();
      var portal = portalUtils.getPortal(portalUrl);
      var sharingUrl = portalUrlUtils.getSharingUrl(portalUrl);
      var defSignIn;

      if(this.isRunInPortal){
        //we don't register oauth info for app run in portal.
        defSignIn = IdentityManager.checkSignInStatus(sharingUrl);
        defSignIn.promise.always(lang.hitch(this, function(){
          def.resolve();
        }));
      }else{
        if (!tokenUtils.isInBuilderWindow() && !tokenUtils.isInConfigOrPreviewWindow() &&
          this.portalSelf.supportsOAuth && this.rawAppConfig.appId && !isWebTier) {
          tokenUtils.registerOAuthInfo(portalUrl, this.rawAppConfig.appId);
        }
        //we call checkSignInStatus here because this is the first place where we can get portal url
        defSignIn = IdentityManager.checkSignInStatus(sharingUrl);
        defSignIn.promise.always(lang.hitch(this, function(){
          tokenUtils.xtGetCredentialFromCookie(portalUrl);
          //call portal self again because the first call is not sign in,
          //this call maybe have signed in.
          portal.loadSelfInfo().then(lang.hitch(this, function(portalSelf) {
            this.portalSelf = portalSelf;
            this._checkLocale();
            def.resolve();
          }));
        }));
      }
      return def;
    },

    _checkLocale: function(){
      if(tokenUtils.isInConfigOrPreviewWindow()){
        //in builder, app will use wab_locale
        return;
      }

      var appLocale = this.portalSelf.user && this.portalSelf.user.culture ||
          dojoConfig.locale;

      appLocale = appLocale.toLowerCase();

      if(jimuUtils.isLocaleChanged(dojoConfig.locale, appLocale)){
        cookie('wab_app_locale', appLocale);
        window.location.reload();
      }
    },

    _getAppConfigFromTemplateAppId: function(portalUrl, appId){
      //the appid means: the app created by AGOL template.
      var def = new Deferred();
      this._getWabAppIdAndDataFromTemplateAppId(portalUrl, appId).
      then(lang.hitch(this, function(response){
        var wabAppId = response.appId;
        var itemData = response.itemData;

        this._getAppConfigFromAppId(portalUrl, wabAppId).then(function(appConfig){
          appConfig._itemData = itemData;
          def.resolve(appConfig);
        });
      }));
      return def;
    },

    _getAppDataFromTemplateAppId: function(portalUrl, appId){
      //the appid means: the app created by AGOL template.
      var portal = portalUtils.getPortal(portalUrl);
      return portal.getItemData(appId);
    },

    _getWabAppIdAndDataFromTemplateAppId: function(portalUrl, appId){
      //the appid means: the app created by AGOL template.
      var def = new Deferred();
      var portal = portalUtils.getPortal(portalUrl);
      portal.getItemData(appId).then(lang.hitch(this, function(itemData) {
      //itemData.source means template id
        portal.getItemById(itemData.source).then(lang.hitch(this, function(item) {
          var urlObject = esriUrlUtils.urlToObject(item.url);
          def.resolve({
            appId: urlObject.query.id,
            itemData: itemData
          });
        }));
      }), function(err){
        def.reject(err);
      });
      return def;
    },

    _getAppConfigFromAppId: function(portalUrl, appId){
      //the appid means: the app created by app builder.
      return portalUtils.getPortal(portalUrl).getItemData(appId);
    },

    _mergeTemplateAppConfigToAppConfig: function(itemData, _appConfig){
      //url has appid parameter means open app in AGOL's template config page
      //merge the AGOL's template config parameters into the config.json
      var i;
      var screenSectionConfig = _appConfig.widgetOnScreen;
      var portalUrl = _appConfig.portalUrl;
      _appConfig.agolConfig = itemData;
      _appConfig.map.itemId = itemData.values.webmap;
      _appConfig.map.portalUrl = portalUrl;
      // use default mapOptions of current webmap.
      delete _appConfig.map.mapOptions;

      function reorderWidgets(widgetArray) {
        var tempWidgets = [];
        array.forEach(widgetArray, function(widget) {
          if (widget) {
            tempWidgets.push(widget);
          }
        }, this);
        return tempWidgets;
      }

      var title = null, subtitle = null;
      for (var key in itemData.values) {
        if (key !== "webmap") {
          jimuUtils.setConfigByTemplateWithId(_appConfig, key, itemData.values[key]);
        }
        if (key === "app_title") {
          title = itemData.values[key];
        }
        if (key === "app_subtitle") {
          subtitle = itemData.values[key];
        }
      }

      var defRet = new Deferred();
      if (!title || !subtitle) {
        var portal = portalUtils.getPortal(portalUrl);
        portal.getItemById(itemData.values.webmap).then(lang.hitch(this, function(item){
          // merge title
          if (!title) {
            _appConfig.title = item.title;
          }
          // subtitle
          if (!subtitle) {
            _appConfig.subtitle = item.snippet;
          }
          reorder();
          defRet.resolve();
        }));
      } else {
        reorder();
        defRet.resolve();
      }

      function reorder() {
        //reorderWidgets
        _appConfig.widgetPool.widgets = reorderWidgets(_appConfig.widgetPool.widgets);
        screenSectionConfig.widgets = reorderWidgets(screenSectionConfig.widgets);
        if (_appConfig.widgetPool.groups) {
          for (i = 0; i < _appConfig.widgetPool.groups.length; i++) {
            _appConfig.widgetPool.groups[i].widgets =
            reorderWidgets(_appConfig.widgetPool.groups[i].widgets);
          }
        }
        if (screenSectionConfig.groups) {
          for (i = 0; i < screenSectionConfig.groups.length; i++) {
            screenSectionConfig.groups[i].widgets =
            reorderWidgets(screenSectionConfig.groups[i].widgets);
          }
        }
      }
      return defRet;

    },

    _removeHash: function(urlParams){
      for(var p in urlParams){
        if(urlParams[p]){
          urlParams[p] = urlParams[p].replace('#', '');
        }
      }
    },

    loadWidgetsManifest: function(config){
      var defs = [], def = new Deferred();
      if(config._buildInfo && config._buildInfo.widgetManifestsMerged){
        this._loadMergedWidgetManifests().then(lang.hitch(this, function(manifests){
          sharedUtils.visitElement(config, lang.hitch(this, function(e){
            if(!e.widgets && e.uri){
              if(manifests[e.uri]){
                this._addNeedValuesForManifest(manifests[e.uri]);
                jimuUtils.addManifest2WidgetJson(e, manifests[e.uri]);
              }else{
                defs.push(this.widgetManager.loadWidgetManifest(e));
              }
            }
          }));
          all(defs).then(function(){
            def.resolve(config);
          });
        }));
      }else{
        sharedUtils.visitElement(config, lang.hitch(this, function(e){
          if(!e.widgets && e.uri){
            defs.push(this.widgetManager.loadWidgetManifest(e));
          }
        }));
        all(defs).then(function(){
          def.resolve(config);
        });
      }

      setTimeout(function(){
        if(!def.isResolved()){
          def.resolve(config);
        }
      }, jimuConfig.timeout);
      return def;
    },

    _addNeedValuesForManifest: function(manifest){
      jimuUtils.addManifestProperies(manifest);
      jimuUtils.processManifestLabel(manifest, dojoConfig.locale);
    },

    _loadMergedWidgetManifests: function(){
      var file = window.appInfo.appPath + 'widgets/widgets-manifest.json';
      return xhr(file, {
        handleAs: 'json'
      });
    },

    _getRepeatedId: function(appConfig){
      var id = [], ret;
      sharedUtils.visitElement(appConfig, function(e){
        if(id.indexOf(e.id) > 0){
          ret = e.id;
          return true;
        }
        id.push(e.id);
      });
      return ret;
    },

    //we use URL parameters for the first loading.
    //After loaded, if user changes app config through builder,
    //we'll use the configuration in builder.
    _processUrlParams: function(appConfig){
      if(this.urlParams.itemid || this.urlParams.webmap){
        appConfig.map.itemId = this.urlParams.itemid || this.urlParams.webmap;
      }
      if(this.urlParams.mode){
        appConfig.mode = this.urlParams.mode;
      }
      if(!appConfig.map.mapOptions){
        appConfig.map.mapOptions = {};
      }

      var spliter;
      if(this.urlParams.extent){
        if(this.urlParams.extent.indexOf(';') > -1){
          spliter = ';';
        }else{
          spliter = ',';
        }
        var extent = this.urlParams.extent.split(spliter);
        if(extent.length === 4){
          appConfig.map.mapOptions.extent = {
            xmin: parseFloat(extent[0]),
            ymin: parseFloat(extent[1]),
            xmax: parseFloat(extent[2]),
            ymax: parseFloat(extent[3])
          };
        }else if(extent.length === 5){
          appConfig.map.mapOptions.extent = {
            xmin: parseFloat(extent[0]),
            ymin: parseFloat(extent[1]),
            xmax: parseFloat(extent[2]),
            ymax: parseFloat(extent[3]),
            spatialReference: {wkid: parseInt(extent[4], 10)}
          };
        }
      }
      if(this.urlParams.center){
        if(this.urlParams.center.indexOf(';') > -1){
          spliter = ';';
        }else{
          spliter = ',';
        }
        var center = this.urlParams.center.split(spliter);
        if(center.length === 2){
          appConfig.map.mapOptions.center = center;
        }else if(center.length === 3){
          var point = new Point(
            parseInt(center[0], 10),
            parseInt(center[1], 10),
            new SpatialReference(parseInt(center[2], 10)));
          appConfig.map.mapOptions.center = point.toJson();
        }
      }
      if(this.urlParams.scale){
        appConfig.map.mapOptions.scale = this.urlParams.scale;
      }
      if(this.urlParams.level || this.urlParams.zoom){
        appConfig.map.mapOptions.zoom = this.urlParams.level || this.urlParams.zoom;
      }
    }

  });

  clazz.getInstance = function (urlParams, options) {
    if(instance === null) {
      instance = new clazz(urlParams, options);
    }else{
      instance.urlParams = urlParams;
      instance.options = options;
    }
    return instance;
  };

  return clazz;
});
