# After-payment automation: setup

What a buyer sees once this is switched on:

| Step | ₹199 live workshop | ₹4,999 Weekend Founder |
|---|---|---|
| Pays on Razorpay | `rzp.io/rzp/9hyRWq04` | `rzp.io/rzp/iACekPPW` |
| Lands on | `/weekend-founder/live/booked/` | `/weekend-founder/book/` |
| Calendly shows | Saturdays 11 AM – 12 PM IST only | Sat + Sun, 12 PM – 6 PM IST |
| Calendly emails | the buyer **and** Noor (invite + Meet link) | same |
| WhatsApp group button | `chat.whatsapp.com/KcdOo9nqv7k3Whya6lwQoz` | `chat.whatsapp.com/EYYFwHqslBkLlDvTIv4no9` |
| Automatic email (script) | booking link + group link, plus a "new sale" note to Noor | same |
| Automatic WhatsApp (script) | on payment, and again once the slot is booked | same |

WhatsApp does not let anyone add a person to a group automatically. Every buyer gets the group's join link instead (on the page, by email and on WhatsApp), so joining takes one tap.

Steps 1–3 make the site part work. Step 4 adds the automatic emails. Step 5 adds the automatic WhatsApp messages.

## 1. Calendly: make the ₹199 event a group class (2 min)
The event **"₹199 Live workshop: build a website with AI"** already exists, set to Saturdays 11:00–12:00 IST. Calendly's API can only make one-on-one events, so right now **only one person can book each Saturday**.
Calendly → Event types → that event → **Edit** → event type **Group** → **Max invitees per slot: 100** → Save.
(If Calendly says Group needs a paid plan, tell Claude: the page can switch to "you're booked for Saturday" without Calendly.)

## 2. Razorpay: send buyers to the booking page (3 min)
Razorpay Dashboard → **Payment Pages**:
- Open the ₹199 page (`rzp.io/rzp/9hyRWq04`) → Edit → **Action after successful payment → Redirect** → `https://thedayzero.in/weekend-founder/live/booked/`. While you're in there, rename the page title to **"Live workshop: build a website with AI (₹199)"**.
- Open the ₹4,999 page (`rzp.io/rzp/iACekPPW`) → same setting → `https://thedayzero.in/weekend-founder/book/`.

## 3. Test (2 min)
Pay ₹199 yourself, check you land on the booking page, book, and check the Calendly email reaches you and the buyer. Refund yourself from Razorpay afterwards.

## 4. Automatic email on every payment (10 min)
1. New Google Sheet "DayZero Payments" → Extensions → Apps Script → paste all of `tools/payments/payment-hook.gs` → Save.
2. Run `setup` once (approve Gmail + Sheets access). View → Logs shows the **HOOK_KEY**.
3. Project Settings → **Script properties**, add:
   - `RZP_KEY_ID`, `RZP_KEY_SECRET`: Razorpay → Account & Settings → **API Keys** → Generate (Live mode).
   - `NOOR_EMAIL`: the Gmail you want sale alerts on
   - `CALENDLY_TOKEN`: Calendly → Integrations → **API & Webhooks** → Personal access token (free plan works).
4. Deploy → New deployment → **Web app**, Execute as **Me**, access **Anyone** → copy the URL.
5. Razorpay → Account & Settings → **Webhooks** → Add: URL = `<web app URL>?k=<HOOK_KEY>`, event **payment.captured**, any secret → Save.
6. Send Claude the web app URL (not the keys). It goes into both booking pages as `HOOK_URL`, which turns on the "slot booked" WhatsApp.

## 5. Automatic WhatsApp messages
**Cheapest route: Meta's WhatsApp Cloud API directly.** There's no monthly fee: Meta charges per message, and a utility message in India costs a fraction of a rupee. Tools like AiSensy, Interakt or WATI use the same API but add a monthly plan. They're only worth it if you want their chat inbox.

Needs: a phone number **not** already on the WhatsApp app (a new SIM, or move a number off the app), and a Meta Business account.
1. developers.facebook.com → My Apps → Create app → **Business** → add **WhatsApp**.
2. WhatsApp → API Setup → add your business number, verify it by SMS. Copy the **Phone number ID**.
3. Business settings → System users → add one (Admin) → **Generate token** with `whatsapp_business_messaging` → copy (permanent token).
4. WhatsApp Manager → **Message templates** → create 4 templates, category **Utility**, language **English**:
   - `paid_199`: `Hi {{1}}, your ₹199 payment for the TheDayZero live workshop is received. Book your Saturday 11 AM IST seat here: {{2}} and join the attendees' group: {{3}}`
   - `booked_199`: `Hi {{1}}, your seat is booked for {{2}}. The Google Meet link is in your email. Join the attendees' group for reminders: {{3}}`
   - `paid_4999`: `Hi {{1}}, your Weekend Founder payment is received. Book your sessions (Sat/Sun, 12–6 PM IST) here: {{2}} and join the group: {{3}}`
   - `booked_4999`: `Hi {{1}}, your Weekend Founder session is booked for {{2}}. The Google Meet link is in your email. Group: {{3}}`
5. Script properties: `WA_TOKEN`, `WA_PHONE_ID`, `WA_TEMPLATE_PAID_199=paid_199`, `WA_TEMPLATE_BOOKED_199=booked_199`, `WA_TEMPLATE_PAID_4999=paid_4999`, `WA_TEMPLATE_BOOKED_4999=booked_4999`, `TEST_PHONE=91<your number>`.
6. Run `testWhatsApp` in the editor: both messages should arrive on your phone.

Until step 5 is done, the script still emails, and the Payments tab marks WhatsApp as "not set up".
