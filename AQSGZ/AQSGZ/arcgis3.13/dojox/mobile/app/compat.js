/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

/*
	This is an optimized version of Dojo, built for deployment and not for
	development. To get sources and documentation, please visit:

		http://dojotoolkit.org
*/

//>>built
require({cache:{"dojox/mobile/compat":function(){define(["dojo/_base/lang","dojo/sniff"],function(e,a){var b=e.getObject("dojox.mobile",!0);(!(a("webkit")||10===a("ie"))||!a("ie")&&6<a("trident"))&&require(["dojox/mobile/_compat"]);return b})},"dijit/main":function(){define(["dojo/_base/kernel"],function(e){return e.dijit})},"dojox/main":function(){define(["dojo/_base/kernel"],function(e){return e.dojox})},"*noref":1}});
define("dojox/mobile/app/compat",["dijit","dojo","dojox","dojo/require!dojox/mobile/compat"],function(e,a,b){a.provide("dojox.mobile.app.compat");a.require("dojox.mobile.compat");a.extend(b.mobile.app.AlertDialog,{_doTransition:function(f){console.log("in _doTransition and this \x3d ",this);var c=a.marginBox(this.domNode.firstChild).h,d=this.controller.getWindowSize().h,c=d-c,d=a.fx.slideTo({node:this.domNode,duration:400,top:{start:0>f?c:d,end:0>f?d:c}}),c=a[0>f?"fadeOut":"fadeIn"]({node:this.mask,
duration:400}),d=a.fx.combine([d,c]),b=this;a.connect(d,"onEnd",this,function(){0>f&&(b.domNode.style.display="none",a.destroy(b.domNode),a.destroy(b.mask))});d.play()}});a.extend(b.mobile.app.List,{deleteRow:function(){console.log("deleteRow in compat mode",b);var b=this._selectedRow;a.style(b,{visibility:"hidden",minHeight:"0px"});a.removeClass(b,"hold");var c=a.contentBox(b).h;a.animateProperty({node:b,duration:800,properties:{height:{start:c,end:1},paddingTop:{end:0},paddingBottom:{end:0}},onEnd:this._postDeleteAnim}).play()}});
b.mobile.app.ImageView&&!a.create("canvas").getContext&&a.extend(b.mobile.app.ImageView,{buildRendering:function(){this.domNode.innerHTML="ImageView widget is not supported on this browser.Please try again with a modern browser, e.g. Safari, Chrome or Firefox";this.canvas={}},postCreate:function(){}});b.mobile.app.ImageThumbView&&a.extend(b.mobile.app.ImageThumbView,{place:function(b,c,d){a.style(b,{top:d+"px",left:c+"px",visibility:"visible"})}})});