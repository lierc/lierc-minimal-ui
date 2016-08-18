var Panel = function(name, id, connection) {
  this.name = name;
  this.id = id;
  this.connection = connection;
  this.unread = 0;
  this.missed = 0;
  this.type = determine_panel_type(name);
  this.focused = false;
  this.backlog_empty = false;
  this.nicks = [];

  this.change_name = function(name) {
    this.name = name;
    this.update_nav();
    this.elem.prefix.text(name);
  };

  function determine_panel_type(name) {
    if (name == "status") return "status";
    if (name.match(/^[#&]/)) return "channel";
    return "private";
  }
  
  this.update_completions = function(nicks) {
    this.keyboard.completion.completions = nicks;
  };

  this.focus = function() {
    this.focused = true;
    this.resize_filler();
    this.elem.input.focus();
    this.unread = 0;
    this.missed = 0;
    this.update_nav();
    this.scroll();
  };

  this.build_nav = function() {
    var el = $('<li/>', {'data-panel-id': id});
    var name = $('<span/>', {'class':'panel-name'}).text(this.name);
    var pill = $('<span/>', {'class':'pill'});
    name.append(pill);
    el.append(name);
    return el;
  };

  this.update_nav = function() {
    this.elem.nav.find('.panel-name').text(this.name);
    this.elem.nav.find('.pill').text(this.unread);

    if (this.unread)
      this.elem.nav.addClass('unread');
    else
      this.elem.nav.removeClass('unread');

    if (this.missed)
      this.elem.nav.addClass('missed');
    else
      this.elem.nav.removeClass('missed');

    if (this.focused)
      this.elem.nav.addClass('active');
    else
      this.elem.nav.removeClass('active');
  };

  this.incr_unread = function() {
    this.unread++;
    if (this.unread > 10)
      this.unread = "10+"
    this.update_nav();
  };

  this.incr_missed = function() {
    this.missed++;
    this.update_nav();
  }

  this.unfocus = function() {
    this.focused = false;
    this.elem.nav.removeClass("active");
  };

  this.set_topic = function(text) {
    this.elem.topic.text(text);
  };

  this.prepend = function(el) {
    this.elem.list.prepend(el);
    this.resize_filler();
  };

  this.is_scrolled = function() {
    if (document.documentElement.scrollHeight <= window.innerHeight)
      return true;
    return window.scrollY == document.documentElement.scrollHeight - window.innerHeight;
  };

  this.append = function(el) {
    var scrolled = this.is_scrolled();
    this.elem.list.append(el);

    if (this.focused && scrolled) {
      this.scroll();
    }
    else {
      if (el.hasClass("message"))
        this.incr_unread();
      else (el.hasClass("event"))
        this.incr_missed();
    }

    this.resize_filler();
  };

  this.resize_filler = function() {
    if (!this.focused) return;

    this.elem.filler.height(
      Math.max(0, window.innerHeight - this.elem.list.outerHeight())
    );
  };

  this.scroll = function() {
    var b = document.body;
    b.scrollTop = b.scrollHeight;
  };

  this.own_message = function(nick, text) {
    var el = Render({
      Prefix: {Name: nick},
      Params: [this.name, text],
      Command: "PRIVMSG"
    });
    this.append(el);
    return el;
  };

  this.oldest_message_id = function() {
    return this.elem.list.find('li[data-message-id]:first').attr('data-message-id');
  };

  this.update_topic = function(text) {
    this.elem.topic.text(text);
  };

  this.elem = {
    input: $('<input/>', {
      'type': 'text',
      'data-panel-id': id
    }),
    list: $('<ol/>'),
    topic: $('<p>No topic set</p>'),
    filler: $('<div/>', {'class':'filler'}),
    prefix: $('<span/>').text(this.name),
    nav: this.build_nav()
  };

  this.keyboard = new Keyboard(this.elem.input.get(0));
};
