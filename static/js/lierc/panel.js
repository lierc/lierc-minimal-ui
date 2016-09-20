var Panel = function(name, id, connection) {
  var panel = this;

  panel.name = name;
  panel.id = id;
  panel.connection = connection;
  panel.unread = false;
  panel.missed = false;
  panel.highlighted = false;
  panel.type = determine_panel_type(name);
  panel.focused = false;
  panel.backlog_empty = false;
  panel.reactions = [];

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
    var sorted = nicks.map(function(n) {
      return [n, n.toLowerCase()];
    }).sort(function(a, b) {
      return a[1] < b[1]
        ? -1 : a[1] > b[1]
          ? 1 : 0;
    }).map(function(n) {
      return n[0];
    });

    panel.elem.nicks.html( sorted.map(function(nick) {
      return $('<li/>').append(
        $('<a/>', {
          'class': 'nick-list-nick',
          'title': nick,
          'data-nick': nick
        }).text(nick)
      );
    }));
    panel.keyboard.completion.completions = sorted;
  };

  panel.focus = function() {
    panel.focused = true;
    panel.resize_filler();
    if (!("ontouchstart" in document.documentElement))
      panel.elem.input.focus();
    panel.unread = false;
    panel.missed = false;
    panel.highlighted = false;
    panel.update_nav();
    panel.scroll();
    setTimeout(function() { panel.scroll() } , 10);
  };

  panel.build_nav = function() {
    var el = $('<li/>', {'data-panel-id': id});
    var name = $('<a/>', {'class':'panel-name'}).text(panel.name);
    el.append(name);
    if (panel.type == "status") {
      var edit = $('<a/>', {'class':'fa fa-pencil edit-panel'});
      el.append(edit);
    }
    else {
      var close = $('<a/>', {'class':'fa fa-times close-panel'});
      el.append(close);
    }
    return el;
  };

  panel.update_nav = function() {
    panel.elem.nav.find('.panel-name').text(panel.name);

    if (panel.focused) {
      panel.elem.nav.addClass('active');
      panel.elem.nav.removeClass('unread missed highlighted');
    }
    else {
      panel.elem.nav.removeClass('active');
      if (panel.unread)
        panel.elem.nav.addClass('unread');
      if (panel.missed)
        panel.elem.nav.addClass('missed');
      if (panel.highlighted)
        panel.elem.nav.addClass('highlighted');
    }
  };

  panel.unfocus = function() {
    panel.focused = false;
    panel.elem.nav.removeClass("active");
    panel.elem.list.remove();
    panel.elem.list = $('<ol/>');
    panel.backlog_empty = false;
  };

  panel.prepend = function(el, target) {
    var height = liercd.elem.scroll.scrollHeight;
    var scroll = liercd.elem.scroll.scrollTop;
    el.css('opacity', '0');

    var prev;

    if (target)
      target.prepend(el);
    else
      panel.elem.list.prepend(el);

    el.css('opacity', '1');
    var diff = liercd.elem.scroll.scrollHeight - height;
    liercd.elem.scroll.scrollTop = scroll + diff;
    panel.resize_filler();

    panel.imagify(el.get(0), false);
    Embed.embed_all(el.find(".message-text"), panel);
  };

  panel.embed = function(a, embed) {
    var height = liercd.elem.scroll.scrollHeight;
    var scroll = liercd.elem.scroll.scrollTop;

    var li = $(a).parents('li');
    var wrap = $('<div/>', {
      'class': 'embed-wrap',
      'data-embed-provider': embed.provider_name.toLowerCase()
    });

    if (embed.provider_name == "Twitter") {
      wrap.html(embed.html).addClass("open");
    }
    else {
      if (embed.thumbnail_url) {
        var img = $('<div/>', {
          'class': 'embed-thumb'
        }).css({
          "background-image": "url(//noembed.com/i/0/450/" + embed.thumbnail_url + ')',
        });
        img.append($('<div/>', {
          'class': 'embed-play'
        }));
        wrap.append(img);
      }
      wrap.attr('data-embed', embed.html);
      wrap.append($('<h2/>').text(embed.title));
      if (embed.description)
        wrap.append($('<p/>').text(embed.description));
      wrap.append($('<p/>', {
        'class': 'embed-source'
      }).text(embed.provider_name));
    }

    li.find('.message-text').append(wrap);

    var diff = liercd.elem.scroll.scrollHeight - height;
    liercd.elem.scroll.scrollTop = scroll + diff;
    panel.resize_filler();

    var wrap_el = wrap.get(0);
    var prev = wrap_el.getBoundingClientRect().height;

    var o = new MutationObserver(function(s) {
      var cur = wrap_el.getBoundingClientRect().height;
      if (! panel.is_scrolled())
        liercd.elem.scroll.scrollTop += cur - prev;
      prev = cur;
    });

    var config = {
      childList: true,
      attributes: true,
      subtree: true,
      attributeFilter: ['class', 'style']
    };

    o.observe(wrap.get(0), config);
  };

  panel.is_scrolled = function() {
    if (panel.scroller.scrollHeight <= panel.scroller.offsetHeight)
      return true;
    var diff = panel.scroller.scrollTop - (panel.scroller.scrollHeight - panel.scroller.offsetHeight);
    return Math.abs(diff) <= 1;
  };

  panel.append = function(el, highlight) {
    var id = el.attr('data-message-id');
    if (id && panel.elem.list.find('li[data-message-id='+id+']').length)
      return;

    var scrolled = panel.is_scrolled();
    panel.imagify(el.get(0));
    panel.elem.list.append(el);

    var nick = el.find('span[data-nick]').attr('data-nick');
    var prev = el.prev().find('span[data-nick]').attr('data-nick');

    if (nick == prev)
      el.addClass('consecutive');

    if (panel.focused && scrolled) {
      panel.scroll();
    }
    else {
      if (el.hasClass("message")) {
        panel.unread = true;
        if (highlight)
          panel.highlighted = true;
        panel.update_nav();
      }
      else if (el.hasClass("event")) {
        panel.missed = true;
        panel.update_nav();
      }
    }

    panel.resize_filler();
    Embed.embed_all(el.find(".message-text"), panel);
  };

  panel.resize_filler = function() {
    if (!panel.focused) return;

    var scroll = panel.scroller.getBoundingClientRect().height;
    var chat   = panel.elem.list.get(0).getBoundingClientRect().height;

    panel.elem.filler.height(Math.max(0, scroll - chat));
  };

  panel.scroll = function() {
    panel.scroller.scrollTop = panel.scroller.scrollHeight;
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
    nav: panel.build_nav(),
  };

  panel.scroller = $('#panel-scroll').get(0);
  panel.prune = function() {
    if (panel.focused && !panel.is_scrolled())
      return;

    var l = panel.elem.list.find('li.chat:gt(' + 200 + ')').length;

    if (l) {
      panel.elem.list.find('li.chat:lt(' + l + ')').remove();
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
        image.src = "https://noembed.com/i/0/600/" + link.href;
      }
    }
  };

  panel.react_backlog_check = function() {
    panel.reactions.forEach(function(reaction, i) {
      var li = panel.elem.list.find('li[data-message-hash='+reaction[1]+']');
      if (li.length) {
        panel.handle_reaction.apply(panel, reaction);
        panel.reactions.slice(i, 1);
      }
    });
  };

  panel.handle_reaction = function(from, hash, reaction) {
    var li = panel.elem.list.find('li[data-message-hash=' + hash + ']');

    if (li.length) {
      var scroll = panel.is_scrolled();

      var reactions = li.find('.reactions');
      if (!reactions.length) {
        reactions = $('<div/>', {'class': 'reactions'});
        li.append(reactions);
      }

      reactions.prepend($('<span/>').text(reaction).attr('title', from));

      if (scroll) {
        panel.resize_filler();
        panel.scroll();
      }
    }
    else {
      panel.reactions.push([from, hash, reaction]);
    }
  };
};
