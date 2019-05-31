
# shopify-serverless-auth

A starter project with completely working Shopify OAuth2 approval flow.

### Configuration

1. Requires Serverless globally installed: `npm install -g serverless`
2. Install OAuth dependency using `npm install`
3. Export required variables: `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET`
4. Ensure an AWS account is configured / authenticated on the CLI.
5. Run deployment: `sls deploy`
6. All endpoints returned after deploy must be added to the "redirect whitelist" in the Shopify App Config
7. The app URL is the URL output for the `init` handler.
8. Using a Custom Domain with AWS API Gateway is recommended.
