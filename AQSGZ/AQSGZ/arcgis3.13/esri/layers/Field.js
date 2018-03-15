// All material copyright ESRI, All Rights Reserved, unless otherwise specified.
// See http://js.arcgis.com/3.13/esri/copyright.txt for details.
//>>built
define("esri/layers/Field","dojo/_base/declare dojo/_base/lang dojo/has ../kernel ./RangeDomain ./CodedValueDomain".split(" "),function(b,c,d,e,f,g){b=b(null,{declaredClass:"esri.layers.Field",constructor:function(a){if(a&&c.isObject(a)&&(this.name=a.name,this.type=a.type,this.alias=a.alias,this.length=a.length,this.editable=a.editable,this.nullable=a.nullable,(a=a.domain)&&c.isObject(a)))switch(a.type){case "range":this.domain=new f(a);break;case "codedValue":this.domain=new g(a)}}});d("extend-esri")&&
c.setObject("layers.Field",b,e);return b});