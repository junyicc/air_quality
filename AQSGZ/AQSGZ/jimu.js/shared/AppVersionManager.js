define(['./BaseVersionManager'],
function(BaseVersionManager) {

  //app version manager manage config and framework version
  function AppWidgetManager(){
    this.versions = [{
      version: '1.0',

      description: 'The version embedded in portal 10.3 final.',

      upgrader: function(oldConfig){
        return oldConfig;
      },
      //if true, means widgets that depend on the last version can run in this version.
      //if not set, means true.
      compatible: true
    }, {
      version: '1.1',

      description: 'The version embedded in online3.6, and used in developer edition 1.0.',

      upgrader: function(oldConfig){
        if(oldConfig.widgetOnScreen && oldConfig.widgetOnScreen.panel &&
          oldConfig.widgetOnScreen.panel.uri === 'themes/FoldableTheme/panels/TitlePanel/Panel'){
          oldConfig.widgetOnScreen.panel.uri = 'jimu/PreloadWidgetIconPanel';
        }

        return oldConfig;
      },
      compatible: true
    }, {
      version: '1.2',

      description: 'The version embedded in online3.7.',

      upgrader: function(oldConfig){
        var i = 0;
        if(oldConfig.widgetOnScreen && oldConfig.widgetOnScreen.widgets){
          //add splash widget
          var findSplashWidget = false;
          for(i = 0; i < oldConfig.widgetOnScreen.widgets.length; i++){
            if(oldConfig.widgetOnScreen.widgets[i].uri === 'widgets/Splash/Widget'){
              findSplashWidget = true;
            }
          }

          if(!findSplashWidget){
            oldConfig.widgetOnScreen.widgets.push({
              "uri": "widgets/Splash/Widget",
              "visible": false,
              "positionRelativeTo": "browser",
              "version": "1.2"
            });
          }

          var findTimesliderWidget = false;
          for(i = 0; i < oldConfig.widgetOnScreen.widgets.length; i++){
            if(oldConfig.widgetOnScreen.widgets[i].uri === 'widgets/TimeSlider/Widget'){
              findTimesliderWidget = true;
            }
          }

          if(!findTimesliderWidget){
            oldConfig.widgetOnScreen.widgets.push({
              "uri": "widgets/TimeSlider/Widget",
              "visible": false,
              "position": {
                "bottom": 55,
                "left": 7
              },
              "version": "1.2"
            });
          }

          var findSwipeWidget = false;
          for(i = 0; i < oldConfig.widgetOnScreen.widgets.length; i++){
            if(oldConfig.widgetOnScreen.widgets[i].uri === 'widgets/Swipe/Widget'){
              findSwipeWidget = true;
            }
          }

          if (!findSwipeWidget){
            oldConfig.widgetOnScreen.widgets.push({
              "uri": "widgets/Swipe/Widget",
              "visible": false,
              "position": {
                "top": 145,
                "left": 7
              },
              "version": "1.2"
            });
          }
        }

        return oldConfig;
      },
      compatible: true
    }];

    this.isCompatible = function(_oldVersion, _newVersion){
      var oldVersionIndex = this.getVersionIndex(_oldVersion);
      var newVersionIndex = this.getVersionIndex(_newVersion);
      var i;
      for(i = oldVersionIndex + 1; i <= newVersionIndex; i++){
        if(this.versions[i].compatible === false){
          return false;
        }
      }
      return true;
    };
  }

  AppWidgetManager.prototype = new BaseVersionManager();
  AppWidgetManager.prototype.constructor = AppWidgetManager;
  return AppWidgetManager;
});