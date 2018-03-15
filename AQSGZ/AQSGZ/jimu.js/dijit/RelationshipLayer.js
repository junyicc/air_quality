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

define(['dojo/_base/declare',
  'dojo/_base/array',
  'dojo/_base/lang',
  'dojo/_base/html',
  'dojo/dom-construct',
  'dojo/aspect',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/RelationshipLayer.html',
  'esri/request',
  'jimu/dijit/RelationshipConfig'
],
function(declare, array, lang, html, domConstruct, aspect, _WidgetBase,_TemplatedMixin,
  _WidgetsInTemplateMixin,template, esriRequest, RelationshipConfig){
  return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
    templateString: template,
    baseClass: 'jimu-filter',
    declaredClass: 'jimu.dijit.RelationshipLayer',
    nls: null,
    relationConfigs: [],

    postCreate: function(){
      this.inherited(arguments);
      if(this.baseurl && this.relations){
        this.init();
      }
    },

    destroy: function(){
      this.clear();
      this.inherited(arguments);
    },

    clear: function(){
      array.forEach(this.relationConfigs,function(rConfig){
        rConfig.destroy();
      });

      this.relationshipSelect.removeOption(this.relationshipSelect.getOptions());

      this.relationConfigs = [];

      domConstruct.empty(this.allRelsBox);
    },

    getConfig: function(){
      var relationships = [];
      array.forEach(this.relationConfigs,function(rConfig){
        relationships.push(rConfig.getConfig());
      });
      return relationships;
    },

    setConfig: function(config){
      this.clear();

      this.config = config;
      if(!this._isObject(this.config)){
        return;
      }
      this.init(config);

      if(config.settings instanceof Array && config.settings.length > 0){
        array.forEach(config.settings,lang.hitch(this,function(setting){
          var tableId = setting.tableId;
          var visibleFields = [];

          array.forEach(setting.fields,function(field){
            visibleFields.push(field.name);
          });

          this._loadRelatedTable(tableId,visibleFields);
        }));
      }
    },

    init: function(args){
      if(args && args.baseurl && args.relations && args.refName){
        this.baseurl = args.baseurl;
        this.relations = args.relations;
        this.refName = args.refName;
      }

      var options = [{label:this.nls.selectOption,value:-1}];

      array.forEach(this.relations,lang.hitch(this,function(item){
        options.push({label:item.name,value:item.relatedTableId});
      }));

      this.relationshipSelect.addOption(options);
      html.setStyle(this.contentSection, 'display', 'block');
    },

    _onBtnAddRelationshipClick: function(){
      if(!this.relations || !this.baseurl){
        return;
      }
      //load a relate layer
      var tableId = this.relationshipSelect.get('value');
      if(tableId !== -1){
        this._loadRelatedTable(tableId);
      }
    },

    _loadRelatedTable: function(tableId, visibleFields){
      var layerUrl = this._replaceLayerId(this.baseurl,tableId);

      var args = {
        nls: this.nls,
        tableId: tableId
      };
      var relCfg = new RelationshipConfig(args);
      this.own(aspect.after(relCfg,'_destroySelf',lang.hitch(this,function(){
        var getTableId = (function(){
          var id = tableId;
          return function(){return id;};
        })();
        return this._addOption(getTableId());
      })));

      relCfg.placeAt(this.allRelsBox);
      relCfg.startup();

      esriRequest({
          url: layerUrl,
          content: {f:'json'},
          handleAs: 'json'
        }).then(lang.hitch(this, function(response){
          relCfg.setFields(response.fields, visibleFields);
          var relatedTo = '';
          if(response.relationships && response.relationships.length > 0){
            relatedTo = response.relationships[0].name;
          }
          relCfg.setTitle(relatedTo + ' -- ' + this.nls.relatedTo + ' : ' + this.refName);
          this.relationConfigs.push(relCfg);
          this._removeOption(tableId);
        }), lang.hitch(this, function(err){
          console.error(err);
          relCfg.destroy();
        }));
    },

    _removeOption: function(tableId){
      this.relationshipSelect.removeOption(String(tableId));
      this.relationshipSelect.set('value',-1);
    },

    _addOption: function(tableId){
      var status = array.some(this.relations,lang.hitch(this,function(item){
        if(item.relatedTableId === tableId){
          this.relationshipSelect.addOption({label:item.name,value:item.relatedTableId});
          return true;
        }
      }));
      if(status){
        this.relationshipSelect.set('value',tableId);
      }else{
        this.relationshipSelect.set('value',-1);
      }
    },

    _replaceLayerId: function(url,newLayerId){
      //replace the last number
      return url.replace(/[0-9]+(?!.*[0-9])/, function(){
        return newLayerId;
      });
    },

    _isObject:function(o){
      return o && typeof o === 'object';
    }
  });
});
