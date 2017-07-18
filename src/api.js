class API {
  constructor (baseurl) {
    this.baseurl = baseurl
  }

  request (method, path, options) {
    if (!options) {
      options = {}
    }

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

    return fetch(this.baseurl + path, settings).then( res =>  {
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
    }).then( data => {
      if (data['status'] == 'error') {
        throw 'API Error: ' + data['error']
      }

      if (options['success']) {
        options['success'](data)
      }
    }).catch( e => {
      if (options['error']) {
        options['error'](e)
      } else {
        console.error(e)
      }
    })
  }

  build_query (params) {
    return Object.keys(params).map( k => {
      return [
        encodeURIComponent(k),
        encodeURIComponent(params[k])
      ].join('=')
    }).join('&')
  }

  stream () {
    return new Stream(this.baseurl)
  }

  auth (cb) {
    return fetch(this.baseurl + '/auth', {
      credentials: 'same-origin'
    }).then(cb)
  }

  logout () {
    return fetch(this.baseurl + '/logout', {
      'method': 'POST',
      'credentials': 'same-origin'
    }).then( res => {
      if (!res.ok) {
        alert('Error!')
      }
      else {
        window.location.reload()
      }
    })
  }

  get (path, options) {
    if (options['data']) {
      path += '?' + this.build_query(options['data'])
    }
    return this.request('GET', path, options)
  }

  post (path, options) {
    return this.request('POST', path, options)
  }

  delete (path, options, query) {
    if (query) {
      path += '?' + this.build_query(query)
    }
    return this.request('DELETE', path, options)
  }

  put (path, options) {
    return this.request('PUT', path, options)
  }
}
