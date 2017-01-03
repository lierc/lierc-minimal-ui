var Panel = function(name, id, connection) {
  var panel = this;

  panel.name = name;
  panel.id = id;
  panel.connection = connection.id;
  panel.unread = false;
  panel.missed = false;
  panel.connected = connection.connected;
  panel.highlighted = false;
  panel.type = determine_panel_type(name, connection.chantypes);
  panel.focused = false;
  panel.backlog_empty = false;
  panel.reactions = [];
  panel.ignore_events = false;
  panel.collapse_embeds = false;
  panel.show_nicklist = false;
  panel.first_focus = true;
  panel.last_seen = null;
  panel.path = window.location.pathname + "#/" + connection.id + "/" + encodeURIComponent(name);

  panel.mode = "";
  panel.network = connection.config.Host;

  panel.change_name = function(name) {
    panel.name = name;
    panel.update_nav();
    panel.elem.prefix.text(name);
  };

  function determine_panel_type(name, chantypes) {
    if (name == "status") return "status";
    if (chantypes.indexOf(name[0]) != -1) return "channel";
    return "private";
  }

  panel.update_mode = function(mode) {
    panel.mode = mode;
    panel.update_nav();
  };
  
  panel.update_nicks = function(nicks) {
    var order = [ "@", "+" ];
    var sorted = Object.keys(nicks).map(function(n) {
      return [n, n.toLowerCase()];
    }).sort(function(a, b) {
      return a[1] < b[1]
        ? -1 : a[1] > b[1]
          ? 1 : 0;
    }).map(function(n) {
      return n[0];
    });

    var display_sorted = sorted.map(function(n) {
      var pos = order.indexOf(nicks[n]);
      var prefix = "" + (pos != -1 ? pos : "");
      return [n, prefix + n.toLowerCase()];
    }).sort(function(a, b) {
      return a[1] < b[1]
        ? -1 : a[1] > b[1]
          ? 1 : 0;
    }).map(function(n) {
      return n[0];
    });

    panel.elem.nicks.html( display_sorted.map(function(nick) {
      return $('<li/>').append(
        $('<a/>', {
          'class': 'nick-list-nick',
          'data-nick': nick
        }).text(nicks[nick] + nick)
      );
    }));
    panel.keyboard.completion.completions = sorted;
  };

  panel.focus = function() {
    if (panel.ignore_events)
      panel.elem.body.addClass('hide-events');
    else
      panel.elem.body.removeClass('hide-events');

    if (panel.collapse_embeds)
      panel.elem.body.addClass('hide-embeds');
    else
      panel.elem.body.removeClass('hide-embeds');

    if (panel.show_nicklist)
      panel.elem.body.addClass('show-nicklist');
    else
      panel.elem.body.removeClass('show-nicklist');

    panel.first_focus = false;
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
      panel.elem.nav.removeClass('unread missed highlighted disconnected');
      if (! panel.connected)
        panel.elem.nav.addClass('disconnected');
    }
    else {
      panel.elem.nav.removeClass('active');
      if (panel.unread)
        panel.elem.nav.addClass('unread');
      if (panel.missed)
        panel.elem.nav.addClass('missed');
      if (panel.highlighted)
        panel.elem.nav.addClass('highlighted');

      if (panel.connected)
        panel.elem.nav.removeClass('disconnected');
      else
        panel.elem.nav.addClass('disconnected');
    }

    var title = panel.network;
    if (panel.mode) title += " (+" + panel.mode + ")";

    panel.elem.prefix.attr("title", title);
    panel.elem.nav.attr("title", title);
  };

  panel.update_seen = function() {
    panel.last_seen = panel.latest_message_id();
  };

  panel.unfocus = function() {
    panel.update_seen();
    panel.focused = false;
    panel.elem.nav.removeClass("active");
    panel.elem.list.remove();
    panel.elem.list = $('<ol/>');
    panel.backlog_empty = false;
  };

  panel.prepend = function(els, target) {
    var height = liercd.elem.scroll.scrollHeight;
    var scroll = liercd.elem.scroll.scrollTop;
    els.css('opacity', '0');

    var prev;
    els.filter('li.chat').each(function() {
      if (this.className.indexOf('message') != -1) {
        var time = this.querySelector('time');
        if (time) {
          if (time.innerHTML == prev)
            time.className = "hidden";
          prev = time.innerHTML;
        }
      }
      else {
        prev = null;
      }
    });

    if (target)
      target.prepend(els);
    else
      panel.elem.list.prepend(els);

    setTimeout(function(){
      els.css('opacity', '1')
    }, 0);
    var diff = liercd.elem.scroll.scrollHeight - height;
    liercd.elem.scroll.scrollTop = scroll + diff;
    panel.resize_filler();

    for (var i=0; i < els.length; i++) {
      panel.imagify(els.get(i), false);
      panel.vidify(els.get(i), false);
      panel.audify(els.get(i), false);
    }

    Embed.embed_all(els.find(".message-text"), panel);

    panel.last_seen_separator();
  };

  panel.embed = function(a, embed, manual) {
    var toggle = document.createElement('SPAN');
    toggle.setAttribute("class", "embed-toggle");
    toggle.setAttribute("aria-hidden", "true");
    a.parentNode.insertBefore(toggle, a.nextSibling);

    var li = $(a).parents('li');
    var wrap = $('<div/>', {
      'class': 'embed-wrap-wrap',
      'data-embed-provider': embed.provider_name.toLowerCase()
    });
    var inner = $('<div/>', {'class': 'embed-wrap'});
    wrap.append(inner);

    var temp;

    toggle.addEventListener("click", function(e) {
      e.preventDefault();
      $(toggle).toggleClass('hidden');
      if ($(toggle).hasClass('hidden')) {
        wrap.remove();
      }
      else {
        $(toggle).remove();
        panel.embed(a, embed, true);
      }
    });

    if (!manual && panel.collapse_embeds) {
      $(toggle).addClass('hidden');
      wrap.remove();
      return;
    }

    var show = ["Twitter"];
    if (show.indexOf(embed.provider_name) != -1) {
      inner.html(embed.html).addClass("open");
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
        inner.append(img);
      }
      wrap.attr('data-embed', embed.html);
      inner.append($('<h2/>').text(embed.title));
      if (embed.description)
        inner.append($('<p/>').text(embed.description));
      inner.append($('<p/>', {
        'class': 'embed-source'
      }).text(embed.provider_name));
    }

    li.find('.message-text').append(wrap);

    var wrap_el = wrap.get(0);
    var prev = wrap_el.getBoundingClientRect().height;
    liercd.elem.scroll.scrollTop += prev;

    panel.resize_filler();

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

  panel.append = function(el) {
    var id = el.attr('data-message-id');
    if (id && panel.elem.list.find('li[data-message-id='+id+']').length)
      return;

    var scrolled = panel.is_scrolled();
    panel.imagify(el.get(0));
    panel.vidify(el.get(0));
    panel.audify(el.get(0));
    panel.elem.list.append(el);

    if (el.hasClass("chat")) {
      var prev = el.prev();

      if (prev.hasClass("chat")) {
        var nick = el.find('span[data-nick]').attr('data-nick');
        var prev_nick = prev.find('span[data-nick]').attr('data-nick');

        if (nick == prev_nick)
          el.addClass('consecutive');

        var time = el.find("time");
        var prev_time = prev.find("time").text();
        if (time.text() == prev_time)
          time.addClass("hidden");
      }
    }

    if (panel.focused && scrolled) {
      panel.scroll();
    }
    else {
      if (el.hasClass("message")) {
        panel.unread = true;
        if (el.hasClass("highlight"))
          panel.highlighted = true;
        panel.update_nav();
      }
      else if (el.hasClass("event") && ! panel.ignore_events) {
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

  panel.set_disabled = function(bool) {
    if (bool) {
      panel.elem.input.attr('contenteditable', 'false');
      panel.elem.input.addClass('disabled');
    }
    else {
      panel.elem.input.attr('contenteditable', 'true');
      panel.elem.input.removeClass('disabled');
    }
  };

  panel.latest_message_id = function() {
    return parseInt(panel.elem.list.find('li[data-message-id]:last').attr('data-message-id'));
  };

  panel.oldest_message_id = function() {
    return panel.elem.list.find('li[data-message-id]:first').attr('data-message-id');
  };

  panel.update_topic = function(topic) {
    panel.elem.topic.html(Format(topic.value));
    linkify(panel.elem.topic.get(0));

    if (topic.user && topic.time) {
      var date = (new Date(topic.time * 1000));
      panel.elem.topic.attr("title", "set by " + topic.user + " on " + date);
    }
  };

  panel.elem = {
    input: $('<div/>', {
      'contenteditable': 'true',
      'class': 'input',
      'data-panel-id': id
    }),
    list: $('<ol/>'),
    nicks: $('<ul/>'),
    topic: $('<p>No topic set</p>'),
    filler: $('<div/>', {'class':'filler'}),
    prefix: $('<span/>').text(panel.name),
    nav: panel.build_nav(),
    body: $('body')
  };

  panel.scroller = $('#panel-scroll').get(0);
  panel.prune = function() {
    if (panel.focused && !panel.is_scrolled())
      return;

    var l = panel.elem.list.find('li.chat:visible:gt(' + 200 + ')').length;

    if (l) {
      panel.elem.list.find('li.chat:visible:lt(' + l + ')').remove();
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
        if (link.href.match(/#(nsfw|hide)/)) continue;
        var image = new Image();
        image.setAttribute("title", link);
        image.onload = (function(image, link) {
            return function(e) {
              var s = panel.scroller;
              var wrap = document.createElement('DIV');
              var a = link.cloneNode(false);

              var toggle = document.createElement('SPAN');
              if (panel.collapse_embeds) {
                toggle.setAttribute("class", "embed-toggle hidden");
                wrap.setAttribute("class", "image-wrap hidden");
              }
              else {
                toggle.setAttribute("class", "embed-toggle");
                wrap.setAttribute("class", "image-wrap");
              }
              toggle.setAttribute("aria-hidden", "true");
              link.parentNode.insertBefore(toggle, link.nextSibling);

              toggle.addEventListener("click", function(e) {
                e.preventDefault();
                var scroll = panel.is_scrolled();
                $(wrap).toggleClass("hidden");
                $(toggle).toggleClass("hidden");
                if (scroll) panel.scroll();
              });

              link.parentNode.appendChild(wrap);
              a.appendChild(image);

              wrap.appendChild(a);
              panel.scroller.scrollTop += wrap.getBoundingClientRect().height;
            };
        })(image, link);
        image.src = "https://noembed.com/i/0/600/" + link.href;
      }
    }
  };
  panel.vid_re = /^http[^\s]*\.(?:gifv|mp4)[^\/]*$/i;
  panel.vidify = function(elem) {
    var links = elem.querySelectorAll("a");
    for (var i=links.length - 1; i >= 0; i--) {
      var link = links[i];
      if (link.href.match(panel.vid_re)) {
        if (link.href.match(/i\.imgur\.com\/[^\/\.]+\.gifv/))
          link.href = link.href.replace('.gifv', '.mp4');
        if (link.href.match(/http:\/\/i\.imgur\.com/))
          link.href = link.href.replace(/^http/, 'https');

        var video = document.createElement('VIDEO');
        video.controls = "controls";
        video.preload = "metadata";

        video.addEventListener('loadeddata', (function(video, link) {
          return function(e) {
            var s = panel.scroller;
            var wrap = document.createElement('DIV');

            var toggle = document.createElement('SPAN');
            if (panel.collapse_embeds) {
              toggle.setAttribute("class", "embed-toggle hidden");
              wrap.setAttribute("class", "image-wrap hidden");
            }
            else {
              toggle.setAttribute("class", "embed-toggle");
              wrap.setAttribute("class", "image-wrap");
            }
            toggle.setAttribute("aria-hidden", "true");
            link.parentNode.insertBefore(toggle, link.nextSibling);

            toggle.addEventListener("click", function(e) {
              e.preventDefault();
              var scroll = panel.is_scrolled();
              $(wrap).toggleClass("hidden");
              $(toggle).toggleClass("hidden");
              if (scroll) panel.scroll();
            });

            link.parentNode.appendChild(wrap);
            wrap.appendChild(video);
            panel.scroller.scrollTop += wrap.getBoundingClientRect().height;
          };
        })(video, link), false);

        video.src = link.href;
        video.load();
      }
    }
  };

  panel.aud_re = /^http[^\s]*\.(?:mp3|wav|aac|m4a)[^\/]*$/i;
  panel.audify = function(elem) {
    var links = elem.querySelectorAll("a");
    for (var i=links.length - 1; i >= 0; i--) {
      var link = links[i];
      if (link.href.match(panel.aud_re)) {
        var audio = document.createElement('AUDIO');
        audio.controls = "controls";

        audio.addEventListener('loadeddata', (function(audio, link) {
          return function(e) {
            var s = panel.scroller;
            var start = s.scrollHeight;
            var wrap = document.createElement('DIV');
            link.parentNode.appendChild(wrap);
            link.parentNode.removeChild(link);
            wrap.appendChild(link);
            link.innerHTML = "";
            link.appendChild(audio);
            wrap.className = "image-wrap";
            var end = s.scrollHeight
            panel.scroller.scrollTop += end - start;
          };
        })(audio, link), false);

        audio.src = link.href;
        audio.load();
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
    if (!hash) {
      console.log(from, hash, reaction);
      return;
    }

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

  panel.set_loading = function(on) {
    if (on) {
      panel.elem.list.addClass("loading");
    }
    else {
      panel.elem.list.removeClass("loading");
    }
  };

  panel.set_collapse_embeds = function(bool) {
    var scrolled = panel.is_scrolled();

    if (panel.focused) {
      if (bool) {
        panel.elem.body.addClass('hide-embeds');
        panel.elem.list.find(".embed-toggle:not(.hidden)").trigger("click");
      }
      else {
        panel.elem.body.removeClass('hide-embeds');
        panel.elem.list.find(".embed-toggle.hidden").trigger("click");
      }
    }

    panel.collapse_embeds = bool;

    if (panel.focused) {
      if (scrolled)
        panel.scroll();
      if (bool)
        panel.resize_filler();
    }
  };

  panel.set_ignore_events = function(bool) {
    var scrolled = panel.is_scrolled();

    if (panel.focused) {
      if (bool)
        panel.elem.body.addClass('hide-events');
      else
        panel.elem.body.removeClass('hide-events');
    }

    panel.ignore_events = bool;

    if (panel.focused) {
      if (scrolled)
        panel.scroll();
      if (bool)
        panel.resize_filler();
    }
  };

  panel.set_connected = function(bool, message) {
    panel.connected = bool;
    panel.update_nav();

    if (panel.type == "status") {
      panel.append($('<li/>', {
        'class': 'chat raw'
      }).text(message));
    }
  };

  panel.set_show_nicklist = function(bool) {
    var scrolled = panel.is_scrolled();

    if (bool)
      panel.elem.body.addClass('show-nicklist');
    else
      panel.elem.body.removeClass('show-nicklist');

    panel.show_nicklist = bool;

    if (scrolled)
      panel.scroll();

    panel.resize_filler();
  };

  panel.last_seen_separator = function() {
    if (panel.last_seen) {
      var msg = panel.elem.list.find('li[data-message-id='+panel.last_seen+']');
      if (msg.length) {
        var next = msg.nextAll('li.chat:visible');
        if (next.length) {
          var scrolled = panel.is_scrolled();
          panel.elem.list.find('.last-read').remove();
          msg.after($('<div/>', {'class':'last-read'}));
          if (scrolled)
            panel.scroll();
        }
      }
    }
  };
};
