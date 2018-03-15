///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define([], function() {
	var mo = {};

	mo.hasAppSearchInfo = function(map) {
		return map.itemInfo && map.itemInfo.itemData &&
			map.itemInfo.itemData.applicationProperties &&
			map.itemInfo.itemData.applicationProperties.viewing &&
			map.itemInfo.itemData.applicationProperties.viewing.search;
	};

	mo.searchLayer = function(map) {
		if (!this.hasAppSearchInfo(map)) {
			return false;
		}
		var search = map.itemInfo.itemData.applicationProperties.viewing.search;
		if (!search.enabled) {
			return false;
		}
		if (search.layers.length === 0) {
			return false;
		}

		return true;
	};

	mo.isConfigured = function(config) {
		return config && config.geocoder &&
			config.geocoder.geocoders && config.geocoder.geocoders.length > 0;
	};

	return mo;
});