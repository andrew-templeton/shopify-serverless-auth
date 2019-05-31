
const Crypto = require('crypto')
const { OAuth2 } = require('oauth')
const Qs = require('querystring')
const Util = require('util')
const { POST_AUTH_REDIRECT, SHOPIFY_API_KEY, SHOPIFY_API_SECRET } = process.env
const scope = 'write_content, read_themes, write_themes, read_script_tags, write_script_tags, write_products'

const getOAuthAccessToken = Util.promisify((shop, code, callback) => {
  return Auth(shop).getOAuthAccessToken(code, {}, callback)
})

module.exports.init = hmacChecked(async ({ headers:{ Host }, queryStringParameters:{ shop } }) => {
  return redirect(Auth(shop).getAuthorizeUrl({ redirect_uri: `https://${Host}/auth/token`, scope }))
})

module.exports.token = hmacChecked(async ({ headers:{ Host }, queryStringParameters:{ shop, code } }) => {
  return redirect((POST_AUTH_REDIRECT || `https://${Host}/test?`) + Qs.stringify({ accessToken: await getOAuthAccessToken(shop, code), shop }))
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
          ShopifyApp.flashNotice('You are using the shopify-serverless-auth default page. You can set what page to redirect to by setting the POST_AUTH_REDIRECT environment variable in the serverless.yml file.');
        </script>
      </head>
      <body>
        <p>Hello world!</p>
        <p>Token: <pre>${accessToken}</pre></p>
      </body>
    </html>`
  }
}

function redirect (Location) {
  console.log('Redirecting to: %s', Location)
  return {
    statusCode: 302,
    headers: {
      'Content-Type': 'text/html',
      Location
    }
  }
}

function hmacChecked (asyncFunctor) {
  return async ({ queryStringParameters, queryStringParameters:{ hmac }, headers, requestContext }) => {
    delete queryStringParameters.hmac
    return Crypto.createHmac('sha256', SHOPIFY_API_SECRET).update(Qs.stringify(queryStringParameters)).digest('hex') == hmac
      ? await asyncFunctor({ queryStringParameters, headers, requestContext })
      : { statusCode: 500 }
  }
}

function Auth(host) {
  return new OAuth2(SHOPIFY_API_KEY, SHOPIFY_API_SECRET, `https://${host}`, '/admin/oauth/authorize', '/admin/oauth/access_token')
}
