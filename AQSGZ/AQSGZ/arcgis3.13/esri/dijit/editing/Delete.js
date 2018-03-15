// All material copyright ESRI, All Rights Reserved, unless otherwise specified.
// See http://js.arcgis.com/3.13/esri/copyright.txt for details.
//>>built
define("esri/dijit/editing/Delete","dojo/_base/declare dojo/_base/lang dojo/has ../../kernel ../../OperationBase ./Add".split(" "),function(a,b,c,d,e,f){a=a(e,{declaredClass:"esri.dijit.editing.Delete",type:"edit",label:"Delete Features",constructor:function(a){a=a||{};this._add=new f({featureLayer:a.featureLayer,addedGraphics:a.deletedGraphics})},performUndo:function(){this._add.performRedo()},performRedo:function(){this._add.performUndo()}});c("extend-esri")&&b.setObject("dijit.editing.Delete",
a,d);return a});