/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/has",["require","module"],function(k,h){var a=k.has||function(){};if(!a("dojo-has-api")){var b="undefined"!=typeof window&&"undefined"!=typeof location&&"undefined"!=typeof document&&window.location==location&&window.document==document,l=function(){return this}(),g=b&&document,m=g&&g.createElement("DiV"),c=h.config&&h.config()||{},a=function(a){return"function"==typeof c[a]?c[a]=c[a](l,g,m):c[a]};a.cache=c;a.add=function(d,b,n,e){("undefined"==typeof c[d]||e)&&(c[d]=b);return n&&a(d)}}a.add("dom-addeventlistener",
!!document.addEventListener);a.add("touch","ontouchstart"in document||"onpointerdown"in document&&0<navigator.maxTouchPoints||window.navigator.msMaxTouchPoints);a.add("touch-events","ontouchstart"in document);a.add("pointer-events","onpointerdown"in document);a.add("MSPointer","msMaxTouchPoints"in navigator);a.add("device-width",screen.availWidth||innerWidth);b=document.createElement("form");a.add("dom-attributes-explicit",0==b.attributes.length);a.add("dom-attributes-specified-flag",0<b.attributes.length&&
40>b.attributes.length);a.clearElement=function(a){a.innerHTML="";return a};a.normalize=function(d,b){var c=d.match(/[\?:]|[^:\?]*/g),e=0,f=function(d){var b=c[e++];if(":"==b)return 0;if("?"==c[e++]){if(!d&&a(b))return f();f(!0);return f(d)}return b||0};return(d=f())&&b(d)};a.load=function(a,b,c){a?b([a],c):c()};return a});