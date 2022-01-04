var Panel = function(opts) {
  var panel = this;

  panel.name = opts.name;
  panel.id = opts.id;
  panel.type = opts.type;
  panel.connection = opts.connection;
  panel.editable = opts.editable;
  panel.closable = opts.closable;
  panel.log_url = opts.log_url;
  panel.backlog_url = opts.backlog_url;
  panel.path = opts.path;
  panel.connected = opts.connected;
  panel.network = opts.network;
  panel.mobile = opts.mobile;

  panel.unread = false;
  panel.missed = false;
  panel.highlighted = false;
  panel.focused = false;
  panel.backlog_empty = false;
  panel.reactions = [];
  panel.monospace_nicks = [];
  panel.ignore_nicks = [];
  panel.ignore_events = false;
  panel.send_typing = true;
  panel.collapse_embeds = false;
  panel.pause_gifs = false;
  panel.show_nicklist = false;
  panel.first_focus = true;
  panel.last_seen = null;
  panel.oldest_message = null;
  panel.mode = "";
  panel.debounce_typing = false;

  panel.change_name = function(name) {
    panel.name = name;
    panel.update_nav();
  };

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

    var list = panel.elem.nicks;
    var items = list.querySelectorAll('li');
    var l = items.length;
    var del = [];

    for (var i=0; i < l; i++) {
      var a = items[i].querySelector('a');
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
        var a = item.querySelector('a');
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
          var html = Template('nick', {
            nick: nick,
            order: order,
            sigil: nicks[nick],
          });
          item.insertAdjacentHTML('beforebegin', html);
          inserted = true;
          break;
        }
      }

      if (!inserted) {
        var html = Template('nick', {
          nick: nick,
          order: order,
          sigil: nicks[nick],
        });
        list.insertAdjacentHTML('beforeend', html);
      }
    }

    for (var i=0; i < del.length; i++) {
      list.removeChild(del[i]);
    }
  };

  panel.focus = function() {
    if (panel.ignore_events)
      panel.elem.body.classList.add('hide-events');
    else
      panel.elem.body.classList.remove('hide-events');

    if (panel.collapse_embeds)
      panel.elem.body.classList.add('hide-embeds');
    else
      panel.elem.body.classList.remove('hide-embeds');

    if (panel.show_nicklist)
      panel.elem.body.classList.add('show-nicklist');
    else
      panel.elem.body.classList.remove('show-nicklist');

    if (panel.send_typing)
      panel.elem.body.classList.add('send-typing');
    else
      panel.elem.body.classList.remove('send-typing');

    panel.first_focus = false;
    panel.focused = true;
    panel.resize_filler();
    if (! panel.mobile)
      panel.elem.input.focus();
    panel.unread = false;
    panel.missed = false;
    panel.highlighted = false;
    panel.update_nav();
    panel.scroll_bottom(0);
    setTimeout(function() { panel.scroll_bottom(0) } , 10);
  };

  panel.build_nav = function() {
    var html = Template('nav_item', {
      name: panel.name,
      closable: panel.closable,
      editable: panel.editable,
      log_url: panel.log_url,
      id: panel.id,
    });

    var el = document.createElement('DIV');
    el.innerHTML = html;
    return el.firstChild;
  };

  panel.update_nav = function() {
    panel.elem.nav.querySelector('.panel-name').textContent = panel.name;
    panel.elem.nav.classList.remove('unread', 'missed', 'highlighted', 'disconnected');

    if (panel.focused) {
      panel.elem.nav.classList.add('active');
      if (! panel.connected)
        panel.elem.nav.classList.add('disconnected');
    }
    else {
      panel.elem.nav.classList.remove('active');
      if (panel.unread)
        panel.elem.nav.classList.add('unread');
      if (panel.missed)
        panel.elem.nav.classList.add('missed');
      if (panel.highlighted)
        panel.elem.nav.classList.add('highlighted');

      if (! panel.connected)
        panel.elem.nav.classList.add('disconnected');
    }

    if (panel.network) {
      var title = panel.network;

      if (panel.mode) {
        title += " (+" + panel.mode + ")";
      }

      panel.elem.nav.setAttribute("title", title);
    }

    panel.elem.nav.setAttribute("data-name", panel.name);
  };

  panel.update_seen = function() {
    var id = panel.latest_message_id();
    if (id)
      panel.last_seen = id;
  };

  panel.unfocus = function() {
    panel.update_seen();
    panel.focused = false;
    panel.elem.nav.classList.remove("active");
    panel.clear_lists();
    panel.backlog_empty = false;
    panel.oldest_message = null;
  };

  panel.remove_elems = function() {
    ['nav','filler','topic','nicks','input','list']
      .forEach(function(el) {
        if (panel.elem[el].parentNode)
          panel.elem[el].parentNode.removeChild(
            panel.elem[el]
          );
      });
  };

  panel.clear_lists = function() {
    var list = panel.elem.list;
    while (list.firstChild) {
      list.removeChild(list.firstChild);
    }
    var nicks = panel.elem.nicks;
    while (nicks.firstChild) {
      nicks.removeChild(nicks.firstChild);
    }
  }

  panel.prepend = function(els) {
    var list = panel.elem.list;

    var prev_time, prev_nick, prev_mono;
    var length = els.length;

    for (var i=length - 1; i >= 0; i--) {
      var el = els[i];
      el.classList.add('loading');

      if (!el.matches('li.chat'))
        continue;

      var id = el.getAttribute('data-message-id');
      if (id && panel.elem.list.querySelectorAll('li[data-message-id="'+id+'"]').length)
        continue;

      var time = el.querySelector('time');
      if (time) {
        if (time.innerHTML == prev_time)
          time.className = "hidden";
        prev_time = time.innerHTML;
      }

      if (el.classList.contains('message')) {
        var nick = el.querySelector('.message-nick').getAttribute('data-nick');
        if (panel.monospace_nicks.indexOf(nick) != -1) {
          el.classList.add("monospace");
          if (!prev_mono) {
            el.classList.add("monospace-start");
          }
          prev_mono = true;
        }
        else {
          if (prev_mono && els[i + 1]) {
            els[i + 1].classList.add("monospace-end");
          }
          prev_mono = false;
        }
        if (nick == prev_nick) {
          el.classList.add("consecutive");
        }
        prev_nick = nick;
      }
      else {
        if (prev_mono && els[i + 1])
          els[i + 1].classList.add("monospace-end");
        prev_nick = null;
        prev_mono = null;
      }
    }

    panel.scroll(function() {
      for (var i=0; i < els.length; i++) {
        if (list.childNodes.length) {
          list.insertBefore(els[i], list.childNodes[0]);
        }
        else {
          list.appendChild(els[i]);
        }
      }
      panel.check_dates(els, true);
    });

    requestAnimationFrame(function() {
      for(var i=0; i < els.length; i++) {
        els[i].classList.add('loaded');
      }
    });


    for (var i=0; i < els.length; i++) {
      panel.vidify(els[i])
      panel.imagify(els[i])
      panel.audify(els[i])
      panel.emojify(els[i])
    }

    Embed.embed_all(els, panel);
    panel.last_seen_separator();
  };

  panel.check_dates = function(els, prepend) {
    var len = els.length;
    var prev_ts, prev_date;

    if (prepend && panel.oldest_message) {
      prev_date = panel.oldest_message;
      prev_ts = [prev_date.getYear(), prev_date.getMonth(), prev_date.getDate()].join(":");
    }

    for (var i=0; i < len; i++) {
      if (getComputedStyle(els[i]).display == "none")
        continue;

      var time = els[i].getAttribute('data-time');
      if (time) {
        var date = new Date(time * 1000);
        var ts = [date.getYear(), date.getMonth(), date.getDate()].join(":");

        if (prev_ts && prev_ts != ts) {
          panel.insert_date_separator_before(els[i], prev_date);
        }

        prev_ts = ts;
        prev_date = date;
      }
    }

    if (prepend)
      panel.oldest_message = prev_date;
  };

  var months = [ "Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec" ];
  var days   = [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" ];
  panel.insert_date_separator_before = function(el, date) {
    if (!panel.focused)
      return;

      var sep = Template('date_separator', {
        day: days[ date.getDay() ],
        month: months[ date.getMonth() ],
        date: date.getDate(),
        year: (date.getYear() + 1900)
      });
      el.insertAdjacentHTML('afterend', sep);
  };

  panel.emojify = function(el) {
    var message = el.querySelector(".message-text");
    if (!message)
      return;
    var emojis = message.querySelectorAll("span.emoji");
    if (emojis.length != 1)
      return;
    var e = emojis[0];
    if (e.innerText.trim() != message.innerText.trim())
      return;
    panel.scroll(function() {
      var wrap = document.createElement('DIV');
      wrap.className = "emoji-wrap";
      e.parentNode.removeChild(e);
      e.className = "emoji-large";
      wrap.appendChild(e);
      message.innerHTML = '';
      message.appendChild(wrap);
    });
  };

  panel.embed = function(a, embed, manual) {
    if (!manual && panel.collapse_embeds) {
      var toggle = a.nextSibling;
      while (toggle && !toggle.classList.contains("embed-toggle")) {
        toggle = toggle.nextSibling;
      }
      if (toggle && toggle.classList.contains("embed-toggle")) {
        toggle.classList.add("hidden");
      }
      return;
    }

    var li = a.parentNode;
    while (li.nodeName != 'LI') {
      li = li.parentNode;
    }

    var use_html = false;

    if (embed.provider_name == "Twitter") {
      use_html = true;
      embed.html = new Handlebars.SafeString(
        embed.html
          .replace(/<script[^>]+>.*<\/script>/, "")
          .replace(/twitter-tweet/, "")
        );
    }
    else if (embed.provider_name == "Facebook") {
      use_html = true;
      embed.html = new Handlebars.SafeString(
        embed.html
          .replace(/<script[^>]+>.*<\/script>/, "")
        );
    }

    var html = Template('embed', {
      provider_name_lc: embed.provider_name.toLowerCase(),
      provider_name: embed.provider_name,
      id: embed.id,
      is_video: embed.type == "video",
      image: embed.image,
      thumbnail_url: embed.thumbnail_url,
      title: embed.title,
      description: embed.description,
      html: embed.html,
      use_html: use_html
    });

    panel.scroll(function() {
      li.querySelector('.message-text').insertAdjacentHTML('beforeend', html);
    });
  };

  panel.is_scrolled = function() {
    return panel.scroll_bottom() <  10;
  };

  panel.append = function(el, opts) {
    if (el === undefined)
      return;

    if (!opts)
      opts = {};

    if (panel.focused) {
      var id = el.getAttribute('data-message-id');
      if (id && panel.elem.list.querySelectorAll('li[data-message-id="'+id+'"]').length)
        return;

      var append = function() {
        panel.elem.list.appendChild(el);

        if (el.classList.contains("chat")) {
          var nick_el = el.querySelector('span[data-nick]');
          var nick = nick_el ? nick_el.getAttribute('data-nick') : "";
          var prev = el.previousSibling;

          if (el.classList.contains("message") && prev && prev.classList.contains("message")) {
            var prev_nick_el = prev.querySelector('span[data-nick]');
            var prev_nick = prev_nick_el ? prev_nick_el.getAttribute('data-nick') : "";

            if (nick == prev_nick)
              el.classList.add('consecutive');
          }

          if (prev && prev.classList.contains("chat") && !opts['skip_date']) {
            var time = el.querySelector("time");
            var prev_time = prev.querySelector("time");
            if (time && prev_time && time.textContent == prev_time.textContent)
              time.classList.add("hidden");
          }

          if (el.classList.contains("message") && panel.monospace_nicks.indexOf(nick) != -1) {
            el.classList.add("monospace");
            if (prev && !prev.classList.contains("monospace")) {
              el.classList.add("monospace-start");
            }
          }
          else {
            if (prev && prev.classList.contains("monospace"))
              prev.classList.add("monospace-end");
          }

          if (el.classList.contains('message')) {
            panel.vidify(el)
            panel.imagify(el)
            panel.audify(el)
            panel.emojify(el)
            Embed.embed_all([el], panel);
          }
        }

        if (!opts['skip_date'] && el.previousSibling) {
          panel.check_dates([el, el.previousSibling]);
        }
      };

      panel.is_scrolled() ? panel.scroll(append) :  append();
    }
    else {
      el.innerHTML = '';

      if (el.classList.contains("message")) {
        panel.unread = true;
        if (el.classList.contains("highlight"))
          panel.highlighted = true;
        panel.update_nav();
      }
      else if (el.classList.contains("event") && ! panel.ignore_events) {
        panel.missed = true;
        panel.update_nav();
      }
    }
  };

  panel.info = function(text) {
    var li = document.createElement('LI');
    li.classList.add('message', 'info', 'monospace');
    li.textContent = text;

    panel.scroll(function() {
      panel.elem.list.appendChild(li)
    });
  };

  panel.resize_filler = function() {
    if (!panel.focused) return;

    var scroll = panel.scroller.clientHeight;
    var chat   = panel.elem.list.clientHeight;

    panel.elem.filler.style.height = Math.max(0, scroll - chat) + "px";
  };

  panel.scroll_jump = 0;
  panel.scrolling = false;
  panel.scroll = function(cb) {
    var nested = panel.scrolling;
    if (! nested) {
      panel.scroll_jump = panel.scroll_bottom();
      panel.scrolling = true;
    }

    if (cb) cb();
    if (!nested) {
      if (panel.focused) {
        panel.scroll_bottom(panel.scroll_jump);
        panel.resize_filler();
      }
      panel.scrolling = false;
    }
  };

  panel.set_disabled = function(bool) {
    if (bool) {
      panel.elem.input.setAttribute('contenteditable', 'false');
      panel.elem.input.classList.add('disabled');
    }
    else {
      panel.elem.input.setAttribute('contenteditable', 'true');
      panel.elem.input.classList.remove('disabled');
    }
  };

  panel.latest_message_id = function() {
    var els = panel.elem.list.querySelectorAll('li[data-message-id]');
    if (els.length) {
      return parseInt(els[ els.length - 1 ].getAttribute('data-message-id'));
    }
    return null;
  };

  panel.oldest_message_id = function() {
    var els = panel.elem.list.querySelectorAll('li[data-message-id]');
    if (els.length) {
      return parseInt(els[0].getAttribute('data-message-id'));
    }
    return null;
  };

  panel.update_topic = function(topic) {
    while (panel.elem.topic.firstChild) {
      panel.elem.topic.removeChild(panel.elem.topic.firstChild);
    }
    Format(topic.value).forEach(function(el) {
      panel.elem.topic.appendChild(el);
    });

    if (topic.user && topic.time) {
      var date = (new Date(topic.time * 1000));
      panel.elem.topic.setAttribute("title", "set by " + topic.user + " on " + date);
    }
  };

  panel.elem = {
    input: document.createElement('DIV'),
    list: document.createElement('OL'),
    nicks: document.createElement('UL'),
    topic: document.createElement('P'),
    filler: document.createElement('DIV'),
    nav: panel.build_nav(),
    body: document.body
  };

  panel.elem.input.setAttribute('contenteditable', 'true');
  panel.elem.input.setAttribute('data-panel-id', panel.id);
  panel.elem.input.classList.add('input');
  panel.elem.input.setAttribute('autocapitalize', 'none');
  panel.elem.filler.classList.add('filler');

  switch (panel.type) {
  case "channel":
    panel.elem.topic.textContent = 'No topic set';
    break;
  case "private":
    panel.elem.topic.textContent = '';
    break;
  case "status":
    panel.elem.topic.textContent = panel.elem.name;
    break;
  }

  panel.scroller = document.getElementById('panel-scroll');
  panel.inner = document.getElementById('panel-inner-scroll');
  panel.prune = function() {
    if (panel.focused && !panel.is_scrolled())
      return;

    var els = Array.prototype.filter.call(panel.elem.list.querySelectorAll('li.chat'), function(el) {
      return getComputedStyle(el).display != "none";
    });

    var l = els.length;
    if (l > 300) {
      els.slice(0, l - 300).forEach(function(el) {
        el.parentNode.removeChild(el);
      });
    }
  };

  panel.watch_editor = function() {
    var elem = panel.elem.input;
    var prev = elem.clientHeight;
    var resize = function() {
      if (panel.focused) {
        var now = elem.clientHeight;
        var diff = now - prev;
        if ( diff < 0 ) {
          panel.scroller.scrollTop -= diff;
        }
        else {
          panel.scroller.scrollTop += diff;
        }
        panel.resize_filler();
        prev = now;
      }
    };
    new ResizeObserver(resize).observe(elem);
  };

  panel.editor = new Editor(panel.elem.input);
  setInterval(panel.prune, 1000 * 60);
  panel.watch_editor();

  panel.img_re = /^http[^\s]*(?:\.|format=)(?:jpe?g|gif|png|bmp|svg|webp)[^\/]*$/i;
  panel.imagify = function (elem) {
    var links = elem.querySelectorAll("a[href]:not(.processed)");
    var message = elem.querySelector('.message-text');
    if (!message) return;

    for (var i=links.length - 1; i >= 0; i--) {
      var link = links[i];
      if (link.href.match(panel.img_re)) {
        link.classList.add("processed");
        if (link.href.match(/\.gifv/)) continue;
        if (link.href.match(/#(nsfw|hide)/)) continue;
        var image = new Image();
        image.setAttribute("title", link.href);
        image.onload = (function(image, link) {
            return function(e) {
              image.onload = null;
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
                wrap.appendChild(a);
                message.appendChild(wrap);
              });

              toggle.addEventListener("click", function(e) {
                e.preventDefault();
                var hidden = wrap.classList.contains("hidden");
                if (hidden) {
                  panel.scroll(function() {
                    wrap.classList.remove("hidden");
                    toggle.classList.remove("hidden");
                  });
                }
                else {
                  wrap.classList.add("hidden");
                  toggle.classList.add("hidden");
                }
              });
            };
        })(image, link);
        if (panel.pause_gifs) {
          image.src = "https://noembed.com/i/still/0/600/" + link.href;
        }
        else {
          image.src = "https://noembed.com/i/0/600/" + link.href;
        }
      }
    }
  };

  panel.vid_re = /^http[^\s]*\.(?:gifv|mp4|mov|webm)[^\/]*$/i;
  panel.vidify = function(elem) {
    var links = elem.querySelectorAll("a[href]:not(.processed)");
    var message = elem.querySelector('.message-text');
    if (!message) return;

    for (var i=links.length - 1; i >= 0; i--) {
      var link = links[i];
      if (link.href.match(panel.vid_re)) {
        link.classList.add("processed");
        if (link.href.match(/#(nsfw|hide)/)) continue;
        if (link.href.match(/(i\.)?imgur\.com\/[^\/\.]+\.gifv/))
          link.href = link.href.replace('.gifv', '.mp4');
        if (link.href.match(/http:\/\/(i\.)?imgur\.com/))
          link.href = link.href.replace(/^http/, 'https');

        var video = document.createElement('VIDEO');
        video.controls = "controls";
        video.preload = "metadata";

        video.addEventListener('loadeddata', (function(video, link) {
          return function(e) {
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
              wrap.appendChild(video);
              message.appendChild(wrap);
            });

            toggle.addEventListener("click", function(e) {
              e.preventDefault();
              var hidden = wrap.classList.contains("hidden");
              if (hidden) {
                panel.scroll(function() {
                  wrap.classList.remove("hidden");
                  toggle.classList.remove("hidden");
                });
              }
              else {
                wrap.classList.add("hidden");
                toggle.classList.add("hidden");
              }
            });
          };
        })(video, link), false);

        video.src = link.href;
        video.load();
      }
    }
  };

  panel.aud_re = /^http[^\s]*\.(?:mp3|wav|aac|m4a|flac)[^\/]*$/i;
  panel.audify = function(elem) {
    var links = elem.querySelectorAll("a[href]:not(.processed)");
    var message = elem.querySelector('.message-text');
    if (!message) return;

    for (var i=links.length - 1; i >= 0; i--) {
      var link = links[i];
      if (link.href.match(panel.aud_re)) {
        link.classList.add("processed");
        if (link.href.match(/#(nsfw|hide)/)) continue;
        var audio = document.createElement('AUDIO');
        audio.controls = "controls";
        audio.preload = "metadata";

        audio.addEventListener('loadeddata', (function(audio, link) {
          return function(e) {
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
              wrap.appendChild(audio);
              message.appendChild(wrap);
            });
            toggle.addEventListener("click", function(e) {
              e.preventDefault();
              var hidden = wrap.classList.contains("hidden");
              if (hidden) {
                panel.scroll(function() {
                  wrap.classList.remove("hidden");
                  toggle.classList.remove("hidden");
                });
              }
              else {
                wrap.classList.add("hidden");
                toggle.classList.add("hidden");
              }
            });
          };
        })(audio, link), false);

        audio.src = link.href;
        audio.load();
      }
    }
  };


  panel.react_backlog_check = function() {
    panel.reactions.forEach(function(reaction, i) {
      var li = panel.elem.list.querySelector('li[data-message-server-id="'+reaction[1]+'"]');
      if (li) {
        panel.handle_reaction(reaction);
        panel.reactions.slice(i, 1);
      }
    });
  };

  panel.handle_reaction = function(message) {
    if (!message.Tags)
      return;

    var from = message.Prefix.Name;
    var id = message.Tags["+draft/reply"];
    var reaction = message.Tags["+draft/react"];

    if (!id) {
      console.log(from, id, reaction);
      return;
    }

    var li = panel.elem.list.querySelector('li[data-message-server-id="' + id + '"] .message-text');

    if (li) {
      panel.scroll(function() {
        var reactions = li.querySelector('.reactions');
        if (!reactions) {
          reactions = document.createElement('DIV');
          reactions.classList.add('reactions');
          li.appendChild(reactions);
        }

        var span = document.createElement('SPAN');
        span.textContent = reaction;
        span.setAttribute('title', from);
        if (reactions.firstChild) {
          reactions.insertBefore(span, reactions.firstChild);
        }
        else {
          reactions.appendChild(span);
        }
      });
    }
    else {
      panel.reactions.push(message);
    }
  };

  panel.set_loading = function(on) {
    if (on) {
      panel.elem.list.classList.add("loading");
    }
    else {
      panel.elem.list.classList.remove("loading");
    }
  };

  panel.set_pause_gifs = function(bool) {
    var els = panel.elem.list.querySelectorAll(".image-wrap");
    els.forEach(function(wrap) {
      var a = wrap.querySelector("a");
      if (!a) return;

      var img = a.querySelector("img");

      if (bool) {
        img.src = "https://noembed.com/i/still/0/600/" + a.href;
      }
      else {
        img.src = "https://noembed.com/i/0/600/" + a.href;
      }
    });
  };

  panel.set_collapse_embeds = function(bool) {
    panel.scroll(function() {
      if (panel.focused) {
        if (bool) {
          panel.elem.body.classList.add('hide-embeds');
          panel.elem.list.querySelectorAll(".embed-toggle:not(.hidden)").forEach(function(el) {
            el.click();
          });
          panel.elem.list.querySelectorAll(".image-toggle:not(.hidden)").forEach(function(el) {
            el.click();
          });
        }
        else {
          panel.elem.body.classList.remove('hide-embeds');
          panel.elem.list.querySelectorAll(".embed-toggle.hidden").forEach(function(el) {
            el.click();
          });
          panel.elem.list.querySelectorAll(".image-toggle.hidden").forEach(function(el) {
            el.click();
          });
        }
      }

      panel.collapse_embeds = bool;
    });
  };

  panel.set_send_typing = function(bool) {
    panel.scroll(function() {
        console.log("focused " + panel.focused);
      if (panel.focused) {
        if (bool)
          panel.elem.body.classList.add('send-typing');
        else
          panel.elem.body.classList.remove('send-typing');
      }

      panel.send_typing = bool;
    });
  };

  panel.should_send_typing = function(c) {
    // must contain non-space character
    if (!c.match(/\w/))
      return false;

    if (!panel.send_typing)
      return false;

    return panel.send_typing_debounced();
  }

  panel.send_typing_debounced = function() {
    if (panel.debounce_typing)
      return false;

    setTimeout(function() { panel.debounce_typing = false; }, 5000);
    panel.debounce_typing = true;

    return true;
  };

  panel.set_ignore_events = function(bool) {
    panel.scroll(function() {
      if (panel.focused) {
        if (bool)
          panel.elem.body.classList.add('hide-events');
        else
          panel.elem.body.classList.remove('hide-events');
      }

      panel.ignore_events = bool;
    });
  };

  panel.set_connected = function(bool, message) {
    panel.connected = bool;
    panel.update_nav();
  };

  panel.set_show_nicklist = function(bool) {
    panel.scroll(function() {
      if (bool)
        panel.elem.body.classList.add('show-nicklist');
      else
        panel.elem.body.classList.remove('show-nicklist');

      panel.show_nicklist = bool;
    });
  };

  panel.add_ignore = function(nick) {
    if (panel.ignore_nicks.indexOf(nick) == -1) {
      panel.ignore_nicks.push(nick);
    }
  };

  panel.remove_ignore = function(nick) {
    var i = panel.ignore_nicks.indexOf(nick);
    if (i != -1) {
      panel.ignore_nicks.splice(i, 1);
    }
  };

  panel.add_monospace_nick = function(nick) {
    if (panel.monospace_nicks.indexOf(nick) == -1) {
      panel.monospace_nicks.push(nick);
    }
    panel.scroll(function() {
      panel.elem.list.querySelectorAll('li.message .message-nick[data-nick="'+nick+'"]')
        .forEach(function(line) {
          line.parentNode.parentNode.classList.add('monospace');
        });
    });
  };

  panel.remove_monospace_nick = function(nick) {
    var i = panel.monospace_nicks.indexOf(nick);
    if (i != -1) {
      panel.monospace_nicks.splice(i, 1);
    }
    panel.scroll(function() {
      panel.elem.list.querySelectorAll('li.message .message-nick[data-nick="'+nick+'"]')
        .forEach(function(line) {
            line.parentNode.parentNode.classList
              .remove('monospace', 'monospace-start', 'monospace-end');
         });
    });
  };

  panel.last_seen_separator = function() {
    if (panel.last_seen) {
      var msg = panel.elem.list.querySelector('li[data-message-id="'+panel.last_seen+'"]');
      if (!msg) return;

      var next_visible;
      while (msg.nextSibling) {
        if (msg.nodeType == 1 && getComputedStyle(msg.nextSibling).display != "none") {
          next_visible = msg.nextSibling;
          break;
        }
        msg = msg.nextSibling;
      }

      if (next_visible) {
        panel.scroll(function() {
          var sep = panel.elem.list.querySelector('.last-read');
          if (sep) {
            sep.parentNode.removeChild(sep);
          }

          sep = document.createElement('DIV');
          sep.classList.add('last-read');

          msg.parentNode.insertBefore(sep, msg.nextSibling);

          if (msg.classList.contains('monospace')) {
            msg.classList.add('monospace-end');
          }
        });
      }
    }
  };

  panel.scroll_bottom = function(set) {
    var s = panel.scroller.scrollHeight;

    if (set !== undefined) {
      if (set <= 5) {
        panel.scroller.scrollTop = s;
        return set;
      }
      var h = panel.scroller.clientHeight;
      var t = (s - h) - set;

      panel.scroller.scrollTop = t;

      if (window.navigator.userAgent.match(/iP(hone|ad)/i)) {
        panel.scroller.style.overflowY = 'hidden';
        requestAnimationFrame(function() {
          panel.scroller.style.overflowY = 'visible';
        });
      }

      return set;
    }

    var s = panel.scroller.scrollHeight;
    var h = panel.scroller.clientHeight;
    var t = panel.scroller.scrollTop;
    var b = s - (t + h);
    return b;
  };
};
