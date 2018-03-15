define([
        'dojo/_base/declare',
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
],
    function (declare, BaseWidget, domConstruct, domStyle,
              domAttr, domClass, lang, on, dom, Toolbar, Button, esriConfig) {

        return declare([BaseWidget], {

            baseClass: "jimu-widget-DanMu",

            name: 'DanMu',

            postCreate: function () {
                this.inherited(arguments);
            },

            startup: function () {
                this.inherited(arguments);
                
                domStyle.set(this.domNode, {
                    "left": (document.body.clientWidth-900)/2+"px",
                    "top": "85px",
                    "width": "900px",
                    "height": "0px",
                    "position": "absolute",
                    "-webkit-transition": "width 0.5s ease-out",/* Safari 和 Chrome */
                    "-o-transition": "width 0.5s ease-out",/* Opera */
                    "-moz-transition": "width 0.5s ease-out"/* Firefox 4 */
                });

                this.creatTrigger();

                esriConfig.defaults.DanMu = this;
                this.init_screen();
                $(".s_sub").click(function () {
                    var text = $(".s_txt").val();
                    var div = "<div>" + text + "</div>";
                    $(".d_show").append(div);
                    $(".s_txt").val("");
                    PageMethods.GetChatMessage(function (e) {
                        var div_show = dom.byId("d_show");

                        for (var i = 0; i < e.length; i++) {
                            var newDiv = document.createElement("div");
                            newDiv.id = "d_show_child" + i;
                            newDiv.innerText = e[i];
                            newDiv.style.display = "none";
                            div_show.appendChild(newDiv);
                        }
                    });
                    esriConfig.defaults.DanMu.init_screen();
                });
                $(".d_del").click(function () {
                    $(".dm").hide(250);
                });
   
            },

            getReandomColor: function () {
                return '#' + (function (h) {
                    return new Array(7 - h.length).join("0") + h
                })((Math.random() * 0x1000000 << 0).toString(16))
            },

            init_screen: function () {
                var _top = 0;
                $(".d_show").find("div").show().each(function () {
                    var _left =1200 - $(this).width(); //$(window).width()
                    var _height = 400//$(window).height();

                    _top = _top + 20;
                    if (_top >= _height - 100) {
                        _top = 0;
                    }

                    $(this).css({ left: _left, top: _top, color: esriConfig.defaults.DanMu.getReandomColor() });
                    var time = 20000 + Math.random() * 10000;
                    //if ($(this).index() % 2 == 0) {
                    //    time = 15000;
                    //}
                    $(this).animate({ left: "-" + _left + "px" }, time, function () {
                        $(this).remove();
                    });
                });
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
            creatTrigger: function () {
                var trigger = domConstruct.create("div");
                domClass.add(trigger, "DanMuTrigger");
                domStyle.set(trigger, {
                    "width": "40px",
                    "height": "40px",
                    "background-color": "gray",
                    "left": "-77px",
                    "top": "-40px",
                    "position": "absolute",
                    "border-radius": "5px",
                    "overflow": "hidden",
                    "background-color":"black",
                    "opacity": "0.3"
                });
                $(trigger).hover(function () {
                    $(trigger).css("opacity", "0.5");
                }, function () {
                    $(trigger).css("opacity", "0.3");
                });
                this.own(on(trigger, 'click', lang.hitch(this, this.openDanMu)));
                var TimeImg = domConstruct.create("img", {}, trigger);
                domAttr.set(TimeImg, "src", "widgets/MyWidgets/DanMu/images/chat.png");
                domStyle.set(TimeImg, {"width": "73%", "height": "67%", "cursor": "pointer","margin": "6px" });
                //TimeImg
                domConstruct.place(trigger, this.domNode);
            },
            openDanMu: function () {
                $(".dm").toggle(250);

                PageMethods.GetChatMessage(function (e) {
                    var div_show = dom.byId("d_show");

                    for (var i = 0; i < e.length; i++) {
                        var newDiv = document.createElement("div");
                        newDiv.id = "d_show_child" + i;
                        newDiv.innerText = e[i];
                        newDiv.style.display = "none";
                        div_show.appendChild(newDiv);
                    }
                    esriConfig.defaults.DanMu.init_screen();
                });
            }
        });

    }
    );