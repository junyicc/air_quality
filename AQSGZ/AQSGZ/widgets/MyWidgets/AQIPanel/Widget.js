/**
 * Created by dailiwei on 14/12/20.
 */

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
        "dijit/Toolbar",
        "dijit/form/Button",
        "dojo/dom",
        "esri/config",
        "esri/tasks/Geoprocessor",
        "esri/layers/ImageParameters"
],
    function (declare, _WidgetsInTemplateMixin, BaseWidget, domConstruct, domStyle,
              domAttr, domClass, lang, on, Toolbar, Button, dom, esriConfig, Geoprocessor, ImageParameters) {
        var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {
            name: 'FacePanel',
            baseClass: 'jimu-widget-facepanel',
            normalWidth: 0,
            panelHeight: 600,//面板的高度
            bottomPosition: 0,
            openWidth: 335,
            AQIvalue: [21, 43, 55],//AQI三个值，依次为平均值，最小值，最大值，默认为0
            otherValue: [1.5, 55, 70, 37, 66, 6.5],//其他值，依次为CO、NO2、O3、PM2_5、PM10、SO2，默认为0
            timestr: "2015年9月3日00:00",//最新数据时间
            newestTableName:"",
            firstPlu: "--",//首要污染物
            PM_TENtops: [7, 35, 97, 160, 222, 284, 324, 361, 382, 406],
            PM_TENgrades: [0, 15, 30, 45, 60, 75, 90, 150, 200, 250],
            COtops: [7, 36, 74, 114, 152, 193, 251, 291, 328, 349, 368, 386, 406],
            COgrades: [0, 0.2, 0.4, 0.6, 0.8, 1, 2, 4, 6, 7, 8, 9, 10],
            NO_TWOtops: [7, 55, 95, 139, 178, 222, 263, 303, 345, 386, 406],
            NO_TWOgrades: [0, 15, 25, 35, 45, 60, 80, 100, 120, 140, 150],
            O_THRtops: [7, 34, 82, 116, 146, 177, 211, 261, 308, 342, 375, 406],
            O_THRgrades: [0, 10, 30, 40, 60, 80, 100, 130, 160, 180, 200, 300],
            SO_TWOtops: [7, 37, 64, 91, 116, 146, 174, 201, 228, 256, 283, 311, 351, 379, 406],
            SO_TWOgrades: [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 45, 60, 100],
            PM_HFtops: [7, 63, 132, 199, 267, 337, 361, 382, 406],
            PM_HFgrades: [0, 15, 30, 45, 60, 75, 115, 150, 250],
            tops: 6,
            grades: 0,
            value: 0,
            HelpWindow:undefined,

            InitPanel: function () {
                PageMethods.GetNewestWholeData(
                    this.initPanel
                    );
            },

            initPanel: function (e) {

                //创建面板的内容
                esriConfig.defaults.PanelWidget.AQIvalue = e[0];
                esriConfig.defaults.PanelWidget.otherValue = e[1];
                esriConfig.defaults.PanelWidget.timestr = e[2];
                esriConfig.defaults.PanelWidget.firstPlu = e[3];
                esriConfig.defaults.PanelWidget.newestTableName = e[4];

                esriConfig.defaults.PanelWidget.createToolDiv();
                esriConfig.defaults.PanelWidget.createContentDiv();
                esriConfig.defaults.PanelWidget.createBar();
                esriConfig.defaults.PanelWidget.closePanel();
                esriConfig.defaults.map.on("resize", lang.hitch(this, this.mapResize));
            },

            startup: function () {
                this.inherited(arguments);

                this.isFirst = true;
                this.currentWidth = 0;
                //初始化面板的位置和大小
                this.setInitialPosition();
                ////创建面板的内容
                esriConfig.defaults.PanelWidget = this;
                esriConfig.defaults.map = this.map;
                this.InitPanel();
            },

            mapResize: function (evt) {

                domStyle.set(this.domNode, "left", (evt.width - this.panelWidth) / 2 + "px");
                domStyle.set(this.domNode, "right", (evt.width - this.panelWidth) / 2 + "px");
            },

            createBar: function () {
                this.bar = domConstruct.create("div");
                domClass.add(this.bar, "jimu-widget-facepanel-bar");
                domConstruct.place(this.bar, this.domNode);
                domStyle.set(this.bar, "left", "335px");
                this.own(on(this.bar, 'click', lang.hitch(this, this.changeState)));

                var help = domConstruct.create("p");
                domClass.add(help, "jimu-widget-facepanel-help");
                domStyle.set(help, {
                    "cursor": "pointer",
                    "color": "white",
                    "position": "absolute",
                    "top": "96%",
                    "right": "10px"
                });
                domAttr.set(help, {
                    "innerHTML": "获取帮助->",
                    "id": "jimu-widget-facepanel-help"
                });
                domConstruct.place(help, this.domNode);

                this.own(on(help, 'click', lang.hitch(this, this.ShowHelpDialog)));

            },

            ShowHelpDialog: function () {
                if (typeof (this.HelpWindow) == "undefined") {
                    this.HelpWindow = new domConstruct.create("div");
                    domClass.add(this.HelpWindow, "jimu-widget-facepanel-helpwindow");
                    domStyle.set(this.HelpWindow, {
                        "display": "block",
                        "position": "absolute",
                        "width": "550px",
                        "height": "420px",
                        "left": "335px",
                        "bottom": "1%",
                        "border-radius": "5px",
                        "overflow": "hidden",
                        "background-color":"black"
                    });
                    var help_toolBarDiv = domConstruct.create("div", {}, this.HelpWindow);
                    domClass.add(help_toolBarDiv, "Toolbar");
                    domStyle.set(help_toolBarDiv, { "width": "100%", "height": "30px", "background-color": "#414141" });

                    var help_toolBarP = domConstruct.create("p", { innerHTML: "相关帮助" }, help_toolBarDiv);
                    domStyle.set(help_toolBarP, { "margin-left": "6px", "color": "white", "float": "left", "margin-top": "6px" });
                    domStyle.set(help_toolBarP, { "margin-top": "6px" });
                    help_toolBarP = domConstruct.create("p");
                    domStyle.set(help_toolBarP, {"margin-left": "95%","float": "left","margin-top": "-15px"});
                    this.own(on(help_toolBarP,'click', lang.hitch(this, this.toggleHelp)));
                    domConstruct.place(help_toolBarP, help_toolBarDiv);
                    var toolBarImg = domConstruct.create("img", {}, help_toolBarP);
                    domAttr.set(toolBarImg, "src", "widgets/MyWidgets/AQIPanel/css/images/close.png");

                    var contentsDiv = domConstruct.create("div");
                    domClass.add(contentsDiv, "Contents")
                    domStyle.set(contentsDiv, { "width": "100%", "height": "390px","overflow-y":"scroll" });
                    domConstruct.place(contentsDiv, this.HelpWindow);
                    domConstruct.place(this.HelpWindow, this.domNode);

                    $(".jimu-widget-facepanel-helpwindow .Contents").load("widgets/MyWidgets/AQIPanel/Help.html");
                }
                else {
                    $(".jimu-widget-facepanel-helpwindow").toggle(500);
                };
            },

            toggleHelp: function () {
                $(".jimu-widget-facepanel-helpwindow").toggle(500);
            },

            close: function () {
                domStyle.set(HelpWindow, {
                    "display": "none"
                });
            },

            changeState: function () {
                if (domAttr.get(this.bar, "class") === "jimu-widget-facepanel-bar close") {
                    this.openPanel();
                } else {
                    this.closePanel();
                }
            },

            openPanel: function () {
                if (this.isFirst) { // first open
                    this.isFirst = false;
                }
                domClass.remove(this.bar, 'close');
                domClass.add(this.bar, 'open');
                domAttr.set(this.bar, 'title', this.nls.closeTableTip);
                domStyle.set("map", { "overflow": "visible", "left": "335px", "width": domStyle.get(dom.byId("map"), "width") - 335 + "px", "-webkit-transition": "0.2s ease-out" });
            },

            closePanel: function () {
                domClass.remove(this.bar, 'open');
                domClass.add(this.bar, 'close');
                domAttr.set(this.bar, 'title', this.nls.openTableTip);
                domStyle.set("map", { "left": "0px", "width": document.body.clientWidth + "px" });
            },

            destroy: function () {
            },

            onOpen: function () {
            },

            onClose: function () {
            },

            changeWidth: function (w) {
                domStyle.set(this.domNode, "width", w + "px");

                this.currentWidth = w;
                if (w !== 0) {
                    this.openWidth = w;
                }
            },

            setInitialPosition: function () {
                var b;
                if (this.position.bottom) {
                    b = this.position.bottom;
                } else {
                    b = 0;
                }
                this.bottomPosition = b;
                //这里是控制面板的
                domStyle.set(this.domNode, "width", "335px");
                domStyle.set(this.domNode, "top", "0px");
                domStyle.set(this.domNode, "left", "-335px");
                domStyle.set(this.domNode, "position", "absolute");
                domStyle.set(this.domNode, "-webkit-transition", "0.2s linear");
                domStyle.set(this.domNode, "height", "100%");
            },

            createToolDiv: function () {
                this.facepanelDiv = domConstruct.create("div", {}, this.domNode);
                domClass.add(this.facepanelDiv, "jimu-widget-facepanel-main");

                var toolbarDiv = domConstruct.create("div");
                var toolbar = new Toolbar({}, domConstruct.create("div"));

                var fullScreenButton = new Button({
                    label: "全屏",
                    iconClass: "esrifacepanelZoomImage",
                    onClick: lang.hitch(this, this.onFullScreenButton)
                });
                toolbar.addChild(fullScreenButton);
                var closeFace3Button = new Button({
                    label: "关闭",
                    iconClass: "esrifacepanelCloseImage",
                    onClick: lang.hitch(this, this.oncCloseFace3Button)
                });
                toolbar.addChild(closeFace3Button);
                domConstruct.place(toolbar.domNode, toolbarDiv);
                domConstruct.place(toolbarDiv, this.facepanelDiv);
            },

            createContentDiv: function () {
                this.facepanelDiv = domConstruct.create("div", {}, this.domNode);
                domClass.add(this.facepanelDiv, "jimu-widget-facepanel-content");
                domStyle.set(this.facepanelDiv, {
                    "position": "absolute",
                    "top": "27px",
                    "width": "100%",
                    "height": "100%",
                });

                //$(".jimu-widget-facepanel-content").load("widgets/MyWidgets/AQIPanel/02.html");
                //+++++++++++++++++++++++++++  绘制界面  +++++++++++++++++++++++++++++++++++


                //此处修改AQIvalue与otherValue


                //初始化
                var containerDiv = domConstruct.create("div", {}, this.facepanelDiv);
                domClass.add(containerDiv, "container");

                var pictureDiv = domConstruct.create("div", {}, containerDiv);
                domAttr.set(pictureDiv, "id", "Picture");

                var A = ['AQI', 'CO', 'NO2', 'O3', 'PM2_5', 'PM10', 'SO2'];
                var pictureA;
                for (var i = 0; i < 7; i++) {
                    pictureA = domConstruct.create("a");
                    domClass.add(pictureA, "Circle");
                    domAttr.set(pictureA, "id", A[i]);
                    domConstruct.place(pictureA, pictureDiv);
                    if (i === 0) {
                        this.own(on(pictureA, 'click', lang.hitch(this, this.ToCircle)));
                    }
                    else {
                        this.own(on(pictureA, 'click', lang.hitch(this, this.ToLine, pictureA)));
                    }
                }
                var lineDiv = domConstruct.create("div");//Line
                domClass.add(lineDiv, "Line");
                domAttr.set(lineDiv, "id", "Line");
                var lineSpan;
                for (var i = 1; i < 7; i++) {
                    lineSpan = domConstruct.create("span");
                    domClass.add(lineSpan, A[i]);
                    domConstruct.place(lineSpan, lineDiv);
                    this.own(on(lineSpan, 'click', lang.hitch(this, this.AddLayer, lineSpan)));
                }
                domConstruct.place(lineDiv, pictureDiv);

                var detailDiv = domConstruct.create("div");//Detail
                domClass.add(detailDiv, "Detail");
                domAttr.set(detailDiv, "id", "Detail");
                var detailSpan = detailSpan = domConstruct.create("span", { innerHTML: "市最大值" + this.AQIvalue[2] });
                domClass.add(detailSpan, "AQI");
                domAttr.set(detailSpan, "id", "DetailAQI")
                domConstruct.place(detailSpan, detailDiv);
                for (var i = 6; i > 0; i--) {
                    if (i == 1) {
                        detailSpan = domConstruct.create("span", { innerHTML: this.otherValue[i - 1] + "毫克/立方米" });
                    }
                    else {
                        detailSpan = domConstruct.create("span", { innerHTML: this.otherValue[i - 1] + "微克/立方米" });
                    }
                    domClass.add(detailSpan, A[i]);
                    domAttr.set(detailSpan, "id", "Detail" + A[i])
                    domConstruct.place(detailSpan, detailDiv);
                }
                detailSpan[7] = domConstruct.create("span");
                domClass.add(detailSpan[7], "ColorGrades");
                domAttr.set(detailSpan[7], "id", "ColorGrades")
                domConstruct.place(detailSpan[7], detailDiv);
                detailSpan[8] = domConstruct.create("span");
                domClass.add(detailSpan[8], "ColorValuePointer");
                domAttr.set(detailSpan[8], "id", "ColorValuePointer")
                domConstruct.place(detailSpan[8], detailDiv);

                var valuepointerP = domConstruct.create("p", { innerHTML: "0" }, detailSpan[8]);
                domAttr.set(valuepointerP, "id", "valuepointerP");
                domStyle.set(valuepointerP, { "margin-top": "4px", "margin-left": "3px", "color": "black" });
                domConstruct.place(detailDiv, pictureDiv);

                var messageDiv = domConstruct.create("div");//MessageDIV
                domAttr.set(messageDiv, "id", "Message");
                var partoneDiv = domConstruct.create("div", {}, messageDiv);
                domClass.add(partoneDiv, "PartOne");
                var partoneSpan = domConstruct.create("span", { innerHTML: "AQI" });
                domConstruct.place(partoneSpan, partoneDiv);
                partoneSpan = domConstruct.create("span", { innerHTML: "市最大值" });
                domConstruct.place(partoneSpan, partoneDiv);
                partoneSpan = domConstruct.create("span", { innerHTML: this.AQIvalue[2] });
                domAttr.set(partoneSpan, "id", "GuangZhouAQIValue_Ave");
                domConstruct.place(partoneSpan, partoneDiv);

                var parttwoDiv = domConstruct.create("div");
                domClass.add(parttwoDiv, "PartTwo");
                var parttwoSpan = domConstruct.create("span", { innerHTML: this.AQIvalue[1] });
                domAttr.set(parttwoSpan, "id", "GuangZhouAQIValue_Min");
                domStyle.set(parttwoSpan, { "left": "0px", "top": "50px" });
                domConstruct.place(parttwoSpan, parttwoDiv);

                parttwoSpan = domConstruct.create("span");
                domAttr.set(parttwoSpan, "id", "GuangZhouAQIValue_Color");
                domStyle.set(parttwoSpan, { "width": "230px", "border": "1px solid", "left": "29px", "top": "58px"});
                domConstruct.place(parttwoSpan, parttwoDiv);

                parttwoSpan = domConstruct.create("span", { innerHTML: this.AQIvalue[2] });
                domAttr.set(parttwoSpan, "id", "GuangZhouAQIValue_Max");
                domStyle.set(parttwoSpan, { "display": "block", "right": "0px", "top": "50px" });
                domConstruct.place(parttwoSpan, parttwoDiv);

                parttwoSpan = domConstruct.create("span", { innerHTML: this.timestr });
                domAttr.set(parttwoSpan, "id", "GuangZhouAQIValue_Time");
                domStyle.set(parttwoSpan, { "display": "block", "left": "87px", "top": "65px" });
                domConstruct.place(parttwoSpan, parttwoDiv);

                parttwoSpan = domConstruct.create("span", { innerHTML: "空气质量：" });
                domStyle.set(parttwoSpan, { "display": "block", "left": "0px", "top": "99px" });
                domConstruct.place(parttwoSpan, parttwoDiv);

                //空气质量以及建议
                var AirQuality, tips;
                if (this.AQIvalue[2] <= 50) { AirQuality = "优秀"; tips = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;空气质量令人满意，基本无空气污染，各类人群可正常活动。"; }
                else if (this.AQIvalue[2] <= 100) { AirQuality = "良"; tips = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;空气质量可接受，但某些污染物可能对极少数异常敏感人群健康有较弱影响，极少数异常敏感人群应减少户外活动。"; }
                else if (this.AQIvalue[2] <= 150) { AirQuality = "轻度污染"; tips = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;易感人群症状有轻度加剧，健康人群出现刺激症状，有心脏或肺部疾病的人、老人和小孩应该减少长期或沉重的负荷。"; }
                else if (this.AQIvalue[2] <= 200) { AirQuality = "中度污染"; tips = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;进一步加剧易感人群症状，可能对健康人群心脏/呼吸系统有影响，有心脏或肺部疾病的人、老人和小孩应该避免长期或沉重的负荷。其他人也应该减少长期或沉重的负荷。"; }
                else if (this.AQIvalue[2] <= 250) { AirQuality = "重度污染"; tips = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;心脏病和肺病患者症状显著加剧，运动耐受力降低，健康人群普片出现症状，有心脏或肺部疾病的人、老人和小孩应该避免所有户外活动。其他人也应该避免长期或沉重的负荷。"; }
                else { AirQuality = "严重污染"; tips = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;健康人群运动耐受力降低，有明显强烈症状，提前出现某些疾病，所有人都应该避免户外活动。有心脏或肺病的人、老人和小孩应该保持在室内，减少活动。"; }
                parttwoSpan = domConstruct.create("span", { innerHTML: AirQuality });
                domAttr.set(parttwoSpan, "id", "GuangZhouAQI_Quality");
                domStyle.set(parttwoSpan, { "display": "block", "left": "77px", "top": "99px" });
                domConstruct.place(parttwoSpan, parttwoDiv);

                parttwoSpan = domConstruct.create("span", { innerHTML: "首要污染物：" });
                domStyle.set(parttwoSpan, { "display": "block", "left": "0px", "top": "130px" });
                domConstruct.place(parttwoSpan, parttwoDiv);

                parttwoSpan = domConstruct.create("span", { innerHTML: this.firstPlu });
                domAttr.set(parttwoSpan, "id", "GuangZhouAQI_FirstPol");
                domStyle.set(parttwoSpan, { "display": "block", "left": "95px", "top": "130px" });
                domConstruct.place(parttwoSpan, parttwoDiv);

                parttwoSpan = domConstruct.create("span", { innerHTML: tips });
                domAttr.set(parttwoSpan, "id", "GuangZhouAQI_Tip");
                domStyle.set(parttwoSpan, { "top": "162px" });
                domConstruct.place(parttwoSpan, parttwoDiv);
                domConstruct.place(parttwoDiv, messageDiv);
                domConstruct.place(messageDiv, containerDiv);


                domConstruct.place(containerDiv, this.facepanelDiv);
                //+++++++++++++++++++++++++++  绘制界面  +++++++++++++++++++++++++++++++++++
            },

            oncCloseFace3Button: function () {
                this.changeState();
            },

            onFullScreenButton: function () {
                var docElm = document.documentElement;
                //W3C
                if (docElm.requestFullscreen) {
                    docElm.requestFullscreen();
                }  //FireFox
                else if (docElm.mozRequestFullScreen) {
                    docElm.mozRequestFullScreen();
                }   //Chrome等
                else if (docElm.webkitRequestFullScreen) {
                    docElm.webkitRequestFullScreen();
                }
            },

            ToLine: function (e) {
                $("#Message").css({ "top": "600px", "opacity": "0" });
                $("#CO").css("visibility", "hidden");
                $(".Line span").css({ "opacity": "1", "-webkit-transition-duration": "0.5s" });
                $(".Line span.CO").css({ "-webkit-transform": "translate(0px,400px)", "visibility": "visible" });
                document.getElementById('NO2').style.webkitTransform = "rotate(-60deg)";
                document.getElementById('NO2').style.visibility = "hidden";
                $(".Line span.NO2").css({ "-webkit-transform": "translate(0px,320px)", "visibility": "visible" });
                document.getElementById('O3').style.webkitTransform = "rotate(-120deg)";
                document.getElementById('O3').style.visibility = "hidden";
                $(".Line span.O3").css({ "-webkit-transform": "translate(0px,240px)", "visibility": "visible" });
                document.getElementById('PM2_5').style.webkitTransform = "rotate(-180deg)";
                document.getElementById('PM2_5').style.visibility = "hidden";
                $(".Line span.PM2_5").css({ "-webkit-transform": "translate(0px,160px)", "visibility": "visible" });
                document.getElementById('PM10').style.webkitTransform = "rotate(-240deg)";
                document.getElementById('PM10').style.visibility = "hidden";
                $(".Line span.PM10").css({ "-webkit-transform": "translate(0px,80px)", "visibility": "visible" });
                document.getElementById('SO2').style.webkitTransform = "rotate(-300deg)";
                document.getElementById('SO2').style.visibility = "hidden";
                $(".Line span.SO2").css({ "visibility": "visible" });
                var topV = this.ValuePointer($(e).attr('id'));
                setTimeout(function () {
                    document.getElementById('AQI').style.webkitTransform = 'translate(-106px,-90px) scale(0.9)';
                    document.getElementById('DetailAQI').style.webkitTransform = 'translate(-246px,0px)';
                    $("#DetailAQI").css({ "opacity": "1" })
                    $("#DetailSO2,#DetailPM10,#DetailPM2_5,#DetailO3,#DetailNO2,#DetailCO").css({ "left": "55px", "opacity": "1" });

                    $("#ColorGrades").css({ "height": "412px", "top": "21px" });
                    $(".Detail span.ColorValuePointer").css({ "top": topV[1] + "px" });
                    domAttr.set(dom.byId("valuepointerP"), "innerHTML", topV[0]);
                    //$("#valuepointerP").html = topV[0];
                    $(".Detail span.ColorValuePointer").css({ "visibility": "visible", "-webkit-transition-duration": "3s" });
                }, 600);
                $("#Line span." + $(e).attr('id')).addClass('Selected');
                $("#Detail span." + $(e).attr('id')).addClass('selected');
                $(".Detail span.ColorGrades").css("background-image", "url('widgets/MyWidgets/AQIPanel/css/images/AQI/" + $(e).attr('id') + "Grade.png')");
            },

            ToCircle: function () {
                document.getElementById('DetailAQI').style.webkitTransform = 'translate(-100px,0px)';
                $("#ColorGrades").css({ "height": "0px", "top": "428px" })
                $("#DetailCO").css({ "left": "505px", "opacity": "0" });
                $("#DetailNO2").css({ "left": "455px", "opacity": "0" });
                $("#DetailO3").css({ "left": "405px", "opacity": "0" });
                $("#DetailPM2_5").css({ "left": "355px", "opacity": "0" });
                $("#DetailPM10").css({ "left": "305px", "opacity": "0" });
                $("#DetailSO2").css({ "left": "305px", "opacity": "0" });
                $("#DetailAQI").css({ "opacity": "0" });
                $(".Detail span.ColorValuePointer").css({ "visibility": "hidden", "top": "407px", "-webkit-transition-duration": "0.2s" })
                document.getElementById('AQI').style.webkitTransform = 'translate(0px,0px)';
                setTimeout(function () {
                    $(".Line span").css({ "opacity": "0", "-webkit-transition-duration": "0.5s" });
                    $(".Line span.SO2").css({ "visibility": "hidden" });
                    document.getElementById('SO2').style.webkitTransform = 'rotate(0deg)';
                    document.getElementById('SO2').style.visibility = "visible";
                    $(".Line span.PM10").css({ "-webkit-transform": "translate(0px,0px)" });
                    document.getElementById('PM10').style.webkitTransform = 'rotate(0deg)';
                    document.getElementById('PM10').style.visibility = "visible";
                    $(".Line span.PM2_5").css({ "-webkit-transform": "translate(0px,0px)" });
                    document.getElementById('PM2_5').style.webkitTransform = 'rotate(0deg)';
                    document.getElementById('PM2_5').style.visibility = "visible";
                    $(".Line span.O3").css({ "-webkit-transform": "translate(0px,0px)" });
                    document.getElementById('O3').style.webkitTransform = 'rotate(0deg)';
                    document.getElementById('O3').style.visibility = "visible";
                    $(".Line span.NO2").css({ "-webkit-transform": "translate(0px,0px)" });
                    document.getElementById('NO2').style.webkitTransform = 'rotate(0deg)';
                    document.getElementById('NO2').style.visibility = "visible";
                    $(".Line span.CO").css({ "-webkit-transform": "translate(0px,0px)" });
                    document.getElementById('CO').style.visibility = "visible";
                    $(".Line span").css({ "visibility": "hidden" });
                    document.getElementById('Message').style.top = "300px";
                    document.getElementById('Message').style.opacity = "1";
                }, 400);
                $("#Line span").removeClass("Selected");
                $("#Detail span").removeClass('selected');
            },

            AddLayer: function (e) {
                var Type = e.className;
                $("#Line span").removeClass("Selected");
                $(e).addClass("Selected");
                var nas = $(e).attr('class');
                nas = nas.split(" ");
                $("#Detail span").removeClass('selected');
                $("#Detail span." + nas[0]).addClass('selected');
                var topVa = this.ValuePointer(nas[0]);
                $(".Detail span.ColorValuePointer").css({ "top": topVa[1] + "px" });
                domAttr.set(dom.byId("valuepointerP"), "innerHTML", topVa[0]);
                $(".Detail span.ColorGrades").css("background-image", "url('widgets/MyWidgets/AQIPanel/css/images/AQI/" + nas[0] + "Grade.png')");

                //展示等待图标
                if (loadLayer == undefined) {
                    var loadLayer = domConstruct.create("div");
                    domClass.add(loadLayer, "Loading");
                    domStyle.set(loadLayer, { "background-color": "black", "opacity": "0.9", "position": "absolute", "top": "28px", "border-radius": "5px", "width": "100%", "height": "100%", "background-image": "url('images/loading3.gif')", "background-position": "center", "background-repeat": "no-repeat" });
                    domConstruct.place(loadLayer, this.domNode);//$(document.body).outerHeight()
                }
                else { domStyle.set(loadLayer, "display", "block"); }

                dojo.xhrGet({
                    url: "WebService.json",
                    handleAs: "json",
                    load: function (response, ioArgs) {

                        var DataType = Type;
                        DataType = DataType.split(" ")[0];
                        var gpLink;
                        switch (DataType) {
                            case "SO2":
                                DataType = "SO2";
                                gpLink = response['SO2'];
                                break;
                            case "PM10":
                                DataType = "PM10";
                                gpLink = response['PM10'];
                                break;
                            case "PM2_5":
                                DataType = "PM25";
                                gpLink = response['PM25'];
                                break;
                            case "O3":
                                DataType = "O3_1";
                                gpLink = response['O3'];
                                break;
                            case "NO2":
                                DataType = "NO2";
                                gpLink = response['NO2'];
                                break;
                            case "CO":
                                DataType = "CO";
                                gpLink = response['CO'];
                                break;
                            default: DataType = "CO";
                                gpLink = response['CO'];
                                break;
                        }
                        var gp = new Geoprocessor(gpLink);
                        gp.outSpatialReference = esriConfig.defaults.map.spatialReference;
                        gp.processSpatialReference = esriConfig.defaults.map.spatialReference;

                        var params = {
                            "DataType": DataType,
                            "DatabaseName": "Air_Quality",
                            "DatatableName": esriConfig.defaults.PanelWidget.newestTableName
                        };
                        gp.submitJob(
                            params,
                            function (jobInfo) {
                                var imageParams = new ImageParameters();
                                imageParams.imageSpatialReference = esriConfig.defaults.map.spatialReference;
                                gp.getResultImageLayer(jobInfo.jobId, "OutputResult", imageParams, function (gpLayer) {
                                    //  OutputResult
                                    //判断上一次的插值图的ID是否为空，若为空，表示尚上一次没有添加插值的图，若不为空，先移除
                                    //if (esriConfig.defaults.InterpolationLayerId != null) {
                                    //    var layer = esriConfig.defaults.map.getLayer(esriConfig.defaults.InterpolationLayerId);
                                    //    esriConfig.defaults.map.removeLayer(layer);
                                    //}
                                    //gpLayer.setOpacity(0.8);
                                    //esriConfig.defaults.map.addLayer(gpLayer);
                                    ////记录新添加插值图层的ID，在下次添加时把这次的先移除
                                    //esriConfig.defaults.InterpolationLayerId = esriConfig.defaults.map.layerIds[esriConfig.defaults.map.layerIds.length - 1];

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
                                    setTimeout($("#" + id).css({ "opacity": "0.8" }), 1000);

                                    //设置上一次添加的图层div渐变消失
                                    if (lastId != null) {
                                        $("#map_" + lastId).css({ "-webkit-transition": "opacity 2s linear", "opacity": "0.8" });
                                        setTimeout(
                                            function () {
                                                $("#map_" + lastId).css({ "opacity": "0" })
                                                var layer = esriConfig.defaults.map.getLayer(lastId);
                                                esriConfig.defaults.map.removeLayer(layer);
                                            },
                                            2000);
                                    }

                                    domStyle.set(loadLayer, "display", "none");

                                });
                            },
                            function (jobInfo) {
                                console.log(jobInfo);
                            });
                    },
                    error: function (response, ioArgs) { }
                }
                );

            },

            ValuePointer: function (type) {
                if (type === 'CO') { this.tops = this.COtops; this.grades = this.COgrades; this.value = this.otherValue[0]; }
                else if (type === 'NO2') { this.tops = this.NO_TWOtops; this.grades = this.NO_TWOgrades; this.value = this.otherValue[1]; }
                else if (type === 'O3') { this.tops = this.O_THRtops; this.grades = this.O_THRgrades; this.value = this.otherValue[2]; }
                else if (type === 'PM2_5') { this.tops = this.PM_HFtops; this.grades = this.PM_HFgrades; this.value = this.otherValue[3]; }
                else if (type === 'PM10') { this.tops = this.PM_TENtops; this.grades = this.PM_TENgrades; this.value = this.otherValue[4]; }
                else if (type === 'SO2') { this.tops = this.SO_TWOtops; this.grades = this.SO_TWOgrades; this.value = this.otherValue[5]; }
                var index = 0;
                for (; index < this.grades.length; index++) {
                    if (this.value <= this.grades[index]) {
                        var results = [];
                        results.push(this.value);
                        if (this.value == this.grades[index])
                        {
                            results.push(this.tops[index]);
                            return results;
                        }
                        results.push((this.value / (this.grades[index] + this.grades[index - 1])));
                        results[1] = results[1] * (this.tops[index] - this.tops[index - 1]) + this.tops[index - 1];
                        return results;
                    }
                }

            }
        });

        clazz.inPanel = false;
        clazz.hasUIFile = false;
        return clazz;
    });