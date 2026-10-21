# Deployment

## Canonical host: Cloudflare Pages

- Project: `anatomy-atlas`
- Account: `Shanto12@gmail.com's Account` (`CLOUDFLARE_ACCOUNT_ID=4c936f21d17be8ba59a88e6e89bece09`)
- Production branch: `main`
- URL: https://anatomy-atlas-b2m.pages.dev

### Manual deploy

```bash
npm ci
npm run build
CLOUDFLARE_ACCOUNT_ID=4c936f21d17be8ba59a88e6e89bece09 \
  npx wrangler pages deploy dist --project-name anatomy-atlas --branch main
```

The `_redirects` file in `public/` provides SPA fallback (`/* /index.html 200`), and `_headers` sets caching and
security headers. `npm run deploy` wraps the two commands.

### CI

`.github/workflows/ci.yml` runs typecheck, build, unit tests, and Playwright e2e on pushes and pull requests.
Automatic deploys are intentionally not wired to CI because the Cloudflare API token is not stored in the repo;
run the manual deploy after merging to `main`.

## Netlify (historical note)

The app's build output is static and Netlify-compatible (`netlify deploy --prod --dir=dist`). During this build both
Netlify accounts available on this machine rejected new deploys/site creation with:

> Account credit usage exceeded — new deploys are blocked until credits are added

and

> Cannot create more sites because account has exceeded usage limit

Therefore Cloudflare Pages is used for hosting. To switch to Netlify later, connect the GitHub repo to a Netlify
project with build command `npm run build` and publish directory `dist`, then add a `netlify.toml` if desired.

## Verification

```bash
npm run build
npm run test
npm run test:e2e
node scripts/verify-live.mjs https://anatomy-atlas-b2m.pages.dev
```

`scripts/verify-live.mjs` checks status, title, H1, navigation, key routes, console errors, and canvas presence
using Playwright.
