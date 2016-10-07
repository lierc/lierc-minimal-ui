var Commands = function() {
  var commands = this;
  var handlers = {};

  function add_command(name, aliases, handler) {
    handlers[name] = handler;
    aliases.forEach(function(alias) {
      handlers[alias] = handler;
    });
  }

  add_command("help", ["h"], function(panel, line) {
  });

  add_command("join", ["j"], function(panel, line) {
    var parts = ["JOIN", line];
    return parts.join(" ");
  });

  add_command("nick", [], function(panel, line) {
    var parts = ["NICK", line];
    return parts.join(" ");
  });

  add_command("part", ["close","wc"], function(panel, line) {
    if (panel.type != "channel") {
      throw "PART only works in channels";
    }

    var parts = ["PART", panel.name];

    if (line)
      parts.push(":" + line);

    return parts.join(" ");
  });

  add_command("query", ["q","say", "msg"], function(panel, line) {
    var args = line.split(" ", 1);
    var rest = line.substring(args[0].length).trim();

    var parts = ["PRIVMSG", args[0]];

    if (rest)
      parts.push(":" + rest);

    return parts.join(" ");
  });

  add_command("me", [], function(panel, line) {
    var parts = ["PRIVMSG", panel.name];
    parts.push(":" + "\x01" + "ACTION" + line);
    return parts.join(" ");
  });

  add_command("topic", ["t"], function(panel, line) {
    if (panel.type != "channel") {
      throw "TOPIC only works for channels";
    }

    var parts = ["TOPIC", panel.name];

    if (line)
      parts.push(":" + line);

    return parts.join(" ");
  });

  commands.handle_command = function(panel, line) {
    var parts = line.split(" ", 1);
    var command = parts[0].toLowerCase();

    if ( command in handlers ) {
      var rest = line.substring(command.length);
      return handlers[command](panel, rest.trim());
    }

    throw "Unknown command " + parts[0];
  };
};
