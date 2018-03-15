
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
            dataType: ["AQI", "CO", "NO2", "O3_1", "O3_8", "PM25", "PM10", "SO2"],
            selectedDataType:"AQI",

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

                PageMethods.GetNewestTableName(
                    function (e) {
                        var newesttablename = String(e);
                        var OutPar = newesttablename.split('_');
                        if (parseInt(OutPar[2]) < 10) {
                            OutPar[2] = "0" + OutPar[2];
                        }
                        if (parseInt(OutPar[3]) < 10) {
                            OutPar[3] = "0" + OutPar[3];
                        }
                        var max = OutPar[1] + "-" + OutPar[2] + "-" + OutPar[3];
                        var value = new Date(max);
                        max = esriConfig.defaults.interpolation.GetDateString(value);
                        var DatePicker = dom.byId("SelectDate_TI"); //DateOfTable
                        DatePicker.max = max;
                        DatePicker.min = "2015-04-08";
                        DatePicker.value = max;
                    });
            },

            creatTrigger: function () {
                var trigger = domConstruct.create("div");
                domClass.add(trigger, "TimeTrigger");
                domStyle.set(trigger, {
                    "width": "40px",
                    "height": "40px",
                    "background-color": "gray",
                    "right": "-40px",
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
                    domStyle.set(this.domNode, { "width": "0px" });
                    if (esriConfig.defaults.LayerId_TI != null) {
                        //判断插值图的ID是否为空，若为空，表示尚没有添加过插值的图，若不为空，先把以添加的移除
                        var layer = esriConfig.defaults.map.getLayer(esriConfig.defaults.LayerId_TI);
                        esriConfig.defaults.map.removeLayer(layer);
                        esriConfig.defaults.LayerId_TI = undefined;
                    }
                    $(".jimu-widget-timeinterpolation .mainDiv .Loading").remove();
                }
                $(this.mainDiv).fadeToggle(500);
            },

            Init: function () {
                //domConstruct.create("script", { src: "JS/JQ/jquery-1.9.1.min.js" }, this.domNode);
                domConstruct.create("script", { src: "JS/JQ/jquery.timeliner.min.js"}, this.domNode);
                domConstruct.create("script", { src: "widgets/MyWidgets/TimeInterpolation/Timeline.js"}, this.domNode);

                this.mainDiv = domConstruct.create("div", {}, this.domNode);
                domStyle.set(this.domNode, {
                    "right": "95px",
                    "left": "auto",
                    "top": "auto",
                    "bottom": "20px",
                    "width": "0px",
                    "height": "100px",
                    "position": "absolute",
                    "-webkit-transition": "width 0.5s ease-out",/* Safari 和 Chrome */
                    "-o-transition": "width 0.5s ease-out",/* Opera */
                    "-moz-transition": "width 0.5s ease-out"/* Firefox 4 */
                });
                domClass.add(this.mainDiv, "mainDiv");
                domStyle.set(this.mainDiv, {
                    "width": "700px",
                    "height": "100%",
                    "background-color": "rgb(134, 207, 219)",
                    "border-radius": "5px",
                    "display": "none",
                    "opacity": "0.9"
                });


                //Select Date
                dateDiv = domConstruct.create("div", { style: { width: "45%", float: "left" } });
                domConstruct.place(dateDiv, this.mainDiv);
                var pDate = domConstruct.create("p", {}, dateDiv)
                domConstruct.create("label", { for: "SelectDate_TI", style: { width: "30%" }, innerText: "选择日期：" }, pDate);
                $(pDate).html("选择日期：");
                input = domConstruct.create("input", { style: { width: "40%" } });
                domConstruct.place(input, pDate);
                domAttr.set(input, "id", "SelectDate_TI");
                domAttr.set(input, "type", "Date");

                var timeNodes = domConstruct.create("p");
                domClass.add(timeNodes, "PlayTime");
                domConstruct.place(timeNodes, dateDiv);

                //Select DataType
                dataTypeDiv = domConstruct.create("div", { style: { width: "55%", float: "right" } });
                domConstruct.place(dataTypeDiv, this.mainDiv);
                //pDataType = domConstruct.create("p", {}, dataTypeDiv)
                //domConstruct.create("label", { for: "DataType_TI", style: { width: "30%" }, innerHTML: "Select DataType: " }, pDataType);
                //select = domConstruct.create("select", {
                //    style: { width: "40%" },
                //    innerHTML: "<option value=\"AQI\">AQI</option><option value=\"PM25\">PM25</option><option value=\"PM10\">PM10</option><option value=\"CO\">CO</option><option value=\"NO2\">NO2</option><option value=\"O3_1\">O3/h</option><option value=\"O3_8\">O3/8h</option><option value=\"SO2\">SO2</option>"
                //});
                //domConstruct.place(select, pDataType);
                //domAttr.set(select, "id", "DataType_TI");
                //create dataType of Pictures

                var picturesDIV = domConstruct.create("div");
                domConstruct.place(picturesDIV, dataTypeDiv);
                domClass.add(picturesDIV, "DataType");
                domAttr.set(picturesDIV, "id", "DataType");
                var nodes;
                for (var i = 0; i < 8; i++) {
                    nodes = domConstruct.create("img");
                    domAttr.set(nodes, { "id": this.dataType[i], "src": "widgets/MyWidgets/TimeInterpolation/images/AQI/" + this.dataType[i] + ".png" });
                    domClass.add(nodes, this.dataType[i]);
                    if (i == 0) { domClass.add(nodes, "selected"); }
                    this.own(on(nodes, "click", lang.hitch(this, this.ChangeDataType, nodes)));
                    domConstruct.place(nodes, picturesDIV);
                }

                button = domConstruct.create("button", { innerText: "确定", style: { float: "right" } });
                $(button).html("确定");
                domConstruct.place(button, dataTypeDiv);
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

                if (esriConfig.defaults.InterpolationLayerId != null) {
                    var existlayer = esriConfig.defaults.map.getLayer(esriConfig.defaults.InterpolationLayerId);
                    esriConfig.defaults.map.removeLayer(existlayer);
                    esriConfig.defaults.InterpolationLayerId = null;
                }

                //清楚时间label
                $(".jimu-widget-timeinterpolation .mainDiv .PlayTime").html("");
                //创建等待面板
                var load = domConstruct.create("div");
                domClass.add(load, "Loading");
                domConstruct.place(load, this.mainDiv);
                var loadingimg = domConstruct.create("img", { src: "widgets/MyWidgets/TimeInterpolation/images/loading3.gif" });
                //进度百分比
                domConstruct.place(loadingimg, load);
                var process = domConstruct.create("p");
                domConstruct.place(process, load);


                if (esriConfig.defaults.LayerId_TI != null) {
                    $("#timeInterpolation li").remove();
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
                        esriConfig.defaults.Table = table;
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
                //var DataType = dom.byId("DataType_TI");
                //var SelectDataType = DataType.value;
                var SelectDataType = this.selectedDataType;
                if (this.index < this.date.length) {
                    this.GetResult(this.date[this.index], SelectDataType);
                    $(".jimu-widget-timeinterpolation .mainDiv .Loading p").html(parseInt((this.index / this.date.length) * 100)  + "%");
                }
                if (this.layers.length == this.date.length) {
                    $('#timeInterpolation').timeliner({
                        containerwidth: 700, //幻灯片宽度
                        containerheight: 70, //幻灯片高度
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

            ChangeDataType: function (DOM) {
                this.selectedDataType = $(DOM).attr("id");
                $(".jimu-widget-timeinterpolation .mainDiv .DataType .selected").removeClass("selected");
                $(DOM).addClass("selected");
            }

        });

    });