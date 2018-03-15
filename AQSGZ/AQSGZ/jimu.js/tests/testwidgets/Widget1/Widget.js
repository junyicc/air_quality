define(['dojo/_base/declare', 'jimu/BaseWidget'],
  function(declare, BaseWidget){
  return declare([BaseWidget], {
    templateString: '<div></div>',
    baseClass: 'jimu-widget-testwidget1',
    name: 'test-widget1',

    onOpen: function(){
      this.testState = 'onOpen';
    },

    resize: function(){
      this.testState = 'resize';
    }
  });
});