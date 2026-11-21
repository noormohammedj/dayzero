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
  if(body && body.event && body.payload && !body.vid){
    if(!prop_('HOOK_KEY') || (e.parameter || {}).k !== prop_('HOOK_KEY')) return json_({ ok:false });
    if(body.event !== 'payment.captured') return json_({ ok:true, skipped:body.event });
    var entity = ((body.payload || {}).payment || {}).entity || {};
    return json_(handlePayment_(entity.id, entity));
  }
  // B. Booking page after a Calendly booking
  if(body && body.type === 'booked') return json_(handleBooking_(body));
  // C. Lead forms (type:'lead') and Weekend Founder page activity (has a visitor id) → Leads + Events tabs
  if(body && (body.type === 'lead' || body.vid)) return json_(logLead_(body));
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
    try{ upsertLead_({ name:name, email:email, phone:phone, source:'razorpay', event:'paid', plan:plan || 'unknown' }, { paid:plan || ('₹' + pay.amount / 100), payment_id:id }); }catch(err){}
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

/* ---------- C. Lead sheet: every lead and payer in one place ---------- */
// Leads tab: one row per person (matched on phone, then email). Payments update the same row.
// Events tab: every form submit and page action, including anonymous visitors, for funnel analysis.
var LEAD_HEAD = ['first_seen', 'last_seen', 'name', 'email', 'phone', 'first_source', 'last_source', 'interest', 'role', 'profession', 'goal', 'hours',
  'utm_source', 'utm_campaign', 'actions', 'last_action', 'status', 'paid', 'payment_id', 'contacted', 'notes'];
var EV_HEAD = ['ts', 'visitor', 'event', 'source', 'page', 'plan', 'name', 'email', 'phone', 'utm_source', 'utm_campaign', 'referrer'];
function tab_(name, head){
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(name);
  if(!sh){ sh = ss.insertSheet(name); sh.appendRow(head); sh.setFrozenRows(1); sh.getRange(1, 1, 1, head.length).setFontWeight('bold'); }
  return sh;
}
function s_(v, n){ return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').replace(/^[=+\-@]/, "'$&").slice(0, n || 80); }
function email_(v){ v = String(v || '').trim().toLowerCase(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v.slice(0, 120) : ''; }
function utm_(b){ var u = {}; try{ u = typeof b.utm === 'string' ? JSON.parse(b.utm || '{}') : (b.utm || {}); }catch(e){}
  return { source:b.utm_source || b.src || u.source || '', campaign:b.utm_campaign || b.cmp || u.campaign || '' }; }

function logLead_(b){
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try{
    var phone = phone_(b.whatsapp || b.phone), email = email_(b.email), u = utm_(b);
    var source = s_(b.source || b.form || b.page || (b.pageUrl ? String(b.pageUrl).split('?')[0] : ''), 60);
    var event = s_(b.event || 'form_submit', 30);
    tab_('Events', EV_HEAD).appendRow([iso_(), s_(b.vid, 40), event, source, s_(b.page || b.pageUrl, 120), s_(b.plan, 20),
      s_(b.name, 60), email, phone, s_(u.source, 40), s_(u.campaign, 60), s_(b.referrer, 120)]);
    if(!phone && !email) return { ok:true, anonymous:true };
    upsertLead_({ name:b.name, email:email, phone:phone, source:source, event:event, plan:b.plan || b.recommended || (b.price ? '₹' + b.price : ''),
      role:b.role, profession:b.profession, goal:b.goal, hours:b.hours, utm:u }, null);
    return { ok:true };
  } finally { lock.releaseLock(); }
}

// pay = { paid, payment_id } marks the person as a buyer.
function upsertLead_(d, pay){
  var sh = tab_('Leads', LEAD_HEAD), n = LEAD_HEAD.length, row = 0, last = sh.getLastRow();
  var phone = phone_(d.phone), email = email_(d.email), now = iso_();
  if(last >= 2){
    if(phone){ var h = sh.getRange(2, 5, last - 1, 1).createTextFinder(phone).matchEntireCell(true).findNext(); if(h) row = h.getRow(); }
    if(!row && email){ var h2 = sh.getRange(2, 4, last - 1, 1).createTextFinder(email).matchEntireCell(true).findNext(); if(h2) row = h2.getRow(); }
  }
  var r = row ? sh.getRange(row, 1, 1, n).getValues()[0] : [now, '', '', '', '', s_(d.source, 60), '', '', '', '', '', '', '', '', 0, '', 'new', '', '', '', ''];
  function keep(i, v){ if(v) r[i] = v; }
  r[1] = now; keep(2, s_(d.name, 60)); keep(3, email); keep(4, phone); keep(6, s_(d.source, 60)); keep(7, s_(d.plan, 20));
  keep(8, s_(d.role, 20)); keep(9, s_(d.profession, 20)); keep(10, s_(d.goal, 30)); keep(11, s_(d.hours, 10));
  if(d.utm){ if(!r[12]) r[12] = s_(d.utm.source, 40); if(!r[13]) r[13] = s_(d.utm.campaign, 60); }
  r[14] = (Number(r[14]) || 0) + 1; r[15] = s_(d.event, 30);
  if(pay && String(r[18]).indexOf(pay.payment_id) >= 0) pay = null;   // this payment is already on the row
  if(pay){ r[16] = 'paid'; r[17] = r[17] ? r[17] + ', ' + s_(pay.paid, 20) : s_(pay.paid, 20); r[18] = r[18] ? r[18] + ', ' + pay.payment_id : pay.payment_id; }
  else if(r[16] !== 'paid' && d.event !== 'paid'){ r[16] = (phone ? 'has number' : 'email only'); }
  if(row) sh.getRange(row, 1, 1, n).setValues([r]); else sh.appendRow(r);
}

/** Run once from the editor to copy leads from an older sheet into the Leads tab.
 *  Set Script property OLD_LEADS_SHEET_ID to that sheet's id (the long part of its URL).
 *  Columns are found by their header names (name, email, whatsapp/phone, source/pageUrl, timestamp). Safe to run twice. */
function importOldLeads(){
  var id = prop_('OLD_LEADS_SHEET_ID'); if(!id) throw new Error('Set OLD_LEADS_SHEET_ID first');
  var count = 0;
  SpreadsheetApp.openById(id).getSheets().forEach(function(t){
    var v = t.getDataRange().getValues(); if(v.length < 2) return;
    var h = v[0].map(function(x){ return String(x).toLowerCase(); });
    function col(re){ for(var i = 0; i < h.length; i++) if(re.test(h[i])) return i; return -1; }
    var cn = col(/name/), ce = col(/mail/), cp = col(/whatsapp|phone|mobile|contact/), cs = col(/^source|form/), cu = col(/pageurl|page/);
    if(ce < 0 && cp < 0) return;
    for(var i = 1; i < v.length; i++){
      var src = (cs >= 0 && v[i][cs]) || (cu >= 0 && String(v[i][cu]).split('?')[0]) || ('old sheet: ' + t.getName());
      if(!phone_(cp >= 0 ? v[i][cp] : '') && !email_(ce >= 0 ? v[i][ce] : '')) continue;
      upsertLead_({ name:cn >= 0 ? v[i][cn] : '', email:ce >= 0 ? v[i][ce] : '', phone:cp >= 0 ? v[i][cp] : '', source:src, event:'imported' }, null);
      count++;
    }
  });
  // Mark everyone already in the Payments tab as paid.
  var p = sheet_(), pv = p.getLastRow() < 2 ? [] : p.getRange(2, 1, p.getLastRow() - 1, PAY_HEAD.length).getValues();
  pv.forEach(function(x){ upsertLead_({ name:x[4], email:x[5], phone:x[6], source:'razorpay', event:'paid' }, { paid:x[2], payment_id:x[1] }); });
  Logger.log('Imported ' + count + ' old leads and ' + pv.length + ' payments.');
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
