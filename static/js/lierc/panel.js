import { Editor } from "./editor.js";
import { Embed } from "./embed.js";
import { Format } from "./format.js";
import { Template } from "./template.js";

const months = [ "Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec" ];
const days   = [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" ];

export class Panel {
  constructor(opts) {
    this.name = opts.name;
    this.id = opts.id;
    this.type = opts.type;
    this.connection = opts.connection;
    this.editable = opts.editable;
    this.closable = opts.closable;
    this.log_url = opts.log_url;
    this.backlog_url = opts.backlog_url;
    this.path = opts.path;
    this.connected = opts.connected;
    this.network = opts.network;
    this.mobile = opts.mobile;

    this.unread = false;
    this.missed = false;
    this.highlighted = false;
    this.focused = false;
    this.backlog_empty = false;
    this.reactions = [];
    this.monospace_nicks = [];
    this.ignore_nicks = [];
    this.ignore_events = false;
    this.send_typing = true;
    this.collapse_embeds = false;
    this.pause_gifs = false;
    this.show_nicklist = false;
    this.first_focus = true;
    this.last_seen = -1;
    this.oldest_message = null;
    this.oldest_message_id = null;
    this.mode = "";
    this.debounce_typing = false;

    this.scroll_jump = 0;
    this.scrolling = false;

    this.elem = {
      input: document.createElement('DIV'),
      list: document.createElement('OL'),
      nicks: document.createElement('UL'),
      topic: document.createElement('P'),
      filler: document.createElement('DIV'),
      nav: this.build_nav(),
      body: document.body
    };

    this.elem.input.setAttribute('contenteditable', 'true');
    this.elem.input.setAttribute('data-panel-id', this.id);
    this.elem.input.classList.add('input');
    this.elem.input.setAttribute('autocapitalize', 'none');
    this.elem.filler.classList.add('filler');

    switch (this.type) {
    case "channel":
      this.elem.topic.textContent = 'No topic set';
      break;
    case "private":
      this.elem.topic.textContent = '';
      break;
    case "status":
      this.elem.topic.textContent = this.elem.name;
      break;
    }

    this.scroller = document.getElementById('panel-scroll');
    this.inner = document.getElementById('panel-inner-scroll');

    this.editor = new Editor(this.elem.input);
    setInterval(() => this.prune(), 1000 * 60);
    this.watch_editor();

    this.img_re = /^http[^\s]*(?:\.|format=)(?:jpe?g|gif|png|bmp|svg|webp|heic)[^\/]*$/i;

    this.vid_re = /^http[^\s]*\.(?:gifv|mp4|m4v|mov|webm)[^\/]*$/i;

    this.aud_re = /^http[^\s]*\.(?:mp3|wav|aac|m4a|flac)[^\/]*$/i;
  }

  change_name(name) {
    this.name = name;
    this.update_nav();
  }

  update_mode(mode) {
    this.mode = mode;
    this.update_nav();
  }

  update_nicks(nicks) {
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

    var list = this.elem.nicks;
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
  }

  focus() {
    if (this.ignore_events)
      this.elem.body.classList.add('hide-events');
    else
      this.elem.body.classList.remove('hide-events');

    if (this.collapse_embeds)
      this.elem.body.classList.add('hide-embeds');
    else
      this.elem.body.classList.remove('hide-embeds');

    if (this.show_nicklist)
      this.elem.body.classList.add('show-nicklist');
    else
      this.elem.body.classList.remove('show-nicklist');

    if (this.send_typing)
      this.elem.body.classList.add('send-typing');
    else
      this.elem.body.classList.remove('send-typing');

    this.first_focus = false;
    this.focused = true;
    this.resize_filler();
    if (! this.mobile)
      this.elem.input.focus();
    this.unread = false;
    this.missed = false;
    this.highlighted = false;
    this.update_nav();
    this.scroll_bottom(0);
    setTimeout(() => { this.scroll_bottom(0) } , 10);
  }

  build_nav() {
    var html = Template('nav_item', {
      name: this.name,
      closable: this.closable,
      editable: this.editable,
      log_url: this.log_url,
      id: this.id,
    });

    var el = document.createElement('DIV');
    el.innerHTML = html;
    return el.firstChild;
  }

  update_nav() {
    this.elem.nav.querySelector('.panel-name').textContent = this.name;
    this.elem.nav.classList.remove('unread', 'missed', 'highlighted', 'disconnected');

    if (this.focused) {
      this.elem.nav.classList.add('active');
      if (! this.connected)
        this.elem.nav.classList.add('disconnected');
    }
    else {
      this.elem.nav.classList.remove('active');
      if (this.unread)
        this.elem.nav.classList.add('unread');
      if (this.missed)
        this.elem.nav.classList.add('missed');
      if (this.highlighted)
        this.elem.nav.classList.add('highlighted');

      if (! this.connected)
        this.elem.nav.classList.add('disconnected');
    }

    if (this.network) {
      var title = this.network;

      if (this.mode) {
        title += " (+" + this.mode + ")";
      }

      this.elem.nav.setAttribute("title", title);
    }

    this.elem.nav.setAttribute("data-name", this.name);
  }

  update_seen() {
    var id = this.latest_message_id();
    if (id)
      this.last_seen = id;
  }

  update_oldest_message_id(id) {
    if (!this.focused)
      return

    if (id && (this.oldest_message_id === null || id < this.oldest_message_id))
      this.oldest_message_id = id;
  }

  unfocus() {
    this.update_seen();
    this.focused = false;
    this.elem.nav.classList.remove("active");
    this.clear_lists();
    this.backlog_empty = false;
    this.oldest_message = null;
    this.oldest_message_id = null;
  }

  remove_elems() {
    ['nav','filler','topic','nicks','input','list']
      .forEach((el) => {
        if (this.elem[el].parentNode)
          this.elem[el].parentNode.removeChild(
            this.elem[el]
          );
      });
  }

  clear_lists() {
    var list = this.elem.list;
    while (list.firstChild) {
      list.removeChild(list.firstChild);
    }
    var nicks = this.elem.nicks;
    while (nicks.firstChild) {
      nicks.removeChild(nicks.firstChild);
    }
  }

  prepend(els) {
    var list = this.elem.list;

    var prev_time, prev_nick, prev_mono;
    var length = els.length;

    for (var i=length - 1; i >= 0; i--) {
      var el = els[i];
      el.classList.add('loading');

      if (!el.matches('li.chat'))
        continue;

      var id = el.getAttribute('data-message-id');
      if (id && this.elem.list.querySelectorAll('li[data-message-id="'+id+'"]').length)
        continue;

      var time = el.querySelector('time');
      if (time) {
        if (time.innerHTML == prev_time)
          time.className = "hidden";
        prev_time = time.innerHTML;
      }

      if (el.classList.contains('message')) {
        var nick = el.querySelector('.message-nick').getAttribute('data-nick');
        if (this.monospace_nicks.indexOf(nick) != -1) {
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

    this.scroll(() => {
      for (var i=0; i < els.length; i++) {
        if (list.childNodes.length) {
          list.insertBefore(els[i], list.childNodes[0]);
        }
        else {
          list.appendChild(els[i]);
        }
      }
      this.check_dates(els, true);
    });

    requestAnimationFrame(function() {
      for(var i=0; i < els.length; i++) {
        els[i].classList.add('loaded');
      }
    });


    for (var i=0; i < els.length; i++) {
      this.vidify(els[i])
      this.imagify(els[i])
      this.audify(els[i])
      this.emojify(els[i])
    }

    Embed.embed_all(els, this);
    this.last_seen_separator();
  }

  check_dates(els, prepend) {
    var len = els.length;
    var prev_ts, prev_date;

    if (prepend && this.oldest_message) {
      prev_date = this.oldest_message;
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
          this.insert_date_separator_before(els[i], prev_date);
        }

        prev_ts = ts;
        prev_date = date;
      }
    }

    if (prepend)
      this.oldest_message = prev_date;
  }

  insert_date_separator_before(el, date) {
    if (!this.focused)
      return;

      var sep = Template('date_separator', {
        day: days[ date.getDay() ],
        month: months[ date.getMonth() ],
        date: date.getDate(),
        year: (date.getYear() + 1900)
      });
      el.insertAdjacentHTML('afterend', sep);
  }

  emojify(el) {
    var message = el.querySelector(".message-text");
    if (!message)
      return;
    var emojis = message.querySelectorAll("span.emoji");
    if (emojis.length != 1)
      return;
    var e = emojis[0];
    if (e.innerText.trim() != message.innerText.trim())
      return;
    this.scroll(function() {
      var wrap = document.createElement('DIV');
      wrap.className = "emoji-wrap";
      e.parentNode.removeChild(e);
      e.className = "emoji-large";
      wrap.appendChild(e);
      message.innerHTML = '';
      message.appendChild(wrap);
    });
  }

  index_links(message) {
    if (message.hasAttribute('data-links-indexed'))
      return;

    message.setAttribute('data-links-indexed', 'true');
    var links = message.querySelectorAll('a[href]');
    for (var i=0; i < links.length; i++) {
      links[i].setAttribute('data-link-order', i);
    }
  }

  message_text(el) {
    while (el && !(el.classList && el.classList.contains('message-text'))) {
      el = el.parentNode;
    }
    return el;
  }

  media_order(link) {
    var message = this.message_text(link);
    if (!message)
      return Number.MAX_SAFE_INTEGER;

    this.index_links(message);

    var order = parseInt(link.getAttribute('data-link-order'), 10);
    return isNaN(order) ? Number.MAX_SAFE_INTEGER : order;
  }

  insert_media(message, node, order) {
    node.setAttribute('data-media-order', order);

    var children = message.children;
    for (var i=0; i < children.length; i++) {
      var child = children[i];
      var child_order = parseInt(child.getAttribute('data-media-order'), 10);

      if (!isNaN(child_order) && child_order > order) {
        message.insertBefore(node, child);
        return;
      }

      // reactions always stay at the bottom of the message
      if (child.classList.contains('reactions')) {
        message.insertBefore(node, child);
        return;
      }
    }

    message.appendChild(node);
  }

  embed(a, embed, manual) {
    if (!manual && this.collapse_embeds) {
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

    var order = this.media_order(a);

    this.scroll(() => {
      var message = li.querySelector('.message-text');
      var wrap = document.createElement('DIV');
      wrap.innerHTML = html;

      var node = wrap.firstElementChild;
      if (!node)
        return;

      this.insert_media(message, node, order);
    });
  }

  is_scrolled() {
    return this.scroll_bottom() <  10;
  }

  append(el, opts) {
    if (el === undefined)
      return;

    if (!opts)
      opts = {};

    if (this.focused) {
      var id = el.getAttribute('data-message-id');
      if (id && this.elem.list.querySelectorAll('li[data-message-id="'+id+'"]').length)
        return;

      var append = () => {
        this.elem.list.appendChild(el);

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

          if (el.classList.contains("message") && this.monospace_nicks.indexOf(nick) != -1) {
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
            this.vidify(el)
            this.imagify(el)
            this.audify(el)
            this.emojify(el)
            Embed.embed_all([el], this);
          }
        }

        if (!opts['skip_date'] && el.previousSibling) {
          this.check_dates([el, el.previousSibling]);
        }
      };

      this.is_scrolled() ? this.scroll(append) :  append();
    }
    else {
      el.innerHTML = '';

      if (el.classList.contains("message")) {
        this.unread = true;
        if (el.classList.contains("highlight"))
          this.highlighted = true;
        this.update_nav();
      }
      else if (el.classList.contains("event") && ! this.ignore_events) {
        this.missed = true;
        this.update_nav();
      }
    }
  }

  info(text) {
    var li = document.createElement('LI');
    li.classList.add('message', 'info', 'monospace');
    li.textContent = text;

    this.scroll(() => {
      this.elem.list.appendChild(li)
    });
  }

  resize_filler() {
    if (!this.focused) return;

    var scroll = this.scroller.clientHeight;
    var chat   = this.elem.list.clientHeight;

    this.elem.filler.style.height = Math.max(0, scroll - chat) + "px";
  }

  scroll(cb) {
    var nested = this.scrolling;
    if (! nested) {
      this.scroll_jump = this.scroll_bottom();
      this.scrolling = true;
    }

    if (cb) cb();
    if (!nested) {
      if (this.focused) {
        this.scroll_bottom(this.scroll_jump);
        this.resize_filler();
      }
      this.scrolling = false;
    }
  }

  set_disabled(bool) {
    if (bool) {
      this.elem.input.setAttribute('contenteditable', 'false');
      this.elem.input.classList.add('disabled');
    }
    else {
      this.elem.input.setAttribute('contenteditable', 'true');
      this.elem.input.classList.remove('disabled');
    }
  }

  latest_message_id() {
    var els = this.elem.list.querySelectorAll('li[data-message-id]');
    if (els.length) {
      return parseInt(els[ els.length - 1 ].getAttribute('data-message-id'));
    }
    return null;
  }

  update_topic(topic) {
    while (this.elem.topic.firstChild) {
      this.elem.topic.removeChild(this.elem.topic.firstChild);
    }
    Format(topic.value).forEach((el) => {
      this.elem.topic.appendChild(el);
    });

    if (topic.user && topic.time) {
      var date = (new Date(topic.time * 1000));
      this.elem.topic.setAttribute("title", "set by " + topic.user + " on " + date);
    }
  }

  prune() {
    if (this.focused && !this.is_scrolled())
      return;

    var els = Array.prototype.filter.call(this.elem.list.querySelectorAll('li.chat'), function(el) {
      return getComputedStyle(el).display != "none";
    });

    var l = els.length;
    if (l > 300) {
      els.slice(0, l - 300).forEach(function(el) {
        el.parentNode.removeChild(el);
      });
    }
  }

  watch_editor() {
    var elem = this.elem.input;
    var prev = elem.clientHeight;
    var resize = () => {
      if (this.focused) {
        var now = elem.clientHeight;
        var diff = now - prev;
        if ( diff < 0 ) {
          this.scroller.scrollTop -= diff;
        }
        else {
          this.scroller.scrollTop += diff;
        }
        this.resize_filler();
        prev = now;
      }
    };
    new ResizeObserver(resize).observe(elem);
  }

  imagify(elem) {
    var links = elem.querySelectorAll("a[href]:not(.processed)");
    var message = elem.querySelector('.message-text');
    if (!message) return;

    for (var i=links.length - 1; i >= 0; i--) {
      var link = links[i];
      if (link.href.match(this.img_re)) {
        link.classList.add("processed");
        if (link.href.match(/\.gifv/)) continue;
        if (link.href.match(/#(nsfw|hide)/)) continue;
        var image = new Image();
        image.setAttribute("title", link.href);
        image.onload = ((image, link, order) => {
            return (e) => {
              image.onload = null;
              var s = this.scroller;
              var wrap = document.createElement('DIV');
              var a = link.cloneNode(false);
              var toggle = document.createElement('SPAN');
              a.appendChild(image);

              this.scroll(() => {
                if (this.collapse_embeds) {
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
                this.insert_media(message, wrap, order);
              });

              toggle.addEventListener("click", (e) => {
                e.preventDefault();
                var hidden = wrap.classList.contains("hidden");
                if (hidden) {
                  this.scroll(function() {
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
        })(image, link, this.media_order(link));
        if (link.href.match("i.imgur.com")) {
          image.src = link.href;
        }
        else if (this.pause_gifs) {
          image.src = "https://noembed.com/i/still/0/600/" + link.href;
        }
        else {
          image.src = "https://noembed.com/i/0/600/" + link.href;
        }
      }
    }
  }

  vidify(elem) {
    var links = elem.querySelectorAll("a[href]:not(.processed)");
    var message = elem.querySelector('.message-text');
    if (!message) return;

    for (var i=links.length - 1; i >= 0; i--) {
      var link = links[i];
      if (link.href.match(this.vid_re)) {
        link.classList.add("processed");
        if (link.href.match(/#(nsfw|hide)/)) continue;
        if (link.href.match(/(i\.)?imgur\.com\/[^\/\.]+\.gifv/))
          link.href = link.href.replace('.gifv', '.mp4');
        if (link.href.match(/http:\/\/(i\.)?imgur\.com/))
          link.href = link.href.replace(/^http/, 'https');

        var video = document.createElement('VIDEO');
        video.controls = "controls";
        video.preload = "metadata";

        video.addEventListener('loadeddata', ((video, link, order) => {
          return (e) => {
            var wrap = document.createElement('DIV');
            var toggle = document.createElement('SPAN');

            this.scroll(() => {
              if (this.collapse_embeds) {
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
              this.insert_media(message, wrap, order);
            });

            toggle.addEventListener("click", (e) => {
              e.preventDefault();
              var hidden = wrap.classList.contains("hidden");
              if (hidden) {
                this.scroll(function() {
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
        })(video, link, this.media_order(link)), false);

        video.src = link.href;
        video.load();
      }
    }
  }

  audify(elem) {
    var links = elem.querySelectorAll("a[href]:not(.processed)");
    var message = elem.querySelector('.message-text');
    if (!message) return;

    for (var i=links.length - 1; i >= 0; i--) {
      var link = links[i];
      if (link.href.match(this.aud_re)) {
        link.classList.add("processed");
        if (link.href.match(/#(nsfw|hide)/)) continue;
        var audio = document.createElement('AUDIO');
        audio.controls = "controls";
        audio.preload = "metadata";

        audio.addEventListener('loadeddata', ((audio, link, order) => {
          return (e) => {
            var wrap = document.createElement('DIV');
            var toggle = document.createElement('SPAN');

            this.scroll(() => {
              if (this.collapse_embeds) {
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
              this.insert_media(message, wrap, order);
            });
            toggle.addEventListener("click", (e) => {
              e.preventDefault();
              var hidden = wrap.classList.contains("hidden");
              if (hidden) {
                this.scroll(function() {
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
        })(audio, link, this.media_order(link)), false);

        audio.src = link.href;
        audio.load();
      }
    }
  }

  react_backlog_check() {
    this.reactions.forEach((reaction, i) => {
      var li = this.elem.list.querySelector('li[data-message-server-id="'+reaction[1]+'"]');
      if (li) {
        this.handle_reaction(reaction);
        this.reactions.slice(i, 1);
      }
    });
  }

  handle_reaction(message) {
    if (!message.Tags)
      return;

    var from = message.Prefix.Name;
    var id = message.Tags["+draft/reply"];
    var reaction = message.Tags["+draft/react"];

    if (!id) {
      console.log(from, id, reaction);
      return;
    }

    var li = this.elem.list.querySelector('li[data-message-server-id="' + id + '"] .message-text');

    if (li) {
      this.scroll(function() {
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
      this.reactions.push(message);
    }
  }

  set_loading(on) {
    if (on) {
      this.elem.list.classList.add("loading");
    }
    else {
      this.elem.list.classList.remove("loading");
    }
  }

  set_pause_gifs(bool) {
    var els = this.elem.list.querySelectorAll(".image-wrap");
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
  }

  set_collapse_embeds(bool) {
    this.scroll(() => {
      if (this.focused) {
        if (bool) {
          this.elem.body.classList.add('hide-embeds');
          this.elem.list.querySelectorAll(".embed-toggle:not(.hidden)").forEach(function(el) {
            el.click();
          });
          this.elem.list.querySelectorAll(".image-toggle:not(.hidden)").forEach(function(el) {
            el.click();
          });
        }
        else {
          this.elem.body.classList.remove('hide-embeds');
          this.elem.list.querySelectorAll(".embed-toggle.hidden").forEach(function(el) {
            el.click();
          });
          this.elem.list.querySelectorAll(".image-toggle.hidden").forEach(function(el) {
            el.click();
          });
        }
      }

      this.collapse_embeds = bool;
    });
  }

  set_send_typing(bool) {
    this.scroll(() => {
      if (this.focused) {
        if (bool)
          this.elem.body.classList.add('send-typing');
        else
          this.elem.body.classList.remove('send-typing');
      }

      this.send_typing = bool;
    });
  }

  should_send_typing(c) {
    if (!this.send_typing)
      return false;

    // must contain non-space character
    if (!c.match(/\w/))
      return false;

    return this.send_typing_debounced();
  }

  send_typing_debounced() {
    if (this.debounce_typing)
      return false;

    setTimeout(() => { this.debounce_typing = false; }, 3000);
    this.debounce_typing = true;

    return true;
  }

  set_ignore_events(bool) {
    this.scroll(() => {
      if (this.focused) {
        if (bool)
          this.elem.body.classList.add('hide-events');
        else
          this.elem.body.classList.remove('hide-events');
      }

      this.ignore_events = bool;
    });
  }

  set_connected(bool, message) {
    this.connected = bool;
    this.update_nav();
  }

  set_show_nicklist(bool) {
    this.scroll(() => {
      if (bool)
        this.elem.body.classList.add('show-nicklist');
      else
        this.elem.body.classList.remove('show-nicklist');

      this.show_nicklist = bool;
    });
  }

  add_ignore(nick) {
    if (this.ignore_nicks.indexOf(nick) == -1) {
      this.ignore_nicks.push(nick);
    }
  }

  remove_ignore(nick) {
    var i = this.ignore_nicks.indexOf(nick);
    if (i != -1) {
      this.ignore_nicks.splice(i, 1);
    }
  }

  add_monospace_nick(nick) {
    if (this.monospace_nicks.indexOf(nick) == -1) {
      this.monospace_nicks.push(nick);
    }
    this.scroll(() => {
      this.elem.list.querySelectorAll('li.message .message-nick[data-nick="'+nick+'"]')
        .forEach(function(line) {
          line.parentNode.parentNode.classList.add('monospace');
        });
    });
  }

  remove_monospace_nick(nick) {
    var i = this.monospace_nicks.indexOf(nick);
    if (i != -1) {
      this.monospace_nicks.splice(i, 1);
    }
    this.scroll(() => {
      this.elem.list.querySelectorAll('li.message .message-nick[data-nick="'+nick+'"]')
        .forEach(function(line) {
            line.parentNode.parentNode.classList
              .remove('monospace', 'monospace-start', 'monospace-end');
         });
    });
  }

  last_seen_separator() {
    if (this.last_seen) {
      var msg = this.elem.list.querySelector('li[data-message-id="'+this.last_seen+'"]');
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
        this.scroll(() => {
          var sep = this.elem.list.querySelector('.last-read');
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
  }

  scroll_bottom(set) {
    var s = this.scroller.scrollHeight;

    if (set !== undefined) {
      if (set <= 5) {
        this.scroller.scrollTop = s;
        return set;
      }
      var h = this.scroller.clientHeight;
      var t = (s - h) - set;

      this.scroller.scrollTop = t;

      if (window.navigator.userAgent.match(/iP(hone|ad)/i)) {
        this.scroller.style.overflowY = 'hidden';
        requestAnimationFrame(() => {
          this.scroller.style.overflowY = 'visible';
        });
      }

      return set;
    }

    var s = this.scroller.scrollHeight;
    var h = this.scroller.clientHeight;
    var t = this.scroller.scrollTop;
    var b = s - (t + h);
    return b;
  }
}
