/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/_base/config",["../has","require"],function(e,d){var a={},b=d.rawConfig,c;for(c in b)a[c]=b[c];if(!a.locale&&"undefined"!=typeof navigator&&(b=navigator.language||navigator.userLanguage))a.locale=b.toLowerCase();return a});