# Weekend Founder: plans, course finder and lead funnel

## What's on the page (`/weekend-founder/#plans`)

- **Three swipeable plan tiles.** The ₹4,999 1:1 tile is in front, and the OS and Business tiles show faintly on either side. You can swipe, drag, use the arrows, tap a side card or press ← →. Each swipe plays a sound, and the page's ♪ button mutes it. The price counts up whenever a card comes to the front.
- **Prices switch on their own dates (IST):**
  - OS: ₹1,999 until 30 Nov 2026, then ₹4,999.
  - 1:1: ₹4,999 until 31 Dec 2026, then ₹9,999.
  - Business: ₹29,999 until 31 Mar 2027, then ₹79,999.

  To change a date, edit `CFG` at the top of `/assets/wf-plans.js`.
- **FOMO.** The page shows "November 1:1 batch: Full", a December seat count you set from the admin page, a seat bar, and countdowns. When seats reach 0, it switches to "December full · join the January waitlist".
- **"Which one is for me?"** Visitors answer three taps (what they do, what they're looking for, hours a week). The page then recommends a plan, rotates the carousel to it, and offers "Send me this plan" (name + WhatsApp) or "Connect with Noor before you buy".
- **Reserve / Book call modal.** It takes a name and WhatsApp number, logs the lead, and opens WhatsApp with a pre-filled message that includes their quiz answers.
- **Floating WhatsApp button.** It says "Connect with me before you buy", and its message changes to match the plan the visitor is looking at or was recommended.

The page works without the backend below. Clicks still reach GA4 and the Meta Pixel (`WF_*` events). The backend is only needed for the admin lead list.

## Backend setup (10 minutes, one time)

1. Create a new Google Sheet, for example "DayZero Leads".
2. Go to **Extensions → Apps Script**, delete the sample code, paste in all of `tools/funnel/Code.gs`, and save.
3. Pick `setup` in the function dropdown and click **Run**. Approve the permissions.
   - Open **View → Logs** and copy the **ADMIN KEY**.
   - The run also creates the `Events`, `Leads` and `Config` tabs.
4. Go to **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**

   Click **Deploy**, then copy the URL that ends in `/exec`.
5. Open `/assets/wf-plans.js` and paste that URL into `endpoint: ''`. Commit and push.
6. Open **https://thedayzero.in/admin/leads/**, then paste in the URL and the admin key. Both are saved only in that browser.
7. In the admin page, set the real number of **December seats left / total** and click **Update site**.

If you edit `Code.gs` later, go to **Deploy → Manage deployments → Edit → New version**. That keeps the same URL.

## Using the admin page daily

- **Today's call list** shows people who left a number, are hot or warm, and haven't been contacted yet. Clicking **WhatsApp** opens a chat with a message that matches their plan and temperature, and marks them as contacted.
- **Score** adds up their actions:

  | Action | Points |
  |---|---|
  | Saw the plans | 1 |
  | Viewed a plan | 2 |
  | Finished the quiz | 8 |
  | Clicked a CTA | 6 |
  | Clicked WhatsApp | 10 |
  | Clicked buy | 15 |
  | Left a number | 25 |

  A lead is **Hot** if they left a number, clicked buy, or scored 30 or more. **Warm** is 12 or more.
- **Interest** is the plan they spent the most time and clicks on.
- **Message templates** lets you edit the six WhatsApp messages (plan × hot/warm).
- **Copy numbers** copies every number in the current filter, for a WhatsApp broadcast list. Only message people who left their number.
- **Anonymous visitors** (no number) can't be messaged. To reach them, build Meta custom audiences from the `WF_tile_view` / `WF_tile_cta` / `WF_quiz_result` pixel events (plan is a parameter) and retarget them with your reels.
- **Use UTM links in Instagram**, for example `https://thedayzero.in/weekend-founder/?utm_source=instagram&utm_campaign=reel3`. The admin page then shows which reel brought each lead.

## Before 1 December

The OS Razorpay link (`https://rzp.io/rzp/UQYIUZL`) has a fixed amount, so Razorpay keeps charging ₹1,999 until you change it by hand. The website switches itself at midnight IST on 1 Dec: every "₹1,999" becomes "₹4,999" on the main page, the free-website guide and the reader; the launch-price lines, countdowns and the "November 1:1 batch: Full" line are hidden; tracking values become 4999.

What you do in Razorpay (Dashboard → Payment Links, or Payment Pages if UQYIUZL is a page):

1. Before 30 Nov, open the link and check whether it can be edited. Some links only let you change the amount while no payment is in progress; a Payment Page lets you edit the price field any time.
2. Between 00:00 and 00:15 IST on 1 Dec, change the amount from ₹1,999 to ₹4,999 and save. If you can't be awake, do it first thing in the morning; anyone who pays ₹1,999 before you change it simply got the launch price.
3. Open `https://rzp.io/rzp/UQYIUZL` in a private window and check it now shows ₹4,999.
4. If the amount can't be edited: create a new ₹4,999 link with the same title, description, customer fields and redirect URL, then send the new link to whoever maintains the site so `UQYIUZL` can be replaced everywhere (`weekend-founder/index.html`, `free-website/`, `read/`).
5. The reader backend (the Apps Script at `BACKEND_URL` in `weekend-founder/read/index.html`) checks payments before opening the book. If it checks for an amount of ₹1,999 (199900 paise), add 499900 as a valid amount, or ₹4,999 buyers will be told their payment "isn't valid".
6. Make a ₹4,999 test purchase (or ask a friend), unlock the book with it, then refund it from the dashboard.
7. If you saved your own WhatsApp templates on the admin page, edit the OS one: it still says "till 30 Nov".

Also on 1 Dec: the search and social preview text in the `<head>` of `weekend-founder/index.html` (meta descriptions and the JSON-LD `price`/`priceValidUntil`) can't switch by date. Change `₹1,999` to `₹4,999` there, and the JSON-LD `"price": "1999"` to `"4999"` with `"priceValidUntil"` removed.

The "November 1:1 batch: Full" line is controlled by `novemberFull` in `assets/wf-plans.js`. Set it to `false` if the November batch is not actually full.
