'use strict';

const OAuth = require('oauth').OAuth2
const url = require('url')

const POST_AUTH_REDIRECT = process.env.POST_AUTH_REDIRECT
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET


module.exports.init = (event, context, callback) => {

  console.log('Got event: %j', event)

  const host = event.headers.Host
  const shopUri = event.queryStringParameters.shop
  const stage = event.requestContext.stage

  const redirectURI = _OAuth('https://' + shopUri).getAuthorizeUrl({
    redirect_uri: [
      'https:/',
      host,
      stage,
      'auth/token'
    ].join('/'),
    scope: [
      'write_content',
      'read_themes',
      'write_themes',
      'read_script_tags',
      'write_script_tags',
      'write_products'
    ].join(', ')
  })

  console.log('redirectURI: %s', redirectURI);

  const response = {
    statusCode: 302,
    headers: {
      'Content-Type': 'text/html',
      'Location': redirectURI
    }
  }

  callback(null, response);
}



module.exports.token = (event, context, callback) => {

  console.log('Got event: %j', event)

  const code = event.queryStringParameters.code
  const host = event.headers.Host
  const shopUri = event.queryStringParameters.shop
  const stage = event.requestContext.stage

  console.log('Got token for shop: %s', shopUri)

  _OAuth('https://' + shopUri).getOAuthAccessToken(
    code,
    {},
    function(err, accessToken, refreshToken) {
      if (err) {
        console.error('OAuth access token generation error: %j', err)
        return callback(null, {
          statusCode: 500
        })
      } else {
        const redirectQueryParams = '?accessToken=' + accessToken + '&shopUrl=' + shopUri
        console.log('Built access token: %s', accessToken)
        const redirectURI = (POST_AUTH_REDIRECT || [
          'https:/',
          host,
          stage,
          'test'
        ].join('/')) + redirectQueryParams
        console.log('RedirectURI: %s', redirectURI)
        const response = {
          statusCode: 302,
          headers: {
            'Content-Type': 'text/html',
            'Location': redirectURI
          }
        }
        callback(null, response)
      }
    }
  )

}



module.exports.page = (event, context, callback) => {

  console.log('Got event: %j', event)

  const accessToken = event.queryStringParameters.accessToken
  const shopHost = event.queryStringParameters.shopUrl
  
  callback(null, {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html'
    },
    body: [
      '<html>',
      '  <head>',
      '    <script src="https://cdn.shopify.com/s/assets/external/app.js"></script>',
      '    <script>',
      '      ShopifyApp.init({',
      '        apiKey: "' + SHOPIFY_API_KEY + '",',
      '        shopOrigin: "https://' + shopHost + '",',
      '        debug: true',
      '      });',
      '      ShopifyApp.flashNotice("You are using the shopify-serverless-auth ' +
      'default page. You can set what page to redirect to by setting the ' +
      'POST_AUTH_REDIRECT environment variable in the serverless.yml file.");',
      '    </script>',
      '  </head>',
      '  <body>',
      '    <p>Hello, world!</p>',
      '    <p>Token: <pre>' + accessToken + '</pre></p>',
      '  </body>',
      '</html>'
    ].join('\n')
  })

}



function _OAuth(shopUri) {
  return new OAuth(
    SHOPIFY_API_KEY,
    SHOPIFY_API_SECRET,
    shopUri,
    '/admin/oauth/authorize',
    '/admin/oauth/access_token'
  );
}
