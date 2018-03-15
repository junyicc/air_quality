define([
    "dojo/_base/lang",
    "dojo/_base/declare",
    "dojo/parser",
    "jimu/BaseWidget",
    "dojo/on",
    "dojo/dom-style",
    "dojo/dom-attr",
    "dojo/dom-class",
     "dojo/dom",
     "esri/tasks/Geoprocessor",
     "esri/config",
     "esri/layers/ImageParameters",
     "esri/graphic",
     "esri/tasks/FeatureSet",
     "esri/toolbars/draw",
     "esri/symbols/SimpleFillSymbol",
     "dojo/dom-construct",
],
    function (lang, declare, Parser, BaseWidget, On, domStyle, domAttr, domClass, Dom, Geoprocessor, esriConfig, ImageParameters, Graphic, FeatureSet, Draw, SimpleFillSymbol, domConstruct) {

        return declare([BaseWidget], {

            baseClass: "jimu-widget-Interpolation",

            name: 'Interpolation',

            datatype: ["AQI", "CO", "NO2", "O3/h", "PM10", "PM25", "SO2"],

            datatypeIndex: 0,

            ChaZhi: false,

            DengZhiXian: false,

            ZiDingYi: false,

            Remove: false,

            StaticData: true,

            //初始化执行顺序为postCreate->startup->onOpen->onSignOut->.....
            postCreate: function () {
                this.inherited(arguments);
            },

            startup: function () {
                this.inherited(arguments);
                //  On(this.YMD, "click", lang.hitch(this, this.CheckChange, this.YMD));
                On(this.Hour, "click", lang.hitch(this, this.CheckChange, this.Hour));
            },

            onOpen: function () {

            },

            onClose: function () {
                esriConfig.defaults.drawTool =null;
                esriConfig.defaults.InterpolationWidget = null;
            },

            onMinimize: function () {
            },

            onMaximize: function () {
            },

            onSignIn: function (credential) {
            },

            onSignOut: function () {
                this.InitDatePicker();
                this.InitHourPicker();
                esriConfig.defaults.map = this.map;
            },

            //根据时间获取对应的时间字符串
            GetDateString: function (datetime) {
                var ReturnStr = "";
                var Year = datetime.getUTCFullYear();
                var Month = datetime.getUTCMonth() + 1;
                var Day = datetime.getDate();
                ReturnStr = Year + "-";
                if (Month < 10) {
                    ReturnStr += "0" + Month + "-";
                }
                else {
                    ReturnStr += Month + "-";
                }

                if (Day < 10) {
                    ReturnStr += "0" + Day;
                }
                else {
                    ReturnStr += Day;
                }
                return ReturnStr;
            },

            //初始化时间选择器
            InitDatePicker: function () {
                var nowday = new Date();
                nowday -= 1000 * 3600 * 24;
                nowday = new Date(nowday);
                var max = this.GetDateString(nowday);
                var DatePicker = Dom.byId("SelectDate");
                DatePicker.min = "2015-04-08";
                DatePicker.max = max;
                DatePicker.value = max;
            },

            InitHourPicker: function () {
                if (!this.StaticData) {
                    var DatePicker = Dom.byId("SelectDate");
                    var SelectDate = DatePicker.valueAsDate;
                    var SelectYear = SelectDate.getUTCFullYear();
                    var SelectMonth = SelectDate.getUTCMonth() + 1;
                    var SelectDay = SelectDate.getDate();
                    var selecthourmethod = this.SelectHour;
                    PageMethods.GetExitsTableOneDay(
                        SelectYear,
                        SelectMonth,
                        SelectDay,
                        function (e) {
                            var hourselect = Dom.byId("hoursPicker");
                            var children = hourselect.children;
                            for (j = children.length - 1; j >= 0; j--) {
                                hourselect.removeChild(children[j]);
                            }
                            var text = "--:--";
                            for (i = 0; i < e.length; i++) {
                                var option = document.createElement("span");
                                //option.value = e[i];
                                
                                if (e[i] < 10) {
                                    text = "0" + e[i] + ":00";
                                }
                                else {
                                    text = e[i] + ":00";
                                }
                                option.id = e[i]+"_hourspan";
                                option.innerHTML = text;
                                On(option, 'click', lang.hitch(this, selecthourmethod));
                                hourselect.appendChild(option);
                            }
                            $(".jimu-widget-Interpolation .MenuBody .Hour").html(text);
                        });
                }
            },

            //获取插值结果
            GetResult_Basic: function () {
                var DatePicker = Dom.byId("SelectDate");
                var DataType = this.GetSelectDataType();
                var SelectDate = DatePicker.valueAsDate;
                var SelectYear = SelectDate.getUTCFullYear();
                var SelectMonth = SelectDate.getUTCMonth() + 1;
                var SelectDay = SelectDate.getDate();
                var SelectHour = this.GetSelectHour();
                var DatabaseName = "Air_Quality";
                var DatatableName = "DT_" + SelectYear + "_" + SelectMonth + "_" + SelectDay + "_" + SelectHour;
                this.GetResultFormGP(DatabaseName,DatatableName,SelectDataType);
            },

            GetResult_Static: function () {
                var DatePicker = Dom.byId("SelectDate");
                var SelectDataType = this.GetSelectDataType();;
                var SelectDate = DatePicker.valueAsDate;
                var SelectYear = SelectDate.getUTCFullYear();
                var SelectMonth = SelectDate.getUTCMonth() + 1;
                var SelectDay = SelectDate.getDate();
                var DatabaseName = "Air_Statistics";
                var DatatableName = "DT_" + SelectYear + "_" + SelectMonth + "_" + SelectDay;
                this.GetResultFormGP(DatabaseName, DatatableName, SelectDataType);
            },

            GetResultFormGP: function (DatabaseName, DatatableName, DataType) {
                this.ShowWaitting();
                PageMethods.CheckTableExits(
                    DatabaseName,
                    DatatableName,
                    function (e) {
                        if (e == true) {

                            dojo.xhrGet({
                                url: "WebService.json",
                                handleAs: "json",
                                load: function (response, ioArgs) {
                                    var gpLink;
                                    switch (DataType) {
                                        case "AQI":
                                            gpLink = response['AQI']; break;
                                        case "PM25":
                                            gpLink = response['PM25']; break;
                                        case "PM10":
                                            gpLink = response['PM10']; break;
                                        case "CO":
                                            gpLink = response['CO']; break;
                                        case "NO2":
                                            gpLink = response['NO2']; break;
                                        case "O3_1":
                                        case "O3_8":
                                            gpLink = response['O3']; break;
                                        case "SO2":
                                            gpLink = response['SO2']; break;
                                        default:
                                            gpLink = response['AQI']; break;
                                    }
                                    var gp = new Geoprocessor(gpLink);
                                    gp.outSpatialReference = esriConfig.defaults.map.spatialReference;
                                    gp.processSpatialReference = esriConfig.defaults.map.spatialReference;
                                    var params = {
                                        "DataType": DataType,
                                        "DatabaseName": DatabaseName,
                                        "DatatableName": DatatableName
                                    };
                                    gp.submitJob(
                                        params,
                                        function (jobInfo) {
                                            var imageParams = new ImageParameters();
                                            imageParams.imageSpatialReference = esriConfig.defaults.map.spatialReference;
                                            gp.getResultImageLayer(jobInfo.jobId, "OutputResult", imageParams, function (gpLayer) {
                                                //  OutputResult
                                                //判断上一次的插值图的ID是否为空，若为空，表示尚上一次没有添加插值的图，若不为空，先移除
                                                var lastId;
                                                if (esriConfig.defaults.InterpolationLayerId != null) {
                                                    lastId = esriConfig.defaults.InterpolationLayerId;
                                                }
                                                gpLayer.setOpacity(0);
                                                esriConfig.defaults.map.addLayer(gpLayer);

                                                //记录新添加插值图层的ID，在下次添加时移除掉之前的图层
                                                esriConfig.defaults.InterpolationLayerId = esriConfig.defaults.map.layerIds[esriConfig.defaults.map.layerIds.length - 1];

                                                //设置图层div渐变显示
                                                var id = "map_" + esriConfig.defaults.InterpolationLayerId;
                                                $("#" + id).css({ "-webkit-transition": "opacity 1s linear", "opacity": "0" });
                                                setTimeout($("#" + id).css({ "opacity": "0.8" }), 1000);

                                                //设置上一次添加的图层div渐变消失
                                                if (lastId != null) {
                                                    $("#map_" + lastId).css({ "-webkit-transition": "opacity 0.5s linear", "opacity": "0.8" });
                                                    setTimeout(
                                                        function () {
                                                            $("#map_" + lastId).css({ "opacity": "0" })
                                                            var layer = esriConfig.defaults.map.getLayer(lastId);
                                                            esriConfig.defaults.map.removeLayer(layer);
                                                        },
                                                        2000);
                                                }

                                                domStyle.set(esriConfig.defaults.loadLayer, "display", "none");
                                            });
                                        },
                                        function (jobInfo) {
                                        });

                                },
                                error: function (response, ioArgs) {
                                    console.log(response);
                                },
                            });


                        }
                    });
            },

            AddContour: function () {
                var DatePicker = Dom.byId("SelectDate");
                var SelectDataType = this.GetSelectDataType();
                var SelectDate = DatePicker.valueAsDate;
                var SelectYear = SelectDate.getUTCFullYear();
                var SelectMonth = SelectDate.getUTCMonth() + 1;
                var SelectDay = SelectDate.getDate();
                var SelectHour = this.GetSelectHour();
                var DatabaseName =this.StaticData?"Air_Statistics": "Air_Quality";
                var DatatableName = "DT_" + SelectYear + "_" + SelectMonth + "_" + SelectDay;

                DatatableName+=this.StaticData?"":"_"+this.GetSelectHour();

                dojo.xhrGet({
                    url: "WebService.json",
                    handleAs: "json",
                    load: function (response, ioArgs) {
                        var gp = new Geoprocessor(response['AirContour']);
                        gp.outSpatialReference = esriConfig.defaults.map.spatialReference;
                        gp.processSpatialReference = esriConfig.defaults.map.spatialReference;
                        var params = {
                            "DataType": SelectDataType,
                            "DatabaseName": DatabaseName,
                            "DatatableName": DatatableName
                        };
                        gp.submitJob(
                            params,
                            function (jobInfo) {
                                var imageParams = new ImageParameters();
                                imageParams.imageSpatialReference = esriConfig.defaults.map.spatialReference;
                                gp.getResultImageLayer(jobInfo.jobId, "Contour_shp", imageParams, function (gpLayer) {
                                    //  OutputResult
                                    //判断上一次的插值图的ID是否为空，若为空，表示尚上一次没有添加插值的图，若不为空，先移除
                                    if (esriConfig.defaults.ContourID != null) {
                                        var layer = esriConfig.defaults.map.getLayer(esriConfig.defaults.ContourID);
                                        esriConfig.defaults.map.removeLayer(layer);
                                    }
                                    //   gpLayer.setOpacity(0.8);
                                    gpLayer.setOpacity(0.7);
                                    esriConfig.defaults.map.addLayer(gpLayer);
                                    //记录新添加插值图层的ID，在下次添加时把这次的先移除
                                    esriConfig.defaults.ContourID = esriConfig.defaults.map.layerIds[esriConfig.defaults.map.layerIds.length - 1];
                                    domStyle.set(esriConfig.defaults.loadLayer, "display", "none");
                                });
                            },
                            function (jobInfo) {
                                console.log(jobInfo);
                            });
                    },
                    error: function (response, ioArgs) {
                        console.log(response);
                        console.log(ioArgs);
                    }
                });

            },

            CustomArea: function () {
                this.DrawTool = new Draw(esriConfig.defaults.map);
                this.DrawTool.on("draw-end", this.AddGraphic);
                esriConfig.defaults.map.disableMapNavigation();
                esriConfig.defaults.drawTool = this.DrawTool;
                esriConfig.defaults.InterpolationWidget = this;
                this.DrawTool.activate("polygon");
            },

            AddGraphic: function (evt) {
                esriConfig.defaults.InterpolationWidget.ShowWaitting();
                esriConfig.defaults.drawTool.deactivate();
                esriConfig.defaults.map.enableMapNavigation();
                dojo.xhrGet({
                    url: "WebService.json",
                    handleAs: "json",
                    load: function (response, ioArgs) {

                        var gra = new Graphic(evt.geometry, new SimpleFillSymbol());
                        esriConfig.defaults.map.graphics.add(gra);
                        var features = [];
                        features.push(gra);
                        var featureSet = new FeatureSet();
                        featureSet.features = features;

                        var DatePicker = Dom.byId("SelectDate");
                        var DataType = esriConfig.defaults.InterpolationWidget.GetSelectDataType();
                        var SelectDate = DatePicker.valueAsDate;
                        var SelectYear = SelectDate.getUTCFullYear();
                        var SelectMonth = SelectDate.getUTCMonth() + 1;
                        var SelectDay = SelectDate.getDate();

                        var DatabaseName = esriConfig.defaults.InterpolationWidget.StaticData ? "Air_Statistics" : "Air_Quality";
                        var DatatableName = "DT_" + SelectYear + "_" + SelectMonth + "_" + SelectDay;
                        DatatableName += esriConfig.defaults.InterpolationWidget.StaticData ? "" : esriConfig.defaults.InterpolationWidget.GetSelectHour();


                        var gpLink = "";
                        switch (DataType) {
                            case "AQI":
                                gpLink = response['AQI_Mask']; break;
                            case "PM25":
                                gpLink = response['PM25_Mask']; break;
                            case "PM10":
                                gpLink = response['PM10_Mask']; break;
                            case "CO":
                                gpLink = response['CO_Mask']; break;
                            case "NO2":
                                gpLink = response['NO2_Mask']; break;
                            case "O3_1":
                                gpLink = response['O3_Mask']; break;
                            case "SO2":
                                gpLink = response['SO2_Mask']; break;
                            default:
                                gpLink = response['AQI_Mask']; break;
                        }

                        var gp = new Geoprocessor(gpLink);
                        gp.outSpatialReference = esriConfig.defaults.map.spatialReference;
                        gp.processSpatialReference = esriConfig.defaults.map.spatialReference;
                        var params = {
                            "DatabaseName": "Air_Quality",
                            "DatatableName": "DT_2015_8_8_17",
                            "DataType": DataType,
                            "Mask": featureSet
                        };
                        gp.submitJob(
                            params,
                            function (jobInfo) {
                                var imageParams = new ImageParameters();
                                imageParams.imageSpatialReference = esriConfig.defaults.map.spatialReference;
                                gp.getResultImageLayer(jobInfo.jobId, "OutputResult", imageParams, function (gpLayer) {
                                    //判断上一次的插值图的ID是否为空，若为空，表示尚上一次没有添加插值的图，若不为空，先移除
                                    var lastId;
                                    if (esriConfig.defaults.InterpolationLayerId != null) {
                                        lastId = esriConfig.defaults.InterpolationLayerId;
                                    }

                                    gpLayer.setOpacity(0);
                                    esriConfig.defaults.map.addLayer(gpLayer);

                                    //记录新添加插值图层的ID，在下次添加时移除掉之前的图层
                                    esriConfig.defaults.InterpolationLayerId = esriConfig.defaults.map.layerIds[esriConfig.defaults.map.layerIds.length - 1];
                                    //设置图层div渐变显示
                                    var id = "map_" + esriConfig.defaults.InterpolationLayerId;
                                    $("#" + id).css({ "-webkit-transition": "opacity 2s linear", "opacity": "0" });
                                    setTimeout($("#" + id).css({ "opacity": "0.7" }), 1000);

                                    //设置上一次添加的图层div渐变消失
                                    if (lastId != null) {
                                        $("#map_" + lastId).css({ "-webkit-transition": "opacity 2s linear", "opacity": "0.7" });
                                        setTimeout(
                                            function () {
                                                $("#map_" + lastId).css({ "opacity": "0" })
                                                var layer = esriConfig.defaults.map.getLayer(lastId);
                                                esriConfig.defaults.map.removeLayer(layer);
                                            },
                                            2000);
                                    }
                                    esriConfig.defaults.map.graphics.clear();
                                    domStyle.set(esriConfig.defaults.loadLayer, "display", "none");
                                });
                            },
                            function (jobInfo) {
                                console.log(jobInfo);
                            });
                    },
                    error: function () { }
                });
            },

            RemoveLayer: function () {
                //判断插值图的ID是否为空，若为空，表示尚没有添加过插值的图，若不为空，先把以添加的移除
                if (esriConfig.defaults.InterpolationLayerId != null) {
                    var layer = esriConfig.defaults.map.getLayer(esriConfig.defaults.InterpolationLayerId);
                    esriConfig.defaults.map.removeLayer(layer);
                    esriConfig.defaults.InterpolationLayerId = null;
                }
                if (esriConfig.defaults.ContourID != null) {
                    var layer = esriConfig.defaults.map.getLayer(esriConfig.defaults.ContourID);
                    esriConfig.defaults.map.removeLayer(layer);
                    esriConfig.defaults.ContourID = null;
                }
                domStyle.set(esriConfig.defaults.loadLayer, "display", "none");
            },

            selectDataTyperight: function () {
                this.datatypeIndex = (this.datatypeIndex + 1) % 7;
                var dt = this.datatype;
                var dti = this.datatypeIndex;

                $(".jimu-widget-Interpolation .MenuBody .Datatype .DT_content").css({ "-webkit-animation": "dataTypeNext 0.5s" });
                setTimeout(function () {
                    $(".jimu-widget-Interpolation .MenuBody .Datatype .DT_content").html(dt[dti]);
                }, 250);
                setTimeout(function () {
                    $(".jimu-widget-Interpolation .MenuBody .Datatype .DT_content").removeAttr("style");
                }, 500);
            },

            selectDataTypeleft: function () {
                this.datatypeIndex = (this.datatypeIndex + 6) % 7;

                var dt = this.datatype;
                var dti = this.datatypeIndex;
                $(".jimu-widget-Interpolation .MenuBody .Datatype .DT_content").css({ "-webkit-animation": "dataTypeBack 0.5s" });
                setTimeout(function () {
                    $(".jimu-widget-Interpolation .MenuBody .Datatype .DT_content").html(dt[dti]);
                }, 250);
                setTimeout(function () {
                    $(".jimu-widget-Interpolation .MenuBody .Datatype .DT_content").html(dt[dti]);
                    $(".jimu-widget-Interpolation .MenuBody .Datatype .DT_content").removeAttr("style");
                }, 500);
            },

            ToggleSelectHour: function () {
                $(".jimu-widget-Interpolation .MenuBody .Hours").slideToggle(300);
            },

            SelectHour: function (e) {
                var sss = domAttr.get(e.currentTarget, "innerHTML");
                $(".jimu-widget-Interpolation .MenuBody .Hour").html(sss);
                $(".jimu-widget-Interpolation .MenuBody .Hours").slideToggle(300);

            },

            GetSelectHour: function () {
                var selecthour = domAttr.get("Hour_date", "innerHTML");
                var part = selecthour.split(':')[0];
                var result = parseInt(part);
                return result;
            },

            GetSelectDataType: function () {
                var DataType='AQI'
                switch (this.datatypeIndex) {
                    case 0: DataType = 'AQI'; break;
                    case 1: DataType = 'CO'; break;
                    case 2: DataType = 'NO2'; break;
                    case 3: DataType = 'O3_1'; break;
                    case 4: DataType = 'PM10'; break;
                    case 5: DataType = 'PM25'; break;
                    case 6: DataType = 'AQSO2'; break;
                    default: DataType = 'AQI'; break;
                }
                return DataType;
            },

            CheckChange: function (e) {
                if ((domAttr.get(e, 'class').split(" "))[1] == "checked") {
                    domClass.remove(e, "checked");
                    domClass.add(e, "unchecked");
                    $(".jimu-widget-Interpolation .MenuBody .Hour").html('--:--');
                    this.StaticData = true;
                    var hourselect = Dom.byId("hoursPicker");
                    var children = hourselect.children;
                    for (j = children.length - 1; j >= 0; j--) {
                        hourselect.removeChild(children[j]);
                    }
                }
                else {
                    domClass.remove(e, "unchecked");
                    domClass.add(e, "checked");
                    this.StaticData = false;
                    this.InitHourPicker();
                }
            },

            SelectMethod: function (e) {
                $(".jimu-widget-Interpolation .Methods span").removeClass("selected");
                domClass.add(e.currentTarget, "selected");
                var selectId = domAttr.get(e.currentTarget, "id");
                switch (selectId) {
                    case "ChaZhi":
                        this.ChaZhi = true;
                        this.DengZhiXian = false;
                        this.ZiDingYi = false;
                        this.Remove = false;
                        break;
                    case "DengZhiXian":
                        this.ChaZhi = false;
                        this.DengZhiXian = true;
                        this.ZiDingYi = false;
                        this.Remove = false;
                        break;
                    case "ZiDingYi":
                        this.ChaZhi = false;
                        this.DengZhiXian = false;
                        this.ZiDingYi = true;
                        this.Remove = false;
                        break;
                    case "Remove":
                        this.ChaZhi = false;
                        this.DengZhiXian = false;
                        this.ZiDingYi = false;
                        this.Remove = true;
                        break;
                };
                $(".jimu-widget-Interpolation #OK").show(500);
            },

            Excute: function () {
                if (this.ChaZhi) {
                    this.ShowWaitting();
                    if (this.StaticData) {
                        this.GetResult_Static();
                    }
                    else {
                        this.GetResult_Basic();
                    }
                }
                else if (this.DengZhiXian) {
                    this.ShowWaitting();
                    this.AddContour();
                }
                else if (this.ZiDingYi) {
                    this.CustomArea();
                }
                else if (this.Remove) {
                    this.RemoveLayer();
                }
            },

            ShowWaitting: function () {
                if (esriConfig.defaults.loadLayer == undefined) {
                    esriConfig.defaults.loadLayer = domConstruct.create("div");
                    domClass.add(esriConfig.defaults.loadLayer, "Loading");
                    domStyle.set(esriConfig.defaults.loadLayer, { "background-color": "black", "opacity": "0.5", "position": "absolute", "width": "550px", "height": "350px", "background-image": "url('images/loading3.gif')", "background-position": "center", "background-repeat": "no-repeat", "top": "0" });
                    domConstruct.place(esriConfig.defaults.loadLayer, this.domNode);
                }
                else {
                    domStyle.set(esriConfig.defaults.loadLayer, "display", "block");
                }
            },
        });
    }
    );