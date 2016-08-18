var Render = function(message) {
  var img_re = /^http[^\s]*\.(?:jpe?g|gif|png|bmp|svg)[^\/]*$/i;
  var url_re = /(https?:\/\/[^\s<"]*)/ig;

  switch (String(message.Command)) {
  case "NICK":
    var old = message.Prefix.Name;
    var nick = message.Params[0];
    return make("event", message).text(
      old + " is now known as " + nick)

  case "PART":
    var nick = message.Prefix.Name;
    var name = message.Params[0];
    var msg = message.Params[1];
    return make("event", message).text(
      nick + ' has quit' + (msg ? " ("+msg+")" : ""));

  case "QUIT":
    var nick = message.Prefix.Name;
    var msg = message.Params[0];
    return make("event", message).text(
      nick + ' has quit' + (msg ? " ("+msg+")" : ""));

  case "JOIN":
    var name = message.Params[0];
    var nick = message.Prefix.Name;
    return make("event", message).text(
      nick + ' has joined the channel');

  case "332":
    var name = message.Params[1];
    var text = message.Params[2];
    return make("event", message).text(
      "Topic changed to: " + text);
    break;

  case "PRIVMSG":
    var nick = message.Prefix.Name;
    var name = message.Params[0];
    var text = message.Params[1];

    var from = $('<span/>', {'class':'message-nick'});
    var color = string_to_rgb(nick);
    var msg = $('<span/>', {'class':'message-text'});
    from.css({'color': '#' + color});

    if (text.substring(0, 7) == "\x01"+"ACTION") {
      from.text('* ' + nick);
      msg.text(text.substring(7));
    }
    else {
      from.text('< '+nick+'> ');
      msg.text(text);
    }

    linkify(msg.get(0));

    return make("message", message).append(from, msg);

  default:
    var text = message.Command.match(/^[0-9][0-9][0-9]$/)
      ? message.Params.slice(1).join(" ")
      : [message.Command].concat(message.Params).join(" ");
    return make("raw", message).text(text);
  };

  function linkify(elem) {
    var children = elem.childNodes;
    var length = children.length;

    for (var i=0; i < length; i++) {
      var node = children[i];
      if (node.nodeName == "A") {
        continue;
      }
      else if (node.nodeName != "#text") {
        linkify(node);
      }
      else if (node.nodeValue.match(url_re)) {
        var span = document.createElement("SPAN");
        var escaped = $('<div/>').text(node.nodeValue).html();
        span.innerHTML = escaped.replace(
          url_re, '<a href="$1" target="_blank" rel="noreferrer">$1</a>');
        node.parentNode.replaceChild(span, node);
      }
    }
  }

  function make (type, message) {
    return $('<li/>', {
      'class':type,
      'data-time': message.Time,
      'data-message-id': message.Id
    });
  }

  function string_to_rgb(str){
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
       hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    var c = (hash & 0x00FFFFFF)
      .toString(16)
      .toUpperCase();

    return "00000".substring(0, 6 - c.length) + c;
  }
};
