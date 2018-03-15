// All material copyright ESRI, All Rights Reserved, unless otherwise specified.
// See http://js.arcgis.com/3.13/esri/copyright.txt for details.
//>>built
define("esri/dijit/editing/Union","dojo/_base/declare dojo/_base/lang dojo/has ../../kernel ../../OperationBase ./Cut".split(" "),function(b,c,d,e,f,g){b=b(f,{declaredClass:"esri.dijit.editing.Union",type:"edit",label:"Union Features",constructor:function(a){a=a||{};this._cut=new g({featureLayer:a.featureLayer,addedGraphics:a.deletedGraphics,preUpdatedGraphics:a.preUpdatedGraphics,postUpdatedGraphics:a.postUpdatedGraphics})},performUndo:function(){this._cut.performRedo()},performRedo:function(){this._cut.performUndo()}});
d("extend-esri")&&c.setObject("dijit.editing.Union",b,e);return b});