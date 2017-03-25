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
      modal_overlay(complete);
    });
  };

  function modal_overlay(complete) {
    var overlay = $('<div/>', {'class':'overlay'});
    overlay.append($('.login').clone());
    $('body').append(overlay);

    if (!("ontouchstart" in document.documentElement))
      overlay.find('.login-form input[name=email]').focus();

    overlay.on("submit", function(e) {
      e.preventDefault();
      var form = $(e.target);
      var action = form.find('input[type=submit]').attr('name');
      var email = form.find('input[name=email]').val();
      var user = form.find('input[name=username]').val();
      var pass = form.find('input[type=password]').val();

      var body = "";
      body += "email=" + encodeURIComponent(email);
      body += "&username=" + encodeURIComponent(user);
      body += "&pass=" + encodeURIComponent(pass);

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

    overlay.find('.login-toggle').on('click', function(e) {
      e.preventDefault();
      overlay.find('.login-wrap').show();
      overlay.find('.reset-wrap').hide();
    });

    overlay.find('.reset-toggle').on('click', function(e) {
      e.preventDefault();
      overlay.find('.login-wrap').hide();
      overlay.find('.reset-wrap').show();
    });

  };
};
