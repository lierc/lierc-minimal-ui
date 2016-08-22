var Panel = function(name, id, connection) {
  var panel = this;

  panel.name = name;
  panel.id = id;
  panel.connection = connection;
  panel.unread = 0;
  panel.missed = 0;
  panel.type = determine_panel_type(name);
  panel.focused = false;
  panel.backlog_empty = false;
  panel.nicks = [];

  panel.change_name = function(name) {
    panel.name = name;
    panel.update_nav();
    panel.elem.prefix.text(name);
  };

  function determine_panel_type(name) {
    if (name == "status") return "status";
    if (name.match(/^[#&+!]/)) return "channel";
    return "private";
  }
  
  panel.update_nicks = function(nicks) {
    panel.elem.nicks.html( nicks.sort().map(function(nick) {
      return $('<li/>').append(
        $('<a/>', {
          'class': 'nick-list-nick',
          'title': nick,
          'data-nick': nick
        }).text(nick)
      );
    }));
    panel.keyboard.completion.completions = nicks;
  };

  panel.focus = function() {
    panel.focused = true;
    panel.resize_filler();
    if (!("ontouchstart" in document.documentElement))
      panel.elem.input.focus();
    panel.unread = 0;
    panel.missed = 0;
    panel.update_nav();
    panel.scroll();
  };

  panel.build_nav = function() {
    var el = $('<li/>', {'data-panel-id': id});
    var name = $('<a/>', {'class':'panel-name'}).text(panel.name);
    var pill = $('<span/>', {'class':'pill'});
    name.append(pill);
    el.append(name);
    return el;
  };

  panel.update_nav = function() {
    panel.elem.nav.find('.panel-name').text(panel.name);
    panel.elem.nav.find('.pill').text(panel.unread);

    if (panel.unread)
      panel.elem.nav.addClass('unread');
    else
      panel.elem.nav.removeClass('unread');

    if (panel.missed)
      panel.elem.nav.addClass('missed');
    else
      panel.elem.nav.removeClass('missed');

    if (panel.focused)
      panel.elem.nav.addClass('active');
    else
      panel.elem.nav.removeClass('active');
  };

  panel.incr_unread = function() {
    panel.unread++;
    if (panel.unread > 10)
      panel.unread = "10+"
    panel.update_nav();
  };

  panel.incr_missed = function() {
    panel.missed++;
    panel.update_nav();
  }

  panel.unfocus = function() {
    panel.focused = false;
    panel.elem.nav.removeClass("active");
  };

  panel.prepend = function(el) {
    var height = liercd.elem.scroll.scrollHeight;
    var scroll = liercd.elem.scroll.scrollTop;
    el.css({'opacity': '0'});

    panel.elem.list.prepend(el);

    el.css({'opacity': '1'});
    var diff = liercd.elem.scroll.scrollHeight - height;
    liercd.elem.scroll.scrollTop = scroll + diff;
    panel.resize_filler();

    panel.imagify(el.get(0), false);
  };

  panel.is_scrolled = function() {
    if (panel.scroller.scrollHeight <= panel.scroller.offsetHeight)
      return true;
    return panel.scroller.scrollTop == panel.scroller.scrollHeight - panel.scroller.offsetHeight;
  };

  panel.append = function(el) {
    var scrolled = panel.is_scrolled();
    panel.imagify(el.get(0));
    panel.elem.list.append(el);

    if (panel.focused && scrolled) {
      panel.scroll();
    }
    else {
      if (el.hasClass("message"))
        panel.incr_unread();
      else (el.hasClass("event"))
        panel.incr_missed();
    }

    panel.resize_filler();
  };

  panel.resize_filler = function() {
    if (!panel.focused) return;

    panel.elem.filler.height(
      Math.max(0, panel.scroller.offsetHeight - panel.elem.list.outerHeight())
    );
  };

  panel.scroll = function() {
    panel.scroller.scrollTop = panel.scroller.scrollHeight;
  };

  panel.own_message = function(nick, text) {
    var el = Render({
      Time: (new Date()).getTime() / 1000,
      Prefix: {Name: nick},
      Params: [panel.name, text],
      Command: "PRIVMSG"
    });
    panel.append(el);
    return el;
  };

  panel.stream_status_change = function(connected) {
    var li = $('<li/>', {'class':'status-change'});
    if (connected)
      li.text("Connected to lierc.");
    else
      li.text("Disconnected from lierc. Reconnecting…");

    panel.append(li);
  };

  panel.latest_message_id = function() {
    return panel.elem.list.find('li[data-message-id]:last').attr('data-message-id');
  };

  panel.oldest_message_id = function() {
    return panel.elem.list.find('li[data-message-id]:first').attr('data-message-id');
  };

  panel.update_topic = function(text) {
    panel.elem.topic.html(Format(text));
    linkify(panel.elem.topic.get(0));
  };

  panel.elem = {
    input: $('<input/>', {
      'type': 'text',
      'data-panel-id': id
    }),
    list: $('<ol/>'),
    nicks: $('<ul/>'),
    topic: $('<p>No topic set</p>'),
    filler: $('<div/>', {'class':'filler'}),
    prefix: $('<span/>').text(panel.name),
    nav: panel.build_nav()
  };

  panel.scroller = $('#panel-scroll').get(0);
  panel.prune = function() {
    if (panel.focused && !panel.is_scrolled())
      return;

    var l = panel.elem.list.find('li:gt(' + 200 + ')').length;
    if (l) {
      panel.elem.list.find('li:lt(' + l + ')').remove();
      panel.elem.list.find('.backlog-block:empty').remove();
    }
  };

  panel.keyboard = new Keyboard(panel.elem.input.get(0));
  panel.pruner = setInterval(panel.prune, 1000 * 60);

  panel.img_re = /^http[^\s]*\.(?:jpe?g|gif|png|bmp|svg)[^\/]*$/i;
  panel.imagify = function (elem) {
    var links = elem.querySelectorAll("a");
    for (var i=links.length - 1; i >= 0; i--) {
      var link = links[i];
      if (link.href.match(panel.img_re)) {
        if (link.href.match(/\.gifv/)) continue;
        var image = new Image();
        image.onload = (function(image, link) {
            return function(e) {
              var s = panel.scroller;
              var start = s.scrollHeight;
              var wrap = document.createElement('DIV');
              link.parentNode.appendChild(wrap);
              link.parentNode.removeChild(link);
              wrap.appendChild(link);
              link.innerHTML = "";
              link.appendChild(image);
              wrap.className = "image-wrap";
              var end = s.scrollHeight
              panel.scroller.scrollTop += end - start;
            };
        })(image, link);
        image.src = "https://noembed.com/i/0/400/" + link.href;
      }
    }
  };
};
