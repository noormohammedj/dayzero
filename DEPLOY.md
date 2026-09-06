# Deployment

## How this site is deployed

This repository has no build step — it's static HTML, CSS, and vanilla JavaScript, served directly. The `CNAME` file at the repo root (containing `thedayzero.in`) confirms this is deployed via **GitHub Pages** with a custom domain. There is no CI/CD workflow in the repository (no `.github/workflows/`), so the deployment model is almost certainly: push to the default branch → GitHub Pages serves the updated files directly, with no intermediate build or transform step.

## Deployment steps

1. **Review the diff.** Confirm the changed files match `CHANGELOG.md`: `index.html`, `Skill-Test.html`, `find-business.html`, `run-business-30-days.html`, `story.html`, `sitemap.xml`, `founder.html`, `hero-video.mp4`.
2. **Run through `TESTING.md`** locally first — serve the repo root with any static file server (e.g. `python3 -m http.server 8000` from the repo root, then visit `http://localhost:8000/`) and click through every item in that checklist. Because there's no build step, what you see locally is exactly what will go live.
3. **Commit and push to the branch GitHub Pages is configured to serve** (check the repo's Settings → Pages to confirm which branch/folder is live — typically `main` at the repo root, given the `CNAME` file's location).
4. **Wait for GitHub Pages to rebuild** (usually under a minute) and re-verify the live site at `https://www.thedayzero.in` — specifically re-check the items in `TESTING.md` sections 1–4 (tracking, WhatsApp, payment, and the lead-modal gate) directly on production, since these carry the highest risk if something didn't deploy as expected.
5. **Submit the updated `sitemap.xml` to Google Search Console** (or wait for the next crawl) so the three newly-indexable pages (`find-business.html`, `run-business-30-days.html`, `Skill-Test.html`) get picked up faster.
6. **Monitor GA4** over the following days for the funnel events already in place (`step_view`, `form_start`, `buy_click`, etc. — all of which live in `day4-30/index.html` and are unaffected by this PR) plus overall session counts on `find-business.html` and `Skill-Test.html`, which should now show a large increase now that both are reachable without the lead-capture gate and indexable by Google.

## Environment variables / secrets

None exist in this repository. The only "credential-like" value present is the Google Apps Script Web App URL hardcoded in `index.html` (`WEBAPP_URL`) — this was not changed and remains functional, even though it's currently unreachable via any link on the page (see `CHANGELOG.md`).

## Rollback

Because there's no build artifact, rollback is a straight `git revert` of this PR's commit(s) followed by a push — GitHub Pages will redeploy the previous file versions on the next push, with no cache-busting or CDN purge steps required beyond normal GitHub Pages propagation (typically under a minute).

## Nothing else to configure

No new dependencies, no new environment variables, no new third-party services, and no changes to `CNAME`, `robots.txt`, or the routing model were introduced by this PR.
