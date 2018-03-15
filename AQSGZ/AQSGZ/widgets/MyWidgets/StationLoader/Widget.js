define([
    'dojo/_base/lang',
    'dojo/_base/declare',
    'dojo/parser',
    'jimu/BaseWidget',
    "dojo/on",
    "esri/layers/GraphicsLayer",
    "esri/geometry/Point",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/graphic",
    "esri/layers/ArcGISDynamicMapServiceLayer",
    "dojo/dom",
    "esri/config",
    "esri/tasks/Geoprocessor",
    "esri/layers/ImageParameters",
    "esri/symbols/PictureMarkerSymbol"
],
    function (lang, declare, parser, BaseWidget, On, GraphicsLayer, Point, SimpleMarkerSymbol, Graphic, ArcGISDynamicMapServiceLayer, Dom, esriConfig, Geoprocessor, ImageParameters, PictureMarkerSymbol) {

        return declare([BaseWidget], {

            baseClass: "jimu-widget-StationLoader",

            name: 'StationLoader',

            graphicsLayer: undefined,

            warningGraphicsLayer:undefined,

            //初始化执行顺序为postCreate->startup->onOpen->onSignOut->.....

            postCreate: function () {
                this.inherited(arguments);
            },

            startup: function () {
                this.inherited(arguments);

                this.addWarningArea();

                this.addMapOverlay();

                this.addBound();


            },

            onOpen: function () {
                
            },

            onClose: function () {
            },

            onMinimize: function () {
            },

            onMaximize: function () {
            },

            onSignIn: function (credential) {
            },

            onSignOut: function () {
            },

            addWarningArea: function () {
                esriConfig.defaults.map = this.map;
                dojo.xhrGet({
                    url: "WebService.json",
                    handleAs: "json",
                    load: function (response, ioArgs) {

                        PageMethods.GetNewestTableName(function (e) {
                            var gp = new Geoprocessor(response['Air_Warning']);
                            var params = {
                                "DataType": 'AQI',
                                "DatabaseName": 'Air_Quality',
                                "DatatableName": e
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
                                            });
                                        },
                                        function (jobInfo) {
                                        }
                                        );
                        });
                    },
                    error: function (response, ioArgs) {
                        console.log(response);
                    }
                });
            },

            //添加监测点
            addMapOverlay: function () {
                var Map = this.map;
                PageMethods.GetLocation(function (e) {
                    graphicsLayer = new GraphicsLayer();
                    warningGraphicsLayer = new GraphicsLayer();
                    var stationsJson = eval("(" + e + ")");
                    for (i = 0; i < stationsJson.items.length; i++) {
                        //坐标点
                        var pt = new Point(stationsJson.items[i].X, stationsJson.items[i].Y);
                        //属性信息
                        var Attr = stationsJson.items[i];
                        //符号颜色，点符号
                        var PointSymbol = new PictureMarkerSymbol("widgets/MyWidgets/StationLoader/images/station.png", 21, 26);
                        var PointSymbol1 = new PictureMarkerSymbol("widgets/MyWidgets/StationLoader/images/warning.gif", 50, 40);
                        PointSymbol1.yoffset = -5;
                        graphicsLayer.on('mouse-over', function (e) { e.graphic.setSymbol(PointSymbol1) });
                        graphicsLayer.on('mouse-out', function (e) { e.graphic.setSymbol(PointSymbol) });
                        var gra = new Graphic(pt, PointSymbol, Attr);
                        graphicsLayer.add(gra);
                    }
                    graphicsLayer.on("click", function (e) {

                        esriConfig.defaults.flag = false;
                        var Name = e.graphic.attributes.Name;
                        var geo = e.graphic.geometry;

                        PageMethods.GetNewestData(Name, function (e) {

                            var NewestJson = eval("(" + e + ")");//转换为json

                            var innerHTML = "<p>更新时间：" + NewestJson["时间"] + "</p>";

                            innerHTML += "<div style=\"overflow-y:hidden\" ><table class=\"altrowstable\" ><tr><td align=\"center\">空气质量</td><td align=\"center\">AQI</td><td align=\"center\">首要污染物</td><td align=\"center\">CO/h</td><td align=\"center\">NO2/h</td><td align=\"center\">03/h</td><td align=\"center\">03/8h</td><td align=\"center\">PM10/h</td><td align=\"center\">PM2.5/h</td><td align=\"center\">S02/h</td></tr>";

                            innerHTML += "<tr><td align=\"center\">" + NewestJson["空气质量指数类别"] + "</td><td align=\"center\">" + NewestJson["AQI"] + "</td><td align=\"center\">" + NewestJson["首要污染物"] + "</td><td align=\"center\">" + NewestJson["CO一氧化碳"] + "</td><td align=\"center\">" + NewestJson["NO2二氧化氮"] + "</td><td align=\"center\">" + NewestJson["O3臭氧1一小时平均"] + "</td><td align=\"center\">" + NewestJson["O3臭氧8小时平均"] + "</td><td align=\"center\">" + NewestJson["PM10可吸入颗粒物"] + "</td><td align=\"center\">" + NewestJson["PM2.5细颗粒物"] + "</td><td align=\"center\">" + NewestJson["SO2二氧化硫"] + "</td></tr></table></div>";

                            innerHTML += "<div style='width:100%;text-align:center;cursor:pointer;border:1px solid #a9c9e2;background:#e8f5fe' id='btn_showAQIHC'>显示AQI趋势图</div>";
                            innerHTML += "<div style='width:100%'><div id='AQI_Highcharts' style='display:none'></div></div>";

                            Map.infoWindow.hide();
                            Map.infoWindow.resize(650, 600);
                            Map.infoWindow.setTitle(Name);
                            Map.infoWindow.setContent(innerHTML);
                            Map.infoWindow.show(geo);

                            document.getElementById("btn_showAQIHC").addEventListener("click", function () {
                                var btn_showHC = Dom.byId("btn_showAQIHC");
                                if (btn_showHC.innerHTML == "显示AQI趋势图") {
                                    btn_showHC.innerHTML = "隐藏AQI趋势图";
                                }
                                else {
                                    btn_showHC.innerHTML = "显示AQI趋势图";
                                }
                                if (!esriConfig.defaults.flag) {
                                    PageMethods.GetStationData(Name, "AQI", function (e) {
                                        $(function () {
                                            esriConfig.defaults.flag = true;
                                            var Timeset = e[0];
                                            var json = eval(e[1]);//将返回数据的第二项转换为json
                                            $('#AQI_Highcharts').highcharts({
                                                chart: {
                                                    type: 'spline'
                                                },
                                                title: {
                                                    text: Name + "AQI趋势变化",
                                                    x: -20 //center
                                                },
                                                subtitle: {
                                                    text: '数据来源: http://www.pm25.in/guangzhou',
                                                    x: -20
                                                },
                                                xAxis: {
                                                    categories: Timeset
                                                },
                                                yAxis: {
                                                    title: {
                                                        text: '空气质量指数(AQI)'
                                                    },
                                                    plotLines: [{
                                                        value: 0,
                                                        width: 1,
                                                        color: '#808080'
                                                    }]
                                                },
                                                plotOptions: {
                                                    series: {
                                                        events: {
                                                            'click': function (event) {
                                                                var dataValue = [];
                                                                for (var i = 0; i < this.data.length; i++) {
                                                                    if (this.data[i].y != null)
                                                                        dataValue.push(this.data[i].y);
                                                                    else
                                                                        dataValue.push(0);
                                                                }
                                                                PageMethods.Statistics(dataValue, function (e) {
                                                                    result = e;
                                                                    var string = name + "统计结果：\n最小值： " + result[0] + "\n最大值： " + result[1] + "\n平均值： " + result[2] + "\n方差： " + result[3] + "\n标准差： " + result[4];
                                                                    alert(string);
                                                                });
                                                            }
                                                        }
                                                    }
                                                },
                                                series: json
                                            });
                                        });
                                        $('#AQI_Highcharts').toggle(1000);
                                    });
                                }
                                else {
                                    $('#AQI_Highcharts').toggle(1000);
                                }
                            });
                        });
                    });
                    Map.addLayer(graphicsLayer);
                    esriConfig.defaults.LocationGraphicsLayer = graphicsLayer;
                });
            },

            //添加广州边界
            addBound: function () {
                esriConfig.defaults.map = this.map;
                dojo.xhrGet({
                    url: "WebService.json",
                    handleAs: "json",
                    load: function (response, ioArgs) {
                        var layer = new ArcGISDynamicMapServiceLayer(response['GuangZhouBound']);
                        esriConfig.defaults.map.addLayer(layer);
                    },
                    error: function (response, ioArgs) {
                        console.log(response);
                    }
                });
            }
        });
    }
    );