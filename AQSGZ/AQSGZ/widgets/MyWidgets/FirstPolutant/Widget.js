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

            baseClass: "jimu-widget-SpiderChart",

            name: 'SpiderChart',
            //初始化执行顺序为postCreate->startup->onOpen->onSignOut->.....

            postCreate: function () {
                this.inherited(arguments);
                esriConfig.defaults.WRW = this;
            },

            startup: function () {
                this.inherited(arguments);
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
            },

            resize: function () {
                this.StartStatistics();
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
                        var lastDate = new Date(max);
                        lastDate -= 1000 * 3600 * 24;
                        lastDate = new Date(lastDate);
                        max=esriConfig.defaults.WRW.GetDateString(lastDate);
                        var FD = Dom.byId("Date"); //DateOfTable
                        FD.min = "2015-04-08";
                        FD.max = max; 
                        FD.value = max;
                        esriConfig.defaults.WRW.StartStatistics();
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

            StartStatistics: function () {

                //统计方法
                PageMethods.GetSYWRW(
                    Dom.byId("Date").value,
                    function (e) {
                        var obj_json = eval(e[0]);

                        esriConfig.defaults.WRW.InitAbout(e[1], "", "");


                        $('#SpiderChart').highcharts({
                            chart: {
                                polar: true,
                                type: 'line'
                            },
                            title: {
                                text: "各监测站点污染物AQI贡献值",
                                x: -80 //center
                            },
                            pane: {
                                size: '100%'
                            },
                            xAxis: {
                                categories: ['PM25', 'PM10', 'CO', 'NO2', 'O3_1', 'SO2'],
                                tickmarkPlacement: 'on',
                                lineWidth: 0
                            },
                            yAxis: {
                                gridLineInterpolation: 'polygon',
                                lineWidth: 0,
                                min: 0
                            },
                            plotOptions:{
                                series: {
                                    events: {
                                        'click': function (event) {
                                            var category,stationName;
                                            for (var i = 0; i < this.data.length; i++) {
                                                if (this.data[i].y == this.dataMax) {
                                                    catogry = this.data[i].category;
                                                    stationName = this.data[i].series.name;
                                                    break;
                                                }
                                            }
                                            esriConfig.defaults.WRW.InitAbout(Math.round(this.dataMax), catogry, "污染物：", stationName);
                                        }
                                    }
                                }
                            },
                            tooltip: {
                                shared: false,
                                pointFormat: '<span style="color:{series.color}">{series.name}: <b>{point.y:,.0f}</b><br/>'
                            },
                            legend: {
                                align: 'right',
                                verticalAlign: 'top',
                                y: 70,
                                layout: 'vertical'
                            },
                            series: obj_json
                        });

                    });
            },//统计生成Highcharts图表

            OptChange: function () {
                var flag = true;
                var Time = new Date(Dom.byId("Date").value);
                if (Time == null) {
                    flag = false;
                }
                if (flag) {
                    this.StartStatistics();
                }
                var SelectDate = new Date(Dom.byId("Date").value);
                $(this.time).html(this.GetDateString(SelectDate));
            },

            DataTypeSelect: function (e) {
                this.StartStatistics();
            },

            ShowChrt: function () {
                $(".jimu-widget-SpiderChart .body .Highchart").css("left", "0px");
            },

            InitAbout: function (AQInum, Fir, label, StationName) {

                if (StationName != undefined) { $(this.stationName).html("监测站点：" + StationName); }
                if (Fir != "") { $(this.Firstpolu).html(Fir); }
                if (label != "") { $(this.label).html(label); }
                if (AQInum == "非数字") {
                    $(this.AQIvalue).html("--");
                    $(this.AQIvalue).css("color", "rgb(0,0,0)");
                    $(this.AQIpicture).attr("src", "");
                    $(this.AQIgrade).html("");
                    $(this.tips).html("");
                }
                else {
                    $(this.AQIvalue).html(AQInum);

                    if (AQInum >= 0 && AQInum < 50) {
                        $(this.AQIvalue).css("color", "rgb(119, 197, 51)");
                        $(this.AQIpicture).attr("src", "widgets/MyWidgets/FirstPolutant/images/01.png");
                        $(this.AQIgrade).html("优秀");
                        $(this.tips).html("&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;空气质量令人满意，基本无空气污染，各类人群可正常活动。");
                    }
                    else if (AQInum < 100) {
                        $(this.AQIvalue).css("color", "rgb(255, 246, 51)");
                        $(this.AQIpicture).attr("src", "widgets/MyWidgets/FirstPolutant/images/02.png");
                        $(this.AQIgrade).html("良");
                        $(this.tips).html("&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;空气质量可接受，但某些污染物可能对极少数异常敏感人群健康有较弱影响，极少数异常敏感人群应减少户外活动。");
                    }
                    else if (AQInum < 150) {
                        $(this.AQIvalue).css("color", "rgb(255, 159, 51)");
                        $(this.AQIpicture).attr("src", "widgets/MyWidgets/FirstPolutant/images/03.png");
                        $(this.AQIgrade).html("轻度污染");
                        $(this.tips).html("&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;易感人群症状有轻度加剧，健康人群出现刺激症状，有心脏或肺部疾病的人、老人和小孩应该减少长期或沉重的负荷。");
                    }
                    else if (AQInum < 200) {
                        $(this.AQIvalue).css("color", "rgb(255, 83, 51);");
                        $(this.AQIpicture).attr("src", "widgets/MyWidgets/FirstPolutant/images/04.png");
                        $(this.AQIgrade).html("中度污染");
                        $(this.tips).html("&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;进一步加剧易感人群症状，可能对健康人群心脏/呼吸系统有影响，有心脏或肺部疾病的人、老人和小孩应该避免长期或沉重的负荷。其他人也应该减少长期或沉重的负荷。");
                    }
                    else if (AQInum < 250) {
                        $(this.AQIvalue).css("color", "rgb(231, 37, 37)");
                        $(this.AQIpicture).attr("src", "widgets/MyWidgets/FirstPolutant/images/05.png");
                        $(this.AQIgrade).html("重度污染");
                        $(this.tips).html("&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;心脏病和肺病患者症状显著加剧，运动耐受力降低，健康人群普片出现症状，有心脏或肺部疾病的人、老人和小孩应该避免所有户外活动。其他人也应该避免长期或沉重的负荷。");
                    }
                    else if (AQInum < 300) {
                        $(this.AQIvalue).css("color", "rgb(176, 21, 21)");
                        $(this.AQIpicture).attr("src", "widgets/MyWidgets/FirstPolutant/images/06.png");
                        $(this.AQIgrade).html("严重污染");
                        $(this.tips).html("&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;健康人群运动耐受力降低，有明显强烈症状，提前出现某些疾病，所有人都应该避免户外活动。有心脏或肺病的人、老人和小孩应该保持在室内，减少活动。");
                    }
                    else {
                        $(this.AQIpicture).css("display", "none");
                    }


                }
            }
        });
    }
    );