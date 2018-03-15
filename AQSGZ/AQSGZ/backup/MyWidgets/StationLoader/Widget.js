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
    "esri/config"],
    function (lang, declare, parser, BaseWidget, On, GraphicsLayer, Point, SimpleMarkerSymbol, Graphic, ArcGISDynamicMapServiceLayer,Dom,esriConfig) {

        return declare([BaseWidget], {

            baseClass: "jimu-widget-StationLoader",

            name: 'StationLoader',

            graphicsLayer:undefined,

            //初始化执行顺序为postCreate->startup->onOpen->onSignOut->.....

            postCreate: function () {
                this.inherited(arguments);
            },

            startup: function () {
                this.inherited(arguments);

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

            //添加监测点
            addMapOverlay: function () {
                var Map = this.map;
                PageMethods.GetLocation(function (e) {
                    graphicsLayer = new GraphicsLayer();
                    var stationsJson = eval("(" + e + ")");
                    for (i = 0; i < stationsJson.items.length; i++) {
                        //坐标点
                        var pt = new Point(stationsJson.items[i].X, stationsJson.items[i].Y);
                        //属性信息
                        var Attr = stationsJson.items[i];
                        //符号颜色，点符号
                        var PointSymbol = new SimpleMarkerSymbol();
                        PointSymbol.style = SimpleMarkerSymbol.STYLE_CIRCLE;//圆点样式
                        PointSymbol.setSize(20);
                        PointSymbol.setColor("#FFFFFF");
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
                });
            },

            //添加广州边界
            addBound: function () {
                var layer = new ArcGISDynamicMapServiceLayer("http://localhost:6080/arcgis/rest/services/GZ_Bound/MapServer");
                this.map.addLayer(layer);
            }
        });
    }
    );