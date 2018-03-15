define(['dojo/_base/declare', 'jimu/BaseWidget'],
  function(declare, BaseWidget){
  return declare([BaseWidget], {
    templateString: '<div></div>',
    name: 'Widget3',
    noData: false,

    onReceiveData: function(name, widgetId, data, historyData) {
      this.widget2Data = data;
      this.widget2HistoryData = historyData;
    },

    onNoData: function(widgetId) {
      this.noData = true;
    }
  });
});