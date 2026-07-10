# Production deployment - trem-explorer.org.uk

The production build of the TReM Explorer is a static Vite/React bundle
served by nginx on the same server that hosts
[climatematch.org.uk](https://climatematch.org.uk). No backend, no
database - just files.

`../aws-test/DEPLOYMENT.md` describes a *separate* AWS-based test
deployment on trems.nicksynes.com and is not used here.

## Setup

The commands below all reference `$DEPLOY_USER` and `$DEPLOY_HOST`.
Set them once at the top of your shell session (values kept out of
this repo intentionally - grab them from your notes or the domain
owner):

```bash
export DEPLOY_USER=<ssh-user>
export DEPLOY_HOST=<server-ip-or-hostname>
```

Everything below assumes those are exported.

## Server layout

| Item          | Value                                    |
|---------------|------------------------------------------|
| Host          | `$DEPLOY_USER@$DEPLOY_HOST`              |
| Files served  | `/home/$DEPLOY_USER/trem-explorer/dist/` |
| nginx config  | `/etc/nginx/sites-available/trem-explorer.org.uk` (symlink in `sites-enabled/`) |
| TLS cert      | Let's Encrypt via Certbot, auto-renewed  |

The nginx source-of-truth for that config file lives in this repo:
[trem-explorer.org.uk-nginx](trem-explorer.org.uk-nginx). If you change
it locally, copy the new version onto the server and reload nginx.

## DNS

`trem-explorer.org.uk` → A record pointing at the server's IPv4
address (v4 only - no AAAA because the server doesn't answer over
IPv6). Managed by the domain owner at the registrar (IONOS). If DNS
changes are needed, ask them - they don't need server access, only
registrar access.

## First-time setup on the server

Runs once. Prereqs (already in place from climatematch): nginx,
certbot, ssh key access.

```bash
# From your laptop - build and ship a first copy of the app files
cd react-app && npm run build
ssh $DEPLOY_USER@$DEPLOY_HOST "mkdir -p /home/$DEPLOY_USER/trem-explorer"
rsync -avz --delete react-app/dist/ \
    $DEPLOY_USER@$DEPLOY_HOST:/home/$DEPLOY_USER/trem-explorer/dist/

# Ship the nginx config
scp trem-explorer.org.uk-nginx \
    $DEPLOY_USER@$DEPLOY_HOST:/tmp/trem-explorer.org.uk

# On the server - install and enable the site
ssh $DEPLOY_USER@$DEPLOY_HOST
sudo mv /tmp/trem-explorer.org.uk /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/trem-explorer.org.uk \
    /etc/nginx/sites-enabled/
sudo nginx -t                                    # sanity-check config
sudo systemctl reload nginx

# Get the TLS cert - DNS must be pointing at this server first
sudo certbot --nginx -d trem-explorer.org.uk
```

Certbot rewrites the sites-available file to add the `listen 443 ssl`
block and a HTTP → HTTPS redirect. Post-Certbot, the file will look
structurally like `climatematch.org.uk-nginx` in this repo.

Verify:

```bash
curl -I https://trem-explorer.org.uk/           # expect 200 OK
```

## Redeploy (the common case)

Just rsync the new build. nginx picks up the changed files immediately.

```bash
cd react-app && npm run build
rsync -avz --delete react-app/dist/ \
    $DEPLOY_USER@$DEPLOY_HOST:/home/$DEPLOY_USER/trem-explorer/dist/
```

Vite content-hashes filenames on build (`index-abc123.js`, etc.), so
new asset URLs cache-bust on the client for free. The nginx config
also sets `Cache-Control: no-cache` on `index.html` so the entry point
is always fresh.

No nginx reload or Certbot step needed for a redeploy - only when the
config or TLS cert changes.

## Regenerating data before deploy

If the TreM data spreadsheet has changed, run the data pipeline before
`npm run build`:

```bash
python scripts/process-data.py
```

That reads `data/column-mapping.json` (which points at whichever
spreadsheet in `data/`), regenerates `react-app/src/data/config.json`
and `react-app/src/data/species.json`, then the standard build picks
them up. See `scripts/process-data.py`'s docstring for details.

## Rollback

The build is deterministic from the repo state and the spreadsheet.
To roll back:

```bash
git checkout <known-good-sha>
cd react-app && npm run build
rsync -avz --delete react-app/dist/ \
    $DEPLOY_USER@$DEPLOY_HOST:/home/$DEPLOY_USER/trem-explorer/dist/
```

## Cert renewal

Certbot registers a systemd timer at install time (`snap` or `deb`
package, whichever is in use). Renewals happen automatically ~30 days
before expiry. Check status any time with:

```bash
ssh $DEPLOY_USER@$DEPLOY_HOST "sudo certbot certificates"
```

## Troubleshooting

- **`nginx -t` fails after copying config** - syntax error. Diff
  against the repo copy; the `# managed by Certbot` lines exist only
  after Certbot has run, don't add them by hand.
- **HTTPS returns "cert doesn't match"** - DNS wasn't pointing at the
  server when Certbot ran. Wait for DNS to propagate, then
  `sudo certbot --nginx -d trem-explorer.org.uk` again.
- **Old files still served after a deploy** - browser cache; hard
  reload with Ctrl/Cmd + Shift + R. If it's not the browser, verify
  `dist/` on the server actually updated (`ls -la` and check timestamps).