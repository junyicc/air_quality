function start_callback(id) {
    if (id == 'timeInterpolation') {
        $('.play').css("display", "none");
        addLayer(0);
    }
}
function newslide_callback(id, slide) {
    if (id == 'timeInterpolation') {
        addLayer(slide - 1);
    }
}

function end_callback(id) {
    if (id == 'timeInterpolation') {
        //add the last layer
        addLayer(esriConfig.defaults.interpolation.layers.length - 1);
    }
}

function paused_callback(id, slide) {
    if (id == 'timeInterpolation') {

    }
}

function resumed_callback(id, slide) {
    if (id == 'timeInterpolation') {
        //$('#callback_log').html('幻灯片 "' + id + '" 重新开始从幻灯片 ' + slide);
    }
}

function click_callback(id, slide) {
    if (id == 'timeInterpolation') {
        //$('#callback_log').html('Clicked on slide ' + slide + ' of Timeliner "' + id + '"');
        //$('timeInterpolation').timeliner.pauseplay();
    }
}
function addLayer(layerId) {
    if (layerId < esriConfig.defaults.interpolation.layers.length) {

        var layer = esriConfig.defaults.interpolation.layers[layerId];
        layer.setOpacity(0);
        esriConfig.defaults.map.addLayer(layer);
        $(".layersDiv div").css("-webkit-transition", "opacity 2s linear");
        layer.setOpacity(0.9);
        if (esriConfig.defaults.LayerId_TI != null) {
            //判断插值图的ID是否为空，若为空，表示尚没有添加过插值的图，若不为空，先把以添加的移除
            var layer = esriConfig.defaults.map.getLayer(esriConfig.defaults.LayerId_TI);
            layer.setOpacity(0);
            setTimeout(function () {
                esriConfig.defaults.map.removeLayer(layer);
            }, 2000);
        }
        esriConfig.defaults.LayerId_TI = esriConfig.defaults.map.layerIds[esriConfig.defaults.map.layerIds.length - 1];
    } else {
        $('timeInterpolation').timeliner.pause();
    }
}
