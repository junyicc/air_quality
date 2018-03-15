/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/_base/json",["./kernel","../json"],function(a,b){a.fromJson=function(a){return eval("("+a+")")};a._escapeString=b.stringify;a.toJsonIndentStr="\t";a.toJson=function(d,e){return b.stringify(d,function(a,c){if(c){var b=c.__json__||c.json;if("function"==typeof b)return b.call(c)}return c},e&&a.toJsonIndentStr)};return a});