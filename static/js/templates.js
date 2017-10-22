(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates['embed'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {});

  return "    <div class=\"embed-thumb\" style=\"background-image:url(//noembed.com/i/0/450/"
    + container.escapeExpression(((helper = (helper = helpers.image || (depth0 != null ? depth0.image : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"image","hash":{},"data":data}) : helper)))
    + ")\">\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.is_video : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </div>\n";
},"2":function(container,depth0,helpers,partials,data) {
    return "      <div class=\"embed-play\"></div>\n";
},"4":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.thumbnail_url : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"5":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {});

  return "    <div class=\"embed-thumb\" style=\"background-image:url(//noembed.com/i/0/450/"
    + container.escapeExpression(((helper = (helper = helpers.thumbnail_url || (depth0 != null ? depth0.thumbnail_url : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"thumbnail_url","hash":{},"data":data}) : helper)))
    + ")\">\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.is_video : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </div>\n";
},"7":function(container,depth0,helpers,partials,data) {
    var helper;

  return container.escapeExpression(((helper = (helper = helpers.html || (depth0 != null ? depth0.html : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"html","hash":{},"data":data}) : helper)))
    + "\n";
},"9":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.description : depth0),{"name":"if","hash":{},"fn":container.program(10, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"10":function(container,depth0,helpers,partials,data) {
    var helper;

  return "<p class=\"description\">"
    + container.escapeExpression(((helper = (helper = helpers.description || (depth0 != null ? depth0.description : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"description","hash":{},"data":data}) : helper)))
    + "</p>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "<div class=\"embed-wrap-wrap\">\n  <div class=\"embed-wrap\" data-embed-provider=\""
    + alias4(((helper = (helper = helpers.provider_name_lc || (depth0 != null ? depth0.provider_name_lc : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"provider_name_lc","hash":{},"data":data}) : helper)))
    + "\" data-embed-id=\""
    + alias4(((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"id","hash":{},"data":data}) : helper)))
    + "\">\n\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.image : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.program(4, data, 0),"data":data})) != null ? stack1 : "")
    + "\n\n    <h2>"
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + "</h2>\n\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.use_html : depth0),{"name":"if","hash":{},"fn":container.program(7, data, 0),"inverse":container.program(9, data, 0),"data":data})) != null ? stack1 : "")
    + "\n    <p class=\"embed-source\">"
    + alias4(((helper = (helper = helpers.provider_name || (depth0 != null ? depth0.provider_name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"provider_name","hash":{},"data":data}) : helper)))
    + "</p>\n\n  </div>\n</div>\n";
},"useData":true});
templates['nick'] = template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "<li><a class=\"nick-list-nick\" data-nick=\""
    + alias4(((helper = (helper = helpers.nick || (depth0 != null ? depth0.nick : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"nick","hash":{},"data":data}) : helper)))
    + "\" data-nick-order=\""
    + alias4(((helper = (helper = helpers.order || (depth0 != null ? depth0.order : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"order","hash":{},"data":data}) : helper)))
    + "\">"
    + alias4(((helper = (helper = helpers.sigil || (depth0 != null ? depth0.sigil : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"sigil","hash":{},"data":data}) : helper)))
    + alias4(((helper = (helper = helpers.nick || (depth0 != null ? depth0.nick : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"nick","hash":{},"data":data}) : helper)))
    + "</a></li>\n";
},"useData":true});
templates['message_menu'] = template({"1":function(container,depth0,helpers,partials,data) {
    return "off";
},"3":function(container,depth0,helpers,partials,data) {
    return "on";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<div class=\"message-menu-popup\">\n  <ul>\n    <li class=\"message-privmsg\">Direct message</li>\n    <li class=\"message-monospace\">Monospace text "
    + ((stack1 = helpers["if"].call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.is_monospace : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.program(3, data, 0),"data":data})) != null ? stack1 : "")
    + "</li>\n  </ul>\n</div>\n";
},"useData":true});
templates['login'] = template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    return "    <section class=\"dialog login\">\n      <div class=\"login-wrap\">\n      <a href=\"#\" class=\"close reset-toggle\">Reset password</a>\n      <h2>Login</h2>\n      <form method=\"POST\" class=\"login-form\">\n        <fieldset class=\"input-group\">\n          <label for=\"email\">Email address or username</label>\n          <input name=\"email\" type=\"text\" value=\"\" required>\n        </fieldset>\n        <fieldset class=\"input-group\">\n          <label for=\"pass\">Password</label>\n          <input name=\"pass\" type=\"password\" value=\"\" required>\n        </fieldset>\n        <fieldset class=\"submit-group\">\n          <input type=\"submit\" name=\"auth\" value=\"Log In\">\n        </fieldset>\n      </form>\n\n\n      <hr/>\n\n      <h2>Register</h2>\n      <form method=\"POST\">\n        <fieldset class=\"input-group\">\n          <label for=\"username\">Username</label>\n          <input name=\"username\" type=\"text\" value=\"\" required>\n        </fieldset>\n        <fieldset class=\"input-group\">\n          <label for=\"email\">Email address</label>\n          <input name=\"email\" type=\"email\" value=\"\" required>\n        </fieldset>\n        <fieldset class=\"input-group\">\n          <label for=\"pass\">Password</label>\n          <input name=\"pass\" type=\"password\" value=\"\" required>\n        </fieldset>\n        <fieldset class=\"submit-group\">\n          <input type=\"submit\" name=\"register\" value=\"Register\">\n        </fieldset>\n      </form>\n      </div>\n\n      <div class=\"reset-wrap\">\n      <a href=\"#\" class=\"close login-toggle\">Login</a>\n      <h2>Reset password</h2>\n      <form method=\"POST\">\n        <fieldset class=\"input-group\">\n          <label for=\"email\">Email address</label>\n          <input name=\"email\" type=\"email\" value=\"\" required>\n        </fieldset>\n        <fieldset class=\"submit-group\">\n          <input type=\"submit\" name=\"auth\" value=\"This doesn't work\" disabled>\n        </fieldset>\n      </form>\n      </div>\n\n    </section>\n";
},"useData":true});
templates['help'] = template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    return "    <aside class=\"dialog help\">\n      <a href=\"#\" class=\"close\">close</a>\n      <p>Example commands:</p>\n\n      <ul>\n        <li><code>/join #channel</code></li>\n        <li><code>/part reason</code></li>\n        <li><code>/query user message</code></li>\n        <li><code>/say /hello</code></li>\n        <li><code>/topic new topic message</code></li>\n        <li><code>/last query</code></li>\n        <li><code>/[un]ignore nickname</code></li>\n        <li><code>/ignores</code></li>\n      </ul>\n\n      <dl>\n        <h3>Navigation</h3>\n        <dt>Alt + [Up,Down]</dt>\n        <dd>Next/Prev panel</dd>\n        <dt>Shift + Alt + [Up,Down]</dt>\n        <dd>Next/Prev unread panel</dd>\n        <dt>Alt + [1-9]</dt>\n        <dd>Focus panel</dd>\n        <dt>Alt + t</dt>\n        <dd>Quick panel switch</dd>\n        <dt>Alt + k</dt>\n        <dd>Quick panel switch</dd>\n        <dt>Alt + ;</dt>\n        <dd>Toggle nicklist</dd>\n      </dl>\n      <dl>\n        <h3>Editor</h3>\n        <dt>Ctrl + b</dt>\n        <dd>Bold</dd>\n        <dt>Ctrl + i</dt>\n        <dd>Italic</dd>\n        <dt>Ctrl + u</dt>\n        <dd>Underline</dd>\n        <dt>Ctrl + /</dt>\n        <dd>Invert</dd>\n        <dt>Shift + Up</dt>\n        <dd>Previous line history</dd>\n        <dt>Shift + Down</dt>\n        <dd>Next line in history</dd>\n      </dl>\n\n      <p>\n        <a target=\"_blank\" href=\"https://github.com/lierc/lierc-basicui/blob/master/static/js/lierc/commands.js\">Help Lee add more commands?</a>\n      </p>\n    </aside>\n";
},"useData":true});
templates['join'] = template({"1":function(container,depth0,helpers,partials,data) {
    var alias1=container.lambda, alias2=container.escapeExpression;

  return "            <option value=\""
    + alias2(alias1((depth0 != null ? depth0.id : depth0), depth0))
    + "\">"
    + alias2(alias1((depth0 != null ? depth0.host : depth0), depth0))
    + "</option>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "    <section  class=\"dialog join\">\n      <a href=\"#\" class=\"close login-toggle\">close</a>\n      <h2>Join a channel</h2>\n      <form method=\"POST\">\n        <fieldset class=\"input-group\">\n          <label for=\"channel\">Channel name</label>\n          <input type=\"text\" name=\"channel\" required>\n        </fieldset>\n        <fieldset class=\"input-group\">\n          <label for=\"connection\">IRC Network</label>\n          <select name=\"connection\">\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.connections : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "          </select>\n        </fieldset>\n        <fieldset class=\"submit-group\">\n          <input type=\"submit\" name=\"join\" value=\"Join\">\n        </fieldset>\n      </form>\n    </section>\n\n";
},"useData":true});
templates['connection'] = template({"1":function(container,depth0,helpers,partials,data) {
    return "      <h2>Edit connection</h2>\n";
},"3":function(container,depth0,helpers,partials,data) {
    return "      <h2>Add a connection</h2>\n";
},"5":function(container,depth0,helpers,partials,data) {
    return " checked=checked";
},"7":function(container,depth0,helpers,partials,data) {
    return "          <input type=\"submit\" value=\"&#xf071; Delete\" class=\"delete-connection\">\n          <input type=\"submit\" name=\"connect\" value=\"Save & Reconnect\" style=\"font-weight:bold\">\n";
},"9":function(container,depth0,helpers,partials,data) {
    return "          <input type=\"submit\" name=\"connect\" value=\"Connect\">\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "    <section class=\"dialog config\">\n      <a href=\"#\" class=\"close\">close</a>\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.edit : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.program(3, data, 0),"data":data})) != null ? stack1 : "")
    + "      <form method=\""
    + alias4(((helper = (helper = helpers.method || (depth0 != null ? depth0.method : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"method","hash":{},"data":data}) : helper)))
    + "\" action=\""
    + alias4(((helper = (helper = helpers.action || (depth0 != null ? depth0.action : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"action","hash":{},"data":data}) : helper)))
    + "\">\n        <div class=\"input-h-group\">\n          <fieldset class=\"input-group\">\n            <label for=\"host\">Address <span class=\"required\">*</span></label>\n            <input name=\"Host\" type=\"text\" value=\""
    + alias4(((helper = (helper = helpers.Host || (depth0 != null ? depth0.Host : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"Host","hash":{},"data":data}) : helper)))
    + "\" placeholder=\"irc.freenode.com\" required>\n          </fieldset>\n          <fieldset class=\"input-group\">\n            <label for=\"port\">Port <span class=\"required\">*</span></label>\n            <input name=\"Port\" type=\"number\" value=\""
    + alias4(((helper = (helper = helpers.Port || (depth0 != null ? depth0.Port : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"Port","hash":{},"data":data}) : helper)))
    + "\" required>\n          </fieldset>\n          <fieldset class=\"input-group\">\n            <label for=\"ssl\">TLS</label>\n            <input name=\"Ssl\" type=\"checkbox\""
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.Ssl : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ">\n          </fieldset>\n        </div>\n        <fieldset class=\"input-group\">\n          <label for=\"nick\">Nickname <span class=\"required\">*</span></label>\n          <input name=\"Nick\" type=\"text\" value=\""
    + alias4(((helper = (helper = helpers.Nick || (depth0 != null ? depth0.Nick : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"Nick","hash":{},"data":data}) : helper)))
    + "\" required>\n        </fieldset>\n        <div class=\"input-h-group\">\n          <fieldset class=\"input-group\">\n            <label for=\"user\">Username</label>\n            <input name=\"User\" type=\"text\" value=\""
    + alias4(((helper = (helper = helpers.User || (depth0 != null ? depth0.User : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"User","hash":{},"data":data}) : helper)))
    + "\">\n          </fieldset>\n          <fieldset class=\"input-group\">\n            <label for=\"pass\">Password</label>\n            <input name=\"Pass\" type=\"text\" value=\""
    + alias4(((helper = (helper = helpers.Pass || (depth0 != null ? depth0.Pass : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"Pass","hash":{},"data":data}) : helper)))
    + "\">\n          </fieldset>\n        </div>\n        <div class=\"input-h-group\">\n          <fieldset class=\"input-group\" style=\"width:100%\">\n            <input style=\"float:left\" name=\"SASL\" type=\"checkbox\""
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.SASL : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ">\n            <label style=\"float:left;width:auto\" for=\"sasl\">Require SASL</label>\n          </fieldset>\n        </div>\n        <hr>\n        <fieldset class=\"input-group\">\n          <label for=\"channels\">Channels\n            <span>(comma separated)</span>\n          </label>\n          <input name=\"Channels\" type=\"text\" value=\""
    + alias4(((helper = (helper = helpers.Channels || (depth0 != null ? depth0.Channels : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"Channels","hash":{},"data":data}) : helper)))
    + "\">\n        </fieldset>\n        <fieldset class=\"input-group\">\n          <label for=\"highlight\">Highlight words (comma separated)</label>\n          <input name=\"Highlight\" type=\"text\" value=\""
    + alias4(((helper = (helper = helpers.Highlight || (depth0 != null ? depth0.Highlight : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"Highlight","hash":{},"data":data}) : helper)))
    + "\">\n        </fieldset>\n        <fieldset class=\"input-group\">\n          <label for=\"alias\">Network alias</label>\n          <input name=\"Alias\" type=\"text\" value=\""
    + alias4(((helper = (helper = helpers.Alias || (depth0 != null ? depth0.Alias : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"Alias","hash":{},"data":data}) : helper)))
    + "\">\n        </fieldset>\n\n        <fieldset class=\"submit-group\">\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.edit : depth0),{"name":"if","hash":{},"fn":container.program(7, data, 0),"inverse":container.program(9, data, 0),"data":data})) != null ? stack1 : "")
    + "          <p style=\"float:right\" class=\"note\"><span class=\"required\">*</span> required</p>\n        </fieldset>\n      </form>\n    </section>\n\n";
},"useData":true});
templates['nav_item'] = template({"1":function(container,depth0,helpers,partials,data) {
    return "<a class=\"fa fa-pencil edit edit-panel\" title=\"Edit\"></a>";
},"3":function(container,depth0,helpers,partials,data) {
    var helper;

  return "<a class=\"fa fa-times close-panel\" title=\"Close\"></a><a class=\"fa fa-file-text-o panel-log\" title=\"View logs\" href=\""
    + container.escapeExpression(((helper = (helper = helpers.logs || (depth0 != null ? depth0.logs : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"logs","hash":{},"data":data}) : helper)))
    + "\" target=\"_blank\"></a>";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "<li data-panel-id=\""
    + alias4(((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"id","hash":{},"data":data}) : helper)))
    + "\"><a class=\"panel-name\">"
    + alias4(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + "</a>"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.status : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.program(3, data, 0),"data":data})) != null ? stack1 : "")
    + "</li>\n";
},"useData":true});
templates['date_separator'] = template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "<div class=\"date-separator\">\n  <div class=\"date-wrap\">\n    <time>"
    + alias4(((helper = (helper = helpers.day || (depth0 != null ? depth0.day : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"day","hash":{},"data":data}) : helper)))
    + " "
    + alias4(((helper = (helper = helpers.month || (depth0 != null ? depth0.month : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"month","hash":{},"data":data}) : helper)))
    + " "
    + alias4(((helper = (helper = helpers.date || (depth0 != null ? depth0.date : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"date","hash":{},"data":data}) : helper)))
    + ", "
    + alias4(((helper = (helper = helpers.year || (depth0 != null ? depth0.year : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"year","hash":{},"data":data}) : helper)))
    + "</time>\n  </div>\n  <hr>\n</div>\n";
},"useData":true});
templates['emoji'] = template({"1":function(container,depth0,helpers,partials,data) {
    var alias1=container.lambda, alias2=container.escapeExpression;

  return "<li data-chars=\""
    + alias2(alias1((depth0 != null ? depth0.chars : depth0), depth0))
    + "\" data-keywords=\""
    + alias2(alias1((depth0 != null ? depth0.keywords : depth0), depth0))
    + "\" data-name=\""
    + alias2(alias1((depth0 != null ? depth0.name : depth0), depth0))
    + "\" title=\""
    + alias2(alias1((depth0 != null ? depth0.name : depth0), depth0))
    + "\">"
    + alias2(alias1((depth0 != null ? depth0.chars : depth0), depth0))
    + "</li>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.emoji : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"useData":true});
})();
