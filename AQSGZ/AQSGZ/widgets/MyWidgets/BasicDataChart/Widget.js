define([
    'dojo/_base/lang',
    'dojo/_base/declare',
    'dojo/parser',
    'jimu/BaseWidget',
    "dojo/on",
    "dojo/dom",
    "dojo/dom-style",
    "dojo/dom-attr",
    "dojo/dom-class",
    "dojo/dom-prop",
      "esri/config"
],
    function (lang, declare, parser, BaseWidget, On, Dom, domStyle, domAttr, domClass, domProp,esriConfig) {

        return declare([BaseWidget], {

            baseClass: "jimu-widget-BasicDataChart",

            name: 'StaticsChart',

            dataType: "AQI",
            //初始化执行顺序为postCreate->startup->onOpen->onSignOut->.....

            postCreate: function () {
                this.inherited(arguments);
            },

            startup: function () {
                this.inherited(arguments);
                On(this.DT_AQI, 'click', lang.hitch(this, this.DataTypeSelect, this.DT_AQI));
                On(this.DT_CO, 'click', lang.hitch(this, this.DataTypeSelect, this.DT_CO));
                On(this.DT_NO2, 'click', lang.hitch(this, this.DataTypeSelect, this.DT_NO2));
                On(this.DT_O3, 'click', lang.hitch(this, this.DataTypeSelect, this.DT_O3));
                On(this.DT_PM10, 'click', lang.hitch(this, this.DataTypeSelect, this.DT_PM10));
                On(this.DT_PM25, 'click', lang.hitch(this, this.DataTypeSelect, this.DT_PM25));
                On(this.DT_SO2, 'click', lang.hitch(this, this.DataTypeSelect, this.DT_SO2));
                esriConfig.defaults.BasicPanel = this;
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
                this.InitDatePicker();
                this.ReGetData();
            },

            resize: function () {
                this.GetBasicData();
            },

            InitDatePicker: function () {
                PageMethods.GetNewestTableName(
                    function (e){
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
                        value -= 1000 * 3600 * 24;
                        value = new Date(value);
                        var FD = Dom.byId("DateOfTable"); //DateOfTable
                        FD.max = max;
                        FD.min = "2015-04-08";
                        FD.value = esriConfig.defaults.BasicPanel.GetDateString(value);
                        esriConfig.defaults.BasicPanel.ReGetData();
                    });
            },//初始化时间选择器

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

            GetBasicData: function () {
                var title = '';
                var yAxisTitle = '';
                switch (this.dataType) {
                    case "AQI": {
                        title = '广州各监测站点空气质量指数(AQI)趋势';
                        yAxisTitle = '空气质量指数(AQI)';
                        break;
                    }
                    case "PM25": {
                        title = '广州各监测站点PM2.5指数趋势';
                        yAxisTitle = 'PM2.5 （μg/m3）';
                        break;
                    }
                    case "PM10": {
                        title = '广州各监测站点PM10指数趋势';
                        yAxisTitle = 'PM10 （μg/m3）';
                        break;
                    }
                    case "NO2": {
                        title = '广州各监测站点NO2指数趋势';
                        yAxisTitle = 'NO2 （μg/m3）';
                        break;
                    }
                    case "O3_1": {
                        title = '广州各监测站点03指数趋势';
                        yAxisTitle = 'O3 （μg/m3）';
                        break;
                    }
                    case "SO2": {
                        title = '广州各监测站点SO2指数趋势';
                        yAxisTitle = 'SO2 （μg/m3）';
                        break;
                    }
                    case "CO": {
                        title = '广州各监测站点CO指数趋势';
                        yAxisTitle = 'CO mg/m3';
                        break;
                    }
                }

                PageMethods.GetBasicData(this.dataType, Dom.byId("DateOfTable").value, function (e) {
                    $(function () {

                        //根据起始时间计算Categories

                        var Timeset = e[0];

                        var json = eval(e[1]);//将返回数据的第二项转换为json

                        $('#DataChart').highcharts({
                            chart: {
                                type: 'spline'
                            },
                            title: {
                                text: title,
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
                                    text: yAxisTitle
                                },
                                plotLines: [{
                                    value: 0,
                                    width: 1,
                                    color: '#808080'
                                }]
                            },
                            legend: {
                                layout: 'vertical',
                                align: 'right',
                                verticalAlign: 'middle',
                                borderWidth: 0
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
                                            esriConfig.defaults.BasicPanel.ShowStatistics(dataValue, this.name);
                                        }
                                    }
                                }
                            },
                            series: json
                        });
                    });
                });
            },

            InitTable: function () {
                var DT = new Date(Dom.byId("DateOfTable").value);
                var minT = new Date(Dom.byId("DateOfTable").min);
                var maxT = new Date(Dom.byId("DateOfTable").max);
                switch (this.dataType) {
                    case "AQI": {
                        Dom.byId("V0").innerHTML = '广州各监测站点空气质量指数(AQI)统计表     ' + Dom.byId("DateOfTable").value;
                        break;
                    }
                    case "PM25": {
                        Dom.byId("V0").innerHTML = '广州各监测站点PM2.5指数统计表   （μg/m3）  ' + Dom.byId("DateOfTable").value;
                        break;
                    }
                    case "PM10": {
                        Dom.byId("V0").innerHTML = '广州各监测站点PM10指数统计表   （μg/m3）  ' + Dom.byId("DateOfTable").value;
                        break;
                    }
                    case "NO2": {
                        Dom.byId("V0").innerHTML = '广州各监测站点NO2指数统计表  （μg/m3）   ' + Dom.byId("DateOfTable").value;
                        break;
                    }
                    case "O3_1": {
                        Dom.byId("V0").innerHTML = '广州各监测站点03指数统计表   （μg/m3）  ' + Dom.byId("DateOfTable").value;
                        break;
                    }
                    case "SO2": {
                        Dom.byId("V0").innerHTML = '广州各监测站点SO2指数统计表   （μg/m3）  ' + Dom.byId("DateOfTable").value;
                        break;
                    }
                    case "CO": {
                        Dom.byId("V0").innerHTML = '广州各监测站点CO指数统计表   （mg/m3）  ' + Dom.byId("DateOfTable").value;
                        break;
                    }
                }
                if (this.GetDateString(DT) == this.GetDateString(maxT)) {
                    for (i = 1; i <= 12; i++) {
                        Dom.byId("V" + i).innerHTML = '_';
                    }
                }
                else if (DT >= minT && DT < maxT) {
                    PageMethods.GetStaticResult(this.dataType, Dom.byId("DateOfTable").value, Dom.byId("DateOfTable").value, function (e) {
                        var obj_json = eval(e[0]);
                        for (i = 1; i <= 12; i++) {
                            Dom.byId("V" + i).innerHTML = obj_json[i - 1].data;
                        }
                    });
                }
            },

            DataTypeSelect: function (e) {
                $(".jimu-widget-BasicDataChart .heading a").removeClass("selected")
                $(e).addClass("selected");
                this.dataType = e.title;
                this.ReGetData();
            },

            ShowChart: function () {
                $(".jimu-widget-BasicDataChart .body .Datatable").css({ "-webkit-transform": "translateX(-500px)", "opacity": "0" });
                setTimeout(function () {
                    $(".jimu-widget-BasicDataChart .body .Highchart").css({ "opacity": "1", "-webkit-transform": "translateX(0)" });
                    $(".jimu-widget-BasicDataChart").css({ "height": "480px" });
                }, 500);
                $(".jimu-widget-BasicDataChart .heading .AnDate").css({ "-webkit-animation-name": "animationInput", "-webkit-animation-duration": "3s", "-webkit-animation-delay": "0.1s" });
                $(".jimu-widget-BasicDataChart .heading .AnSO2").css({ "-webkit-animation-name": "animationAll", "-webkit-animation-duration": "3s", "-webkit-animation-delay": "0.2s" });
                $(".jimu-widget-BasicDataChart .heading .AnPM25").css({ "-webkit-animation-name": "animationAll", "-webkit-animation-duration": "3s", "-webkit-animation-delay": "0.3s" });
                $(".jimu-widget-BasicDataChart .heading .AnPM10").css({ "-webkit-animation-name": "animationAll", "-webkit-animation-duration": "3s", "-webkit-animation-delay": "0.4s" });
                $(".jimu-widget-BasicDataChart .heading .AnO3").css({ "-webkit-animation-name": "animationAll", "-webkit-animation-duration": "3s", "-webkit-animation-delay": "0.5s" });
                $(".jimu-widget-BasicDataChart .heading .AnNO2").css({ "-webkit-animation-name": "animationAll", "-webkit-animation-duration": "3s", "-webkit-animation-delay": "0.6s" });
                $(".jimu-widget-BasicDataChart .heading .AnCO").css({ "-webkit-animation-name": "animationAll", "-webkit-animation-duration": "3s", "-webkit-animation-delay": "0.7s" });
                $(".jimu-widget-BasicDataChart .heading .AnAQI").css({ "-webkit-animation-name": "animationAll", "-webkit-animation-duration": "3s", "-webkit-animation-delay": "0.8s" });
            },

            ShowTable: function () {
                $(".jimu-widget-BasicDataChart .body .Highchart").css({ "-webkit-transform": "translateX(100%)", "opacity": "0" });
                setTimeout(function () {
                    $(".jimu-widget-BasicDataChart .body .Datatable").css({ "opacity": "1", "-webkit-transform": "translateX(0)" });
                    $(".jimu-widget-BasicDataChart").css({ "height": "305px" });
                }, 500);
                $(".jimu-widget-BasicDataChart .heading .AnDate").css({ "-webkit-animation-name": "animationInput2", "-webkit-animation-duration": "3s", "-webkit-animation-delay": "0.9s" });
                $(".jimu-widget-BasicDataChart .heading .AnSO2").css({ "-webkit-animation-name": "animationAll2", "-webkit-animation-duration": "3s", "-webkit-animation-delay": "0.8s" });
                $(".jimu-widget-BasicDataChart .heading .AnPM25").css({ "-webkit-animation-name": "animationAll2", "-webkit-animation-duration": "3s", "-webkit-animation-delay": "0.7s" });
                $(".jimu-widget-BasicDataChart .heading .AnPM10").css({ "-webkit-animation-name": "animationAll2", "-webkit-animation-duration": "3s", "-webkit-animation-delay": "0.6s" });
                $(".jimu-widget-BasicDataChart .heading .AnO3").css({ "-webkit-animation-name": "animationAll2", "-webkit-animation-duration": "3s", "-webkit-animation-delay": "0.5s" });
                $(".jimu-widget-BasicDataChart .heading .AnNO2").css({ "-webkit-animation-name": "animationAll2", "-webkit-animation-duration": "3s", "-webkit-animation-delay": "0.4s" });
                $(".jimu-widget-BasicDataChart .heading .AnCO").css({ "-webkit-animation-name": "animationAll2", "-webkit-animation-duration": "3s", "-webkit-animation-delay": "0.3s" });
                $(".jimu-widget-BasicDataChart .heading .AnAQI").css({ "-webkit-animation-name": "animationAll2", "-webkit-animation-duration": "3s", "-webkit-animation-delay": "0.2s" });
            },

            ReGetData: function () {
                this.InitTable();
                this.GetBasicData();
            },

            ShowStatistics: function (data, name) {
                PageMethods.Statistics(data, function (e) {
                    result = e;
                    var string = name + "统计结果：\n最小值： " + result[0] + "\n最大值： " + result[1] + "\n平均值： " + result[2] + "\n方差： " + result[3] + "\n标准差： " + result[4];

                    alert(string);
                });
            },
        });
    }
    );