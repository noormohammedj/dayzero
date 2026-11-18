/**
 * TheDayZero · Weekend Founder lead funnel (Google Apps Script web app)
 *
 * Paste into Extensions → Apps Script of a new Google Sheet, run setup() once,
 * then Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
 * Full steps: tools/funnel/SETUP.md
 *
 * Sheets it creates: Events (every click), Leads (one row per visitor, scored), Config (seats).
 */

var EVENTS = ['plans_view','tile_view','tile_cta','quiz_start','quiz_result','wa_click','buy_click','lead_submit'];
var WEIGHT = { plans_view:1, tile_view:2, tile_cta:6, quiz_start:2, quiz_result:8, wa_click:10, buy_click:15, lead_submit:25 };
var EV_HEAD = ['ts','vid','event','plan','loc','name','phone','profession','goal','hours','recommended','business','utm_source','utm_medium','utm_campaign','utm_content','referrer','page'];
var LEAD_HEAD = ['vid','first_seen','last_seen','name','phone','profession','goal','hours','recommended','business','top_plan','score','temperature',
  'views_os','views_one','views_biz','cta_clicks','wa_clicks','buy_clicks','quiz_done','events','utm_source','utm_campaign','referrer','status','notes','last_contacted','views_cohort'];
var PUBLIC_CONFIG = ['decSeatsLeft','decSeatsTotal'];

function setup(){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  sheet_('Events', EV_HEAD); sheet_('Leads', LEAD_HEAD);
  var c = sheet_('Config', ['key','value']);
  if(c.getLastRow() < 2) c.getRange(2, 1, 2, 2).setValues([['decSeatsLeft',''],['decSeatsTotal','']]);
  var props = PropertiesService.getScriptProperties();
  if(!props.getProperty('ADMIN_KEY')) props.setProperty('ADMIN_KEY', Utilities.getUuid().replace(/-/g, '').slice(0, 20));
  Logger.log('ADMIN KEY (paste into the admin page): ' + props.getProperty('ADMIN_KEY'));
}

function sheet_(name, head){
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(name);
  if(!sh){ sh = ss.insertSheet(name); sh.appendRow(head); sh.setFrozenRows(1); sh.getRange(1, 1, 1, head.length).setFontWeight('bold'); }
  return sh;
}
function json_(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function str_(v, n){ return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').slice(0, n || 80); }
function phone_(v){ var d = String(v || '').replace(/\D/g, ''); if(d.length === 10) d = '91' + d; return /^\d{11,13}$/.test(d) ? d : ''; }
function authed_(e){ var k = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY'); return k && e.parameter.key === k; }
function iso_(){ return Utilities.formatDate(new Date(), 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss"); }

/* ---------- visitors post here ---------- */
function doPost(e){
  var raw = (e && e.postData && e.postData.contents) || '';
  if(raw.length > 4000) return json_({ ok:false });
  var p; try{ p = JSON.parse(raw); }catch(err){ return json_({ ok:false }); }
  if(EVENTS.indexOf(p.event) < 0 || !/^v[a-z0-9]{6,20}$/.test(p.vid || '')) return json_({ ok:false });
  var plan = ['os','cohort','one','biz'].indexOf(p.plan) >= 0 ? p.plan : '';
  var ph = phone_(p.phone);
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try{
    var ts = iso_();
    sheet_('Events', EV_HEAD).appendRow([ts, p.vid, p.event, plan, str_(p.loc, 20), str_(p.name, 40), ph, str_(p.profession, 20), str_(p.goal, 20), str_(p.hours, 10),
      str_(p.recommended, 8), str_(p.business, 60), str_(p.utm_source, 60), str_(p.utm_medium, 60), str_(p.utm_campaign, 60), str_(p.utm_content, 60), str_(p.referrer, 120), str_(p.page, 60)]);
    upsertLead_(p, plan, ph, ts);
  } finally { lock.releaseLock(); }
  return json_({ ok:true });
}

function upsertLead_(p, plan, ph, ts){
  var sh = sheet_('Leads', LEAD_HEAD), H = {}; LEAD_HEAD.forEach(function(h, i){ H[h] = i; });
  var hit = sh.getRange(2, 1, Math.max(1, sh.getLastRow() - 1), 1).createTextFinder(p.vid).matchEntireCell(true).findNext();
  var row, r;
  if(hit){ row = hit.getRow(); r = sh.getRange(row, 1, 1, LEAD_HEAD.length).getValues()[0]; }
  else { r = LEAD_HEAD.map(function(){ return ''; }); r[H.vid] = p.vid; r[H.first_seen] = ts; r[H.status] = 'new';
    ['views_os','views_cohort','views_one','views_biz','cta_clicks','wa_clicks','buy_clicks','quiz_done','events','score'].forEach(function(k){ r[H[k]] = 0; }); }
  r[H.last_seen] = ts; r[H.events] = +r[H.events] + 1; r[H.score] = +r[H.score] + (WEIGHT[p.event] || 0);
  if(p.name) r[H.name] = str_(p.name, 40);
  if(ph) r[H.phone] = ph;
  ['profession','goal','hours','recommended'].forEach(function(k){ if(p[k]) r[H[k]] = str_(p[k], 20); });
  if(p.business) r[H.business] = str_(p.business, 60);
  if(!r[H.utm_source] && p.utm_source) r[H.utm_source] = str_(p.utm_source, 60);
  if(!r[H.utm_campaign] && p.utm_campaign) r[H.utm_campaign] = str_(p.utm_campaign, 60);
  if(!r[H.referrer] && p.referrer) r[H.referrer] = str_(p.referrer, 120);
  if(p.event === 'tile_view' && plan) r[H['views_' + plan]] = +r[H['views_' + plan]] + 1;
  if(p.event === 'tile_cta' && plan){ r[H.cta_clicks] = +r[H.cta_clicks] + 1; r[H['views_' + plan]] = +r[H['views_' + plan]] + 3; }
  if(p.event === 'wa_click'){ r[H.wa_clicks] = +r[H.wa_clicks] + 1; if(plan) r[H['views_' + plan]] = +r[H['views_' + plan]] + 3; }
  if(p.event === 'buy_click'){ r[H.buy_clicks] = +r[H.buy_clicks] + 1; if(plan) r[H['views_' + plan]] = +r[H['views_' + plan]] + 5; }
  if(p.event === 'quiz_result') r[H.quiz_done] = 1;
  if(p.event === 'lead_submit' && plan) r[H['views_' + plan]] = +r[H['views_' + plan]] + 6;
  var v = { os:+r[H.views_os], cohort:+r[H.views_cohort] || 0, one:+r[H.views_one], biz:+r[H.views_biz] };
  if(r[H.recommended]) v[r[H.recommended]] += 2;
  var top = Object.keys(v).sort(function(a, b){ return v[b] - v[a]; })[0];
  r[H.top_plan] = v[top] > 0 ? top : '';
  var sc = +r[H.score];
  r[H.temperature] = (r[H.phone] || +r[H.buy_clicks] > 0 || sc >= 30) ? 'hot' : sc >= 12 ? 'warm' : 'cold';
  if(hit) sh.getRange(row, 1, 1, LEAD_HEAD.length).setValues([r]); else sh.appendRow(r);
}

/* ---------- page config + admin API ---------- */
function doGet(e){
  var a = (e && e.parameter.action) || 'config';
  if(a === 'config'){
    var out = {}; readConfig_().forEach(function(kv){ if(PUBLIC_CONFIG.indexOf(kv[0]) >= 0) out[kv[0]] = kv[1]; });
    return json_(out);
  }
  if(!authed_(e)) return json_({ ok:false, error:'bad key' });
  if(a === 'leads'){
    var sh = sheet_('Leads', LEAD_HEAD), n = sh.getLastRow() - 1;
    var rows = n > 0 ? sh.getRange(2, 1, n, LEAD_HEAD.length).getValues() : [];
    var leads = rows.map(function(r){ var o = {}; LEAD_HEAD.forEach(function(h, i){ o[h] = r[i] instanceof Date ? r[i].toISOString() : r[i]; }); return o; });
    var cfg = {}; readConfig_().forEach(function(kv){ cfg[kv[0]] = kv[1]; });
    return json_({ ok:true, leads:leads, config:cfg, at:iso_() });
  }
  if(a === 'update'){
    var sh2 = sheet_('Leads', LEAD_HEAD), f = sh2.getRange(2, 1, Math.max(1, sh2.getLastRow() - 1), 1).createTextFinder(e.parameter.vid || '~').matchEntireCell(true).findNext();
    if(!f) return json_({ ok:false, error:'not found' });
    var col = function(h){ return LEAD_HEAD.indexOf(h) + 1; };
    if(e.parameter.status) sh2.getRange(f.getRow(), col('status')).setValue(str_(e.parameter.status, 20));
    if(e.parameter.notes !== undefined) sh2.getRange(f.getRow(), col('notes')).setValue(str_(e.parameter.notes, 500));
    if(e.parameter.contacted) sh2.getRange(f.getRow(), col('last_contacted')).setValue(iso_());
    return json_({ ok:true });
  }
  if(a === 'setconfig'){
    var k = e.parameter.k; if(PUBLIC_CONFIG.indexOf(k) < 0) return json_({ ok:false, error:'unknown key' });
    var c = sheet_('Config', ['key','value']), cf = c.getRange(1, 1, c.getLastRow(), 1).createTextFinder(k).matchEntireCell(true).findNext();
    if(cf) c.getRange(cf.getRow(), 2).setValue(str_(e.parameter.v, 10)); else c.appendRow([k, str_(e.parameter.v, 10)]);
    return json_({ ok:true });
  }
  return json_({ ok:false, error:'unknown action' });
}
function readConfig_(){ var c = sheet_('Config', ['key','value']); return c.getLastRow() < 2 ? [] : c.getRange(2, 1, c.getLastRow() - 1, 2).getValues(); }
