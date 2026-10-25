(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates["connection"] = template({"0":function(container,depth0,helpers,partials,data) {
    return "      <h2>Edit connection</h2>\n";
},"1":function(container,depth0,helpers,partials,data) {
    return "      <h2>Add a connection</h2>\n";
},"2":function(container,depth0,helpers,partials,data) {
    return " checked=checked";
},"3":function(container,depth0,helpers,partials,data) {
    return "          <input type=\"submit\" value=\"&#xf071; Delete\" class=\"delete-connection\">\n          <input type=\"submit\" name=\"connect\" value=\"Save & Reconnect\" style=\"font-weight:bold\">\n";
},"4":function(container,depth0,helpers,partials,data) {
    return "          <input type=\"submit\" name=\"connect\" value=\"Connect\">\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    <section class=\"dialog config\">\n      <a href=\"#\" class=\"close\">close</a>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"edit") : depth0),{"name":"if","hash":{},"fn":container.program(0, data, 0),"inverse":container.program(1, data, 0),"data":data,"loc":{"start":{"line":3,"column":0},"end":{"line":7,"column":7}}})) != null ? stack1 : "")
    + "      <form method=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"method") || (depth0 != null ? lookupProperty(depth0,"method") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"method","hash":{},"data":data,"loc":{"start":{"line":8,"column":20},"end":{"line":8,"column":30}}}) : helper)))
    + "\" action=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"action") || (depth0 != null ? lookupProperty(depth0,"action") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"action","hash":{},"data":data,"loc":{"start":{"line":8,"column":40},"end":{"line":8,"column":50}}}) : helper)))
    + "\">\n        <div class=\"input-h-group\">\n          <fieldset class=\"input-group\">\n            <label for=\"host\">Address <span class=\"required\">*</span></label>\n            <input name=\"Host\" type=\"text\" value=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"Host") || (depth0 != null ? lookupProperty(depth0,"Host") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"Host","hash":{},"data":data,"loc":{"start":{"line":12,"column":50},"end":{"line":12,"column":58}}}) : helper)))
    + "\" placeholder=\"irc.freenode.com\" required>\n          </fieldset>\n          <fieldset class=\"input-group\">\n            <label for=\"port\">Port <span class=\"required\">*</span></label>\n            <input name=\"Port\" type=\"number\" value=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"Port") || (depth0 != null ? lookupProperty(depth0,"Port") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"Port","hash":{},"data":data,"loc":{"start":{"line":16,"column":52},"end":{"line":16,"column":60}}}) : helper)))
    + "\" required>\n          </fieldset>\n          <fieldset class=\"input-group\">\n            <label for=\"ssl\">TLS</label>\n            <input name=\"Ssl\" type=\"checkbox\""
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"Ssl") : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":20,"column":45},"end":{"line":20,"column":79}}})) != null ? stack1 : "")
    + ">\n          </fieldset>\n        </div>\n        <fieldset class=\"input-group\">\n          <label for=\"nick\">Nickname <span class=\"required\">*</span></label>\n          <input name=\"Nick\" type=\"text\" value=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"Nick") || (depth0 != null ? lookupProperty(depth0,"Nick") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"Nick","hash":{},"data":data,"loc":{"start":{"line":25,"column":48},"end":{"line":25,"column":56}}}) : helper)))
    + "\" required>\n        </fieldset>\n        <div class=\"input-h-group\">\n          <fieldset class=\"input-group\">\n            <label for=\"user\">Username</label>\n            <input name=\"User\" type=\"text\" value=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"User") || (depth0 != null ? lookupProperty(depth0,"User") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"User","hash":{},"data":data,"loc":{"start":{"line":30,"column":50},"end":{"line":30,"column":58}}}) : helper)))
    + "\">\n          </fieldset>\n          <fieldset class=\"input-group\">\n            <label for=\"pass\">Password</label>\n            <input name=\"Pass\" type=\"text\" value=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"Pass") || (depth0 != null ? lookupProperty(depth0,"Pass") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"Pass","hash":{},"data":data,"loc":{"start":{"line":34,"column":50},"end":{"line":34,"column":58}}}) : helper)))
    + "\">\n          </fieldset>\n        </div>\n        <div class=\"input-h-group\">\n          <fieldset class=\"input-group\" style=\"width:100%\">\n            <input style=\"float:left\" name=\"SASL\" type=\"checkbox\""
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"SASL") : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":39,"column":65},"end":{"line":39,"column":100}}})) != null ? stack1 : "")
    + ">\n            <label style=\"float:left;width:auto\" for=\"sasl\">Require SASL</label>\n          </fieldset>\n        </div>\n        <hr>\n        <fieldset class=\"input-group\">\n          <label for=\"channels\">Channels\n            <span>(comma separated)</span>\n          </label>\n          <input name=\"Channels\" type=\"text\" value=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"Channels") || (depth0 != null ? lookupProperty(depth0,"Channels") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"Channels","hash":{},"data":data,"loc":{"start":{"line":48,"column":52},"end":{"line":48,"column":64}}}) : helper)))
    + "\">\n        </fieldset>\n        <fieldset class=\"input-group\">\n          <label for=\"highlight\">Highlight words (comma separated)</label>\n          <input name=\"Highlight\" type=\"text\" value=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"Highlight") || (depth0 != null ? lookupProperty(depth0,"Highlight") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"Highlight","hash":{},"data":data,"loc":{"start":{"line":52,"column":53},"end":{"line":52,"column":66}}}) : helper)))
    + "\">\n        </fieldset>\n        <fieldset class=\"input-group\">\n          <label for=\"alias\">Network alias</label>\n          <input name=\"Alias\" type=\"text\" value=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"Alias") || (depth0 != null ? lookupProperty(depth0,"Alias") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"Alias","hash":{},"data":data,"loc":{"start":{"line":56,"column":49},"end":{"line":56,"column":58}}}) : helper)))
    + "\">\n        </fieldset>\n\n        <fieldset class=\"submit-group\">\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"edit") : depth0),{"name":"if","hash":{},"fn":container.program(3, data, 0),"inverse":container.program(4, data, 0),"data":data,"loc":{"start":{"line":60,"column":0},"end":{"line":65,"column":7}}})) != null ? stack1 : "")
    + "          <p style=\"float:right\" class=\"note\"><span class=\"required\">*</span> required</p>\n        </fieldset>\n      </form>\n    </section>\n\n";
},"useData":true});
templates["date_separator"] = template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div class=\"date-separator\">\n  <div class=\"date-wrap\">\n    <time>"
    + alias4(((helper = (helper = lookupProperty(helpers,"day") || (depth0 != null ? lookupProperty(depth0,"day") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"day","hash":{},"data":data,"loc":{"start":{"line":3,"column":10},"end":{"line":3,"column":17}}}) : helper)))
    + " "
    + alias4(((helper = (helper = lookupProperty(helpers,"month") || (depth0 != null ? lookupProperty(depth0,"month") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"month","hash":{},"data":data,"loc":{"start":{"line":3,"column":18},"end":{"line":3,"column":27}}}) : helper)))
    + " "
    + alias4(((helper = (helper = lookupProperty(helpers,"date") || (depth0 != null ? lookupProperty(depth0,"date") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"date","hash":{},"data":data,"loc":{"start":{"line":3,"column":28},"end":{"line":3,"column":36}}}) : helper)))
    + ", "
    + alias4(((helper = (helper = lookupProperty(helpers,"year") || (depth0 != null ? lookupProperty(depth0,"year") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"year","hash":{},"data":data,"loc":{"start":{"line":3,"column":38},"end":{"line":3,"column":46}}}) : helper)))
    + "</time>\n  </div>\n  <hr>\n</div>\n";
},"useData":true});
templates["embed"] = template({"0":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    <div class=\"embed-thumb\" style=\"background-image:url(//noembed.com/i/0/450/"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"image") || (depth0 != null ? lookupProperty(depth0,"image") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"image","hash":{},"data":data,"loc":{"start":{"line":5,"column":79},"end":{"line":5,"column":88}}}) : helper)))
    + ")\">\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"is_video") : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":6,"column":0},"end":{"line":8,"column":7}}})) != null ? stack1 : "")
    + "    </div>\n";
},"1":function(container,depth0,helpers,partials,data) {
    return "      <div class=\"embed-play\"></div>\n";
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"thumbnail_url") : depth0),{"name":"if","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":10,"column":0},"end":{"line":16,"column":0}}})) != null ? stack1 : "");
},"3":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    <div class=\"embed-thumb\" style=\"background-image:url(//noembed.com/i/0/450/"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"thumbnail_url") || (depth0 != null ? lookupProperty(depth0,"thumbnail_url") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"thumbnail_url","hash":{},"data":data,"loc":{"start":{"line":11,"column":79},"end":{"line":11,"column":96}}}) : helper)))
    + ")\">\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"is_video") : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":12,"column":0},"end":{"line":14,"column":7}}})) != null ? stack1 : "")
    + "    </div>\n";
},"4":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return container.escapeExpression(((helper = (helper = lookupProperty(helpers,"html") || (depth0 != null ? lookupProperty(depth0,"html") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"html","hash":{},"data":data,"loc":{"start":{"line":22,"column":0},"end":{"line":22,"column":8}}}) : helper)))
    + "\n";
},"5":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"description") : depth0),{"name":"if","hash":{},"fn":container.program(6, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":23,"column":0},"end":{"line":25,"column":0}}})) != null ? stack1 : "");
},"6":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<p class=\"description\">"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"description") || (depth0 != null ? lookupProperty(depth0,"description") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"description","hash":{},"data":data,"loc":{"start":{"line":24,"column":23},"end":{"line":24,"column":38}}}) : helper)))
    + "</p>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div class=\"embed-wrap-wrap\">\n  <div class=\"embed-wrap\" data-embed-provider=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"provider_name_lc") || (depth0 != null ? lookupProperty(depth0,"provider_name_lc") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"provider_name_lc","hash":{},"data":data,"loc":{"start":{"line":2,"column":47},"end":{"line":2,"column":67}}}) : helper)))
    + "\" data-embed-id=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"id") || (depth0 != null ? lookupProperty(depth0,"id") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"id","hash":{},"data":data,"loc":{"start":{"line":2,"column":84},"end":{"line":2,"column":90}}}) : helper)))
    + "\">\n\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"image") : depth0),{"name":"if","hash":{},"fn":container.program(0, data, 0),"inverse":container.program(2, data, 0),"data":data,"loc":{"start":{"line":4,"column":0},"end":{"line":16,"column":7}}})) != null ? stack1 : "")
    + "\n\n    <h2>"
    + alias4(((helper = (helper = lookupProperty(helpers,"title") || (depth0 != null ? lookupProperty(depth0,"title") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data,"loc":{"start":{"line":19,"column":8},"end":{"line":19,"column":17}}}) : helper)))
    + "</h2>\n\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"use_html") : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.program(5, data, 0),"data":data,"loc":{"start":{"line":21,"column":0},"end":{"line":25,"column":7}}})) != null ? stack1 : "")
    + "\n    <p class=\"embed-source\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"provider_name") || (depth0 != null ? lookupProperty(depth0,"provider_name") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"provider_name","hash":{},"data":data,"loc":{"start":{"line":27,"column":28},"end":{"line":27,"column":45}}}) : helper)))
    + "</p>\n\n  </div>\n</div>\n";
},"useData":true});
templates["emoji"] = template({"0":function(container,depth0,helpers,partials,data) {
    var alias1=container.lambda, alias2=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<li data-chars=\""
    + alias2(alias1((depth0 != null ? lookupProperty(depth0,"chars") : depth0), depth0))
    + "\" data-keywords=\""
    + alias2(alias1((depth0 != null ? lookupProperty(depth0,"keywords") : depth0), depth0))
    + "\" data-name=\""
    + alias2(alias1((depth0 != null ? lookupProperty(depth0,"name") : depth0), depth0))
    + "\" title=\""
    + alias2(alias1((depth0 != null ? lookupProperty(depth0,"name") : depth0), depth0))
    + "\">"
    + alias2(alias1((depth0 != null ? lookupProperty(depth0,"chars") : depth0), depth0))
    + "</li>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"each").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"emoji") : depth0),{"name":"each","hash":{},"fn":container.program(0, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":3,"column":9}}})) != null ? stack1 : "");
},"useData":true});
templates["help"] = template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    return "    <aside class=\"dialog help\">\n      <a href=\"#\" class=\"close\">close</a>\n      <p>Example commands:</p>\n\n      <ul>\n        <li><code>/join #channel</code></li>\n        <li><code>/part reason</code></li>\n        <li><code>/query user message</code></li>\n        <li><code>/say /hello</code></li>\n        <li><code>/topic new topic message</code></li>\n        <li><code>/last query</code></li>\n        <li><code>/[un]ignore nickname</code></li>\n        <li><code>/ignores</code></li>\n      </ul>\n\n      <dl>\n        <h3>Navigation</h3>\n        <dt>Alt + [Up,Down]</dt>\n        <dd>Next/Prev panel</dd>\n        <dt>Shift + Alt + [Up,Down]</dt>\n        <dd>Next/Prev unread panel</dd>\n        <dt>Alt + [1-9]</dt>\n        <dd>Focus panel</dd>\n        <dt>Alt + t</dt>\n        <dd>Quick panel switch</dd>\n        <dt>Alt + k</dt>\n        <dd>Quick panel switch</dd>\n        <dt>Alt + ;</dt>\n        <dd>Toggle nicklist</dd>\n      </dl>\n      <dl>\n        <h3>Editor</h3>\n        <dt>Ctrl + b</dt>\n        <dd>Bold</dd>\n        <dt>Ctrl + i</dt>\n        <dd>Italic</dd>\n        <dt>Ctrl + u</dt>\n        <dd>Underline</dd>\n        <dt>Ctrl + /</dt>\n        <dd>Invert</dd>\n        <dt>Shift + Up</dt>\n        <dd>Previous line history</dd>\n        <dt>Shift + Down</dt>\n        <dd>Next line in history</dd>\n      </dl>\n\n      <p>\n        <a target=\"_blank\" href=\"https://github.com/lierc/lierc-basicui/blob/master/static/js/lierc/commands.js\">Help Lee add more commands?</a>\n      </p>\n    </aside>\n";
},"useData":true});
templates["image_popup"] = template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div class=\"image-popup-wrap\">\n  <img class=\"image-popup\" src=\"https://noembed.com/i/"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"href") || (depth0 != null ? lookupProperty(depth0,"href") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"href","hash":{},"data":data,"loc":{"start":{"line":2,"column":54},"end":{"line":2,"column":62}}}) : helper)))
    + "\">\n</div>\n";
},"useData":true});
templates["images"] = template({"0":function(container,depth0,helpers,partials,data) {
    var alias1=container.lambda, alias2=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "  <div class=\"uploaded-image\">\n    <a target=\"_blank\" href=\""
    + alias2(alias1((depth0 != null ? lookupProperty(depth0,"url") : depth0), depth0))
    + "\">\n      <div class=\"image-delete\" data-url=\""
    + alias2(alias1((depth0 != null ? lookupProperty(depth0,"url") : depth0), depth0))
    + "\" title=\"Delete image\"></div>\n      <img src=\"https://noembed.com/i/100/50/"
    + alias2(alias1((depth0 != null ? lookupProperty(depth0,"url") : depth0), depth0))
    + "\" title=\""
    + alias2(alias1((depth0 != null ? lookupProperty(depth0,"created") : depth0), depth0))
    + "\">\n    </a>\n  </div>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"each").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"images") : depth0),{"name":"each","hash":{},"fn":container.program(0, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":8,"column":9}}})) != null ? stack1 : "");
},"useData":true});
templates["join"] = template({"0":function(container,depth0,helpers,partials,data) {
    var alias1=container.lambda, alias2=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "            <option value=\""
    + alias2(alias1((depth0 != null ? lookupProperty(depth0,"id") : depth0), depth0))
    + "\">"
    + alias2(alias1((depth0 != null ? lookupProperty(depth0,"host") : depth0), depth0))
    + "</option>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    <section  class=\"dialog join\">\n      <a href=\"#\" class=\"close login-toggle\">close</a>\n      <h2>Join a channel</h2>\n      <form method=\"POST\">\n        <fieldset class=\"input-group\">\n          <label for=\"channel\">Channel name</label>\n          <input type=\"text\" name=\"channel\" required>\n        </fieldset>\n        <fieldset class=\"input-group\">\n          <label for=\"connection\">IRC Network</label>\n          <select name=\"connection\">\n"
    + ((stack1 = lookupProperty(helpers,"each").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"connections") : depth0),{"name":"each","hash":{},"fn":container.program(0, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":12,"column":0},"end":{"line":14,"column":9}}})) != null ? stack1 : "")
    + "          </select>\n        </fieldset>\n        <fieldset class=\"submit-group\">\n          <input type=\"submit\" name=\"join\" value=\"Join\">\n        </fieldset>\n      </form>\n    </section>\n\n";
},"useData":true});
templates["login"] = template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    return "    <section class=\"dialog login\">\n      <div class=\"login-wrap\">\n      <a href=\"#\" class=\"close reset-toggle\">Reset password</a>\n      <h2>Login</h2>\n      <form method=\"POST\" class=\"login-form\">\n        <fieldset class=\"input-group\">\n          <label for=\"email\">Email address or username</label>\n          <input name=\"email\" type=\"text\" value=\"\" required>\n        </fieldset>\n        <fieldset class=\"input-group\">\n          <label for=\"pass\">Password</label>\n          <input name=\"pass\" type=\"password\" value=\"\" required>\n        </fieldset>\n        <fieldset class=\"submit-group\">\n          <input type=\"submit\" name=\"auth\" value=\"Log In\">\n        </fieldset>\n      </form>\n\n\n      <hr/>\n\n      <h2>Register</h2>\n      <form method=\"POST\">\n        <fieldset class=\"input-group\">\n          <label for=\"username\">Username</label>\n          <input name=\"username\" type=\"text\" value=\"\" required>\n        </fieldset>\n        <fieldset class=\"input-group\">\n          <label for=\"email\">Email address</label>\n          <input name=\"email\" type=\"email\" value=\"\" required>\n        </fieldset>\n        <fieldset class=\"input-group\">\n          <label for=\"pass\">Password</label>\n          <input name=\"pass\" type=\"password\" value=\"\" required>\n        </fieldset>\n        <fieldset class=\"submit-group\">\n          <input type=\"submit\" name=\"register\" value=\"Register\">\n        </fieldset>\n      </form>\n      </div>\n\n      <div class=\"reset-wrap\">\n      <a href=\"#\" class=\"close login-toggle\">Login</a>\n      <h2>Reset password</h2>\n      <form method=\"POST\">\n        <fieldset class=\"input-group\">\n          <label for=\"email\">Email address</label>\n          <input name=\"email\" type=\"email\" value=\"\" required>\n        </fieldset>\n        <fieldset class=\"submit-group\">\n          <input type=\"submit\" name=\"auth\" value=\"This doesn't work\" disabled>\n        </fieldset>\n      </form>\n      </div>\n\n    </section>\n";
},"useData":true});
templates["message_menu"] = template({"0":function(container,depth0,helpers,partials,data) {
    return "off";
},"1":function(container,depth0,helpers,partials,data) {
    return "on";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div class=\"message-menu-popup\">\n  <ul>\n    <li class=\"message-privmsg\">Direct message</li>\n    <li class=\"message-monospace\">Monospace text "
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"is_monospace") : depth0),{"name":"if","hash":{},"fn":container.program(0, data, 0),"inverse":container.program(1, data, 0),"data":data,"loc":{"start":{"line":4,"column":49},"end":{"line":4,"column":90}}})) != null ? stack1 : "")
    + "</li>\n  </ul>\n</div>\n";
},"useData":true});
templates["nav_item"] = template({"0":function(container,depth0,helpers,partials,data) {
    return "<a class=\"fa-solid fa-pencil edit edit-panel\" title=\"Edit\"></a>";
},"1":function(container,depth0,helpers,partials,data) {
    return "<a class=\"fa-solid fa-xmark close-panel\" title=\"Close\"></a>";
},"2":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<a class=\"fa-solid fa-file-lines panel-log\" title=\"View logs\" href=\""
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"log_url") || (depth0 != null ? lookupProperty(depth0,"log_url") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"log_url","hash":{},"data":data,"loc":{"start":{"line":1,"column":312},"end":{"line":1,"column":323}}}) : helper)))
    + "\" target=\"_blank\"></a>";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<li data-panel-id=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"id") || (depth0 != null ? lookupProperty(depth0,"id") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"id","hash":{},"data":data,"loc":{"start":{"line":1,"column":19},"end":{"line":1,"column":25}}}) : helper)))
    + "\"><a class=\"panel-name\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"name") || (depth0 != null ? lookupProperty(depth0,"name") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data,"loc":{"start":{"line":1,"column":49},"end":{"line":1,"column":57}}}) : helper)))
    + "</a>"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"editable") : depth0),{"name":"if","hash":{},"fn":container.program(0, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":61},"end":{"line":1,"column":147}}})) != null ? stack1 : "")
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"closable") : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":147},"end":{"line":1,"column":229}}})) != null ? stack1 : "")
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"log_url") : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":229},"end":{"line":1,"column":352}}})) != null ? stack1 : "")
    + "</li>\n";
},"useData":true});
templates["nick"] = template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<li><a class=\"nick-list-nick\" data-nick=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"nick") || (depth0 != null ? lookupProperty(depth0,"nick") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"nick","hash":{},"data":data,"loc":{"start":{"line":1,"column":41},"end":{"line":1,"column":49}}}) : helper)))
    + "\" data-nick-order=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"order") || (depth0 != null ? lookupProperty(depth0,"order") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"order","hash":{},"data":data,"loc":{"start":{"line":1,"column":68},"end":{"line":1,"column":77}}}) : helper)))
    + "\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"sigil") || (depth0 != null ? lookupProperty(depth0,"sigil") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"sigil","hash":{},"data":data,"loc":{"start":{"line":1,"column":79},"end":{"line":1,"column":88}}}) : helper)))
    + alias4(((helper = (helper = lookupProperty(helpers,"nick") || (depth0 != null ? lookupProperty(depth0,"nick") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"nick","hash":{},"data":data,"loc":{"start":{"line":1,"column":88},"end":{"line":1,"column":96}}}) : helper)))
    + "</a></li>\n";
},"useData":true});
})();
