/* TheDayZero · shared behaviour for every page.
   1. Region: visitors in India see ₹, everyone else sees US$ (by the browser's time zone).
      Test with ?region=in or ?region=intl (remembered for the visit).
   2. Every ₹ amount on the page is shown in US$ outside India, using the price list below
      for real prices and a rough rate for anything else.
   3. Outside India, Razorpay links go to WhatsApp (Razorpay doesn't take international cards yet),
      and Saturday class links go to WhatsApp (US$9, same Saturday hour).
   4. The shared header's mobile menu.
   5. Opt-in interface sounds (off until the visitor turns them on in the header). */
(function(){
  'use strict';
  var D = document, W = window;

  /* ---------- 1. region ---------- */
  var tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch(e){}
  var force = null;
  try {
    var q = new URLSearchParams(location.search).get('region');
    if (q === 'in' || q === 'intl'){ sessionStorage.setItem('tdz_region', q); }
    force = sessionStorage.getItem('tdz_region');
  } catch(e){}
  // India unless the browser clearly says otherwise. Signals: India time zone or UTC+5:30 offset,
  // or an Indian language setting (en-IN, hi-IN, ta-IN...). Privacy browsers that report UTC
  // or no time zone count as India, so no Indian visitor is ever shown dollars by mistake.
  var langs = []; try { langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || '']).map(String); } catch(e){}
  var offIN = false; try { offIN = new Date().getTimezoneOffset() === -330; } catch(e){}
  var tzIN = /^Asia\/(Kolkata|Calcutta)$/.test(tz) || offIN;
  var langIN = langs.some(function(l){ return /-IN$/i.test(l) || /^(hi|ta|te|kn|ml|mr|bn|gu|pa|or|as|ur-IN)\b/i.test(l); });
  var tzUnknown = !tz || /^(UTC|Etc\/|GMT|Universal|Zulu)/i.test(tz);
  var india = force ? force === 'in' : (tzIN || langIN || tzUnknown);
  var BOT = /bot|crawl|spider|slurp|lighthouse|headless/i.test(navigator.userAgent || '');
  D.documentElement.setAttribute('data-region', india ? 'in' : 'intl');

  /* ---------- 2. prices ---------- */
  // Real prices: INR → USD. Keep in step with Razorpay and the WhatsApp quotes.
  // 24 Nov: US$ prices approved by Noor: class $9, 1:1 $89 (was $179), Business $449 (was $999).
  var USD = { 99:2, 199:9, 499:19, 999:12, 1999:24, 2499:29, 2999:35, 4999:89, 9999:179, 12999:155, 29999:349, 31999:449, 79999:999 };
  var RATE = 85; // rough ₹ per US$ for amounts that aren't a product price
  function toUsd(n){
    if (!n) return 0;
    if (USD[n] != null) return USD[n];
    var v = n / RATE;
    if (v >= 1000) return Math.round(v / 50) * 50;
    if (v >= 100) return Math.round(v / 10) * 10;
    if (v >= 10) return Math.round(v / 5) * 5;
    return Math.max(1, Math.round(v));
  }
  function num(s, k){ var n = parseFloat(String(s).replace(/,/g, '')); k = (k || '').trim(); if (k) n *= (/^l/i.test(k) ? 100000 : 1000); return n; }
  function usd(n){ var v = toUsd(n); return '$' + (v >= 1000 && v % 1000 === 0 ? (v / 1000) + 'k' : v.toLocaleString('en-US')); }
  function money(inr){ return india ? '₹' + Number(inr).toLocaleString('en-IN') : usd(inr); }
  // ₹1,999 · ₹50k–75k · ₹5,000–₹20,000 · ₹1.5L
  var RX = /(?:₹|Rs\.?\s?|INR\s?)\s?(\d+(?:,\d{2,3})*(?:\.\d+)?)(\s?(?:k|K|L|lakh|lakhs)\b)?(\s?[–-]\s?(?:₹|Rs\.?\s?)?\s?(\d+(?:,\d{2,3})*(?:\.\d+)?)(\s?(?:k|K|L|lakh|lakhs)\b)?)?/g;
  function convertText(s){
    return s.replace(RX, function(m, a, ak, rng, b, bk){
      var out = usd(num(a, ak || bk));
      if (rng) out += '–' + usd(num(b, bk || ak));
      return out;
    }).replace(/\bcharged in INR\b/g, 'charged in US$').replace(/\brupees\b/gi, 'dollars');
  }
  var SKIP = { SCRIPT:1, STYLE:1, NOSCRIPT:1, TEXTAREA:1, CODE:1, PRE:1 };
  function walk(root){
    if (!root) return;
    if (root.nodeType === 3){ if (/₹|Rs\.?\s?\d|INR\s?\d|rupees/i.test(root.nodeValue)){ var v = convertText(root.nodeValue); if (v !== root.nodeValue) root.nodeValue = v; } return; }
    if (root.nodeType !== 1 || SKIP[root.nodeName] || (root.closest && root.closest('[data-keep-inr]'))) return;
    var tw = D.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n, list = [];
    while ((n = tw.nextNode())) list.push(n);
    list.forEach(function(t){
      var p = t.parentNode; if (!p || SKIP[p.nodeName] || (p.closest && p.closest('[data-keep-inr]'))) return;
      if (/₹|Rs\.?\s?\d|INR\s?\d|rupees/i.test(t.nodeValue)){ var v = convertText(t.nodeValue); if (v !== t.nodeValue) t.nodeValue = v; }
    });
    // labels that people read too
    Array.prototype.forEach.call(root.querySelectorAll ? root.querySelectorAll('[aria-label*="₹"],[title*="₹"],input[placeholder*="₹"]') : [], function(el){
      ['aria-label','title','placeholder'].forEach(function(a){ var v = el.getAttribute(a); if (v && v.indexOf('₹') > -1) el.setAttribute(a, convertText(v)); });
    });
  }

  /* ---------- 3. payments and workshop links outside India ---------- */
  var WA = '919629843122';
  var PAY = {
    'UQYIUZL':  'the Weekend Founder OS (US$24)',
    'iACekPPW': '1:1 coaching with Noor',
    '9hyRWq04': 'the weekend crash course'
  };
  // 25 Nov: abroad, 1:1 buttons go straight to Noor's Topmate page (takes international cards),
  // instead of a WhatsApp "how do I pay?" message that had no payment link to send back.
  var TOPMATE_1ON1 = 'https://topmate.io/noor_mohammed_j/2354146';
  var PAY_INTL = { 'iACekPPW': TOPMATE_1ON1 };
  function waLink(what){
    return 'https://wa.me/' + WA + '?text=' + encodeURIComponent('Hi Noor, I\'m outside India (' + (tz || 'abroad') + ') and I\'d like ' + what + '. How do I pay in US$?');
  }
  function fixLinks(root){
    Array.prototype.forEach.call((root || D).querySelectorAll('a[href]'), function(a){
      var h = a.getAttribute('href');
      if (/rzp\.io\/rzp\//.test(h)){
        var id = (h.match(/rzp\/([A-Za-z0-9]+)/) || [])[1];
        a.setAttribute('data-rzp', h);
        a.setAttribute('href', PAY_INTL[id] || waLink(PAY[id] || 'to join'));
        a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener');
      } else if (/^(https:\/\/thedayzero\.in)?\/weekend-founder\/live\/?(#.*)?$/.test(h)){
        // the global class is retired (24 Nov): abroad, the same Saturday class is booked on WhatsApp
        a.setAttribute('href', waLink('a seat in the Saturday AI class (US$9)'));
        a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener');
      }
    });
  }
  // Safety net for scripts that open Razorpay from a click handler
  D.addEventListener('click', function(e){
    if (india) return;
    var a = e.target.closest && e.target.closest('a[href*="rzp.io"]');
    if (!a) return;
    e.preventDefault(); e.stopImmediatePropagation();
    var id = (a.getAttribute('href').match(/rzp\/([A-Za-z0-9]+)/) || [])[1];
    if (PAY_INTL[id]) { try { if (W.gtag) W.gtag('event', 'intl_checkout', { via: 'topmate', item: id }); } catch(err){} }
    W.open(PAY_INTL[id] || waLink(PAY[id] || 'to join'), '_blank', 'noopener');
  }, true);

  // The two workshop pages never redirect. Each page keeps its own price and date, and offers the
  // other session in a small bar if the visitor seems to be in the other region.
  var path = location.pathname.replace(/index\.html$/, '');
  var IN_PAGE = path === '/weekend-founder/live/', GL_PAGE = false; // global page retired 24 Nov
  // Abroad, the Saturday page shows US$9 everywhere (no ₹499 rise) and books on WhatsApp instead of Razorpay.
  if (IN_PAGE && !india) USD[499] = 9;
  function intlClass(){
    D.documentElement.classList.add('tdz-intl');
    var st = D.createElement('style'); st.textContent = '.tdz-intl .rise-only{display:none!important}.tdz-intl-book h3{font-size:26px;letter-spacing:-.02em;margin:0 0 8px}.tdz-intl-book p{margin:0 0 16px;color:#4a463d}.tdz-intl-book .btn{width:100%}'; D.head.appendChild(st);
    var card = D.getElementById('regCard'); if (!card) return;
    ['regForm', 'done'].forEach(function(id){ var el = D.getElementById(id); if (el) el.hidden = true; });
    var box = D.createElement('div'); box.className = 'tdz-intl-book';
    box.innerHTML = '<h3>Book from outside India</h3><p>The class is US$9, live on Google Meet, Saturday 11 AM to 12 PM IST. Message Noor on WhatsApp: you get a card payment link, then your Meet invite.</p>' +
      '<a class="btn btn-y" href="' + waLink('a seat in the Saturday AI class (US$9)') + '" target="_blank" rel="noopener" data-cta="intl_book">Book on WhatsApp · US$9 <span class="ar" aria-hidden="true">→</span></a>';
    card.appendChild(box);
  }
  function regionBar(){
    var html = '';
    if (IN_PAGE && !india) html = 'Outside India? Join this same class for <b>US$9</b>, live online at 11 AM IST. <a href="' + waLink('a seat in the Saturday AI class (US$9)') + '" target="_blank" rel="noopener">Book on WhatsApp →</a>';
    if (!html) return;
    var bar = D.createElement('div'); bar.className = 'tdz-region-bar'; bar.innerHTML = html;
    var nav = D.getElementById('tdzNav'); if (nav && nav.nextSibling) nav.parentNode.insertBefore(bar, nav.nextSibling); else D.body.insertBefore(bar, D.body.firstChild);
  }


  // ---------- motion: progress line, reveal, marker sweep, counters, product marquee ----------
  var PRODUCTS = [
    ['Murugaaa', 'https://murugaaa.in', 'temple bookings'],
    ['Mentell', 'https://mentell.co.in', 'wellness brand'],
    ['Plotskart', 'https://plotskart.in', 'iOS + Android app'],
    ['MandapKart', 'https://mandapkart.in', 'venue marketplace'],
    ['TheDayZero', 'https://thedayzero.in/', 'this site']
  ];
  function motion(){
    var still = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var skin = D.documentElement.getAttribute('data-skin');
    var vh = W.innerHeight || 800;

    // product marquee on the workshop pages, right under the hero (one short line, ~52px)
    if (skin === 'live'){
      var hero = D.querySelector('section.hero');
      if (hero && !D.querySelector('.tdz-mq')){
        var one = PRODUCTS.map(function(p){
          return '<a href="' + p[1] + '" target="_blank" rel="noopener" data-cta="marquee_' + p[0].toLowerCase() + '"><i aria-hidden="true"></i>' + p[0] + ' <small>' + p[2] + '</small></a>';
        }).join('') + '<span><i aria-hidden="true"></i>All built on weekends with AI</span>';
        var mq = D.createElement('div');
        mq.className = 'tdz-mq';
        mq.setAttribute('aria-label', 'Products Noor built with AI');
        mq.innerHTML = '<div class="tdz-mq-track"><div style="display:flex">' + one + '</div>' + (still ? '' : '<div style="display:flex" aria-hidden="true">' + one.replace(/<a /g, '<a tabindex="-1" ') + '</div>') + '</div>';
        hero.parentNode.insertBefore(mq, hero.nextSibling);
      }
    }
    if (still || !('IntersectionObserver' in W)) return;

    // reading progress
    var bar = D.createElement('div'); bar.className = 'tdz-prog'; bar.setAttribute('aria-hidden', 'true'); D.body.appendChild(bar);
    var ticking = false;
    var prog = function(){ ticking = false; var h = D.documentElement.scrollHeight - vh; bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, W.pageYOffset / h) : 0) + ')'; };
    W.addEventListener('scroll', function(){ if (!ticking){ ticking = true; W.requestAnimationFrame(prog); } }, { passive:true });
    prog();

    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){
        if (!e.isIntersecting) return;
        var el = e.target; io.unobserve(el);
        el.classList.add('tdz-in');
        if (el.hasAttribute('data-tdz-count')) count(el);
      });
    }, { rootMargin:'0px 0px -8% 0px', threshold:.12 });
    var below = function(el){ return el.getBoundingClientRect().top > vh * .92; };

    // reveal: only on pages that have no reveal of their own, and only below the first screen
    if (skin === 'about' && !D.querySelector('.rv')){
      Array.prototype.forEach.call(D.querySelectorAll('main h2, main section > *, body > section > *, .wrap > h2, .wrap > p, .wrap > div'), function(el){
        if (el.closest('.tdz-nav,.tdz-foot,.tdz-sheet,.tdz-mq') || el.classList.contains('tdz-rv') || el.closest('.tdz-rv')) return;
        if (!below(el) || el.offsetHeight > vh * 1.4) return;
        el.classList.add('tdz-rv'); io.observe(el);
      });
    }

    // marker sweep on highlighted words below the fold
    Array.prototype.forEach.call(D.querySelectorAll('h2 em, h2 .hl, .tdz-hl'), function(el){
      var bg = getComputedStyle(el).backgroundImage;
      if (!bg || bg === 'none' || !below(el)) return;
      el.classList.add('tdz-sweep'); io.observe(el);
    });

    // counters: plain whole numbers in stat tiles, counted up once when seen
    Array.prototype.forEach.call(D.querySelectorAll('.stat > b, .nums .num > b, [data-tdz-count]'), function(el){
      var t = (el.textContent || '').trim();
      if (!/^\d{1,4}\+?$/.test(t) || parseInt(t, 10) < 3 || !below(el)) return;
      el.setAttribute('data-tdz-count', t);
      el.textContent = '0';
      el.style.minWidth = t.length + 'ch';
      io.observe(el);
    });
    function count(el){
      var t = el.getAttribute('data-tdz-count'), n = parseInt(t, 10), plus = /\+$/.test(t), t0 = null;
      var step = function(ts){
        if (t0 === null) t0 = ts;
        var k = Math.min(1, (ts - t0) / 1100), v = Math.round(n * (1 - Math.pow(1 - k, 3)));
        el.textContent = v + (plus && k === 1 ? '+' : '');
        if (k < 1) W.requestAnimationFrame(step);
      };
      W.requestAnimationFrame(step);
    }
  }


  /* ---------- lead capture (24 Nov) ----------
     One helper for every form: TDZ.lead({...}). It writes to the thedayzero_Lead sheet (the old
     lead webhook, the one that works today), copies to the new tracker, and fires GA4 + Pixel.
     Plus a soft card that asks for WhatsApp only (25 Nov: email removed, 14 of 16 viewers closed the two-field card): it slides in after 12 s or 40% scroll
     (or when the mouse leaves the page on desktop), never blocks the page, and once closed it
     shrinks to a small pill. Not shown on pages that already have their own form. */
  var LEAD_URL = 'https://script.google.com/macros/s/AKfycbwtyokM2Y2IGcFfz2bqd3AI-sI9xEtFtkKQlawnnFrrWO6G8gGjplxaO7Rqg_ZkKqkj/exec';
  var TRACK_URL = 'https://script.google.com/macros/s/AKfycbyXR3mKc1CjNwpDKkSdemEQM0oSraVkIFL0BRjbUjsHhJtJhl_vash_qeD3Arr77T94/exec';
  var RISE = new Date('2026-12-01T00:00:00+05:30');
  function utm(){
    var o = {}; try { var q = new URLSearchParams(location.search); ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(function(k){ if (q.get(k)) o[k.replace('utm_','')] = q.get(k).slice(0, 60); }); } catch(e){}
    try { if (Object.keys(o).length) sessionStorage.setItem('tdz_utm', JSON.stringify(o)); else o = JSON.parse(sessionStorage.getItem('tdz_utm') || '{}'); } catch(e){}
    return o;
  }
  utm();
  function lead(d){
    var interest = d.interest || 'general', src = d.source || 'site';
    var pageUrl = location.origin + location.pathname + '?reg=' + encodeURIComponent(src) + '&interest=' + encodeURIComponent(interest) + (d.note ? '&note=' + encodeURIComponent(String(d.note).slice(0, 80)) : '');
    var p = new URLSearchParams({ name:d.name || '(not given)', email:d.email || '', whatsapp:d.phone || '', pageUrl:pageUrl, timestamp:new Date().toISOString(),
      referrer:D.referrer || '', utm:JSON.stringify(utm()), role:interest, source:src, price:String(d.price || 0) });
    try { fetch(LEAD_URL, { method:'POST', mode:'no-cors', keepalive:true, body:p }); } catch(e){}
    try { navigator.sendBeacon(TRACK_URL, new Blob([JSON.stringify(Object.assign({ type:'lead', region:india ? 'in' : 'intl', tz:tz }, Object.fromEntries(p)))], { type:'text/plain' })); } catch(e){}
    try { if (W.gtag) gtag('event', 'generate_lead', { form:src, interest:interest, value:0, currency:'INR' }); } catch(e){}
    try { if (W.fbq) fbq('track', 'Lead', { content_name:interest }); } catch(e){}
    try { localStorage.setItem('tdz_lead', JSON.stringify({ at:Date.now(), interest:interest, name:d.name || '' })); } catch(e){}
  }
  function capture(){
    var p = location.pathname.replace(/index\.html$/, '');
    if (/^\/weekend-founder\/(live|book|read|free-website)\b|^\/about\/|^\/admin\/|thank-you|^\/Thankyou/i.test(p) || BOT) return;
    var has = function(k){ try { return localStorage.getItem(k); } catch(e){ return null; } };
    var put = function(k, v){ try { localStorage.setItem(k, v); } catch(e){} };
    var done = !!has('tdz_lead');
    var snooze = +(has('tdz_cap_x') || 0);
    var preRise = Date.now() < +RISE;
    var CH = [['class', india ? 'Saturday class' : 'Live class'], ['one', '1:1 coaching'], ['business', 'For my business'], ['team', 'Team or college']];
    var reason = india
      ? (preRise ? 'Leave your WhatsApp. I\'ll send this Saturday\'s class link (11 AM IST), one reminder that morning, and a heads-up before ₹199 becomes ₹499 on 1 Dec.'
                 : 'Leave your WhatsApp. I\'ll send this Saturday\'s class link (11 AM IST) and one reminder that morning.')
      : 'Leave your WhatsApp. I\'ll send the next live class link in your time zone and one reminder before it starts.';
    var box = D.createElement('aside');
    box.className = 'tdz-cap'; box.setAttribute('aria-labelledby', 'tdzCapT'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'false');
    box.innerHTML =
      '<button class="tdz-cap-x" type="button" aria-label="Close">×</button>' +
      '<div class="tdz-cap-in">' +
        '<p class="tdz-cap-k"><i aria-hidden="true"></i>Live every weekend</p>' +
        '<h2 id="tdzCapT">Get the class link on WhatsApp</h2>' +
        '<p class="tdz-cap-p">' + reason + '</p>' +
        '<form novalidate>' +
          '<div class="tdz-cap-ch" role="radiogroup" aria-label="I\'m interested in">' + CH.map(function(c, i){ return '<button type="button" role="radio" aria-checked="' + (i ? 'false' : 'true') + '" data-v="' + c[0] + '">' + c[1] + '</button>'; }).join('') + '</div>' +
          '<label><span>WhatsApp number</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="' + (india ? '98765 43210' : '+44 7700 900123') + '" required></label>' +
          '<label class="tdz-cap-opt"><span>Name <small>(optional)</small></span><input name="name" autocomplete="name" placeholder="Your name"></label>' +
          '<button class="tdz-cap-go" type="submit">Send me the details <span aria-hidden="true">→</span></button>' +
          '<p class="tdz-cap-err" role="alert" hidden></p>' +
          '<p class="tdz-cap-fine">Only about TheDayZero classes. Reply STOP any time. <a href="/privacy.html">Privacy</a></p>' +
        '</form>' +
        '<div class="tdz-cap-ok" hidden></div>' +
      '</div>';
    var pill = D.createElement('button');
    pill.type = 'button'; pill.className = 'tdz-cap-pill'; pill.innerHTML = '<i aria-hidden="true"></i>' + (india ? 'Get Saturday\'s class link' : 'Get the class link');
    D.body.appendChild(box); D.body.appendChild(pill);
    var form = box.querySelector('form'), ok = box.querySelector('.tdz-cap-ok'), err = box.querySelector('.tdz-cap-err'), interest = 'class', shown = false;
    function ga(n, x){ try { if (W.gtag) gtag('event', n, x || {}); } catch(e){} }
    function pick(v){ interest = v; Array.prototype.forEach.call(box.querySelectorAll('.tdz-cap-ch button'), function(b){ b.setAttribute('aria-checked', b.getAttribute('data-v') === v ? 'true' : 'false'); }); }
    function open(why, v){
      if (v) pick(v);
      if (done){ showOk(true); }
      box.classList.add('on'); pill.classList.remove('on'); shown = true;
      ga('capture_view', { trigger:why, interest:interest });
    }
    function close(){ box.classList.remove('on'); pill.classList.add('on'); put('tdz_cap_x', String(Date.now())); ga('capture_close', {}); }
    box.querySelector('.tdz-cap-x').addEventListener('click', close);
    D.addEventListener('keydown', function(e){ if (e.key === 'Escape' && box.classList.contains('on')) close(); });
    pill.addEventListener('click', function(){ open('pill'); });
    box.querySelector('.tdz-cap-ch').addEventListener('click', function(e){ var b = e.target.closest('button'); if (b) pick(b.getAttribute('data-v')); });
    // any button or link on the page can open it: data-capture="class|one|business|team"
    D.addEventListener('click', function(e){
      var a = e.target.closest && e.target.closest('[data-capture]'); if (!a) return;
      e.preventDefault(); open('button', a.getAttribute('data-capture'));
    });
    function next(){
      if (interest === 'class') return india ? ['/weekend-founder/live/', preRise ? 'Book your seat now · ₹199' : 'Book your seat now'] : [waLink('a seat in the Saturday AI class (US$9)'), 'Book your seat on WhatsApp · US$9'];
      if (interest === 'one') return [india ? 'https://rzp.io/rzp/iACekPPW' : TOPMATE_1ON1, india ? 'Book 1:1 now · ₹4,999' : 'Book 1:1 now · pay by card'];
      if (interest === 'business') return ['https://wa.me/' + WA + '?text=' + encodeURIComponent('Hi Noor, I\'d like to talk about the Business AI package for my business.'), 'Talk about my business on WhatsApp'];
      return ['https://wa.me/' + WA + '?text=' + encodeURIComponent('Hi Noor, we\'d like AI training for our team / college. Organisation:  | People:  | Online or on-site: '), 'Plan our training on WhatsApp'];
    }
    function showOk(again){
      var n = next();
      form.hidden = true; ok.hidden = false;
      Array.prototype.forEach.call(box.querySelectorAll('.tdz-cap-k,#tdzCapT,.tdz-cap-p'), function(el){ el.hidden = true; });
      ok.innerHTML = '<p class="tdz-cap-tick" aria-hidden="true">✓</p><h3>' + (again ? 'You\'re on my list.' : 'Got it. Talk soon.') + '</h3>' +
        '<p>I\'ll message you on WhatsApp. Don\'t want to wait?</p>' +
        '<a class="tdz-cap-go" href="' + n[0] + '"' + (/^https/.test(n[0]) ? ' target="_blank" rel="noopener"' : '') + ' data-cta="capture_next_' + interest + '">' + n[1] + ' <span aria-hidden="true">→</span></a>';
      if (!india) fixLinks(ok);
    }
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var raw = form.phone.value.trim(), dig = raw.replace(/\D/g, ''), email = '', name = form.name.value.trim().slice(0, 60);
      if (india && dig.length === 12 && dig.indexOf('91') === 0) dig = dig.slice(2);
      if (dig.length === 11 && dig.charAt(0) === '0') dig = dig.slice(1);
      var phone = india && /^[6-9]\d{9}$/.test(dig) ? '+91' + dig : (/^\+/.test(raw) || dig.length > 10) && dig.length >= 8 && dig.length <= 15 ? '+' + dig : '';
      if (!phone){
        err.hidden = false;
        err.textContent = india ? 'Please enter a 10-digit mobile number.' : 'Please enter your number with the country code, like +44.';
        form.phone.focus(); return;
      }
      err.hidden = true;
      lead({ name:name, phone:phone, email:email, interest:interest, source:'soft_capture' });
      done = true; showOk(false);
      pill.innerHTML = '<i aria-hidden="true"></i>You\'re on the list';
      setTimeout(function(){ if (box.classList.contains('on') && !box.contains(D.activeElement)) { box.classList.remove('on'); pill.classList.add('on'); } }, 15000);
    });
    if (done){ pill.classList.add('on'); pill.innerHTML = '<i aria-hidden="true"></i>You\'re on the list'; return; }
    if (Date.now() - snooze < 3 * 864e5){ pill.classList.add('on'); return; }
    var fire = function(why){ if (!shown) open(why); };
    setTimeout(function(){ fire('timer'); }, 12000);
    W.addEventListener('scroll', function sc(){
      var h = D.documentElement.scrollHeight - innerHeight;
      if (h > 0 && pageYOffset / h > .4){ W.removeEventListener('scroll', sc); fire('scroll'); }
    }, { passive:true });
    if (W.matchMedia && matchMedia('(pointer:fine)').matches){
      D.addEventListener('mouseout', function mo(e){ if (!e.relatedTarget && e.clientY < 8){ D.removeEventListener('mouseout', mo); fire('exit'); } });
    }
  }

  /* ---------- 5. sound: opt-in, synthesised with Web Audio, no files, never autoplays ---------- */
  var snd = { on:false, ctx:null, last:0 };
  try { snd.on = localStorage.getItem('tdz_snd') === '1'; } catch(e){}
  function ac(){
    if (!snd.ctx){ var C = W.AudioContext || W.webkitAudioContext; if (!C) return null; snd.ctx = new C(); }
    if (snd.ctx.state === 'suspended') snd.ctx.resume();
    return snd.ctx;
  }
  function tone(f1, f2, dur, vol, type, delay){
    var c = ac(); if (!c) return;
    var t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f1, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + .02);
  }
  function sfx(name){
    if (!snd.on) return;
    var now = Date.now();
    if (name === 'hover'){ if (now - snd.last < 90) return; snd.last = now; tone(1760, 0, .035, .018, 'sine'); return; }
    if (name === 'tick') return tone(1320, 1100, .05, .04, 'triangle');
    if (name === 'go'){ tone(660, 0, .09, .06, 'triangle'); tone(990, 0, .14, .05, 'triangle', .07); return; }
    if (name === 'on'){ tone(523, 0, .1, .05, 'sine'); tone(784, 0, .16, .05, 'sine', .08); return; }
    tone(880, 620, .06, .045, 'triangle'); // click
  }
  function soundUI(){
    var nav = D.querySelector('#tdzNav .tdz-w'); if (!nav || D.getElementById('tdzSnd')) return;
    var b = D.createElement('button'); b.type = 'button'; b.id = 'tdzSnd'; b.className = 'tdz-snd';
    // icons: Tabler "volume" and "volume-off"
    var ON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 8a5 5 0 0 1 0 8"/><path d="M17.7 5a9 9 0 0 1 0 14"/><path d="M6 15h-2a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h2l3.5-4.5a.8.8 0 0 1 1.5.5v14a.8.8 0 0 1-1.5.5l-3.5-4.5"/></svg>';
    var OFF = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 8a5 5 0 0 1 1.912 4.934m-1.377 2.602a5 5 0 0 1-.535.464"/><path d="M17.7 5a9 9 0 0 1 2.362 11.086m-1.676 2.299a9 9 0 0 1-.686.615"/><path d="M9.069 5.054l.431-.554a.8.8 0 0 1 1.5.5v2m0 4v8a.8.8 0 0 1-1.5.5l-3.5-4.5h-2a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h2l1.294-1.664"/><path d="M3 3l18 18"/></svg>';
    var paint = function(){ b.innerHTML = (snd.on ? ON : OFF) + '<span>' + (snd.on ? 'Sound on' : 'Sound') + '</span>'; b.setAttribute('aria-pressed', snd.on ? 'true' : 'false'); b.setAttribute('aria-label', snd.on ? 'Turn interface sounds off' : 'Turn interface sounds on'); };
    paint();
    b.addEventListener('click', function(){
      snd.on = !snd.on; try { localStorage.setItem('tdz_snd', snd.on ? '1' : '0'); } catch(e){}
      paint(); if (snd.on) sfx('on');
      try { if (W.gtag) gtag('event', 'sound_toggle', { on:snd.on }); } catch(e){}
    });
    var at = nav.querySelector('.tdz-desk') || D.getElementById('tdzMenu'); nav.insertBefore(b, at || null);
    // hover ticks on fine pointers, a click note on every button and link that acts
    var fine = W.matchMedia && W.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var SEL = 'a.btn,a.tdz-btn,button,.tile,[data-snd],summary,.tdz-links a';
    if (fine) D.addEventListener('pointerover', function(e){
      var t = e.target.closest && e.target.closest(SEL); if (!t || t === b) return;
      if (e.relatedTarget && t.contains(e.relatedTarget)) return;
      sfx('hover');
    });
    D.addEventListener('click', function(e){
      var t = e.target.closest && e.target.closest(SEL); if (!t || t === b) return;
      sfx(t.getAttribute('data-snd') === 'go' ? 'go' : (t.nodeName === 'SUMMARY' ? 'tick' : 'click'));
    });
  }

  W.TDZ = { india:india, tz:tz, money:money, usd:toUsd, wa:waLink, convert:convertText, lead:lead, sfx:sfx };

  function run(){
    regionBar();
    Array.prototype.forEach.call(D.querySelectorAll('.tdz-cur'), function(el){ el.textContent = india ? 'Prices in Indian rupees (₹)' : 'Prices in US dollars (US$)'; });
    if (!india){
      if (IN_PAGE) try { intlClass(); } catch(e){}
      walk(D.body);
      fixLinks(D);
      // keep converting whatever page scripts write later (countdowns, carousels, calculators)
      if ('MutationObserver' in W){
        new MutationObserver(function(ms){
          ms.forEach(function(m){
            if (m.type === 'characterData') walk(m.target);
            else Array.prototype.forEach.call(m.addedNodes, function(n){ walk(n); if (n.nodeType === 1){ fixLinks(n.parentNode || D); } });
          });
        }).observe(D.body, { childList:true, characterData:true, subtree:true });
      }
    }
    try { motion(); } catch (e) {}
    try { capture(); } catch (e) {}
    try { soundUI(); } catch (e) {}
    // footer wordmark: fill the width exactly
    var mk = D.querySelector('.tdz-foot-mark');
    if (mk){
      var fit = function(){ mk.style.fontSize = '100px'; mk.style.display = 'inline-block'; var w = mk.getBoundingClientRect().width || 1; mk.style.display = ''; var avail = mk.parentNode.clientWidth - 2 * parseFloat(getComputedStyle(mk).paddingLeft); mk.style.fontSize = Math.floor(100 * avail / (w - 2 * parseFloat(getComputedStyle(mk).paddingLeft)) * .98) + 'px'; };
      fit(); if (D.fonts && D.fonts.ready) D.fonts.ready.then(fit); W.addEventListener('resize', fit);
    }
    // shared header: mobile menu + border on scroll
    var btn = D.getElementById('tdzMenu'), nav = D.getElementById('tdzNav');
    if (btn){
      var set = function(open){ D.documentElement.classList.toggle('tdz-open', open); btn.setAttribute('aria-expanded', open ? 'true' : 'false'); };
      btn.addEventListener('click', function(){ set(!D.documentElement.classList.contains('tdz-open')); });
      Array.prototype.forEach.call(D.querySelectorAll('#tdzSheet a'), function(a){ a.addEventListener('click', function(){ set(false); }); });
      D.addEventListener('keydown', function(e){ if (e.key === 'Escape') set(false); });
    }
    if (nav){
      var here = location.pathname.replace(/index\.html$/, '');
      Array.prototype.forEach.call(nav.querySelectorAll('.tdz-links a'), function(a){
        var p = a.getAttribute('href').split('#')[0];
        if (p && p !== '/' && here === p) a.setAttribute('aria-current', 'page');
      });
    }
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', run); else run();
})();
