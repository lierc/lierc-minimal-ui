var Panel = function(name, id, connection, mobile) {
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
  panel.monospace_nicks = [];
  panel.ignore_events = false;
  panel.collapse_embeds = false;
  panel.show_nicklist = false;
  panel.first_focus = true;
  panel.last_seen = null;
  panel.path = window.location.pathname + "#/" + connection.id + "/" + encodeURIComponent(name);
  panel.observers = {};

  panel.mode = "";
  panel.network = connection.config.Host;
  panel.mobile = mobile;

  panel.change_name = function(name) {
    panel.name = name;
    panel.update_nav();
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
      var prefix = "" + (pos != -1 ? pos : order.length);
      return [n, prefix + n.toLowerCase()];
    }).sort(function(a, b) {
      return a[1] < b[1]
        ? -1 : a[1] > b[1]
          ? 1 : 0;
    });

    var list = panel.elem.nicks.get(0);
    var items = list.childNodes;
    var l = items.length;
    var del = [];

    for (var i=0; i < l; i++) {
      var a = items[i].childNodes[0];
      var nick = a.getAttribute('data-nick');
      if (!(nick in nicks)) {
        del.push(items[i]);
      }
    }

    var sorted_len = display_sorted.length;

    for (var i=0; i < sorted_len; i++) {
      var nick = display_sorted[i][0];
      var order = display_sorted[i][1];
      var inserted = false;

      for (var j=0; j < l; j++) {
        var item = items[j];
        var a = item.childNodes[0];
        var n = a.getAttribute('data-nick');
        var o = a.getAttribute('data-nick-order');

        if (n == nick) {
          var text = a.textContent;
          var display = nicks[nick] + nick;
          if (text != display) {
            a.textContent = display;
            a.setAttribute('data-nick-order', order);
          }
          inserted = true;
          break;
        }
        else if (o > order) {
          var li = document.createElement('LI');
          var a = document.createElement('A');
          a.setAttribute('class', 'nick-list-nick');
          a.setAttribute('data-nick', nick);
          a.setAttribute('data-nick-order', order);
          a.textContent = nicks[nick] + nick;
          li.appendChild(a);
          list.insertBefore(li, item);
          inserted = true;
          break;
        }
      }

      if (!inserted) {
        var li = document.createElement('LI');
        var a = document.createElement('A');
        a.setAttribute('class', 'nick-list-nick');
        a.setAttribute('data-nick', nick);
        a.setAttribute('data-nick-order', order);
        a.textContent = nicks[nick] + nick;
        li.appendChild(a);
        list.appendChild(li);
      }
    }

    for (var i=0; i < del.length; i++) {
      list.removeChild(del[i]);
    }

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
    if (! panel.mobile)
      panel.elem.input.focus();
    panel.unread = false;
    panel.missed = false;
    panel.highlighted = false;
    panel.update_nav();
    panel.scroll(true);
    setTimeout(function() { panel.scroll(true) } , 10);
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

    var prefix = panel.name;
    var title = panel.network;

    if (panel.mode) {
      prefix += " (+" + panel.mode + ")";
      title += " (+" + panel.mode + ")";
    }

    panel.elem.prefix.text(prefix);
    panel.elem.prefix.attr("title", panel.network);
    panel.elem.nav.attr("title", title);
    panel.elem.nav.attr("data-name", panel.name);
  };

  panel.update_seen = function() {
    var id = panel.latest_message_id();
    if (id)
      panel.last_seen = id;
  };

  panel.unfocus = function() {
    panel.update_seen();
    panel.focused = false;
    panel.elem.nav.removeClass("active");
    panel.remove_observers(panel.elem.list);
    panel.elem.list.get(0).innerHTML = '';
    panel.elem.nicks.get(0).innerHTML = '';
    panel.backlog_empty = false;
  };

  panel.prepend = function(els) {
    var list = panel.elem.list.get(0);
    var height = panel.inner.getBoundingClientRect().height;
    els.addClass('loading');

    var prev_time, prev_nick, prev_mono;
    els.filter('li.chat').each(function() {
      var time = this.querySelector('time');
      if (time) {
        if (time.innerHTML == prev_time)
          time.className = "hidden";
        prev_time = time.innerHTML;
      }

      if (this.classList.contains('message')) {
        var nick = this.querySelector('.message-nick').getAttribute('data-nick');
        if (panel.monospace_nicks.indexOf(nick) != -1) {
          this.classList.add("monospace");
          if (!prev_mono) {
            this.classList.add("monospace-start");
          }
          prev_mono = true;
        }
        else {
          if (prev_mono) {
            this.previousSibling.classList.add("monospace-end");
          }
          prev_mono = false;
        }
        if (nick == prev_nick) {
          this.classList.add("consecutive");
        }
        prev_nick = nick;
      }
      else {
        if (prev_mono)
          this.previousSibling.classList.add("monospace-end");
        prev_nick = null;
        prev_mono = null;
      }
    });

    panel.scroll(function() {
      panel.elem.list.prepend(els);
    });

    els.addClass('loaded');

    var diff = panel.inner.getBoundingClientRect().height - height;
    panel.scroller.scrollTop += diff;
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
    var li = $(a).parents('li');
    var wrap = $('<div/>', {'class': 'embed-wrap-wrap'});
    var inner = $('<div/>', {
      'class': 'embed-wrap',
      'data-embed-provider': embed.provider_name.toLowerCase(),
      'data-embed-id': embed.id
    });

    wrap.append(inner);

    if (!manual && panel.collapse_embeds) {
      $(toggle).addClass('hidden');
      wrap.remove();
      return;
    }

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
    inner.append($('<h2/>').text(embed.title));

    if (embed.provider_name == "Twitter") {
      var html = embed.html.replace(/<script[^>]+>.*<\/script>/, "");;
      var blockquote = $(html);
      blockquote.removeClass("twitter-tweet");
      inner.append(blockquote)
    }
    else if (embed.description) {
      inner.append($('<p/>').text(embed.description));
    }

    inner.append($('<p/>', {
      'class': 'embed-source'
    }).text(embed.provider_name));

    panel.scroll(function() {
      li.find('.message-text').append(wrap);
      panel.resize_filler();
    });

    var wrap_el = wrap.get(0);
    var prev = wrap_el.getBoundingClientRect().height;
    panel.scroller.scrollTop += prev;

    var o = new MutationObserver(function(s) {
      var cur = wrap_el.getBoundingClientRect().height;
      if (! panel.is_scrolled()) {
        panel.scroller.scrollTop += cur - prev;
      }
      prev = cur;
    });

    var config = {
      childList: true,
      attributes: true,
      subtree: true,
      attributeFilter: ['class', 'style']
    };

    o.observe(wrap.get(0), config);
    panel.observers[embed.id] = o;
  };

  panel.is_scrolled = function() {
    return Math.abs(panel.scroller.scrollHeight - (panel.scroller.scrollTop + panel.scroller.clientHeight)) < 10;
  };

  panel.append = function(el) {
    var id = el.attr('data-message-id');
    if (id && panel.elem.list.find('li[data-message-id='+id+']').length)
      return;

    if (panel.focused) {
      panel.scroll(function(scrolled) {
        panel.elem.list.append(el);

        if (el.hasClass("chat")) {
          var nick = el.find('span[data-nick]').attr('data-nick');
          var prev = el.prev();

          if (el.hasClass("message") && prev.hasClass("message")) {
            var prev_nick = prev.find('span[data-nick]').attr('data-nick');

            if (nick == prev_nick)
              el.addClass('consecutive');
          }

          if (prev.hasClass("chat")) {
            var time = el.find("time");
            var prev_time = prev.find("time").text();
            if (time.text() == prev_time)
              time.addClass("hidden");
          }

          if (el.hasClass("message") && panel.monospace_nicks.indexOf(nick) != -1) {
            el.addClass("monospace");
            if (!prev.hasClass("monospace")) {
              el.addClass("monospace-start");
            }
          }
          else {
            if (prev.hasClass("monospace"))
              prev.addClass("monospace-end");
          }

          if (el.hasClass('message')) {
            panel.imagify(el.get(0));
            panel.vidify(el.get(0));
            panel.audify(el.get(0));
            Embed.embed_all(el.find(".message-text"), panel);
          }
        }

        panel.resize_filler();
      });
    }
    else {
      el.innerHTML = '';
    }

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
  };

  panel.resize_filler = function() {
    if (!panel.focused) return;

    var scroll = panel.scroller.getBoundingClientRect().height;
    var chat   = panel.elem.list.get(0).getBoundingClientRect().height;

    panel.elem.filler.height(Math.max(0, scroll - chat));
  };

  panel.scroll = function(cb) {
    if (cb === true) {
      if (panel.focused)
        panel.scroller.scrollTop = panel.scroller.scrollHeight;
      return;
    }

    var scrolled = panel.is_scrolled();
    if (cb)
      cb(scrolled);
    if (panel.focused && scrolled)
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
    var el = panel.elem.list.find('li[data-message-id]:last');
    if (el.length) {
      return parseInt(el.attr('data-message-id'));
    }
    return null;
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
  panel.inner = $('#panel-inner-scroll').get(0);
  panel.prune = function() {
    if (panel.focused && !panel.is_scrolled())
      return;

    var els = panel.elem.list.find('li.chat:visible:lt(-' + 200 + ')')
      .last().prevAll();

    panel.remove_observers(els);
    els.remove();
  };

  panel.remove_observers = function(els) {
    els.find('[data-embed-id]').each(function() {
      var id = this.getAttribute('data-embed-id');
      if (panel.observers[id]) {
        panel.observers[id].disconnect();
        delete panel.observers[id];
      }
    });
  };

  panel.keyboard = new Keyboard(panel.elem.input.get(0));
  setInterval(panel.prune, 1000 * 60);

  panel.img_re = /^http[^\s]*\.(?:jpe?g|gif|png|bmp|svg)[^\/]*$/i;
  panel.imagify = function (elem) {
    var links = elem.querySelectorAll("a");
    for (var i=links.length - 1; i >= 0; i--) {
      var link = links[i];
      if (link.href.match(panel.img_re)) {
        if (link.href.match(/\.gifv/)) continue;
        if (link.href.match(/#(nsfw|hide)/)) continue;
        var image = new Image();
        image.setAttribute("title", link.href);
        image.onload = (function(image, link) {
            return function(e) {
              var s = panel.scroller;
              var wrap = document.createElement('DIV');
              var a = link.cloneNode(false);
              var toggle = document.createElement('SPAN');
              a.appendChild(image);

              panel.scroll(function() {
                if (panel.collapse_embeds) {
                  toggle.setAttribute("class", "image-toggle hidden");
                  wrap.setAttribute("class", "image-wrap hidden");
                }
                else {
                  toggle.setAttribute("class", "image-toggle");
                  wrap.setAttribute("class", "image-wrap");
                }
                toggle.setAttribute("aria-hidden", "true");
                link.parentNode.insertBefore(toggle, link.nextSibling);
              });

              toggle.addEventListener("click", function(e) {
                e.preventDefault();
                panel.scroll(function() {
                  wrap.classList.toggle("hidden");
                  toggle.classList.toggle("hidden");
                });
              });

              var start = panel.scroller.scrollTop;
              wrap.appendChild(a);
              link.parentNode.appendChild(wrap);

              var diff = panel.scroller.scrollTop - start;
              panel.scroller.scrollTop += wrap.getBoundingClientRect().height - diff;
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

            panel.scroll(function() {
              if (panel.collapse_embeds) {
                toggle.setAttribute("class", "image-toggle hidden");
                wrap.setAttribute("class", "image-wrap hidden");
              }
              else {
                toggle.setAttribute("class", "image-toggle");
                wrap.setAttribute("class", "image-wrap");
              }
              toggle.setAttribute("aria-hidden", "true");
              link.parentNode.insertBefore(toggle, link.nextSibling);
            });

            toggle.addEventListener("click", function(e) {
              e.preventDefault();
              panel.scroll(function() {
                wrap.classList.toggle("hidden");
                toggle.classList.toggle("hidden");
              });
            });

            var start = panel.scroller.scrollTop;
            wrap.appendChild(video);
            link.parentNode.appendChild(wrap);

            var diff = panel.scroller.scrollTop - start;
            panel.scroller.scrollTop += wrap.getBoundingClientRect().height - diff;
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
      panel.scroll(function(scroll) {
        var reactions = li.find('.reactions');
        if (!reactions.length) {
          reactions = $('<div/>', {'class': 'reactions'});
          li.append(reactions);
        }

        reactions.prepend($('<span/>').text(reaction).attr('title', from));

        if (scroll)
          panel.resize_filler();
      });
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
    panel.scroll(function() {
      if (panel.focused) {
        if (bool) {
          panel.elem.body.addClass('hide-embeds');
          panel.elem.list.find(".embed-toggle:not(.hidden)").trigger("click");
          panel.elem.list.find(".image-toggle:not(.hidden)").trigger("click");
        }
        else {
          panel.elem.body.removeClass('hide-embeds');
          panel.elem.list.find(".embed-toggle.hidden").trigger("click");
          panel.elem.list.find(".image-toggle.hidden").trigger("click");
        }
      }

      panel.collapse_embeds = bool;

      if (panel.focused && bool)
        panel.resize_filler();
    });
  };

  panel.set_ignore_events = function(bool) {
    panel.scroll(function() {
      if (panel.focused) {
        if (bool)
          panel.elem.body.addClass('hide-events');
        else
          panel.elem.body.removeClass('hide-events');
      }

      panel.ignore_events = bool;

      if (panel.focused && bool)
        panel.resize_filler();
    });
  };

  panel.set_connected = function(bool, message) {
    panel.connected = bool;
    panel.update_nav();
  };

  panel.set_show_nicklist = function(bool) {
    panel.scroll(function() {
      if (bool)
        panel.elem.body.addClass('show-nicklist');
      else
        panel.elem.body.removeClass('show-nicklist');

      panel.show_nicklist = bool;
      panel.resize_filler();
    });
  };

  panel.add_monospace_nick = function(nick) {
    if (panel.monospace_nicks.indexOf(nick) == -1) {
      panel.monospace_nicks.push(nick);
    }
    panel.scroll(function() {
      panel.elem.list
        .find('li.message .message-nick[data-nick='+nick+']')
        .parents('li.message')
        .addClass('monospace');
    });
  };

  panel.remove_monospace_nick = function(nick) {
    var i = panel.monospace_nicks.indexOf(nick);
    if (i != -1) {
      panel.monospace_nicks.splice(i, 1);
    }
    panel.scroll(function() {
      panel.elem.list
        .find('li.message .message-nick[data-nick='+nick+']')
        .parents('li.message')
        .removeClass('monospace monospace-start monospace-end');
    });
  };

  panel.last_seen_separator = function() {
    if (panel.last_seen) {
      var msg = panel.elem.list.find('li[data-message-id='+panel.last_seen+']');
      if (msg.length) {
        var next = msg.nextAll('li.chat:visible');
        if (next.length) {
          panel.scroll(function() {
            panel.elem.list.find('.last-read').remove();
            msg.after($('<div/>', {'class':'last-read'}));
            if (msg.hasClass('monospace')) {
              msg.addClass('monospace-end');
            }
          });
        }
      }
    }
  };
};
