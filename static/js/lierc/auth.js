var Auth = function(baseurl) {
  var baseurl = baseurl;

  this.auth = function(complete) {
    $.ajax({
      url: baseurl + "/auth",
      type: "GET",
      dataType: "json",
      error: function() {
        modal_overlay(complete);
      },
      success: complete
    });
  };

  function modal_overlay(complete) {
    var overlay = $('<div/>', {'class':'overlay'});
    overlay.append($('.login').clone().show());
    $('body').append(overlay);

    if (!("ontouchstart" in document.documentElement))
      overlay.find('.login-form input[type=email]').focus();

    overlay.on("submit", function(e) {
      e.preventDefault();
      var form = $(e.target);
      var action = form.find('input[type=submit]').attr('name');
      var email = form.find('input[type=email]').val();
      var pass = form.find('input[type=password]').val();

      $.ajax({
        url: baseurl + "/" + action,
        type: "POST",
        data: { email: email, pass: pass },
        dataType: "json",
        success: function(res) {
          overlay.remove();
          complete();
        },
        error: function(res) {
          alert("Sorry, that didn't work...");
        }
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
