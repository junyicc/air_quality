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
define("dojox/mobile/compat",["dojo/_base/lang","dojo/sniff"],function(b,a){var c=b.getObject("dojox.mobile",!0);(!(a("webkit")||10===a("ie"))||!a("ie")&&6<a("trident"))&&require(["dojox/mobile/_compat"]);return c});