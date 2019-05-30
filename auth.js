
const Crypto = require('crypto')
const { OAuth } = require('oauth')
const Qs = require('querystring')
const Url = require('url')
const Util = require('util')

const { POST_AUTH_REDIRECT, SHOPIFY_API_KEY, SHOPIFY_API_SECRET } = process.env

const scope = 'write_content, read_themes, write_themes, read_script_tags, write_script_tags, write_products'

const getOAuthAccessToken = Util.promisify(function getOAuthAccessToken (shop, code, callback) {
  return _OAuth(shop).getOAuthAccessToken(code, {}, (err, accessToken, refreshToken) => {
    return callback(err, { accessToken, refreshToken })
  })
})

module.exports.init = hmacChecked(async ({ headers:{ Host }, queryStringParameters, requestContext:{ stage } }) => {
  const { shop } = queryStringParameters
  return redirect(_OAuth(shop).getAuthorizeUrl({ redirect_uri: `https://${Host}/${stage}/auth/token`, scope }))
})

module.exports.token = hmacChecked(async ({ queryStringParameters, headers: { Host }, requestContext: { stage } }) => {
  const { code, shop } = queryStringParameters
  const { accessToken, refreshToken } = await getOAuthAccessToken(shop, code)
  return redirect((POST_AUTH_REDIRECT || `https://${Host}/${stage}/test`) + Qs.stringify({ accessToken, shop }))
})

module.exports.page = async ({ queryStringParameters:{ shop, accessToken } }) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html'
    },
    body: `<html>
      <head>
        <script src="https://cdn.shopify.com/s/assets/external/app.js"></script>
        <script>
          ShopifyApp.init({
            apiKey: '${SHOPIFY_API_KEY}',
            shopOrigin: 'https://${shop}',
            debug: true
          });
          ShopifyApp.flashNotice('You are using the shopify-serverless-auth default page. You can set what page to redirect to by setting the POST_AUTH_REDIRECT environment variable in the serverless.yml file.'');
        </script>
      </head>
      <body>
        <p>Hello world!</p>
        <p>Token: <pre>${accessToken}</pre></p>
      </body>
    </html>`
  }
}

function redirect (uri) {
  return {
    statusCode: 302,
    headers: {
      'Content-Type': 'text/html',
      'Location': uri
    }
  }
}

function hmacChecked (asyncFunctor) {
  return async ({ queryStringParameters, queryStringParameters:{ hmac }, headers, requestContext }) => {
    delete queryStringParameters.hmac
    return Crypto.createHmac('sha256', SHOPIFY_API_SECRET).update(Qs.stringify(queryStringParameters)).digest('hex') !== hmac
      ? { statusCode: 500 }
      : await asyncFunctor({ queryStringParameters, headers, requestContext })
  }
}

function _OAuth(origin) {
  return new OAuth(SHOPIFY_API_KEY, SHOPIFY_API_SECRET, origin, '/admin/oauth/authorize', '/admin/oauth/access_token')
}
