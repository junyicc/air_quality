
define([
        'dojo/_base/declare',
        'dijit/_WidgetsInTemplateMixin',
        'jimu/BaseWidget',
        "dojo/dom-construct",
        "dojo/dom-style",
        "dojo/dom-attr",
        "dojo/dom-class",
        'dojo/_base/lang',
        "dojo/on",
        "dojo/dom",
        "dijit/Toolbar",
        "dijit/form/Button",
        "esri/config",
        "esri/tasks/Geoprocessor",
        "esri/layers/ImageParameters",
],
    function (declare, _WidgetsInTemplateMixin, BaseWidget, domConstruct, domStyle,
              domAttr, domClass, lang, on, dom, Toolbar, Button, esriConfig, Geoprocessor, ImageParameters) {
        return declare([BaseWidget], {

            name: 'TimeInterpolation',
            baseClass: 'jimu-widget-timeinterpolation',

            ul: undefined,
            layers: undefined,
            date: undefined,
            index: undefined,

            startup: function () {
                this.inherited(arguments);
                this.Init();
                this.creatTrigger();
                esriConfig.defaults.interpolation = this;
                esriConfig.defaults.map = this.map;
            },

            destroy: function () {
            },

            onOpen: function () {
            },

            onClose: function () {
            },

            onSignIn: function (credential) {
            },

            onSignOut: function () {
                this.InitDatePicker();
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

            InitDatePicker: function () {
                var nowday = new Date();

                nowday -= 1000 * 3600 * 24;

                nowday = new Date(nowday);

                var max = this.GetDateString(nowday);
                var DatePicker = dom.byId("SelectDate_TI");
                console.log(DatePicker);
                DatePicker.min = "2015-04-09";
                DatePicker.max = max;
                DatePicker.value = max;
            },

            creatTrigger: function () {
                var trigger = domConstruct.create("div");
                domClass.add(trigger, "TimeTrigger");
                domStyle.set(trigger, {
                    "width": "40px",
                    "height": "40px",
                    "background-color": "gray",
                    "right": "0px",
                    "bottom": "0px",
                    "position": "absolute",
                    "border-radius": "5px",
                    "overflow": "hidden",
                    "opacity": "0.9"
                });
                this.own(on(trigger, 'click', lang.hitch(this, this.openTimeliner)));
                var TimeImg = domConstruct.create("img", {}, trigger);
                domAttr.set(TimeImg, "src", "widgets/MyWidgets/TimeInterpolation/images/icon.png");
                domStyle.set(TimeImg, { "width": "100%", "height": "100%", "opacity": "0.8", "cursor": "pointer" });
                //TimeImg
                domConstruct.place(trigger, this.domNode);
            },

            openTimeliner: function () {

                if (domStyle.get(this.mainDiv, "display") == "none") {
                    domStyle.set(this.domNode, "width", "1000px");
                }
                else if (domStyle.get(this.mainDiv, "display") == "block") {
                    domStyle.set(this.domNode, "width", "40px");
                    if (esriConfig.defaults.LayerId_TI != null) {
                        //判断插值图的ID是否为空，若为空，表示尚没有添加过插值的图，若不为空，先把以添加的移除
                        var layer = esriConfig.defaults.map.getLayer(esriConfig.defaults.LayerId_TI);
                        esriConfig.defaults.map.removeLayer(layer);
                        esriConfig.defaults.LayerId_TI = undefined;
                    }
                }
                $(this.mainDiv).fadeToggle(500);
            },

            Init: function () {
                //domConstruct.create("script", { src: "JS/JQ/jquery-1.9.1.min.js" }, this.domNode);
                domConstruct.create("script", { src: "JS/JQ/jquery.timeliner.min.js" }, this.domNode);
                domConstruct.create("script", { src: "widgets/MyWidgets/TimeInterpolation/Timeline.js" }, this.domNode);

                this.mainDiv = domConstruct.create("div", {}, this.domNode);
                domStyle.set(this.domNode, {
                    "right": "55px",
                    "left": "auto",
                    "top": "auto",
                    "bottom": "225px",
                    "width": "40px",
                    "height": "100px",
                    "position": "absolute",
                    "-webkit-transition": "width 0.5s ease-out"
                });
                domClass.add(this.mainDiv, "mainDiv");
                domStyle.set(this.mainDiv, {
                    "width": "700px",
                    "height": "100%",
                    "overflow": "hidden",
                    "background-color": "rgb(134, 207, 219)",
                    "border-radius": "5px",
                    "display": "none",
                    "opacity": "0.9"
                });


                //Select Date
                dateDiv = domConstruct.create("div", { style: { width: "50%", float: "left" } });
                domConstruct.place(dateDiv, this.mainDiv);
                var pDate = domConstruct.create("p", {}, dateDiv)
                domConstruct.create("label", { for: "SelectDate_TI", style: { width: "30%" }, innerHTML: "Select Date: " }, pDate);
                input = domConstruct.create("input", { style: { width: "40%" } });
                domConstruct.place(input, pDate);
                domAttr.set(input, "id", "SelectDate_TI");
                domAttr.set(input, "type", "Date");

                //Select DataType
                dataTypeDiv = domConstruct.create("div", { style: { width: "50%", float: "right" } });
                domConstruct.place(dataTypeDiv, this.mainDiv);
                pDataType = domConstruct.create("p", {}, dataTypeDiv)
                domConstruct.create("label", { for: "DataType_TI", style: { width: "30%" }, innerHTML: "Select DataType: " }, pDataType);
                select = domConstruct.create("select", {
                    style: { width: "40%" },
                    innerHTML: "<option value=\"AQI\">AQI</option><option value=\"PM25\">PM25</option><option value=\"PM10\">PM10</option><option value=\"CO\">CO</option><option value=\"NO2\">NO2</option><option value=\"O3_1\">O3/h</option><option value=\"O3_8\">O3/8h</option><option value=\"SO2\">SO2</option>"
                });
                domConstruct.place(select, pDataType);
                domAttr.set(select, "id", "DataType_TI");
                button = domConstruct.create("button", { innerHTML: "Execute", style: { float: "right" } });
                domConstruct.place(button, pDataType);
                domAttr.set(button, "id", "btn_exec");
                this.own(on(button, "click", lang.hitch(this, this.Execute)));

                //create timeline node and add id，css
                interpolationDiv = domConstruct.create("div", { style: { width: "100%", height: "100%" } });
                domConstruct.place(interpolationDiv, this.mainDiv);
                domClass.add(interpolationDiv, "interpolationDiv");

                this.ul = domConstruct.create("ul", { style: { width: "100%", height: "100%" } }, interpolationDiv);
                domAttr.set(this.ul, "id", "timeInterpolation");
                domClass.add(this.ul, "timeliner");

            },
            //初始化时间选择器

            Execute: function () {
                if (esriConfig.defaults.LayerId_TI != null) {
                    //判断插值图的ID是否为空，若为空，表示尚没有添加过插值的图，若不为空，先把以添加的移除
                    var layer = esriConfig.defaults.map.getLayer(esriConfig.defaults.LayerId_TI);
                    esriConfig.defaults.map.removeLayer(layer);
                    esriConfig.defaults.LayerId_TI = undefined;
                }
                var DatePicker = dom.byId("SelectDate_TI");
                if (DatePicker.valueAsDate == null)
                    return;
                var SelectDate = DatePicker.valueAsDate;
                var SelectYear = SelectDate.getUTCFullYear();
                var SelectMonth = SelectDate.getUTCMonth() + 1;
                var SelectDay = SelectDate.getDate();
                var ul = this.ul;
                //create <li> according to existTableOneDay
                PageMethods.GetExitsTableOneDay(
                    SelectYear,
                    SelectMonth,
                    SelectDay,
                    function (table) {
                        domConstruct.empty(ul);
                        esriConfig.defaults.interpolation.index = 0;
                        esriConfig.defaults.interpolation.date = [];
                        esriConfig.defaults.interpolation.layers = [];
                        esriConfig.defaults.interpolation.layers.length = 0;
                        for (var i = 0; i < table.length; i++) {
                            var li = domConstruct.create("li");
                            domConstruct.place(li, ul);
                            domAttr.set(li, "title", table[i] + ":00");

                            var Date = "DT_" + SelectYear + "_" + SelectMonth + "_" + SelectDay + "_" + table[i];
                            esriConfig.defaults.interpolation.date.push(Date);
                        }
                        esriConfig.defaults.interpolation.Getlayers();
                    });


            },

            Getlayers: function () {
                var DataType = dom.byId("DataType_TI");
                var SelectDataType = DataType.value;
                if (this.index < this.date.length)
                    this.GetResult(this.date[this.index], SelectDataType);
                if (this.layers.length == this.date.length) {
                    $('#timeInterpolation').timeliner({
                        containerwidth: 700, //幻灯片宽度
                        containerheight: 80, //幻灯片高度
                        timelinewidth: 650, //时间线宽度
                        timelineheight: 6, //时间线高度
                        repeat: false, //循环播放
                        timedisplayposition: 'below', //时间显示位置
                        transition: 'fade', //切换方式
                        showpauseplay: true,
                        showtimedisplay: false,
                        showtooltiptime: false,
                        showprevnext: false
                    });
                }
            },

            //获取插值结果
            GetResult: function (DatatableName, SelectDataType) {
                console.log(DatatableName + "," + SelectDataType);
                PageMethods.CheckTableExits(
                    "Air_Quality",
                    DatatableName,
                    function (e) {
                        if (e == true) {
                            dojo.xhrGet({
                                url: "WebService.json",
                                handleAs: "json",
                                load: function (response, ioArgs) {
                                    var gpLink;
                                    switch (SelectDataType) {
                                        case "AQI":
                                            gpLink = response["AQI"];break;
                                        case "PM25":
                                            gpLink = response["PM25"]; break;
                                        case "PM10":
                                            gpLink = response["PM10"]; break;
                                        case "CO":
                                            gpLink = response["CO"]; break;
                                        case "NO2":
                                            gpLink = response["NO2"]; break;
                                        case "O3_1":
                                        case "O3_8":
                                            gpLink = response["O3"]; break;
                                        case "SO2":
                                            gpLink = response["SO2"]; break;
                                        default:
                                            gpLink = response["AQI"]; break;
                                    }
                                    var gp = new Geoprocessor(gpLink);
                                    //gp.processSpatialReference = esriConfig.defaults.map.spatialReference;
                                    gp.outSpatialReference = esriConfig.defaults.map.spatialReference;

                                    var params = {
                                        "DataType": SelectDataType,
                                        "DatabaseName": "Air_Quality",
                                        "DatatableName": DatatableName,
                                    };
                                    gp.submitJob(
                                        params,
                                        function (jobInfo) {
                                            if (jobInfo.jobStatus == "esriJobSucceeded") {
                                                var imageParams = new ImageParameters();
                                                //imageParams.bbox = esriConfig.defaults.map.extent;
                                                imageParams.imageSpatialReference = esriConfig.defaults.map.spatialReference;
                                                gp.getResultImageLayer(jobInfo.jobId, "OutputResult", imageParams, function (gpLayer) {
                                                    gpLayer.setOpacity(0.9);
                                                    esriConfig.defaults.interpolation.layers.push(gpLayer);
                                                    esriConfig.defaults.interpolation.index = esriConfig.defaults.interpolation.index + 1;
                                                });
                                                esriConfig.defaults.interpolation.Getlayers();
                                            }
                                        }, function (jobInfo) {
                                            console.log(jobInfo.jobStatus);
                                        }, function (jobInfo) {
                                            console.log("Error occured !");
                                        }
                                    );
                                },
                                error: function (response, ioArgs) {
                                    console.log(response);
                                    console.log(ioArgs);
                                }
                            });
                        }
                        else {
                            console.log("Can't find the table");
                        }
                    }
                );

            },

        });

    });