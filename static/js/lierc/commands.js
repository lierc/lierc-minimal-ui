export class Commands {
  #handlers = {};
  #names = [];

  constructor(app) {
    const add_command = (name, aliases, handler) => {
      this.#names.push(name);
      this.#handlers[name] = handler;
      aliases.forEach((alias) => {
        this.#handlers[alias] = handler;
      });
    };

    add_command("help", ["h"], (panel, line) => {
      app.new_dialog("help");
      return;
    });

    add_command("panel", ["p"], (panel, line) => {
      const parts  = line.split(" ", 2);
      const action = parts[0];
      const rest   = parts[1];

      switch (action) {
      case "move": {
        const order = parseInt(rest);
        const li = panel.elem.nav;
        const ul = li.parentNode;
        const before = ul.querySelectorAll(`li:not([data-panel-id="${panel.id}"])`)[order - 1];
        if (before) {
          ul.removeChild(li);
          ul.insertBefore(li, before);
          app.save_channel_order();
        }
        else {
          alert(`Invalid position: '${order}'`);
        }
        break;
      }
      default:
        alert(`Unknown command: 'panel ${line}'`);
      }
      return;
    });

    add_command("join", ["j"], (panel, line) => {
      const parts = ["JOIN", line];
      return parts.join(" ");
    });

    add_command("nick", [], (panel, line) => {
      const parts = ["NICK", line];
      return parts.join(" ");
    });

    add_command("mode", [], (panel, line) => {
      const parts =["MODE", panel.name];
      if (line) {
        parts.push(line);
      }
      return parts.join(" ");
    });

    add_command("ignores", [], (panel) => {
      const ignores = panel.ignore_nicks;
      let text = "";

      if (ignores.length) {
        text = `Ignores:\n${ignores.join("\n")}`;
      }
      else {
        text = `No ignores for ${panel.name}`;
      }

      panel.info(text);
      return;
    });

    add_command("ignore", [], (panel, nick) => {
      app.add_ignore(panel, nick);
      panel.info(`Ignoring ${nick} in channel ${panel.name}`);
      return;
    });

    add_command("unignore", [], (panel, nick) => {
      app.remove_ignore(panel, nick);
      panel.info(`Unignored ${nick} in channel ${panel.name}`);
      return;
    });

    add_command("last", ["lastlog", "l"], (panel, line) => {
      if (panel.type == "status") {
        throw "Can not search on a status panel.";
      }

      if (!line) {
        throw "Search text required";
      }

      app.search_panel(panel, line);
    });

    add_command("clear", [], (panel) => {
      panel.backlog_empty = true;
      panel.elem.list.innerHTML = '';
    });

    add_command("bikin", ["bike", "biek", "beik"], (panel) => {
      const url = ":https://www.youtube.com/watch?v=WYi-YUsYZtY";
      return ["PRIVMSG", panel.name, url].join(" ");
    });

    add_command("stryfe", ["dragonstryfe", "dagon", "stryfin"], (panel) => {
      const url = ":https://streamable.com/55sxk7";
      return ["PRIVMSG", panel.name, url].join(" ");
    });

    add_command("bustin", ["bust"], (panel) => {
      const url = ":https://www.youtube.com/watch?v=0tdyU_gW6WE";
      return ["PRIVMSG", panel.name, url].join(" ");
    });

    add_command("trim", ["prune"], (panel) => {
      panel.prune();
    });

    add_command("part", ["close","wc"], (panel, line) => {
      if (panel.type == "status") {
        throw "Can not close status panel.";
      }

      if (panel.type == "private") {
        app.close_panel(panel.id);
        return;
      }

      const parts = ["PART", panel.name];

      if (line)
        parts.push(`:${line}`);

      return parts.join(" ");
    });

    add_command("who", [], (panel, line) => {
      const parts = ["WHO", `:${line}`];
      return parts.join(" ");
    });

    add_command("whois", [], (panel, line) => {
      const parts = ["WHOIS", `:${line}`];
      return parts.join(" ");
    });

    add_command("names", ["n", "nicks"], (panel, line) => {
      const parts = ["NAMES"];
      if (!line) {
        parts.push(`:${panel.name}`);
      }
      else {
        parts.push(`:${line}`);
      }
      document.querySelector('#toggle-nicks').click();
      return parts.join(" ");
    });

    add_command("say", [""], (panel, line) => {
      return ["PRIVMSG", panel.name, `:${line}`].join(" ");
    });

    add_command("theme", ["color", "colors"], (panel, line) => {
      switch (line) {
      case "solarized dark":
        app.set_theme("solarized-dark");
        break;
      case "solarized":
      case "solarized light":
        app.set_theme("solarized");
        break;
      case "catppuccin":
      case "catppuccin mocha":
        app.set_theme("catppuccin-mocha");
        break;
      default:
        app.set_theme("default");
        break;
      }
    });

    add_command("query", ["q","msg"], (panel, line) => {
      const args = line.split(" ", 1);
      const rest = line.substring(args[0].length).trim();

      if (!rest.length) {
        const connection = panel.connection;
        app.add_panel(args[0], connection, {focus: true});
        return;
      }

      const parts = ["PRIVMSG", args[0]];
      parts.push(`:${rest}`);

      return parts.join(" ");
    });

    add_command("me", [], (panel, line) => {
      const parts = ["PRIVMSG", panel.name];
      parts.push(`:` + `\x01` + `ACTION ${line}\x01`);
      return parts.join(" ");
    });

    add_command("topic", ["t"], (panel, line) => {
      if (panel.type != "channel") {
        throw "TOPIC only works for channels";
      }

      const parts = ["TOPIC", panel.name];

      if (line)
        parts.push(`:${line}`);

      return parts.join(" ");
    });

    add_command("quote",["raw"], (panel, line) => {
      return line;
    });

    add_command("pause", [], (panel, line) => {
      panel.pause_gifs = true;
      panel.set_pause_gifs(true);
      return;
    });

    add_command("unpause", ["play"], (panel, line) => {
      panel.pause_gifs = false;
      panel.set_pause_gifs(false);
      return;
    });

    add_command("collapse", ["hide"], (panel, line) => {
        panel.set_collapse_embeds(true);
        return;
    });

    add_command("expand", ["show"], (panel, line) => {
        panel.set_collapse_embeds(false);
        return;
    });
  }

  completions() {
    return this.#names.map((k) => {
      return `/${k}`;
    }).sort((a, b) => {
      if (a.length == b.length) {
        return 0;
      }
      if (a.length < b.length) {
        return -1;
      }
      return 1;
    });
  }

  handle(panel, line) {
    line = line.replace(/^[\r\n]+/, "");
    line = line.replace(/[\r\n]+$/, "");

    if ( line.match(/[\r\n]/) ) {
      throw "Newline not allowed in commands";
    }

    const parts = line.split(" ", 1);
    const command = parts[0].toLowerCase();

    if ( command in this.#handlers ) {
      const rest = line.substring(command.length);
      return this.#handlers[command](panel, rest.trim());
    }

    throw `Unknown command ${parts[0]}`;
  }
}
