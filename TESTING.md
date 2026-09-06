# Pre-Deployment Testing Checklist

This site has no build step (static HTML/CSS/vanilla JS). "Building successfully" means every page loads and functions correctly — there's nothing to compile. Test by opening each file directly or serving the repo root with any static file server (e.g. `python3 -m http.server`) and browsing to it.

## 1. Tracking & analytics — must be unaffected

- [ ] Open browser DevTools → Network tab on `index.html`, `find-business.html`, `run-business-30-days.html`, `Skill-Test.html`, `story.html`, `founder.html`. Confirm a request to `googletagmanager.com/gtag/js?id=G-6VT4XMLT0Q` fires on every page.
- [ ] In the GA4 DebugView (or Tag Assistant), confirm `page_view` fires on each page load.
- [ ] Confirm no console errors reference `gtag` or `dataLayer`.
- [ ] If Google Tag Manager, Meta Pixel, or Microsoft Clarity are added to the site in the future, re-run this checklist against those snippets too — none were found in the repository as of this PR (verified via repo-wide search for `googletagmanager.com/gtm.js`, `GTM-`, `connect.facebook.net`, `fbq(`, and `clarity.ms` — zero matches).

## 2. WhatsApp integrations — must be unaffected

- [ ] Homepage navbar "Get in touch" → opens `https://wa.me/919629843122`.
- [ ] Homepage navbar WhatsApp icon + mobile menu WhatsApp link → opens `https://chat.whatsapp.com/D6XeJK0D8kD7zfMAJkAeda`.
- [ ] `Skill-Test.html` results page → the new "Join the WhatsApp Community" invite card opens the same community link in a new tab, and the result underneath it is visible **without** clicking it.
- [ ] `founder.html` → the WhatsApp contact link still opens `https://wa.me/919629843122`.

## 3. Payment flow — must be unaffected

- [ ] `run-business-30-days.html` → both "Start Now — ₹499" buttons (top and after the FAQ) link to `https://rzp.io/rzp/xaRyRIP`.
- [ ] Confirm the Razorpay link opens correctly and nothing on the page intercepts the click (no JS `preventDefault` was added near these buttons).

## 4. Lead-capture modal (now dormant, not deleted) — confirm it's genuinely off

- [ ] From `index.html`, click "Find your skill" and "Convert skill as business" (hero, navbar, and mobile menu versions of each). Confirm they navigate straight to `find-business.html` / `run-business-30-days.html` with **no popup**.
- [ ] Open DevTools console and confirm no JS errors fire from the lead-modal script (its markup, CSS, and webhook code are all still present and valid — just not wired to any link, since `GATED_PAGES` is now `[]`).

## 5. Quiz & scoring logic — must be functionally identical

- [ ] `find-business.html` → pick each of the 3 personas (IT Pro, Student, Homemaker) → confirm the Step 2 pitch copy updates correctly and "Do Skill Test for Free" links to `Skill-Test.html`.
- [ ] `Skill-Test.html` → complete the quiz for at least 2 different personas and 2 different answer combinations. Confirm:
  - The result now appears **immediately** after the analyzing animation (no gate).
  - The strength bars, "why/gap/edge/secondary" text blocks, and the "Beat the Top 1%" CTA all populate correctly.
  - The CTA into `run-business-30-days.html` carries the correct `?biz=` and `?niche=` query parameters.
  - `localStorage.tdz_persona` and `localStorage.tdz_biz` are set correctly (check via DevTools → Application → Local Storage).
- [ ] Switch languages (EN/HI/中文 — actually EN/HI/TA) at every step (persona gate, quiz, results) and confirm all new strings (the community invite title/subtitle) translate correctly and nothing falls back to a blank string.
- [ ] Retake the test via "Retake the test" and confirm it returns to the persona picker cleanly.

## 6. Personalization on the offer page

- [ ] Visit `run-business-30-days.html` directly (no query params) → confirm the default headline shows ("From idea to your first paying customer. In 30 days.").
- [ ] Visit `run-business-30-days.html?biz=hyperlocal-trust&niche=Test%20Business` → confirm the eyebrow/H1/lead update to reference "Test Business."
- [ ] Complete the quiz and click through to the offer page → confirm the personalization still fires from the `localStorage.tdz_biz` fallback.

## 7. New content — visual & functional QA

- [ ] `run-business-30-days.html`: the "Day 1 · Unlocked preview" card, founder-credibility strip, and FAQ accordion all render correctly on both mobile (narrow viewport) and desktop widths.
- [ ] Click each FAQ `<summary>` — confirm it expands/collapses with the `+`/`−` indicator, and that the two in-FAQ links (to `find-business.html` and the founder's WhatsApp) work.
- [ ] `find-business.html`: confirm the new trust strip renders below "Takes 10 minutes either way..." without breaking the persona-card layout on mobile.
- [ ] `founder.html`: confirm the founder photo still displays correctly, cropped the same way as before (top-center, circular frame) — it was recompressed but not re-cropped.

## 8. SEO regressions

- [ ] View source on `find-business.html`, `run-business-30-days.html`, `Skill-Test.html` → confirm `<meta name="robots" content="index, follow">` (not `noindex`).
- [ ] Confirm each page's `<link rel="canonical">` and `og:url` point to itself (especially `Skill-Test.html`, which previously pointed at `/quick-start/`).
- [ ] Validate the new JSON-LD blocks (`Product`, `FAQPage` on the offer page; `Organization`, `WebSite` on the homepage) with Google's Rich Results Test or `https://validator.schema.org/`.
- [ ] Fetch `sitemap.xml` and confirm it lists 6 URLs including the 3 newly-added funnel pages.
- [ ] Confirm `story.html`'s CTA no longer references `/quick-start/` or "₹99."

## 9. Mobile & desktop UX

- [ ] Test all 6 edited pages at 375px (mobile), 768px (tablet), and 1440px (desktop) widths.
- [ ] Confirm the homepage hero video still autoplays, loops, and the mouse/touch-drag scrub interaction still works.
- [ ] Confirm the mobile hamburger menu opens/closes correctly and its links match the desktop nav (both now show 4 items instead of 5, since the duplicate "About" link was removed).

## 10. Performance

- [ ] Confirm `founder.html` now loads a ~65KB page instead of ~6.2MB (check Network tab total transferred).
- [ ] Confirm `hero-video.mp4` now transfers ~832KB instead of ~3.0MB, and still plays with no visible quality loss or audio (it was always muted, so removing the unused audio track has no audible effect).
- [ ] Run Lighthouse (mobile) on `index.html`, `run-business-30-days.html`, and `founder.html` before/after comparison if possible — expect meaningful LCP improvement on `founder.html` in particular.

## 11. Accessibility

- [ ] Confirm the founder photo now has descriptive `alt` text (previously had none).
- [ ] Confirm the FAQ `<details>/<summary>` elements are keyboard-navigable (Tab to focus, Enter/Space to expand) and screen-reader friendly (native HTML, no custom ARIA needed).
- [ ] Confirm the new community-invite card and trust-strip text have sufficient color contrast against their backgrounds.

## 12. Final check

- [ ] Diff every changed file against the previous version (`git diff`) and confirm no unrelated line was touched.
- [ ] Confirm `CNAME`, `robots.txt`, and all files under `day4-30/`, `quick-start/`, `agenda/`, `unlearn/`, and `Day0-Landing-SalesPage.html` are byte-identical to before this PR.
