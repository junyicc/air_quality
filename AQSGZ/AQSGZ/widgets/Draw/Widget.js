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
    'dijit/_WidgetsInTemplateMixin',
    'jimu/BaseWidget',
    'esri/config',
    'esri/graphic',
    'esri/geometry/Polyline',
    'esri/geometry/Polygon',
    'esri/symbols/TextSymbol',
    'esri/symbols/Font',
    'esri/units',
    'esri/geometry/webMercatorUtils',
    'esri/geometry/geodesicUtils',
    'esri/tasks/GeometryService',
    'esri/tasks/AreasAndLengthsParameters',
    'esri/tasks/LengthsParameters',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/Deferred',
    'dojo/_base/html',
    'dojo/_base/Color',
    'dojo/_base/array',
    'jimu/dijit/ViewStack',
    'jimu/utils',
    'jimu/SpatialReference/wkidUtils',
    'jimu/dijit/DrawBox',
    'jimu/dijit/SymbolChooser',
    'dijit/form/Select',
    'dijit/form/NumberSpinner'
  ],
  function(declare, _WidgetsInTemplateMixin, BaseWidget, esriConfig, Graphic, Polyline, Polygon,
    TextSymbol, Font, esriUnits, webMercatorUtils, geodesicUtils, GeometryService,
    AreasAndLengthsParameters, LengthsParameters, lang, on, Deferred, html, Color, array, ViewStack,
    jimuUtils, wkidUtils) {
    return declare([BaseWidget, _WidgetsInTemplateMixin], {
      name: 'Draw',
      baseClass: 'jimu-widget-draw',
      _gs: null,
      _defaultGsUrl: '//tasks.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer',

      postMixInProperties: function(){
        this.inherited(arguments);
        if(esriConfig.defaults.geometryService){
          this._gs = esriConfig.defaults.geometryService;
        }else{
          this._gs = new GeometryService(this._defaultGsUrl);
        }
        this._resetUnitsArrays();
        this._undoList = [];
        this._redoList = [];
      },

      postCreate: function() {
        this.inherited(arguments);
        jimuUtils.combineRadioCheckBoxWithLabel(this.showMeasure, this.showMeasureLabel);
        this.drawBox.setMap(this.map);

        this.viewStack = new ViewStack({
          viewType: 'dom',
          views: [this.pointSection, this.lineSection, this.polygonSection, this.textSection]
        });
        html.place(this.viewStack.domNode, this.settingContent);

        this._initUnitSelect();
        this._bindEvents();
      },

      _resetUnitsArrays: function(){
        this.defaultDistanceUnits = [];
        this.defaultAreaUnits = [];
        this.configDistanceUnits = [];
        this.configAreaUnits = [];
        this.distanceUnits = [];
        this.areaUnits = [];
      },

      _bindEvents: function() {
        //bind DrawBox
        this.own(on(this.drawBox,'IconSelected',lang.hitch(this,this._onIconSelected)));
        this.own(on(this.drawBox,'DrawEnd',lang.hitch(this,this._onDrawEnd)));

        //bind symbol change events
        this.own(on(this.pointSymChooser,'change',lang.hitch(this,function(){
          this._setDrawDefaultSymbols();
        })));
        this.own(on(this.lineSymChooser,'change',lang.hitch(this,function(){
          this._setDrawDefaultSymbols();
        })));
        this.own(on(this.fillSymChooser,'change',lang.hitch(this,function(){
          this._setDrawDefaultSymbols();
        })));
        this.own(on(this.textSymChooser,'change',lang.hitch(this,function(symbol){
          this.drawBox.setTextSymbol(symbol);
        })));

        //bind unit events
        this.own(on(this.showMeasure,'click',lang.hitch(this,this._setMeasureVisibility)));
      },

      _onIconSelected:function(target,geotype,commontype){
        /*jshint unused: false*/
        this._setDrawDefaultSymbols();
        if(commontype === 'point'){
          this.viewStack.switchView(this.pointSection);
        }
        else if(commontype === 'polyline'){
          this.viewStack.switchView(this.lineSection);
        }
        else if(commontype === 'polygon'){
          this.viewStack.switchView(this.polygonSection);
        }
        else if(commontype === 'text'){
          this.viewStack.switchView(this.textSection);
        }
        this._setMeasureVisibility();
      },

      _onDrawEnd:function(graphic,geotype,commontype){
        /*jshint unused: false*/
        this._disableBtnRedo();

        var geometry = graphic.geometry;
        if(geometry.type === 'extent'){
          var a = geometry;
          var polygon = new Polygon(a.spatialReference);
          var r=[[a.xmin,a.ymin],[a.xmin,a.ymax],[a.xmax,a.ymax],[a.xmax,a.ymin],[a.xmin,a.ymin]];
          polygon.addRing(r);
          geometry = polygon;
          commontype = 'polygon';
        }
        if(commontype === 'polyline'){
          if(this.showMeasure.checked){
            this._addLineMeasure(geometry, graphic);
          }else{
            this._pushUndoGraphics([graphic]);
          }
        }
        else if(commontype === 'polygon'){
          if(this.showMeasure.checked){
            this._addPolygonMeasure(geometry, graphic);
          }else{
            this._pushUndoGraphics([graphic]);
          }
        }else{
          this._pushUndoGraphics([graphic]);
        }
      },

      _initUnitSelect:function(){
        this._initDefaultUnits();
        this._initConfigUnits();
        var a = this.configDistanceUnits;
        var b = this.defaultDistanceUnits;
        this.distanceUnits = a.length > 0 ? a : b;
        var c = this.configAreaUnits;
        var d = this.defaultAreaUnits;
        this.areaUnits = c.length > 0 ? c : d;
        array.forEach(this.distanceUnits,lang.hitch(this,function(unitInfo){
          var option = {
            value:unitInfo.unit,
            label:unitInfo.label
          };
          this.distanceUnitSelect.addOption(option);
        }));

        array.forEach(this.areaUnits,lang.hitch(this,function(unitInfo){
          var option = {
            value:unitInfo.unit,
            label:unitInfo.label
          };
          this.areaUnitSelect.addOption(option);
        }));
      },

      _initDefaultUnits:function(){
        this.defaultDistanceUnits = [{
          unit: 'KILOMETERS',
          label: this.nls.kilometers
        }, {
          unit: 'MILES',
          label: this.nls.miles
        }, {
          unit: 'METERS',
          label: this.nls.meters
        }, {
          unit: 'FEET',
          label: this.nls.feet
        }, {
          unit: 'YARDS',
          label: this.nls.yards
        }];

        this.defaultAreaUnits = [{
          unit: 'SQUARE_KILOMETERS',
          label: this.nls.squareKilometers
        }, {
          unit: 'SQUARE_MILES',
          label: this.nls.squareMiles
        }, {
          unit: 'ACRES',
          label: this.nls.acres
        }, {
          unit: 'HECTARES',
          label: this.nls.hectares
        }, {
          unit: 'SQUARE_METERS',
          label: this.nls.squareMeters
        }, {
          unit: 'SQUARE_FEET',
          label: this.nls.squareFeet
        }, {
          unit: 'SQUARE_YARDS',
          label: this.nls.squareYards
        }];
      },

      _initConfigUnits:function(){
        array.forEach(this.config.distanceUnits,lang.hitch(this,function(unitInfo){
          var unit = unitInfo.unit;
          if(esriUnits[unit]){
            var defaultUnitInfo = this._getDefaultDistanceUnitInfo(unit);
            unitInfo.label = defaultUnitInfo.label;
            this.configDistanceUnits.push(unitInfo);
          }
        }));

        array.forEach(this.config.areaUnits,lang.hitch(this,function(unitInfo){
          var unit = unitInfo.unit;
          if(esriUnits[unit]){
            var defaultUnitInfo = this._getDefaultAreaUnitInfo(unit);
            unitInfo.label = defaultUnitInfo.label;
            this.configAreaUnits.push(unitInfo);
          }
        }));
      },

      _getDefaultDistanceUnitInfo:function(unit){
        for(var i=0;i<this.defaultDistanceUnits.length;i++){
          var unitInfo = this.defaultDistanceUnits[i];
          if(unitInfo.unit === unit){
            return unitInfo;
          }
        }
        return null;
      },

      _getDefaultAreaUnitInfo:function(unit){
        for(var i=0;i<this.defaultAreaUnits.length;i++){
          var unitInfo = this.defaultAreaUnits[i];
          if(unitInfo.unit === unit){
            return unitInfo;
          }
        }
        return null;
      },

      _getDistanceUnitInfo:function(unit){
        for(var i=0;i<this.distanceUnits.length;i++){
          var unitInfo = this.distanceUnits[i];
          if(unitInfo.unit === unit){
            return unitInfo;
          }
        }
        return null;
      },

      _getAreaUnitInfo:function(unit){
        for(var i=0;i<this.areaUnits.length;i++){
          var unitInfo = this.areaUnits[i];
          if(unitInfo.unit === unit){
            return unitInfo;
          }
        }
        return null;
      },

      _setMeasureVisibility:function(){
        html.setStyle(this.measureSection,'display','none');
        html.setStyle(this.areaMeasure,'display','none');
        html.setStyle(this.distanceMeasure,'display','none');
        var lineDisplay = html.getStyle(this.lineSection,'display');
        var polygonDisplay = html.getStyle(this.polygonSection,'display');
        if(lineDisplay === 'block'){
          html.setStyle(this.measureSection,'display','block');
          if(this.showMeasure.checked){
            html.setStyle(this.distanceMeasure,'display','block');
          }
        }
        else if(polygonDisplay === 'block'){
          html.setStyle(this.measureSection,'display','block');
          if(this.showMeasure.checked){
            html.setStyle(this.areaMeasure,'display','block');
            html.setStyle(this.distanceMeasure,'display','block');
          }
        }
      },

      _getPointSymbol: function() {
        return this.pointSymChooser.getSymbol();
      },

      _getLineSymbol: function() {
        return this.lineSymChooser.getSymbol();
      },

      _getPolygonSymbol: function() {
        return this.fillSymChooser.getSymbol();
      },

      _getTextSymbol: function() {
        return this.textSymChooser.getSymbol();
      },

      _setDrawDefaultSymbols: function() {
        this.drawBox.setPointSymbol(this._getPointSymbol());
        this.drawBox.setLineSymbol(this._getLineSymbol());
        this.drawBox.setPolygonSymbol(this._getPolygonSymbol());
      },

      onClose: function() {
        this.drawBox.deactivate();
      },

      _addLineMeasure:function(geometry, graphic){
        this._getLengthAndArea(geometry, false).then(lang.hitch(this, function(result){
          if(!this.domNode){
            return;
          }
          var length = result.length;
          var a = Font.STYLE_ITALIC;
          var b = Font.VARIANT_NORMAL;
          var c = Font.WEIGHT_BOLD;
          var symbolFont = new Font("16px",a,b,c, "Courier");
          var fontColor = new Color([0,0,0,1]);
          var ext = geometry.getExtent();
          var center = ext.getCenter();

          var unit = this.distanceUnitSelect.value;
          var abbr = this._getDistanceUnitInfo(unit).label;
          var localeLength = jimuUtils.localizeNumber(length.toFixed(1));
          var lengthText = localeLength + " " + abbr;

          var textSymbol = new TextSymbol(lengthText,symbolFont,fontColor);
          var labelGraphic = new Graphic(center,textSymbol,null,null);
          this.drawBox.addGraphic(labelGraphic);
          this._pushUndoGraphics([graphic, labelGraphic]);
        }), lang.hitch(this, function(err){
          console.log(err);
          if(!this.domNode){
            return;
          }
          this._pushUndoGraphics([graphic]);
        }));
      },

      _addPolygonMeasure:function(geometry, graphic){
        this._getLengthAndArea(geometry, true).then(lang.hitch(this, function(result){
          if(!this.domNode){
            return;
          }
          var length = result.length;
          var area = result.area;

          var a = Font.STYLE_ITALIC;
          var b = Font.VARIANT_NORMAL;
          var c = Font.WEIGHT_BOLD;
          var symbolFont = new Font("16px", a, b, c, "Courier");
          var fontColor = new Color([0, 0, 0, 1]);
          var ext = geometry.getExtent();
          var center = ext.getCenter();

          var areaUnit = this.areaUnitSelect.value;
          var areaAbbr = this._getAreaUnitInfo(areaUnit).label;
          var localeArea = jimuUtils.localizeNumber(area.toFixed(1));
          var areaText = localeArea + " " + areaAbbr;

          var lengthUnit = this.distanceUnitSelect.value;
          var lengthAbbr = this._getDistanceUnitInfo(lengthUnit).label;
          var localeLength = jimuUtils.localizeNumber(length.toFixed(1));
          var lengthText = localeLength + " " + lengthAbbr;

          var text = areaText + "    " + lengthText;
          var textSymbol = new TextSymbol(text, symbolFont, fontColor);
          var labelGraphic = new Graphic(center, textSymbol, null, null);
          this.drawBox.addGraphic(labelGraphic);
          this._pushUndoGraphics([graphic, labelGraphic]);
        }), lang.hitch(this, function(err){
          if(!this.domNode){
            return;
          }
          console.log(err);
          this._pushUndoGraphics([graphic]);
        }));
      },

      _getLengthAndArea: function(geometry, isPolygon){
        var def = new Deferred();
        var defResult = {
          length: null,
          area: null
        };
        var wkid = geometry.spatialReference.wkid;
        var areaUnit = this.areaUnitSelect.value;
        var esriAreaUnit = esriUnits[areaUnit];
        var lengthUnit = this.distanceUnitSelect.value;
        var esriLengthUnit = esriUnits[lengthUnit];
        if(wkidUtils.isWebMercator(wkid)){
          defResult = this._getLengthAndArea3857(geometry, isPolygon, esriAreaUnit, esriLengthUnit);
          def.resolve(defResult);
        }else if(wkid === 4326){
          defResult = this._getLengthAndArea4326(geometry, isPolygon, esriAreaUnit, esriLengthUnit);
          def.resolve(defResult);
        }else{
          def = this._getLengthAndAreaByGS(geometry, isPolygon, esriAreaUnit, esriLengthUnit);
        }
        return def;
      },

      _getLengthAndArea4326: function(geometry, isPolygon, esriAreaUnit, esriLengthUnit){
        var result = {
          area: null,
          length: null
        };
        
        var lengths = null;

        if(isPolygon){
          var areas = geodesicUtils.geodesicAreas([geometry], esriAreaUnit);
          var polyline = this._getPolylineOfPolygon(geometry);
          lengths = geodesicUtils.geodesicLengths([polyline], esriLengthUnit);
          result.area = areas[0];
          result.length = lengths[0];
        }else{
          lengths = geodesicUtils.geodesicLengths([geometry], esriLengthUnit);
          result.length = lengths[0];
        }

        return result;
      },

      _getLengthAndArea3857: function(geometry3857, isPolygon, esriAreaUnit, esriLengthUnit){
        var geometry4326 = webMercatorUtils.webMercatorToGeographic(geometry3857);
        var result = this._getLengthAndArea4326(geometry4326,isPolygon,esriAreaUnit,esriLengthUnit);
        return result;
      },

      _getLengthAndAreaByGS: function(geometry, isPolygon, esriAreaUnit, esriLengthUnit){
        var def = new Deferred();
        var defResult = {
          area: null,
          length: null
        };
        var gsAreaUnit = this._getGeometryServiceUnitByEsriUnit(esriAreaUnit);
        var gsLengthUnit = this._getGeometryServiceUnitByEsriUnit(esriLengthUnit);
        if(isPolygon){
          var areasAndLengthParams = new AreasAndLengthsParameters();
          areasAndLengthParams.lengthUnit = gsLengthUnit;
          areasAndLengthParams.areaUnit = gsAreaUnit;
          this._gs.simplify([geometry]).then(lang.hitch(this, function(simplifiedGeometries){
            if(!this.domNode){
              return;
            }
            areasAndLengthParams.polygons = simplifiedGeometries;
            this._gs.areasAndLengths(areasAndLengthParams).then(lang.hitch(this, function(result){
              if(!this.domNode){
                return;
              }
              defResult.area = result.areas[0];
              defResult.length = result.lengths[0];
              def.resolve(defResult);
            }), lang.hitch(this, function(err){
              def.reject(err);
            }));
          }), lang.hitch(this, function(err){
            def.reject(err);
          }));
        }else{
          var lengthParams = new LengthsParameters();
          lengthParams.polylines = [geometry];
          lengthParams.lengthUnit = gsLengthUnit;
          lengthParams.geodesic = true;
          this._gs.lengths(lengthParams).then(lang.hitch(this, function(result){
            if(!this.domNode){
              return;
            }
            defResult.length = result.lengths[0];
            def.resolve(defResult);
          }), lang.hitch(this, function(err){
            console.error(err);
            def.reject(err);
          }));
        }

        return def;
      },

      _getGeometryServiceUnitByEsriUnit: function(unit){
        var gsUnit = -1;
        switch(unit){
        case esriUnits.KILOMETERS:
          gsUnit = GeometryService.UNIT_KILOMETER;
          break;
        case esriUnits.MILES:
          gsUnit = GeometryService.UNIT_STATUTE_MILE;
          break;
        case esriUnits.METERS:
          gsUnit = GeometryService.UNIT_METER;
          break;
        case esriUnits.FEET:
          gsUnit = GeometryService.UNIT_FOOT;
          break;
        case esriUnits.YARDS:
          gsUnit = GeometryService.UNIT_INTERNATIONAL_YARD;
          break;
        case esriUnits.SQUARE_KILOMETERS:
          gsUnit = GeometryService.UNIT_SQUARE_KILOMETERS;
          break;
        case esriUnits.SQUARE_MILES:
          gsUnit = GeometryService.UNIT_SQUARE_MILES;
          break;
        case esriUnits.ACRES:
          gsUnit = GeometryService.UNIT_ACRES;
          break;
        case esriUnits.HECTARES:
          gsUnit = GeometryService.UNIT_HECTARES;
          break;
        case esriUnits.SQUARE_METERS:
          gsUnit = GeometryService.UNIT_SQUARE_METERS;
          break;
        case esriUnits.SQUARE_FEET:
          gsUnit = GeometryService.UNIT_SQUARE_FEET;
          break;
        case esriUnits.SQUARE_YARDS:
          gsUnit = GeometryService.UNIT_SQUARE_YARDS;
          break;
        }
        return gsUnit;
      },

      _getPolylineOfPolygon: function(polygon){
        var polyline = new Polyline(polygon.spatialReference);
        var points = polygon.rings[0];
        points = points.slice(0, points.length - 1);
        polyline.addPath(points);
        return polyline;
      },

      destroy: function() {
        this._undoList = null;
        this._redoList = null;
        if(this.drawBox){
          this.drawBox.destroy();
          this.drawBox = null;
        }
        if(this.pointSymChooser){
          this.pointSymChooser.destroy();
          this.pointSymChooser = null;
        }
        if(this.lineSymChooser){
          this.lineSymChooser.destroy();
          this.lineSymChooser = null;
        }
        if(this.fillSymChooser){
          this.fillSymChooser.destroy();
          this.fillSymChooser = null;
        }
        if(this.textSymChooser){
          this.textSymChooser.destroy();
          this.textSymChooser = null;
        }
        this.inherited(arguments);
      },

      startup: function() {
        this.inherited(arguments);
        this.viewStack.startup();
        this.viewStack.switchView(null);
      },

      _addGraphics: function(graphics){
        array.forEach(graphics, lang.hitch(this, function(g){
          this.drawBox.addGraphic(g);
        }));
      },

      _removeGraphics: function(graphics){
        array.forEach(graphics, lang.hitch(this, function(g){
          this.drawBox.removeGraphic(g);
        }));
      },

      _pushUndoGraphics: function(graphics){
        this._undoList.push(graphics);
        this._enableBtn(this.btnUndo, true);
      },

      _popUndoGraphics: function(){
        var graphics = this._undoList.pop();
        if(this._undoList.length === 0){
          this._enableBtn(this.btnUndo, false);
        }
        return graphics;
      },

      _pushRedoGraphics: function(graphics){
        this._redoList.push(graphics);
        this._enableBtn(this.btnRedo, true);
      },

      _popRedoGraphics: function(){
        var graphics = this._redoList.pop();
        if(this._redoList.length === 0){
          this._enableBtn(this.btnRedo, false);
        }
        return graphics;
      },

      _enableBtn: function(btn, isEnable){
        if(isEnable){
          html.removeClass(btn, 'jimu-state-disabled');
        }else{
          html.addClass(btn, 'jimu-state-disabled');
        }
      },

      _disableBtnRedo: function(){
        this._enableBtn(this.btnRedo, false);
        this._redoList = [];
      },

      _onBtnUndoClicked: function(){
        if(this._undoList.length === 0){
          return;
        }

        var undoGraphics = this._popUndoGraphics();
        if(undoGraphics && undoGraphics.length > 0){
          this._pushRedoGraphics(undoGraphics);
          this._removeGraphics(undoGraphics);
        }
      },

      _onBtnRedoClicked: function(){
        if(this._redoList.length === 0){
          return;
        }

        var redoGraphics = this._popRedoGraphics();
        if(redoGraphics && redoGraphics.length > 0){
          this._addGraphics(redoGraphics);
          this._pushUndoGraphics(redoGraphics);
        }
      },

      _onBtnClearClicked: function(){
        this._undoList = [];
        this._redoList = [];
        this._enableBtn(this.btnUndo, false);
        this._enableBtn(this.btnRedo, false);
        this.drawBox.clear();
      }
    });
  });