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
    function (lang, declare, parser, BaseWidget, On, Dom) {

        return declare([BaseWidget], {

            baseClass: "jimu-widget-PredictionChart",

            name: 'PredictionChart',

            datatype: "PM25",
            //初始化执行顺序为postCreate->startup->onOpen->onSignOut->.....

            postCreate: function () {
                this.inherited(arguments);
            },

            startup: function () {
                this.inherited(arguments);
                On(this.DT_CO, 'click', lang.hitch(this, this.DataTypeSelect, this.DT_CO));
                On(this.DT_NO2, 'click', lang.hitch(this, this.DataTypeSelect, this.DT_NO2));
                On(this.DT_O3, 'click', lang.hitch(this, this.DataTypeSelect, this.DT_O3));
                On(this.DT_PM10, 'click', lang.hitch(this, this.DataTypeSelect, this.DT_PM10));
                On(this.DT_PM25, 'click', lang.hitch(this, this.DataTypeSelect, this.DT_PM25));
                On(this.DT_SO2, 'click', lang.hitch(this, this.DataTypeSelect, this.DT_SO2));
                Dom.byId("PDays").value = "4";
                esriConfig.defaults.PredictionPanel = this;
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
              //  this.StartPredicting();
            },

            resize: function () {
                this.StartPredicting();
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
                        max = esriConfig.defaults.PredictionPanel.GetDateString(date);
                        
                        var FromDay = new Date(date - 1000 * 3600 * 24 * 6);

                        var FD = Dom.byId("FromDay"); //DateOfTable
                        FD.min = "2015-04-08";
                        FD.max = max;
                        FD.value = esriConfig.defaults.PredictionPanel.GetDateString(FromDay);

                        var TD = Dom.byId("ToDay");
                        TD.min = "2015-04-08";
                        TD.max = max;
                        TD.value = max;

                        esriConfig.defaults.PredictionPanel.StartPredicting();

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

            StartPredicting: function () {
                var days = Dom.byId("PDays").value;
                if (days == "") {
                    alert("请输入预测天数");
                    return;
                }
                else if(days<0){
                    Dom.byId("PDays").innerHTML = 0;
                    Dom.byId("PDays").value = 0;
                }
                //根据datatype修改
                var title = '';
                var yAxisTitle = '';
                switch (this.datatype) {
                    case "PM25": {
                        title = '广州' + $("#Location option:selected").text() + 'PM2.5对应浓度的AQI多元线性回归拟合';
                        yAxisTitle = 'AQI(空气质量指数)';
                        break;
                    }
                    case "PM10": {
                        title = '广州' + $("#Location option:selected").text() + 'PM10对应浓度的AQI多元线性回归拟合';
                        yAxisTitle = 'AQI(空气质量指数)';
                        break;
                    }
                    case "NO2": {
                        title = '广州' + $("#Location option:selected").text() + 'NO2对应浓度的AQI多元线性回归拟合';
                        yAxisTitle = 'AQI(空气质量指数)';
                        break;
                    }
                    case "O3_1": {
                        title = '广州' + $("#Location option:selected").text() + '03对应浓度的AQI多元线性回归拟合';
                        yAxisTitle = 'AQI(空气质量指数)';
                        break;
                    }
                    case "SO2": {
                        title = '广州' + $("#Location option:selected").text() + 'SO2对应浓度的AQI多元线性回归拟合';
                        yAxisTitle = 'AQI(空气质量指数)';
                        break;
                    }
                    case "CO": {
                        title = '广州' + $("#Location option:selected").text() + 'CO对应浓度的AQI趋势预测';
                        yAxisTitle = 'AQI(空气质量指数)';
                        break;
                    }
                }

                //预测方法
                PageMethods.GetPredictionResult(this.datatype, Dom.byId("FromDay").value, Dom.byId("ToDay").value, Dom.byId("Location").value, Dom.byId("PDays").value,
                    function (e) {
                        var obj_json = eval(e[0]);
                        var Categories = new Array();
                        Categories = e[1];

                        $('#PredictionChart').highcharts({
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
                            series: obj_json
                        });

                    });
            },//统计生成Highcharts图表

            OptChange: function () {
                var flag = true;
                var FT = new Date(Dom.byId("FromDay").value);
                var TT = new Date(Dom.byId("ToDay").value);
                var minT = new Date(Dom.byId("FromDay").min);
                var maxT = new Date(Dom.byId("FromDay").max);
                var location = Dom.byId("Location").value;
                var days = Dom.byId("PDays").value;
                if (FT < minT || FT > maxT || FT < minT || FT > maxT || location == null || location == "" || days == null || days == "") {
                    flag = false;
                }
                if (FT >= TT) {
                    alert("请选择合适的时间段！");
                    flag = false;
                }
                if (flag) {
                    this.StartPredicting();
                }
            },

            DataTypeSelect: function (e) {
                $(".jimu-widget-PredictionChart .heading a").removeClass("selected")
                $(e).addClass("selected");
                this.datatype = $(".jimu-widget-PredictionChart .heading .selected").attr("id");
                this.StartPredicting();
            },

            ShowChrt: function () {
                $(".jimu-widget-PredictionChart .body .Highchart").css("left", "0px");
            }
        });
    }
    );