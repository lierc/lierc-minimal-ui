var API = function (baseurl) {
  var api = this
  api.baseurl = baseurl

  api.request = function (method, path, options) {
    if (!options) { options = {} }

    var settings = {
      method: method,
      credentials: 'same-origin'
    }

    if (options['body']) {
      var body = options['body']
      if (body && typeof (body) === 'Object') {
        settings['body'] = JSON.stringify(body)
      } else {
        settings['body'] = body
      }
    }

    if (options['headers']) {
      settings['headers'] = options['headers']
    }

    return fetch(api.baseurl + path, settings).then(function (res) {
      var type = res.headers.get('Content-Type')
      if (type && type.match(/^application\/javascript/)) {
        return res.json()
      } else if (res.ok) {
        return res.text()
      } else {
        throw new Error(
          'API Error: [' + res.status + "] '" + res.statusText + "'"
        )
      }
    }).then(function (data) {
      if (data['status'] == 'error') {
        throw 'API Error: ' + data['error']
      }

      if (options['success']) {
        options['success'](data)
      }
    }).catch(function (e) {
      if (options['error']) {
        options['error'](e)
      } else {
        console.error(e)
      }
    })
  }

  api.build_query = function (params) {
    return Object.keys(params).map(function (k) {
      return [
        encodeURIComponent(k),
        encodeURIComponent(params[k])
      ].join('=')
    }).join('&')
  }

  api.stream = function () {
    return new Stream(api.baseurl)
  }

  api.auth = function (cb) {
    return fetch(api.baseurl + '/auth', {
      credentials: 'same-origin'
    }).then(cb)
  }

  api.logout = function () {
    return fetch(api.baseurl + '/logout', {
      'method': 'POST',
      'credentials': 'same-origin'
    }).then(function (res) {
      if (!res.ok) { alert('Error!') } else { window.location.reload() }
    })
  }

  api.get = function (path, options) {
    if (options['data']) { path += '?' + api.build_query(options['data']) }
    return api.request('GET', path, options)
  }

  api.post = function (path, options) {
    return api.request('POST', path, options)
  }

  api.delete = function (path, options, query) {
    if (query) { path += '?' + api.build_query(query) }
    return api.request('DELETE', path, options)
  }

  api.put = function (path, options) {
    return api.request('PUT', path, options)
  }
}
