# Deploying PawCast Publicly on the Web (Free HTTPS + PWA)

PawCast builds into a self-contained static web app (including `manifest.json`, `apple-touch-icon.png`, all `90` park thumbnails, and strict CSP/security headers) ready for free HTTPS hosting.

## Option A — Vercel (1 Command)
`vercel.json` is already pre-configured with SPA rewrites and security headers.
```bash
npx vercel --prod
```

## Option B — Cloudflare Pages (Free Unlimited Bandwidth)
`public/_headers` and `public/_redirects` are already included.
1. Run:
   ```bash
   npx expo export --platform web --output-dir dist
   ```
2. Deploy `dist/` via Wrangler (`npx wrangler pages deploy dist --project-name pawcast`) or drag-and-drop `dist/` in the Cloudflare Pages dashboard.

## Shareable Deep Links
Once live, share direct links to any curated park, beach, or suburb:
- **Specific Park / Dog Beach:** `https://<your-domain>/#spot=mel-brighton-beach` or `https://<your-domain>/#spot=syd-sirius-cove`
- **Specific Suburb:** `https://<your-domain>/#suburb=mel-3065-fitzroy` or `https://<your-domain>/#suburb=syd-2026-bondi-beach`
- **City Hub:** `https://<your-domain>/#city=sydney` or `https://<your-domain>/#city=shanghai`
