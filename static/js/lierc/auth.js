var Auth = function(baseurl) {
  var baseurl = baseurl;

  this.auth = function(complete) {
    fetch(baseurl + "/auth", {
      'credentials': 'same-origin'
    }).then(function(res) {
      if (!res.ok)
        throw Error(res.statusText);
      return res.json();
    }).then(function(res) {
      complete(res);
    }).catch(function(e) {
        console.log(e);
      modal_overlay(complete);
    });
  };

  function modal_overlay(complete) {
    var overlay = document.createElement('DIV');
    overlay.setAttribute('class', 'overlay');
    var login = document.querySelector('.login').cloneNode(true);
    overlay.appendChild(login);
    document.body.appendChild(overlay);

    if (!("ontouchstart" in document.documentElement)) {
      overlay.querySelector('.login-form input[name="email"]').focus();
    }

    overlay.addEventListener("submit", function(e) {
      e.preventDefault();
      var action = e.target.querySelector('input[type="submit"]').getAttribute('name');
      var email = e.target.querySelector('input[name="email"]').value;
      var pass = e.target.querySelector('input[type="password"]').value;

      var body = "";
      body += "email=" + encodeURIComponent(email);
      body += "&pass=" + encodeURIComponent(pass);

      if (action == "register") {
        var user = e.target.querySelector('input[name="username"]').value;
        body += "&username=" + encodeURIComponent(user);
      }

      fetch(baseurl + "/" + action, {
          'credentials': 'same-origin',
          'method': "POST",
          'body': body,
          'headers': {
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
          }
        }).then(function(res) {
          if (!res.ok)
            throw Error(res.statusText);
          return res.json();
        }).then(function(res) {
          overlay.remove();
          complete(res);
        }).catch(function(e) {
          alert("Sorry, that didn't work...");
        });
    });

    overlay.querySelector('.login-toggle').addEventListener('click', function(e) {
      e.preventDefault();
      overlay.querySelector('.login-wrap').style.display = 'block';
      overlay.querySelector('.reset-wrap').style.display = 'none';
      overlay.querySelector('.login-form input[name="email"]').focus();
    });

    overlay.querySelector('.reset-toggle').addEventListener('click', function(e) {
      e.preventDefault();
      console.log(e);
      overlay.querySelector('.login-wrap').style.display = 'none';
      overlay.querySelector('.reset-wrap').style.display = 'block';
      overlay.querySelector('.reset-wrap input[name="email"]').focus();
    });

  };
};
