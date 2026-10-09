# Admin area & blog (Cloudflare Pages + D1 + R2)

The public site stays plain static HTML in `docs/`. On top of it:

| Path | What |
| --- | --- |
| `/admin/` | The admin GUI (Google sign-in, TipTap rich-text editor) |
| `/blog`, `/blog/<slug>` | Published blog posts, in the site's own header/drawer/footer |
| `/p/<slug>` | Pages written in the admin (optionally listed in the menu under *Blog*) |
| `/media/...` | Images and PDFs uploaded from the editor (stored in R2) |
| `/api/...` | `functions/` — auth, content CRUD, uploads, people |

Content is stored as editor JSON in D1 and rendered to HTML on the server through a strict
whitelist (`functions/_lib/render.js`), so nothing typed in the editor can inject script.
The existing 40 pages are untouched.

## One-time setup

1. **Cloudflare resources**
   ```bash
   npm install
   npx wrangler login
   npx wrangler d1 create sja-cms          # copy the database_id into wrangler.toml
   npx wrangler r2 bucket create sja-media
   npm run db:remote                       # creates the tables
   ```
2. **Google sign-in** — Google Cloud Console → APIs & Services → Credentials → *Create OAuth client ID*
   (type *Web application*). Add as authorised redirect URIs:
   `https://<your-domain>/api/auth/callback` (and `https://<project>.pages.dev/api/auth/callback`).
   Configure the consent screen with scopes `openid` and `email`.
3. **Deploy and set secrets** (Pages project `sja-website`)
   ```bash
   npm run deploy
   npx wrangler pages secret put GOOGLE_CLIENT_ID     --project-name sja-website
   npx wrangler pages secret put GOOGLE_CLIENT_SECRET --project-name sja-website
   npx wrangler pages secret put SESSION_SECRET       --project-name sja-website   # 32+ random characters, e.g. `openssl rand -hex 32`
   npx wrangler pages secret put ADMIN_EMAILS         --project-name sja-website   # owners, comma-separated Gmail addresses
   ```
   Redeploy once after setting the secrets. Owners in `ADMIN_EMAILS` are always admins; they add
   editors (or more admins) from **People** in the admin area.

   If you deploy from GitHub instead: build command empty, output directory `docs`, and add the
   D1/R2 bindings (`DB`, `MEDIA`) and the variables above in the Pages project settings.

## Local development

```bash
cat > .dev.vars <<'VARS'
SESSION_SECRET=local-dev-secret-local-dev-secret-0123456789
ADMIN_EMAILS=you@example.com
DEV_LOGIN_EMAIL=you@example.com     # skips Google, works on localhost only
VARS
npm run db:local && npm run dev     # http://localhost:8788/admin/
```

## Notes

- Roles: **editor** (write, publish, delete content) and **admin** (also manages People).
- Posts with a future publish date stay hidden until then. Signed-in editors can preview drafts at their URL.
- Not wired to the search box yet: new pages/posts are not in `search-index.json`.
- Uploads: JPEG/PNG/WebP/GIF up to 8 MB, PDF up to 25 MB (SVG is refused on purpose).
