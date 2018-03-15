/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/hccss","require ./_base/config ./dom-class ./dom-style ./has ./domReady ./_base/window".split(" "),function(f,g,h,k,c,l,d){c.add("highcontrast",function(){var a=d.doc.createElement("div");a.style.cssText='border: 1px solid; border-color:red green; position: absolute; height: 5px; top: -999px;background-image: url("'+(g.blankGif||f.toUrl("./resources/blank.gif"))+'");';d.body().appendChild(a);var b=k.getComputedStyle(a),e=b.backgroundImage,b=b.borderTopColor==b.borderRightColor||e&&("none"==
e||"url(invalid-url:)"==e);8>=c("ie")?a.outerHTML="":d.body().removeChild(a);return b});l(function(){c("highcontrast")&&h.add(d.body(),"dj_a11y")});return c});