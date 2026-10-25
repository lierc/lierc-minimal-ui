import { API } from "./api.js";
import { Render } from "./render.js";

export class Logs {
  constructor(url) {
    this.api = new API(url);
    this.es = null;
    this.highlight = null;
    this.query = false;
    this.form = document.getElementById("log-search");
    this.status = document.getElementById("status");
    this.submit = document.getElementById("submit");
    this.results = document.getElementById("results");
    this.text = document.getElementById("text");
    this.sender = document.getElementById("sender");
    this.connection = document.getElementById("connection");
    this.channel = document.getElementById("channel");
    this.from = document.getElementById("from");
    this.to = document.getElementById("to");
    this.datalist = document.getElementById("channels");
    this.topic = document.getElementById("topic");
  }

  populate_datalist() {
    var path = "/connection/" + this.connection.value + "/channel";

    if (this.channel.value == '') {
      this.channel.value = 'loading...';
      this.channel.setAttribute('disabled', 'disabled');
    }

    this.api.get(path, {
      error: (err) => {
        if (this.channel.value == 'loading...') {
          this.channel.value = '';
        }
      },
      success: (channels) => {
        this.datalist.innerHTML = '';

        channels.forEach((chan) => {
          var item = document.createElement('OPTION');
          item.value = chan;
          this.datalist.appendChild(item);
        });

        if (this.channel.value == 'loading...') {
          this.channel.value = '';
          this.channel.removeAttribute('disabled');

          if (this.datalist.childNodes.length) {
            this.channel.value = this.datalist.childNodes[0].value;
          }
        }
      }
    });
  }

  init() {
    var now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    this.from.value = JSON.stringify(now).slice(1,11);
    this.to.value = this.from.value;

    this.results.addEventListener('click', (e) => {
      var el = e.target;

      if (!el.matches('li.message time')) {
        return;
      }

      while (el && el.nodeName != "LI") {
        el = el.parentNode;
      }

      if (this.query && el) {
        var time = el.getAttribute('data-time');
        var id   = el.getAttribute('data-message-id');

        var d = new Date(time * 1000);
        var y = String(d.getUTCFullYear());
        var mo = String(d.getUTCMonth() + 1);
        if (mo.length == 1)
          mo = "0" + mo;
        var day = String(d.getUTCDate());
        if (day.length == 1)
          day = "0" + day;
        var date = [y, mo, day].join("-");
        this.from.value = date;
        this.to.value = date;
        this.text.value = '';
        this.sender.value = '';
        this.highlight = id;
        this.submit.click();
      }
      else if (el) {
        el.scrollIntoView();
        el.classList.add('focused');
      }
    });

    this.api.get("/connection", {
      success: (conns) => {
        conns.forEach((conn) => {
          var item = document.createElement('OPTION');
          item.value = conn.Id;

          if (conn.Config.Alias) {
            item.textContent = conn.Config.Alias;
          }
          else {
           item.textContent = conn.Config.Host;
          }

          this.connection.appendChild(item);
        });
        this.load_url_search();
        this.populate_datalist();
      }
    });

    this.to.addEventListener("change", (e) => {
      var to   = new Date(this.to.value);
      var from = new Date(this.from.value);

      if (to < from) {
        this.from.value = this.to.value;
      }
    });

    this.from.addEventListener("change", (e) => {
      var to   = new Date(this.to.value);
      var from = new Date(this.from.value);

      if (to < from) {
        this.to.value = this.from.value;
      }
    });

    this.connection.addEventListener("change", (e) => {
      this.populate_datalist();
    });

    this.form.addEventListener("submit", (e) => {
      e.preventDefault();

      this.results.innerHTML = '';

      var conn = this.connection.value;
      var chan = encodeURIComponent(this.channel.value);

      var from = new Date(this.from.value);
      var to = new Date(this.to.value);

      if (isNaN(from) || isNaN(to)) {
        alert("Invalid date rate '" + this.from.value + "' - '" + this.to.value + "'");
        return;
      }

      from.setMinutes(from.getMinutes() + from.getTimezoneOffset());
      to.setMinutes(to.getMinutes() + to.getTimezoneOffset());

      var from_month = String(from.getMonth() + 1);
      if (from_month.length == 1) {
        from_month = "0" + from_month;
      }

      var from_day = String(from.getDate());
      if (from_day.length == 1) {
        from_day = "0" + from_day;
      }

      var to_month = String(to.getMonth() + 1);
      if (to_month.length == 1) {
        to_month = "0" + to_month;
      }

      var to_day = String(to.getDate());
      if (to_day.length == 1) {
        to_day = "0" + to_day;
      }

      from = [from.getYear() + 1900, from_month, from_day].join("-");
      to   = [to.getYear() + 1900, to_month, to_day].join("-");

      var title;
      var p = document.createElement('P');

      if (this.text.value == "") {
        title = "";
        this.query = false;
      }
      else {
        title = "'" + this.text.value + "' in  ";
        this.query = true;
      }
      p.innerText = title;

      var c = document.createElement('STRONG');
      c.innerText = this.channel.value;
      p.appendChild(c);
      var s = document.createElement('SPAN');
      if (from == to) {
        s.innerText = " from " + from;
      }
      else {
        s.innerText = " from " + from + " to " + to;
      }
      p.appendChild(s);
      this.topic.innerHTML = '';
      this.topic.appendChild(p);

      var data = {};
      if (this.text.value != "") {
        data['text'] = this.text.value;
      }
      if (this.sender.value != "") {
        data['sender'] = this.sender.value;
      }

      var path = "/connection/" + conn + "/channel/" + chan + "/date/" + from + "/" + to;
      var query = this.api.build_query(data);

      if (query) {
        path += '?' + query;
      }

      if (this.es) {
        this.es.close();
      }

      this.es = new EventSource(this.api.baseurl + path);

      window.history.replaceState({}, path, "/search/#!" + path);

      this.status.textContent = "searching...";
      var total = 0;

      this.es.addEventListener("log", (e) => {
        total++;
        var line = JSON.parse(e.data);
        var message = line.Message;
        message.Id = line.MessageId;
        message.Highlight = e.Highlight;
        var el = Render(message, {controls: false, full_date: true});
        if (el) {
          this.results.appendChild(el);
        }
      });

      this.es.addEventListener("error", (e) => {
        this.es.close();
        this.es = null;
        this.status.textContent = total + " results";
        if (this.highlight) {
          var el = this.results.querySelector('li[data-message-id="' + this.highlight + '"]');
          if (el) {
            el.scrollIntoView();
            el.classList.add('focused');
          }
        }
      });
    });
  }

  load_url_search() {
    var hash = window.location.hash;
    if (!hash) return;

    var parts = hash.split("?");
    var path = parts[0];
    var query_string = parts[1];
    var path_parts = path.split("/").slice(1);

    if (query_string) {
      var pairs = query_string.split("&");
      var query = {};

      for (var i=0; i < pairs.length; i++) {
        var kv = pairs[i].split("=");
        query[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]);
      }

      if (query["text"]) {
        this.text.value = query["text"];
        this.query = true;
      }
      else {
        this.query = false;
      }
    }

    while (path_parts.length) {
      var name = path_parts.shift();
      if (name == "connection") {
        this.connection.value = decodeURIComponent(path_parts.shift());
      }
      else if (name == "channel") {
        this.channel.value = decodeURIComponent(path_parts.shift());
      }
      else if (name == "date") {
        this.from.value = decodeURIComponent(path_parts.shift());
        this.to.value = decodeURIComponent(path_parts.shift());
      }
      else if (name == "message") {
        this.highlight = path_parts.shift();
      }
    }

    this.submit.click();
  }
}
