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

    overlay.on("click", "input[type=submit]", function(e) {
      e.preventDefault();
      var action = $(e.target).attr('name');
      var email = overlay.find('input[type=email]').val();
      var pass = overlay.find('input[type=password]').val();

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
  };
};
