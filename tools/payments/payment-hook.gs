/**
 * TheDayZero · after-payment automation (Google Apps Script web app)
 *
 * What it does
 *  1. Razorpay calls this web app when a payment is captured (webhook "payment.captured").
 *     The webhook URL carries a secret key (and, if API keys are set, the payment is re-read from Razorpay),
 *     works out the product from the amount, and then:
 *       - ₹199: adds the buyer as a guest to the next Saturday of the recurring Google Calendar workshop
 *         event, so Google emails them the invite with the Meet link (free, no Calendly needed)
 *       - emails the buyer their next step + WhatsApp group link, and emails Noor a "new sale" note
 *       - sends the buyer a WhatsApp message (WhatsApp Cloud API template), if WhatsApp is set up
 *       - logs the payment in the "Payments" tab (one row per payment, never processed twice)
 *  2. The ₹4,999 booking page (/weekend-founder/book/) calls this web app after someone books in Calendly. The script checks the booking with Calendly's API, finds the
 *     buyer's phone from the Payments tab, and sends a "your slot is booked" WhatsApp message.
 *
 * Setup: tools/payments/SETUP.md. Settings live in Project Settings → Script properties, never in code.
 * Needs the advanced "Google Calendar API" service turned on (Services → + → Google Calendar API).
 */

var PLANS = {
  crash199: {
    label: '₹199 live workshop',
    amounts: [19900],
    bookUrl: 'https://thedayzero.in/weekend-founder/live/booked/',   // thank-you page (no booking needed)
    groupUrl: 'https://chat.whatsapp.com/KcdOo9nqv7k3Whya6lwQoz',
    when: 'Saturdays, 11 AM – 12 PM IST'
  },
  build4999: {
    label: 'Weekend Founder ₹4,999',
    amounts: [499900, 1299900],
    bookUrl: 'https://thedayzero.in/weekend-founder/book/',
    groupUrl: 'https://chat.whatsapp.com/EYYFwHqslBkLlDvTIv4no9',
    when: 'Saturdays and Sundays, 12 PM – 6 PM IST'
  }
};
var PAY_HEAD = ['ts', 'payment_id', 'plan', 'amount', 'name', 'email', 'phone', 'emailed', 'whatsapp_paid', 'booked_at', 'whatsapp_booked', 'notes'];

function prop_(k){ return PropertiesService.getScriptProperties().getProperty(k) || ''; }
function json_(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function iso_(){ return Utilities.formatDate(new Date(), 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss"); }
function sheet_(){
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName('Payments');
  if(!sh){ sh = ss.insertSheet('Payments'); sh.appendRow(PAY_HEAD); sh.setFrozenRows(1); sh.getRange(1, 1, 1, PAY_HEAD.length).setFontWeight('bold'); }
  return sh;
}
function planFor_(amount){
  for(var k in PLANS) if(PLANS[k].amounts.indexOf(Number(amount)) >= 0) return k;
  return '';
}
function phone_(v){ var d = String(v || '').replace(/\D/g, ''); if(d.length === 10) d = '91' + d; return /^\d{11,13}$/.test(d) ? d : ''; }
function findRow_(col, value){
  var sh = sheet_(); if(sh.getLastRow() < 2 || !value) return 0;
  var hit = sh.getRange(2, col, sh.getLastRow() - 1, 1).createTextFinder(String(value)).matchEntireCell(true).findNext();
  return hit ? hit.getRow() : 0;
}

/** Run once from the editor: creates the Payments tab and the webhook key. */
function setup(){
  sheet_();
  var p = PropertiesService.getScriptProperties();
  if(!p.getProperty('HOOK_KEY')) p.setProperty('HOOK_KEY', Utilities.getUuid().replace(/-/g, '').slice(0, 24));
  Logger.log('HOOK_KEY: ' + p.getProperty('HOOK_KEY') + '  → Razorpay webhook URL = <web app URL>?k=' + p.getProperty('HOOK_KEY'));
}

function doPost(e){
  var raw = (e && e.postData && e.postData.contents) || '';
  if(raw.length > 20000) return json_({ ok:false });
  var body; try{ body = JSON.parse(raw); }catch(err){ return json_({ ok:false }); }

  // A. Razorpay webhook (the URL carries ?k=HOOK_KEY because Apps Script can't read request headers)
  if(body && body.event){
    if(!prop_('HOOK_KEY') || (e.parameter || {}).k !== prop_('HOOK_KEY')) return json_({ ok:false });
    if(body.event !== 'payment.captured') return json_({ ok:true, skipped:body.event });
    var entity = ((body.payload || {}).payment || {}).entity || {};
    return json_(handlePayment_(entity.id, entity));
  }
  // B. Booking page after a Calendly booking
  if(body && body.type === 'booked') return json_(handleBooking_(body));
  return json_({ ok:false });
}

/* ---------- A. payment captured ---------- */
function handlePayment_(id, hookEntity){
  if(!/^pay_[A-Za-z0-9]{8,30}$/.test(id || '')) return { ok:false };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try{
    if(findRow_(2, id)) return { ok:true, duplicate:true };
    var pay = razorpayPayment_(id, hookEntity);
    if(!pay || pay.status !== 'captured') return { ok:false, reason:'not captured' };
    var plan = planFor_(pay.amount);
    var name = String((pay.notes && (pay.notes.name || pay.notes.full_name)) || '').slice(0, 60);
    var email = String(pay.email || '').slice(0, 120), phone = phone_(pay.contact);
    var sh = sheet_();
    sh.appendRow([iso_(), id, plan || 'unknown', pay.amount / 100, name, email, phone, '', '', '', '', '']);
    var row = sh.getLastRow();
    if(!plan){ notifyNoor_('Payment of ₹' + (pay.amount / 100) + ' with no matching product', id, name, email, phone, ''); return { ok:true, plan:'unknown' }; }

    var P = PLANS[plan], link, wa, emailed;
    if(plan === 'crash199'){
      var seat = addToWorkshop_(email, name);                         // Google sends the invite + Meet link
      link = P.bookUrl + '?' + 'razorpay_payment_id=' + encodeURIComponent(id) + (name ? '&name=' + encodeURIComponent(name) : '') + (email ? '&email=' + encodeURIComponent(email) : '');
      emailed = emailBuyer199_(P, seat, name, email);
      notifyNoor_('New ₹199 workshop payment (' + seat.label + ')', id, name, email, phone, '');
      wa = sendWhatsApp_(phone, prop_('WA_TEMPLATE_PAID_199'), [name || 'there', seat.label, P.groupUrl]);
      sh.getRange(row, 10, 1, 1).setValue(seat.ok ? 'invited: ' + seat.label : 'INVITE FAILED: ' + seat.error);
    } else {
      link = bookLink_(plan, id, name, email);
      emailed = emailBuyer_(P, link, name, email);
      notifyNoor_('New ' + P.label + ' payment', id, name, email, phone, link);
      wa = sendWhatsApp_(phone, prop_('WA_TEMPLATE_PAID_4999'), [name || 'there', link, P.groupUrl]);
    }
    sh.getRange(row, 8, 1, 2).setValues([[emailed ? 'yes' : 'no', wa]]);
    return { ok:true, plan:plan };
  } finally { lock.releaseLock(); }
}

/* ---------- ₹199: guest on the recurring Saturday workshop ---------- */
// Same rule as /weekend-founder/live/booked/: this Saturday 11:00 IST, unless it is already 10:00 IST
// on Saturday or later, then next Saturday.
function nextSaturday_(now){
  var ist = new Date(now.getTime() + 330 * 60000);
  var add = (6 - ist.getUTCDay() + 7) % 7;
  var start = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + add, 11, 0) - 330 * 60000;
  if(start - 60 * 60000 <= now.getTime()) start += 7 * 86400000;
  return new Date(start);
}

function addToWorkshop_(email, name){
  var start = nextSaturday_(new Date());
  var label = Utilities.formatDate(start, 'Asia/Kolkata', 'EEEE d MMMM') + ', 11 AM – 12 PM IST';
  if(!email) return { ok:false, label:label, error:'no email on the payment' };
  try{
    var cal = prop_('WORKSHOP_CALENDAR_ID') || 'primary', series = prop_('WORKSHOP_EVENT_ID');
    var list = Calendar.Events.instances(cal, series, { timeMin:new Date(start.getTime() - 60000).toISOString(), timeMax:new Date(start.getTime() + 60000).toISOString() });
    var occ = (list.items || [])[0];
    if(!occ) return { ok:false, label:label, error:'no workshop on that Saturday in the calendar' };
    var guests = occ.attendees || [];
    if(!guests.some(function(a){ return String(a.email).toLowerCase() === email.toLowerCase(); }))
      guests.push({ email:email, displayName:name || undefined });
    // Only this Saturday's occurrence: the buyer is not invited to every future Saturday.
    Calendar.Events.patch({ attendees:guests }, cal, occ.id, { sendUpdates:'all' });
    return { ok:true, label:label };
  }catch(err){ return { ok:false, label:label, error:String(err).slice(0, 120) }; }
}

function emailBuyer199_(P, seat, name, email){
  if(!email) return false;
  var hi = name ? 'Hi ' + name.split(' ')[0] + ',' : 'Hi,';
  var body = hi + '\n\nThanks for paying. Your seat is booked for ' + seat.label + ' on Google Meet.\n\n' +
    (seat.ok ? 'A Google Calendar invite with the Meet link has been sent to this email. Please accept it so you get the reminder.\n\n'
             : 'Noor will send you the Google Meet link shortly.\n\n') +
    'Join the attendees\' WhatsApp group for reminders and the notes template:\n' + P.groupUrl + '\n\n' +
    'Bring a laptop, a free Claude or ChatGPT account, and five lines about yourself.\n\n' +
    'Any trouble, reply here or WhatsApp +91 96298 43122.\n\nNoor\nTheDayZero';
  GmailApp.sendEmail(email, "You're in: ₹199 live workshop, " + seat.label, body, { name:'Noor · TheDayZero', replyTo:prop_('NOOR_EMAIL') || undefined });
  return true;
}

// With RZP_KEY_ID/RZP_KEY_SECRET set, the payment is re-read from Razorpay's API (strongest check).
// Without them, the webhook body is used. That is still safe because only Razorpay knows the
// webhook URL's secret ?k=HOOK_KEY. Keys are optional so Noor never has to regenerate the Live key
// that other sites (run-business-30-days page, mentell.co.in) already use.
function razorpayPayment_(id, hookEntity){
  var key = prop_('RZP_KEY_ID'), secret = prop_('RZP_KEY_SECRET');
  if(!key || !secret) return (hookEntity && hookEntity.id === id) ? hookEntity : null;
  var r = UrlFetchApp.fetch('https://api.razorpay.com/v1/payments/' + encodeURIComponent(id), {
    headers:{ Authorization:'Basic ' + Utilities.base64Encode(key + ':' + secret) }, muteHttpExceptions:true });
  return r.getResponseCode() === 200 ? JSON.parse(r.getContentText()) : null;
}

function bookLink_(plan, id, name, email){
  var q = ['razorpay_payment_id=' + encodeURIComponent(id)];
  if(name) q.push('name=' + encodeURIComponent(name));
  if(email) q.push('email=' + encodeURIComponent(email));
  return PLANS[plan].bookUrl + '?' + q.join('&');
}

function emailBuyer_(P, link, name, email){
  if(!email) return false;
  var hi = name ? 'Hi ' + name.split(' ')[0] + ',' : 'Hi,';
  var body = hi + '\n\nThanks for paying for the ' + P.label + '. Two quick steps:\n\n' +
    '1. Book your slot (' + P.when + '):\n' + link + '\n   Calendly then emails you the Google Meet link.\n\n' +
    '2. Join the WhatsApp group for reminders and notes:\n' + P.groupUrl + '\n\n' +
    'Any trouble, reply here or WhatsApp +91 96298 43122.\n\nNoor\nTheDayZero';
  GmailApp.sendEmail(email, 'Payment received: book your slot for the ' + P.label, body, { name:'Noor · TheDayZero', replyTo:prop_('NOOR_EMAIL') || undefined });
  return true;
}

function notifyNoor_(subject, id, name, email, phone, link){
  var to = prop_('NOOR_EMAIL'); if(!to) return;
  GmailApp.sendEmail(to, subject + (name ? ': ' + name : ''),
    'Payment: ' + id + '\nName: ' + (name || '-') + '\nEmail: ' + (email || '-') + '\nPhone: ' + (phone ? '+' + phone : '-') +
    (link ? '\nTheir booking link: ' + link : '') + '\n\nLogged in the Payments tab.');
}

/* ---------- B. slot booked in Calendly ---------- */
function handleBooking_(b){
  var inv = String(b.invitee_uri || '');
  if(!/^https:\/\/api\.calendly\.com\/scheduled_events\/[A-Za-z0-9-]+\/invitees\/[A-Za-z0-9-]+$/.test(inv)) return { ok:false };
  var token = prop_('CALENDLY_TOKEN'); if(!token) return { ok:false, reason:'no calendly token' };
  var h = { headers:{ Authorization:'Bearer ' + token }, muteHttpExceptions:true };
  var r = UrlFetchApp.fetch(inv, h); if(r.getResponseCode() !== 200) return { ok:false };
  var invitee = JSON.parse(r.getContentText()).resource;              // real booking, read from Calendly
  var ev = JSON.parse(UrlFetchApp.fetch(invitee.event, h).getContentText()).resource;
  var when = Utilities.formatDate(new Date(ev.start_time), 'Asia/Kolkata', "EEE d MMM, h:mm a") + ' IST';

  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try{
    var sh = sheet_(), pid = String(b.payment_id || ''), row = /^pay_/.test(pid) ? findRow_(2, pid) : 0;
    if(!row) row = findRow_(6, invitee.email);
    if(!row) return { ok:true, matched:false };                       // booked but no payment on file: Noor still gets Calendly's email
    var v = sh.getRange(row, 1, 1, PAY_HEAD.length).getValues()[0];
    if(v[10] === 'sent:' + ev.start_time) return { ok:true, duplicate:true };
    var P = PLANS.build4999;
    var wa = sendWhatsApp_(v[6], prop_('WA_TEMPLATE_BOOKED_4999'), [invitee.name || v[4] || 'there', when, P.groupUrl]);
    sh.getRange(row, 10, 1, 2).setValues([[when, wa === 'sent' ? 'sent:' + ev.start_time : wa]]);
    return { ok:true, whatsapp:wa };
  } finally { lock.releaseLock(); }
}

/* ---------- WhatsApp Cloud API (Meta) ---------- */
// Template body must have exactly the three {{1}} {{2}} {{3}} variables passed here. See SETUP.md for the texts.
function sendWhatsApp_(phone, template, params){
  var token = prop_('WA_TOKEN'), phoneId = prop_('WA_PHONE_ID');
  if(!token || !phoneId || !template) return 'not set up';
  if(!phone) return 'no phone';
  var payload = { messaging_product:'whatsapp', to:phone, type:'template',
    template:{ name:template, language:{ code:prop_('WA_LANG') || 'en' },
      components:[{ type:'body', parameters:params.map(function(t){ return { type:'text', text:String(t).slice(0, 300) }; }) }] } };
  var r = UrlFetchApp.fetch('https://graph.facebook.com/v21.0/' + phoneId + '/messages', {
    method:'post', contentType:'application/json', payload:JSON.stringify(payload),
    headers:{ Authorization:'Bearer ' + token }, muteHttpExceptions:true });
  return r.getResponseCode() === 200 ? 'sent' : 'error ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 120);
}

/** Editor test: sends both WhatsApp templates to TEST_PHONE (Script property), e.g. 9198xxxxxxxx. */
function testWhatsApp(){
  var to = phone_(prop_('TEST_PHONE'));
  Logger.log(sendWhatsApp_(to, prop_('WA_TEMPLATE_PAID_199'), ['Noor', 'Saturday 28 November, 11 AM – 12 PM IST', PLANS.crash199.groupUrl]));
  Logger.log(sendWhatsApp_(to, prop_('WA_TEMPLATE_PAID_4999'), ['Noor', PLANS.build4999.bookUrl, PLANS.build4999.groupUrl]));
}

/** Editor test: invites TEST_EMAIL (Script property) to the next Saturday workshop. */
function testWorkshopInvite(){
  Logger.log(JSON.stringify(addToWorkshop_(prop_('TEST_EMAIL'), 'Test')));
}
