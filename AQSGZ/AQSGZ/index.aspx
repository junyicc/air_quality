<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="index.aspx.cs" Inherits="AQSGZ.index" %>

<!DOCTYPE HTML>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta http-equiv="X-UA-Compatible" content="IE=EDGE" />
    <title>广州市空气质量监管与预警系统</title>
    <link rel="shortcut icon" href="widgets/MyWidgets/splash/images/map.png">
        <script type="text/javascript">
            function isChrome() {
                var is = navigator.userAgent.indexOf("Chrome") > -1;
                if (!is) { alert("您当前使用的浏览器不是谷歌浏览器，为达到最好效果，请切换至谷歌浏览器！"); }
            }
    </script>
    <script src="JS/JQ/jquery.min.js"></script>
    <script src="JS/HC/js/highcharts.js"></script>
    <script src="JS/HC/js/modules/exporting.js"></script>
    <script src="JS/HC/js/highcharts-more.js"></script>
    <!--[if IE 8]>
    <link rel="stylesheet" type="text/css"  href="jimu.js/css/jimu-ie.css" />
    <![endif]-->
    <link href="Style/Table.css" rel="stylesheet" />
    <style type="text/css">
        * {
            box-sizing: border-box;
        }

        body, html {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            overflow: hidden;
        }

        #main-loading {
            width: 100%;
            height: 100%;
            background-color: #518dca;
            text-align: center;
            overflow: hidden;
        }

            #main-loading #app-loading, #main-loading #ie-note {
                position: absolute;
                top: 0;
                bottom: 0;
                left: 0;
                right: 0;
                margin: auto;
            }

            #main-loading #app-loading {
                width: 100%;
                height: 100px;
            }

            #main-loading .app-name {
                font: 36px arial;
                font-weight: bold;
                position: absolute;
                z-index: 2;
            }

            #main-loading img {
                position: relative;
                display: block;
                margin: auto;
            }

            #main-loading .loading-info {
                font: 14px 'arial';
                margin-top: 50px;
                overflow: hidden;
                position: relative;
            }

                #main-loading .loading-info .loading {
                    width: 260px;
                    height: 4px;
                    border-radius: 2px;
                    background-color: #31659b;
                    margin: auto;
                }

                #main-loading .loading-info .loading-progress {
                    height: 4px;
                    border-radius: 2px;
                    background-color: white;
                }

            #main-loading #ie-note {
                width: 586px;
                height: 253px;
                background-image: url('images/notes.png');
                padding: 0 30px 40px 30px;
                font-size: 14px;
                color: #596679;
            }

        #ie-note .hint-title {
            height: 40px;
            line-height: 48px;
            text-align: left;
            font-weight: bold;
        }

        #ie-note .hint-img {
            background-image: url('images/hint.png');
            background-position: left;
            padding-left: 40px;
            margin-top: 20px;
            background-repeat: no-repeat;
            height: 30px;
            text-align: left;
            line-height: 30px;
            font-weight: bold;
        }

        #ie-note span {
            display: block;
            line-height: 14px;
        }

        #main-page {
            display: none;
            width: 100%;
            height: 100%;
            position: relative;
        }

        #jimu-layout-manager {
            width: 100%;
            height: 100%;
            position: absolute;
        }
    </style>

    <script>
        /*******************************
        * This is the function you can modify to customize the loading page
        * This function will be invoked when one resource is loaded.
        ********************************/
        var progress;
        function loadingCallback(url, i, count) {
            var loading = document.getElementById('main-loading-bar');
            loading.setAttribute('title', url);
            if (!progress) {
                progress = document.createElement('div');
                progress.setAttribute('class', 'loading-progress');
                loading.appendChild(progress);
            }
            progress.style.width = (((i - 1) / count) * 100) + '%';
        }
    </script>
</head>
<body class="claro" onload="isChrome()">
    <form id="Form1" runat="server">
        <asp:ScriptManager ID="ScriptManager1" runat="server" EnablePageMethods="true">
        </asp:ScriptManager>
    </form>
    <div id="main-loading">

        <!-- This is section you can modify to customize the loading page -->
        <div id="app-loading">
            <div class="app-name">
                <span style="color: white"></span>
            </div>
            <div class="loading-info">
                <div id="main-loading-bar" class="loading"></div>
            </div>
        </div>
        <!-- //////////////////    END    ////////////////////////////// -->
        <div id="ie-note" style="display: none;">
            <div class="hint-title">Error</div>
            <div class="hint-img">Your browser is currently not supported.</div>
            <p class="hint-text">
                <span>Please note that creating presentations is not supported in Internet Explorer versions 6, 7.
                </span>
                <br>
                <span>We recommend upgrading to the latest Internet Explorer, Google Chrome, or Firefox.
                </span>
                <br>
                <span>If you are using IE 8 or later, make sure you turn off "Compatibility View".
                </span>
            </p>
        </div>
    </div>
    <div id="main-page">
        <div id="jimu-layout-manager"></div>
    </div>

    <script src="env.js"></script>
    <script type="text/javascript" src="simpleLoader.js"></script>
    <script type="text/javascript" src="init.js"></script>
</body>
</html>
