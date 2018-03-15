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
],
    function (lang, declare, parser, BaseWidget, On,Dom) {

        return declare([BaseWidget], {

            baseClass: "jimu-widget-StaticResultChart",

            name: 'StaticResultChart',

            datatype:"AQI",
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
                esriConfig.defaults.StatiticPanel = this;
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
                this.StartStatic();
            },

            resize: function () {
                this.StartStatic();
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
                        var date = new Date(max);
                        date -= 1000 * 3600 * 24;
                        date = new Date(date);
                        max = esriConfig.defaults.StatiticPanel.GetDateString(date);
                        var FromDay = new Date(date - 1000 * 3600 * 24 * 6);

                        var FD = Dom.byId("FromDate"); //DateOfTable
                        FD.min = "2015-04-08";
                        FD.max = max;
                        FD.value = esriConfig.defaults.StatiticPanel.GetDateString(FromDay);

                        var TD = Dom.byId("ToDate");
                        TD.min = "2015-04-08";
                        TD.max = max;
                        TD.value = max;

                        esriConfig.defaults.StatiticPanel.StartStatic();
                    });
            },//初始化时间选择器

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
            },//根据时间获取对应的时间字符串

            StartStatic: function () {

                var title = '';
                var yAxisTitle = '';

                switch (this.datatype) {
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

                PageMethods.GetStaticResult(this.datatype, Dom.byId("FromDate").value, Dom.byId("ToDate").value, function (e) {
                    var obj_json = eval(e[0]);
                    var Categories = new Array();
                    Categories = e[1];
                  
                    $('#StaticDataChart').highcharts({
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
                            categories: Categories
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
                                        esriConfig.defaults.StatiticPanel.ShowStatistics(dataValue, this.name);
                                    }
                                }
                            }
                        },
                        series: obj_json
                    });

                });
            },//统计生成Highcharts图表

            OptChange: function () {
                var flag = true;
                var FT = new Date(Dom.byId("FromDate").value);
                var TT = new Date(Dom.byId("ToDate").value);
                var minT = new Date(Dom.byId("FromDate").min);
                var maxT = new Date(Dom.byId("FromDate").max);
                if (FT < minT || FT > maxT || FT < minT || FT > maxT) {
                    flag = false;
                }
                if (FT > TT) {
                    alert("请选择正确的时间！");
                }
                if (flag) {
                    this.StartStatic();
                }
            },

            DataTypeSelect: function (e) {
                $(".jimu-widget-StaticResultChart .heading a").removeClass("selected")
                $(e).addClass("selected");
                this.datatype = $(".jimu-widget-StaticResultChart .heading .selected").attr("id");
                this.StartStatic();
            },

            ShowChrt: function () {
                $(".jimu-widget-StaticResultChart .body .Highchart").css("left", "0px");
            },

            ShowStatistics: function (data, name) {
                PageMethods.Statistics(data, function (e) {
                    result = e;
                    var string = name + "统计结果：\n最小值： " + result[0] + "\n最大值： " + result[1] + "\n平均值： " + result[2] + "\n方差： " + result[3] + "\n标准差： " + result[4];

                    alert(string);
                });
            }
        });
        }
    );