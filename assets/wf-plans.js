/* Weekend Founder · plans carousel, course finder, WhatsApp, funnel tracking.
   Edit CFG below. Everything else runs on its own. */
(function(){
  'use strict';
  var CFG = {
    // Google Apps Script web app URL (see tools/funnel/SETUP.md). Leave '' to run without the admin funnel.
    endpoint: '',
    wa: '919629843122',
    // From this moment (IST) the group cohort tile appears and 1:1 moves to ₹12,999.
    // The OS stays ₹1,999.
    newPricesFrom: '2026-12-01T00:00:00+05:30',
    bizUntil: '2027-04-01T00:00:00+05:30',   // ₹29,999 → ₹79,999
    // December 1:1 seats. The admin panel overrides these; until it does, the tile says "open".
    decSeatsLeft: null, decSeatsTotal: null,
    startIndex: 1                              // 1 = the 1:1 tile in front
  };
  var PLANS = {
    os:     { name:'Weekend Founder OS',              short:'Self-paced OS',  now:1999,  later:1999,  ga:'weekend_founder_os' },
    cohort: { name:'Group cohort (4 weekends)',       short:'Group cohort',   now:4999,  later:4999,  ga:'group_cohort_4wk' },
    one:    { name:'1:1 Build it with me (4 weekends)', short:'1:1 with Noor', now:4999, later:12999, ga:'one_to_one_4wk' },
    biz: { name:'Business Tech Enablement',      short:'Business',       now:29999, later:79999, ga:'business_tech' }
  };
  var D = document, W = window;
  var $ = function(s, r){ return (r || D).querySelector(s); };
  var $$ = function(s, r){ return Array.prototype.slice.call((r || D).querySelectorAll(s)); };
  var stage = $('#plStage'); if(!stage) return;
  var newPrices = Date.now() >= +new Date(CFG.newPricesFrom);
  // The group cohort only exists from 1 Dec: before that, take its tile and tab out.
  if(!newPrices){ $$('[data-plan="cohort"], .pl-dots [data-go-plan="cohort"]').forEach(function(el){ el.parentNode.removeChild(el); }); }
  else {
    // the cohort becomes the featured tile
    $$('.pl-tile.feat', stage).forEach(function(t){ t.classList.remove('feat'); });
    var ct = $('[data-plan="cohort"]', stage); if(ct) ct.classList.add('feat');
  }
  var tiles = $$('.pl-tile', stage), dots = $$('.pl-dots [data-go]');
  var ORDER = tiles.map(function(t){ return t.getAttribute('data-plan'); });
  dots.forEach(function(b, i){ b.setAttribute('data-go', i); });
  var LAST = tiles.length - 1;
  CFG.startIndex = Math.max(0, ORDER.indexOf(newPrices ? 'cohort' : 'one'));
  var reduce = false; try{ reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}
  var inr = function(n){ return '₹' + Number(n).toLocaleString('en-IN'); };
  var now = Date.now();

  /* ---------- visitor id + source (for the admin funnel) ---------- */
  function store(k, v){ try{ if(v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); }catch(e){ return null; } }
  var vid = store('tdz_vid');
  if(!vid){ vid = 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); store('tdz_vid', vid); }
  var src = {};
  try{
    var q = new URLSearchParams(location.search);
    ['utm_source','utm_medium','utm_campaign','utm_content'].forEach(function(k){ if(q.get(k)) src[k] = q.get(k).slice(0, 60); });
    if(Object.keys(src).length) store('tdz_src', JSON.stringify(src)); else src = JSON.parse(store('tdz_src') || '{}');
    if(!src.referrer && D.referrer && D.referrer.indexOf(location.host) < 0) src.referrer = D.referrer.slice(0, 120);
  }catch(e){}
  var profile = {}; try{ profile = JSON.parse(store('tdz_profile') || '{}'); }catch(e){}

  function send(event, extra){
    var p = { vid:vid, event:event, page:location.pathname, ts:new Date().toISOString() };
    Object.keys(src).forEach(function(k){ p[k] = src[k]; });
    ['name','phone','profession','goal','hours','recommended'].forEach(function(k){ if(profile[k]) p[k] = profile[k]; });
    if(extra) Object.keys(extra).forEach(function(k){ p[k] = extra[k]; });
    try{ if(W.gtag) gtag('event', event, { plan:p.plan || '', location:p.loc || '' }); }catch(e){}
    try{ if(W.fbq) fbq('trackCustom', 'WF_' + event, { plan:p.plan || '' }); }catch(e){}
    if(!CFG.endpoint) return;
    var body = JSON.stringify(p);
    try{
      if(navigator.sendBeacon && navigator.sendBeacon(CFG.endpoint, new Blob([body], { type:'text/plain' }))) return;
    }catch(e){}
    try{ fetch(CFG.endpoint, { method:'POST', mode:'no-cors', keepalive:true, headers:{ 'Content-Type':'text/plain' }, body:body }); }catch(e){}
  }

  /* ---------- sound (Web Audio, follows the page's mute button) ---------- */
  var AC = null, out = null;
  function muted(){ return store('wf_muted') === '1'; }
  function ac(){
    if(AC) return AC;
    try{ var C = W.AudioContext || W.webkitAudioContext; if(C){ AC = new C(); out = AC.createGain(); out.gain.value = .8; out.connect(AC.destination); } }catch(e){}
    return AC;
  }
  function swoosh(dir, idx){
    if(muted() || !ac()) return;
    if(AC.state === 'suspended') AC.resume();
    var t = AC.currentTime, len = .32;
    // filtered noise sweep = the "swipe"
    var buf = AC.createBuffer(1, Math.floor(AC.sampleRate * len), AC.sampleRate), d = buf.getChannelData(0);
    for(var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    var n = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    n.buffer = buf; f.type = 'bandpass'; f.Q.value = 1.4;
    f.frequency.setValueAtTime(dir > 0 ? 500 : 2600, t); f.frequency.exponentialRampToValueAtTime(dir > 0 ? 2600 : 500, t + len);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.22, t + .05); g.gain.exponentialRampToValueAtTime(.0001, t + len);
    n.connect(f); f.connect(g); g.connect(out); n.start(t); n.stop(t + len);
    // a pitched "land" note per plan
    var notes = [523.25, 783.99, 659.25], o = AC.createOscillator(), g2 = AC.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(notes[idx] || 600, t + .16);
    g2.gain.setValueAtTime(.0001, t + .16); g2.gain.exponentialRampToValueAtTime(.09, t + .18); g2.gain.exponentialRampToValueAtTime(.0001, t + .5);
    o.connect(g2); g2.connect(out); o.start(t + .16); o.stop(t + .55);
  }
  function chime(){
    if(muted() || !ac()) return;
    [523.25, 659.25, 783.99, 1046.5].forEach(function(fq, i){
      var t = AC.currentTime + i * .08, o = AC.createOscillator(), g = AC.createGain();
      o.type = 'triangle'; o.frequency.value = fq; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.08, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + .3);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + .32);
    });
  }

  /* ---------- prices, deadlines, countdowns ---------- */
  var until = { os:Infinity, cohort:Infinity, one:+new Date(CFG.newPricesFrom), biz:+new Date(CFG.bizUntil) };
  function priceOf(k){ return now < until[k] ? PLANS[k].now : PLANS[k].later; }
  tiles.forEach(function(t){
    var k = t.getAttribute('data-plan');
    if(now >= until[k]){
      ['[data-was]','[data-off]','[data-until]'].forEach(function(s){ var el = $(s, t); if(el) el.hidden = true; });
      var a = $('[data-amt]', t); a.setAttribute('data-amt', PLANS[k].later); a.textContent = inr(PLANS[k].later);
      $$('[data-amt-txt]', t).forEach(function(el){ el.textContent = inr(PLANS[k].later); });
    }
  });
  if(now >= until.one){ var fomo = $('.pl-fomo'); if(fomo) fomo.hidden = true; }
  function tickCd(){
    var t = Date.now();
    $$('[data-plcd]', stage).forEach(function(el){
      var left = until[el.getAttribute('data-plcd')] - t; if(left <= 0){ el.textContent = ''; return; }
      var dd = Math.floor(left / 864e5), hh = Math.floor(left / 36e5) % 24, mm = Math.floor(left / 6e4) % 60, ss = Math.floor(left / 1e3) % 60;
      // show the clock only in the last 14 days, otherwise just days
      el.innerHTML = dd > 14 ? '<i>' + dd + '<small>d</small></i>' :
        '<i>' + dd + '<small>d</small></i><i>' + hh + '<small>h</small></i><i>' + mm + '<small>m</small></i><i>' + ss + '<small>s</small></i>';
    });
  }
  tickCd(); setInterval(tickCd, 1000);

  function seats(left, total){
    if(now >= until.one) return;
    var txt = $('#plSeatTxt'), bar = $('#plSeatBar'), live = $('#plFomoLive');
    left = parseInt(left, 10); total = parseInt(total, 10);
    // no real seat count yet: hide the bar rather than show a made-up fill
    if(isNaN(left)){ if(bar && bar.parentNode) bar.parentNode.hidden = true; return; }
    if(left <= 0){
      txt.textContent = 'December · full'; txt.className = 'no';
      live.textContent = 'December full · join the January waitlist';
      $$('[data-reserve="one"]').forEach(function(b){ b.firstChild.nodeValue = 'Join the January waitlist '; });
      if(bar) bar.style.setProperty('--fill', '100%');
      return;
    }
    txt.textContent = 'December · ' + left + ' left';
    live.textContent = 'Only ' + left + (left === 1 ? ' December slot' : ' December slots') + ' left';
    if(bar && total > 0) bar.style.setProperty('--fill', Math.round((1 - left / total) * 100) + '%');
  }
  seats(CFG.decSeatsLeft, CFG.decSeatsTotal);
  if(CFG.endpoint){
    try{ fetch(CFG.endpoint + '?action=config').then(function(r){ return r.json(); }).then(function(c){ if(c && c.decSeatsLeft !== undefined && c.decSeatsLeft !== '') seats(c.decSeatsLeft, c.decSeatsTotal); }).catch(function(){}); }catch(e){}
  }

  /* ---------- carousel ---------- */
  var active = CFG.startIndex, seen = {};
  function countUp(el){
    var to = +el.getAttribute('data-amt'); if(reduce){ el.textContent = inr(to); return; }
    var t0 = performance.now(), from = Math.round(to * .55);
    (function step(t){ var p = Math.min(1, (t - t0) / 650), e = 1 - Math.pow(1 - p, 3); el.textContent = inr(Math.round(from + (to - from) * e)); if(p < 1) requestAnimationFrame(step); })(t0);
  }
  function layout(){
    tiles.forEach(function(t, i){
      var pos = Math.max(-2, Math.min(2, i - active));   // fixed order, cheapest on the left
      t.setAttribute('data-pos', pos); t.setAttribute('aria-hidden', pos === 0 ? 'false' : 'true');
      $$('a,button', t).forEach(function(b){ b.tabIndex = pos === 0 ? 0 : -1; });
    });
    dots.forEach(function(b, i){ b.setAttribute('aria-selected', i === active ? 'true' : 'false'); });
    $('#plPrev').disabled = active === 0; $('#plNext').disabled = active === LAST;
  }
  function go(i, dir, why){
    if(i < 0 || i > LAST){ stage.style.setProperty('--dx', i < 0 ? 40 : -40); setTimeout(function(){ stage.style.setProperty('--dx', 0); }, 200); return; }
    if(i === active) return;
    dir = dir || (i > active ? 1 : -1); active = i; layout(); swoosh(dir, i);
    countUp($('[data-amt]', tiles[i]));
    var k = ORDER[i]; if(!seen[k]){ seen[k] = 1; send('tile_view', { plan:k, loc:why || 'swipe' }); }
  }
  layout();
  $('#plPrev').addEventListener('click', function(){ go(active - 1, -1, 'arrow'); });
  $('#plNext').addEventListener('click', function(){ go(active + 1, 1, 'arrow'); });
  dots.forEach(function(b){ b.addEventListener('click', function(){ go(+b.getAttribute('data-go'), 0, 'tab'); }); });
  tiles.forEach(function(t, i){
    t.addEventListener('click', function(){ if(i !== active && !moved) go(i, 0, 'tap'); });
    t.addEventListener('keydown', function(e){ if(e.key === 'Enter' && i !== active) go(i, 0, 'key'); });
  });
  stage.addEventListener('keydown', function(e){
    if(e.target.matches('input,textarea')) return;
    if(e.key === 'ArrowLeft'){ go(active - 1, -1, 'key'); e.preventDefault(); }
    if(e.key === 'ArrowRight'){ go(active + 1, 1, 'key'); e.preventDefault(); }
  });
  // swipe / drag
  var x0 = null, y0 = 0, dx = 0, moved = false, horiz = null;
  stage.addEventListener('pointerdown', function(e){
    if(e.pointerType === 'mouse' && e.button !== 0) return;
    if(e.target.closest('a,button') && e.target.closest('[data-pos="0"]')) return;
    x0 = e.clientX; y0 = e.clientY; dx = 0; moved = false; horiz = null;
  });
  W.addEventListener('pointermove', function(e){
    if(x0 === null) return;
    var mx = e.clientX - x0, my = e.clientY - y0;
    if(horiz === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) horiz = Math.abs(mx) > Math.abs(my);
    if(!horiz) return;
    dx = mx; moved = Math.abs(dx) > 6; stage.classList.add('drag'); stage.style.setProperty('--dx', Math.max(-160, Math.min(160, dx * .6)));
  }, { passive:true });
  function end(){
    if(x0 === null) return;
    stage.classList.remove('drag'); stage.style.setProperty('--dx', 0);
    if(horiz && Math.abs(dx) > 45) go(active + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1, 'swipe');
    x0 = null; setTimeout(function(){ moved = false; }, 0);
  }
  W.addEventListener('pointerup', end); W.addEventListener('pointercancel', end);

  // section view + a gentle nudge so people discover the swipe
  if('IntersectionObserver' in W){
    var nudged = false;
    new IntersectionObserver(function(es, ob){
      es.forEach(function(en){ if(en.isIntersecting){
        send('plans_view', { loc:'scroll' }); seen[ORDER[active]] = 1; send('tile_view', { plan:ORDER[active], loc:'default' }); ob.disconnect();
        countUp($('[data-amt]', tiles[active]));
        if(!reduce && !nudged){ nudged = true; setTimeout(function(){ stage.style.setProperty('--dx', -30); setTimeout(function(){ stage.style.setProperty('--dx', 30); setTimeout(function(){ stage.style.setProperty('--dx', 0); }, 380); }, 380); }, 900); }
      }});
    }, { threshold:.35 }).observe(stage);
  }

  /* ---------- WhatsApp ---------- */
  function waUrl(text){ return 'https://wa.me/' + CFG.wa + '?text=' + encodeURIComponent(text); }
  function answersLine(){
    var L = { student:'Student', professional:'Working professional', business:'Business owner', other:'Other',
      learn:'learn AI', income:'extra income', owntech:'tech for my idea', fullbiz:'run my business on tech', low:'2–5 hrs/week', mid:'5–10 hrs/week', high:'10+ hrs/week' };
    var a = [L[profile.profession], L[profile.goal], L[profile.hours]].filter(Boolean);
    return a.length ? ' (' + a.join(' · ') + ')' : '';
  }
  function waText(plan, extra){
    var who = profile.name ? 'Hi Noor, this is ' + profile.name + '.' : 'Hi Noor,';
    if(plan === 'cohort') return who + ' I want to join the next group cohort (4 weekends, ' + inr(priceOf('cohort')) + ').' + answersLine() + (extra || '');
    if(plan === 'one') return who + ' I want to reserve a December 1:1 slot for the 4-weekend course (' + inr(priceOf('one')) + ').' + answersLine() + (extra || '');
    if(plan === 'biz') return who + ' I want to talk about Business Tech Enablement for my business.' + answersLine() + (extra || '');
    if(plan === 'os') return who + ' I have a question about the Weekend Founder OS (' + inr(priceOf('os')) + ') before I buy.' + answersLine() + (extra || '');
    return who + ' before I buy, which course is right for me?' + answersLine();
  }
  $$('[data-wa-plan]').forEach(function(a){
    var k = a.getAttribute('data-wa-plan');
    a.target = '_blank'; a.rel = 'noopener';
    a.addEventListener('click', function(){ a.href = waUrl(waText(k)); send('wa_click', { plan:k, loc:'tile' }); });
    a.href = waUrl(waText(k));
  });
  var fab = $('#waFab');
  if(fab){
    fab.addEventListener('click', function(){ var k = profile.recommended || ORDER[active]; fab.href = waUrl(waText(k)); send('wa_click', { plan:k, loc:'fab' }); });
    // show the label once when the visitor reaches the plans
    var said = false;
    if('IntersectionObserver' in W) new IntersectionObserver(function(es){ es.forEach(function(en){
      if(en.isIntersecting && !said){ said = true; fab.classList.add('say'); setTimeout(function(){ fab.classList.remove("say"); }, innerWidth < 520 ? 3500 : 5000); }
    }); }, { threshold:.3 }).observe(stage);
  }
  // buy clicks on the OS tile
  $$('[data-plan-cta]').forEach(function(a){ a.addEventListener('click', function(){ send('buy_click', { plan:a.getAttribute('data-plan-cta'), loc:'tile' }); }); });
  // existing page buy buttons (hero, price, sticky) also count toward the funnel
  D.addEventListener('click', function(e){ var a = e.target.closest && e.target.closest('a.buy-link:not([data-plan-cta])'); if(a) send('buy_click', { plan:'os', loc:a.getAttribute('data-loc') || 'page' }); });

  /* ---------- reserve / book modal ---------- */
  var modal = $('#plModal'), mForm = $('#plModalForm'), mPlan = 'one';
  function cleanPhone(v){ var d = String(v || '').replace(/\D/g, ''); if(d.length === 10) d = '91' + d; return d; }
  function validPhone(d){ return /^\d{11,13}$/.test(d); }
  function openModal(k){
    mPlan = k; send('tile_cta', { plan:k, loc:'reserve' });
    var biz = k === 'biz';
    $('#plModalT').textContent = k === 'cohort' ? 'Join the next cohort' : biz ? 'Book a business call' : ($('#plSeatTxt') && /full/.test($('#plSeatTxt').textContent) ? 'Join the January waitlist' : 'Reserve your December slot');
    $('#plModalP').textContent = k === 'cohort' ? 'Leave your number and Noor will send you the cohort dates on WhatsApp.' : biz ? 'Tell me a little about your business. I\'ll message you on WhatsApp to scope it. Price may vary slightly with your requirement.'
      : 'Leave your number and Noor will confirm your December slot on WhatsApp.';
    $('#plModalBizL').hidden = !biz;
    if(profile.name) mForm.name.value = profile.name;
    if(profile.phone) mForm.phone.value = profile.phone.replace(/^91/, '');
    if(modal.showModal) modal.showModal(); else modal.setAttribute('open', '');
    setTimeout(function(){ (profile.name ? mForm.phone : mForm.name).focus(); }, 50);
  }
  function closeModal(){ if(modal.close) modal.close(); else modal.removeAttribute('open'); }
  $$('[data-reserve]').forEach(function(b){ b.addEventListener('click', function(){ openModal(b.getAttribute('data-reserve')); }); });
  $('#plModalX').addEventListener('click', closeModal);
  modal.addEventListener('click', function(e){ if(e.target === modal) closeModal(); });
  mForm.addEventListener('submit', function(e){
    e.preventDefault();
    var name = mForm.name.value.trim(), ph = cleanPhone(mForm.phone.value);
    if(!name){ mForm.name.focus(); return; }
    if(!validPhone(ph)){ mForm.phone.setCustomValidity('Enter a valid WhatsApp number'); mForm.phone.reportValidity(); mForm.phone.setCustomValidity(''); return; }
    profile.name = name.slice(0, 40); profile.phone = ph; store('tdz_profile', JSON.stringify(profile));
    var biz = mPlan === 'biz' ? mForm.biz.value.trim().slice(0, 60) : '';
    send('lead_submit', { plan:mPlan, loc:'reserve', business:biz });
    chime(); closeModal();
    W.open(waUrl(waText(mPlan, biz ? ' My business: ' + biz + '.' : '')), '_blank', 'noopener');
  });

  /* ---------- course finder ---------- */
  var fd = $('#finder'), steps = $$('.fd-step', fd), bars = $$('.fd-prog i', fd), qi = 0, ans = {}, started = false;
  function showQ(i){
    qi = i; steps.forEach(function(s, j){ s.classList.toggle('on', j === i); });
    bars.forEach(function(b, j){ b.classList.toggle('on', j <= i); });
    $('#fdRes').classList.remove('on');
  }
  function recommend(a){
    // Scores: profession + goal (heaviest) + weekly time. Ties go to the cohort, else the 1:1.
    // Only plans on the page (ORDER) can win, so the cohort is never picked before 1 Dec.
    var s = { os:0, cohort:0, one:0, biz:0 };
    function add(o){ for(var k in o || {}) s[k] += o[k]; }
    add({ student:{ os:3, cohort:1 }, professional:{ one:2, cohort:2, os:1 }, business:{ biz:2, one:2 }, other:{ one:1, cohort:1, os:2 } }[a.profession]);
    add({ learn:{ os:4, cohort:1 }, income:{ one:4, cohort:4, os:1 }, owntech:{ one:4, cohort:2, biz:1 }, fullbiz:{ biz:6 } }[a.goal]);
    add({ low:{ os:3 }, mid:{ one:2, cohort:3, os:1 }, high:{ one:3, cohort:1, biz:1 } }[a.hours]);
    var pref = ORDER.indexOf('cohort') > -1 ? 'cohort' : 'one';
    return ORDER.slice().sort(function(x, y){ return s[y] - s[x] || (x === pref ? -1 : y === pref ? 1 : 0); });
  }
  var WHY = {
    cohort:'You want to build something real, with a group and Noor keeping you on track. Over 4 weekends you build live in Saturday group sessions, and the Weekend Founder OS is included.',
    os: 'You want to learn AI at your own pace. The OS walks you through Claude co-work and prompt engineering, and you finish with your own professional website. Start tonight.',
    one:'You want something that earns or works for your business, and you have the time. In 4 weekends with me you build 2 websites and 1 working product on your own idea, all the way to code.',
    biz:'You need your business running on tech, not a course. I set up your ERP or CRM, marketing and team tools around how you actually work.'
  };
  function result(){
    var rank = recommend(ans), k = rank[0], alt = rank[1];
    profile.profession = ans.profession; profile.goal = ans.goal; profile.hours = ans.hours; profile.recommended = k;
    store('tdz_profile', JSON.stringify(profile));
    steps.forEach(function(s){ s.classList.remove('on'); }); bars.forEach(function(b){ b.classList.add('on'); });
    var price = inr(priceOf(k));
    $('#fdTitle').innerHTML = PLANS[k].short +' · <em>' + price + (k === 'biz' ? '*' : '') + '</em>';
    $('#fdWhy').textContent = WHY[k] + (k === 'one' ? ' The next batch starts in December.' : '');
    $('#fdAlt').textContent = 'Also worth a look: ' + PLANS[alt].short + ' (' + inr(priceOf(alt)) + ').' + (k === 'biz' ? ' *Price may vary slightly based on your requirement.' : '');
    $('#fdGo').firstChild.nodeValue = (k === 'os' ? 'Get the OS now ' : k === 'cohort' ? 'Join the next cohort ' : k === 'one' ? 'Reserve my December slot ' : 'Book a business call ');
    $('#fdGo').setAttribute('data-k', k);
    $('#fdWa').href = waUrl(waText(k)); $('#fdWa').target = '_blank'; $('#fdWa').rel = 'noopener';
    $('#fdRes').classList.add('on'); chime();
    tiles.forEach(function(t){ t.classList.toggle('rec', t.getAttribute('data-plan') === k); });
    send('quiz_result', { plan:k, recommended:k, alt:alt });
  }
  steps.forEach(function(s, i){
    $$('.opt button', s).forEach(function(b){
      b.addEventListener('click', function(){
        if(!started){ started = true; send('quiz_start', {}); }
        $$('.opt button', s).forEach(function(x){ x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        ans[s.getAttribute('data-q')] = b.getAttribute('data-v');
        swoosh(1, i);
        setTimeout(function(){ if(i < steps.length - 1) showQ(i + 1); else result(); }, 220);
      });
    });
  });
  $$('[data-fd-back]', fd).forEach(function(b){ b.addEventListener('click', function(){ showQ(Math.max(0, qi - 1)); }); });
  $('#fdRedo').addEventListener('click', function(){ ans = {}; $$('.opt button', fd).forEach(function(x){ x.setAttribute('aria-pressed', 'false'); }); showQ(0); });
  $('#fdGo').addEventListener('click', function(e){
    var k = this.getAttribute('data-k'); e.preventDefault();
    send('tile_cta', { plan:k, loc:'finder' });
    stage.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block:'center' });
    setTimeout(function(){ go(ORDER.indexOf(k), 0, 'finder'); }, reduce ? 0 : 450);
    if(k === 'os') setTimeout(function(){ W.location.href = $('[data-plan-cta="os"]').href; }, 1200);
    else setTimeout(function(){ openModal(k); }, 1100);
  });
  $('#fdWa').addEventListener('click', function(){ send('wa_click', { plan:profile.recommended, loc:'finder' }); });
  $('#fdLead').addEventListener('submit', function(e){
    e.preventDefault();
    var f = this, name = f.name.value.trim(), ph = cleanPhone(f.phone.value);
    if(!name){ f.name.focus(); return; }
    if(!validPhone(ph)){ f.phone.setCustomValidity('Enter a valid WhatsApp number'); f.phone.reportValidity(); f.phone.setCustomValidity(''); return; }
    profile.name = name.slice(0, 40); profile.phone = ph; store('tdz_profile', JSON.stringify(profile));
    send('lead_submit', { plan:profile.recommended, loc:'finder' }); chime();
    f.innerHTML = '<p style="grid-column:1/-1;font-size:16px;color:var(--bone)">Done, ' + name.replace(/[<>&"]/g, '') + '. Noor will message you on WhatsApp. Want it faster? <a class="lnk" target="_blank" rel="noopener" href="' + waUrl(waText(profile.recommended)) + '">Message him now</a>.</p>';
  });
})();
