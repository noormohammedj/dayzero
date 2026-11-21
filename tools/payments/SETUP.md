# After-payment automation: setup

What a buyer sees once this is switched on:

| Step | ₹199 live workshop | ₹4,999 Weekend Founder |
|---|---|---|
| Pays on Razorpay | `rzp.io/rzp/9hyRWq04` | `rzp.io/rzp/iACekPPW` |
| Lands on | `/weekend-founder/live/booked/`: "You're in for Saturday …" + WhatsApp group button | `/weekend-founder/book/`: Calendly, Sat + Sun 12 PM – 6 PM IST |
| Calendar invite | Script adds them as a guest to that Saturday of your recurring Google Calendar event (11 AM – 12 PM IST, Meet link `myz-kkpn-qnp`). Google emails the invite. Free. | Calendly emails the buyer **and** you |
| WhatsApp group button | `chat.whatsapp.com/KcdOo9nqv7k3Whya6lwQoz` | `chat.whatsapp.com/EYYFwHqslBkLlDvTIv4no9` |
| Automatic email (script) | "You're in for Saturday …" + group link to the buyer, a "new sale" note to you | booking link + group link to the buyer, a "new sale" note to you |
| Automatic WhatsApp (script, optional) | on payment | on payment, and again once the slot is booked |

Who gets which Saturday: anyone who pays before **10 AM IST on a Saturday** goes into that Saturday's class, and anyone later goes into the next one.

WhatsApp does not let anyone add a person to a group automatically. Every buyer gets the group's join link instead (on the page, by email and on WhatsApp), so joining takes one tap.

Nothing here costs money. Calendly stays on the free plan (one-on-one only), Google Calendar and Apps Script are free, and WhatsApp uses Meta's own API, where you pay per message and there's no monthly plan.

## 1. Google Calendar (already done)
Claude created **"TheDayZero live workshop: build a website with AI (₹199)"** on your Google Calendar: every Saturday 11:00–12:00 IST, Meet link `meet.google.com/myz-kkpn-qnp`, guests can't see each other. Leave it as it is; the script adds each buyer to their Saturday only.

## 2. Razorpay: send buyers to the right page after paying (3 min)
Razorpay Dashboard → **Payment Pages**:
- Open the ₹199 page (`rzp.io/rzp/9hyRWq04`) → Edit → **Action after successful payment → Redirect** → `https://thedayzero.in/weekend-founder/live/booked/`. While you're in there, rename the page title to **"Live workshop: build a website with AI (₹199)"**.
- Open the ₹4,999 page (`rzp.io/rzp/iACekPPW`) → same setting → `https://thedayzero.in/weekend-founder/book/`.

## 3. Test (after step 4)
Pay ₹199 from a second email. You should land on the "You're in" page, get the Google Calendar invite for the right Saturday and the email, and receive the "new sale" note yourself. Then refund yourself from Razorpay.

## 4. Automatic email on every payment (10 min)
1. New Google Sheet "DayZero Payments" → Extensions → Apps Script → paste all of `tools/payments/payment-hook.gs` → Save.
2. Left menu **Services → +** → **Google Calendar API** → Add.
3. Run `setup` once (approve Gmail, Sheets and Calendar access). View → Logs shows the **HOOK_KEY**.
4. Project Settings → **Script properties**, add:
   - `RZP_KEY_ID`, `RZP_KEY_SECRET`: **optional, skip them.** Don't regenerate your Live key: the old one is used by the 30-day program page and probably mentell.co.in, and regenerating would break their checkouts. The script works without these keys.
   - `NOOR_EMAIL`: the Gmail you want sale alerts on
   - `WORKSHOP_EVENT_ID`: `todn64al68e1d5dob38f5psqhs` (the recurring Saturday event Claude created)
   - `CALENDLY_TOKEN`: Calendly → Integrations → **API & Webhooks** → Personal access token (free plan works). Only used for the ₹4,999 "slot booked" WhatsApp.
   - `TEST_EMAIL`: a second email of yours. Run `testWorkshopInvite` and check that the invite for next Saturday arrives.
5. Deploy → New deployment → **Web app**, Execute as **Me**, access **Anyone** → copy the URL.
6. Razorpay → Account & Settings → **Webhooks** → Add: URL = `<web app URL>?k=<HOOK_KEY>`, event **payment.captured**, any secret → Save.
7. Send Claude the web app URL (not the keys). It goes into the ₹4,999 booking page as `HOOK_URL`, which turns on the "slot booked" WhatsApp.

## 5. Automatic WhatsApp messages
**Cheapest route: Meta's WhatsApp Cloud API directly.** There's no monthly fee: Meta charges per message, and a utility message in India costs a fraction of a rupee. Tools like AiSensy, Interakt or WATI use the same API but add a monthly plan. They're only worth it if you want their chat inbox.

Needs: a phone number **not** already on the WhatsApp app (a new SIM, or move a number off the app), and a Meta Business account.
1. developers.facebook.com → My Apps → Create app → **Business** → add **WhatsApp**.
2. WhatsApp → API Setup → add your business number, verify it by SMS. Copy the **Phone number ID**.
3. Business settings → System users → add one (Admin) → **Generate token** with `whatsapp_business_messaging` → copy (permanent token).
4. WhatsApp Manager → **Message templates** → create 3 templates, category **Utility**, language **English**:
   - `paid_199`: `Hi {{1}}, your ₹199 payment is received and your seat is booked for {{2}} on Google Meet. The calendar invite with the Meet link is in your email. Join the attendees' group: {{3}}`
   - `paid_4999`: `Hi {{1}}, your Weekend Founder payment is received. Book your sessions (Sat/Sun, 12–6 PM IST) here: {{2}} and join the group: {{3}}`
   - `booked_4999`: `Hi {{1}}, your Weekend Founder session is booked for {{2}}. The Google Meet link is in your email. Group: {{3}}`
5. Script properties: `WA_TOKEN`, `WA_PHONE_ID`, `WA_TEMPLATE_PAID_199=paid_199`, `WA_TEMPLATE_PAID_4999=paid_4999`, `WA_TEMPLATE_BOOKED_4999=booked_4999`, `TEST_PHONE=91<your number>`.
6. Run `testWhatsApp` in the editor: two messages should arrive on your phone.

Until step 5 is done, the script still emails, and the Payments tab marks WhatsApp as "not set up".

## 5. One lead sheet for every lead and payer (2 min, after any update to the script)
The same script now also keeps your lead sheet, in the same "DayZero Payments" spreadsheet:
- **Leads** tab: one row per person, matched on WhatsApp number, then email. It holds where they first and last came from, which plan they looked at, their quiz answers, UTM source and campaign, how many actions they took, and whether they **paid** (with the payment id). Every payment marks the person's row as `paid`, so lead → sale is visible on one row.
- **Events** tab: every form submit and Weekend Founder page action, including anonymous visitors, so we can see where people drop off.

Sources that feed it: the ₹199 live page, the global $9 page, the free-website page, the 30-day program page, the Weekend Founder plans page (quiz, reserve, WhatsApp and buy clicks), and Razorpay payments. The old lead sheet still gets its copy, so nothing is lost.

To switch it on: Apps Script → paste the new `payment-hook.gs` → Save → **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy**. The URL stays the same.

To copy your older leads in once: open the old lead sheet, copy the long id from its URL (between `/d/` and `/edit`), add it as Script property `OLD_LEADS_SHEET_ID`, then run `importOldLeads`. It also marks everyone in the Payments tab as paid. Running it twice does not duplicate payments.
