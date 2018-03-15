// All material copyright ESRI, All Rights Reserved, unless otherwise specified.
// See http://js.arcgis.com/3.13/esri/copyright.txt for details.
//>>built
define("esri/kernel",["dojo/_base/kernel","dojo/_base/config","dojo/has"],function(c,d,e){var b=window.location,a=b.pathname,a={version:"3.13",_appBaseUrl:b.protocol+"//"+b.host+a.substring(0,a.lastIndexOf(a.split("/")[a.split("/").length-1]))};d.noGlobals||(window.esri=a);c.isAsync||e.add("extend-esri",1);(a.dijit=a.dijit||{})._arcgisUrl=("file:"===b.protocol?"http:":b.protocol)+"//www.arcgis.com/sharing/rest";return a});