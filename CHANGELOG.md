# Changelog — Conversion & SEO Implementation (Sep 2026)

All changes below implement the growth-audit recommendations directly in the repository that powers `thedayzero.in`. No build step exists for this site (static HTML/CSS/vanilla JS, deployed via GitHub Pages using the `CNAME` file at the repo root) — every file listed is production-ready as committed.

## `index.html`

**What changed:**
- Disabled the homepage's lead-capture popup gate (`GATED_PAGES` is now `[]` instead of `['find-business.html', 'run-business-30-days.html']`). The modal, its styling, and the Google Apps Script webhook submission code are all left fully intact and functional — only the interception of navigation links was turned off. A path can be added back into `GATED_PAGES` at any time to re-enable gating on a specific page.
- Added a one-line microcopy under the hero CTAs: "Free quiz. Takes 3 clicks. No signup required."
- Removed a duplicate "About" nav link that pointed to the same URL as "Read Our Story" (in both the desktop navbar and mobile menu).
- Added `Organization` and `WebSite` JSON-LD structured data to `<head>`.

**Why it improves conversions:**
GA4 data showed only 17% of homepage visitors even started the lead form, and only 2.5% ever reached a quiz question. The gate sat in front of *both* the free quiz and the paid offer page, directly contradicting `find-business.html`'s own promise of "Free — no card, no signup." This was the single largest drop-off point in the entire funnel. Removing it lets every visitor reach the quiz or the offer page with zero friction.

**What was preserved unchanged:** GA4 tag `G-6VT4XMLT0Q`, the WhatsApp DM and community links, the Instagram link, the hero video and its scrub interaction, the typewriter script, the Apps Script webhook URL and payload shape (dormant but intact).

---

## `Skill-Test.html`

**What changed:**
- Removed the WhatsApp "join before reveal" gate (`communityGate`) that hid the quiz result until a visitor clicked "Join" and then "I've Joined." The result now renders immediately after the analyzing animation, every time, in every language.
- Replaced the gate with a small, non-blocking "community invite" card inside the results view — same real WhatsApp community link (`https://chat.whatsapp.com/D6XeJK0D8kD7zfMAJkAeda`), reframed as an optional invite rather than a precondition. Added matching English/Hindi/Tamil copy.
- Fixed `<link rel="canonical">` and `og:url`, which incorrectly pointed to the legacy `/quick-start/` page — they now self-reference `https://thedayzero.in/Skill-Test.html`.
- Removed `noindex` from the robots meta tag (now `index, follow`).
- Updated the `<title>`/description/OG/Twitter copy to accurately describe the test (free, ~10 minutes, no signup) instead of the stale "₹99. 5 minutes." copy.
- Removed now-dead code (`revealResultBtn`, `hasJoinedCommunity`, `WA_JOIN_KEY`, `renderCommunityGate`, `isCommunityGateVisible`) that only existed to support the gate.

**Why it improves conversions:**
This was the highest-impact fix identified in the audit. Visitors who completed the *entire* multi-screen quiz — the highest-intent action in the whole funnel — were then blocked from seeing their own result unless they self-reported joining a WhatsApp group. There's no way to verify WhatsApp membership from a static page, so this gate produced zero verifiable community growth while costing real, hard-won completions. The community is still promoted, just honestly, after value has been delivered.

**What was preserved unchanged:** the scoring engine, all icon/archetype/niche data, the full EN/HI/TA i18n system, `localStorage` writes to `tdz_persona` and `tdz_biz`, and the personalized link construction into `run-business-30-days.html`.

---

## `find-business.html`

**What changed:**
- Removed `noindex` from the robots meta tag (now `index, follow`).
- Added a small, factual trust strip under the persona-picker step: real proof points already stated elsewhere on the site (Murugaaa.in's break-even timeline, TheKahaaniya's Event 1 profitability, the founder's 16 years in tech) — no invented testimonials or reviews.

**Why it improves conversions:** this page was previously excluded from Google's index entirely, meaning it could never rank for people searching for a business-fit or skill quiz. The trust strip adds credibility without fabricating social proof the business doesn't have yet.

---

## `run-business-30-days.html`

**What changed:**
- Removed `noindex` (now `index, follow`); expanded and sharpened the meta description, OG, and Twitter copy.
- Added `Product` JSON-LD (price, currency, offer validity date) and `FAQPage` JSON-LD structured data.
- Strengthened the hero headline and subhead ("From idea to your first paying customer. In 30 days." / "One focused task a day. No live calls, no cohort to keep up with — just today's step.") while keeping the `#pageEyebrow` / `#pageH1` / `#pageLead` element IDs the JS personalization script depends on.
- Added a **real, unlocked Day 1 preview** ("Do it for 30 minutes today — spend at least 30 minutes actually doing the skill you discovered, not researching it, doing it") — this is the actual Day 1 task pulled from the live course product, not a mockup.
- Added a founder-credibility strip linking to `founder.html`, using only facts already published there (16 years in tech, 4 live ventures).
- Added a 6-question FAQ (native `<details>/<summary>`, no JS) covering price, "I don't know my business yet," daily time commitment, self-paced format, who built it, and how to reach the founder directly for anything else.
- Added a second, repeated "Start Now — ₹499" button after the FAQ, since the page is now long enough that a visitor who scrolls to read the FAQ previously had no CTA in view.

**Why it improves conversions:** the page previously had zero trust content — no guarantee-equivalent risk reducer, no proof the founder is credible, no answer to the most obvious objections, and no way to preview what you're actually buying. Every addition here uses only real, existing facts or real product content — nothing fabricated (see `CONVERSION_REPORT.md` for what was deliberately *not* added, and why).

**What was preserved unchanged:** the Razorpay payment link (`https://rzp.io/rzp/xaRyRIP`), the GA4 tag, the `steps` phase grid, the honest ₹499→₹1,299 (30 Sep 2026) urgency line, and the full `BIZ`/`getBiz`/`getNiche` personalization script.

---

## `story.html`

**What changed:** replaced the closing CTA button, which read "Start My Quick Start — ₹99" and linked to the retired `/quick-start/` page, with "Take The Free Quiz" linking to `/find-business.html`, and updated the paragraph above it to match current, real pricing.

**Why it improves conversions:** this was a live, customer-facing pricing contradiction — the rest of the site promotes a free quiz and a ₹499 course, while this page's only CTA advertised a ₹99 product that no longer matches current positioning.

**What was preserved unchanged:** the honest "we'd rather tell you plainly" section about not having reviews yet — this is a genuine trust asset and was left exactly as written.

---

## `sitemap.xml`

**What changed:** added `find-business.html`, `Skill-Test.html`, and `run-business-30-days.html` — all three are newly indexable now that their `noindex` tags are removed, and are the three most important pages in the sales funnel.

---

## `founder.html`

**What changed:**
- Added `alt="Noor Mohammed J, founder of thedayzero"` to the founder photo (previously had no alt text at all).
- **Re-encoded the embedded founder photo.** It was a full-resolution, unedited camera JPEG (2362×2953px, 4.68MB) embedded as base64 — displayed on the page at 120×120px inside a circular frame. It has been resized to 480×600px (4× the display size, more than enough for retina screens) and re-compressed, cutting the file from **6.24MB to 65KB** with no visible change to the photo as rendered on the page (same crop, same framing — `object-fit: cover; object-position: top center` was already handling the crop, so only the source resolution changed).

**Why it improves performance:** this single file was, by a wide margin, the heaviest asset on the entire site. A 6.2MB page load for a 120px avatar directly hurts LCP and makes `founder.html` effectively unusable on slow mobile connections — a meaningful fraction of this audience.

---

## `hero-video.mp4`

**What changed:** re-encoded from 3.0MB to 832KB (a 72% reduction) — same resolution (720×1280), same 10-second duration, same visual content. Two changes: (1) the audio track was removed, since the video element is always rendered with the `muted` attribute and the audio was never audible or used; (2) the video stream was re-encoded with a more efficient H.264 configuration (CRF 26, `faststart` for immediate playback) instead of the original's higher, unnecessarily generous bitrate.

**Why it improves performance:** this is the largest single asset loaded by `index.html`'s hero — every homepage visitor, especially on mobile data, downloads this file. A 72% size cut directly improves LCP and page-weight without any visible quality change (it plays behind a dark scrim overlay, where compression artifacts are least visible).

---

## Explicitly out of scope (and why)

The following files were intentionally **not modified**:

- **`day4-30/index.html`** — this is the actual post-purchase, gated course-delivery application (multi-language, its own quiz/discovery flow, Calendly booking, AI assistant). It is `noindex, nofollow` and not linked from any marketing page — it's reached only after purchase. It is high-risk to edit without a full read of its ~1,700 lines of stateful logic, and it is outside this task's objective of increasing the *pre-purchase* conversion rate. It does contain one identified bug (a footer link and a JS redirect both pointing to the legacy `/quick-start/` page) — flagged here for a future, dedicated fix rather than risked as a drive-by edit.
- **`quick-start/index.html`** — the legacy ₹99 quiz page. Left in place (not deleted) because it may still receive external traffic from old ads, shared links, or bookmarks that this repo-only analysis can't see; deleting it would risk turning a stale page into a broken one. Its only *customer-facing* reference from the in-scope marketing funnel (`story.html`'s CTA) has been fixed.
- **`agenda/index.html`**, **`unlearn/index.html`** — separate, unlinked campaign landing pages, unrelated to the ₹499 course funnel.
- **`Day0-Landing-SalesPage.html`** — confirmed orphaned (zero references anywhere else in the repo), but left in place rather than deleted, for the same "might still have external traffic" reason as `quick-start/`.

No tracking, analytics, payment, or WhatsApp integration code was touched in any file.

---

# Round 2 — Header consistency + guarantee (Sep 2026)

Follow-up round, made after Round 1 was deployed to production. Scope: two specific, user-directed fixes — a header/footer branding inconsistency on `day4-30/index.html`, and a real refund guarantee on `run-business-30-days.html` to address "people take the free quiz but don't buy the ₹499 course."

## `day4-30/index.html`

**What changed:**
- Replaced the embedded base64 PNG wordmark logo (a custom cursive "the day zero" image, ~13.7KB inline, plus a "by TheKahaaniya" subtitle) in the page header (`.brand-mini`) with the same plain-text treatment used on the homepage and every other marketing page: `thedayzero` in Poppins 800 weight, plus the ✳︎ mark glyph. Same fix applied a second time to an identical logo image found in the page footer (`.fname`).
- This was scoped narrowly and deliberately: only the two self-contained logo/wordmark blocks (header + footer) were touched. The page's course-delivery logic, i18n system, day-unlock state, Calendly integration, and AI assistant — all previously flagged as high-risk — were not read or modified.
- File size dropped from ~208KB to ~176KB as a side effect of removing two duplicate base64 images (this was not the goal, just a byproduct of the fix).

**Why:** the user noticed the logo/header on this page didn't match the homepage and asked for it to be fixed. Confirmed by direct comparison — `day4-30/index.html` was the only page still using the old image wordmark; every other page (`index.html`, `find-business.html`, `run-business-30-days.html`, `story.html`, `founder.html`) already uses the plain-text `thedayzero` + ✳︎ treatment. Standardizing removes a visual inconsistency that's most visible at exactly the moment a paying customer lands on the product they just bought — a bad first impression right after checkout.

**What was preserved unchanged:** every other element on the page — course content, day-unlock logic, language switcher, Calendly booking, AI assistant, all JS and i18n strings, the founder-avatar image (a separate, unrelated base64 image, left untouched), all fonts/colors/layout outside the two logo blocks.

---

## `run-business-30-days.html`

**What changed:**
- Added a real **7-Day Guarantee**: a badge on the offer page ("Not right for you? Message Noor on WhatsApp within 7 days of paying and get a full refund — no forms, no questions") plus a matching new FAQ entry and a matching new `Question` entry in the existing `FAQPage` JSON-LD. The refund path uses the same real WhatsApp number already used everywhere else on the site (`wa.me/919629843122`) — no new form, webhook, or third-party tool was introduced; refunds are handled personally, the same way the founder already handles every other customer conversation.
- No fake urgency, fake scarcity, or fabricated social proof (e.g., a "45+ bought today 🔥" counter, or a buyer count designed to change every day) was added. See `CONVERSION_REPORT.md` Round 2 section for the full reasoning.

**Why:** the user asked directly what would help convert quiz-takers into ₹499 buyers, and specifically floated a live/varying buyer-count widget. A real guarantee is the evidence-backed, honest way to reduce the biggest remaining objection on a page that asks someone to pay before they've experienced the product — it directly answers "what if this isn't for me," without inventing any number, review, or countdown that doesn't reflect reality.

**What was preserved unchanged:** both "Start Now — ₹499" buttons still link to `https://rzp.io/rzp/xaRyRIP` (verified count unchanged: 2), the existing real ₹499→₹1,299 deadline (30 Sept 2026, untouched), all previously-added Day 1 preview / founder-credibility / FAQ content from Round 1, the `Product` JSON-LD block (untouched — only `FAQPage` gained one entry).
