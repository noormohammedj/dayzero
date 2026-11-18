/* TheDayZero · shared behaviour for every page.
   1. Region: visitors in India see ₹, everyone else sees US$ (by the browser's time zone).
      Test with ?region=in or ?region=intl (remembered for the visit).
   2. Every ₹ amount on the page is shown in US$ outside India, using the price list below
      for real prices and a rough rate for anything else.
   3. Outside India, Razorpay links go to WhatsApp (Razorpay doesn't take international cards yet),
      and the ₹199 India workshop links go to the US$9 global workshop.
   4. The shared header's mobile menu. */
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
  var india = force ? force === 'in' : (tz ? (tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta') : /-IN$/i.test(navigator.language || ''));
  var BOT = /bot|crawl|spider|slurp|lighthouse|headless/i.test(navigator.userAgent || '');
  D.documentElement.setAttribute('data-region', india ? 'in' : 'intl');

  /* ---------- 2. prices ---------- */
  // Real prices: INR → USD. Keep in step with Razorpay and the WhatsApp quotes.
  var USD = { 99:2, 199:9, 999:12, 1999:24, 2499:29, 2999:35, 4999:59, 12999:155, 29999:349, 79999:929 };
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
  function waLink(what){
    return 'https://wa.me/' + WA + '?text=' + encodeURIComponent('Hi Noor, I\'m outside India (' + (tz || 'abroad') + ') and I\'d like ' + what + '. How do I pay in US$?');
  }
  function fixLinks(root){
    Array.prototype.forEach.call((root || D).querySelectorAll('a[href]'), function(a){
      var h = a.getAttribute('href');
      if (/rzp\.io\/rzp\//.test(h)){
        var id = (h.match(/rzp\/([A-Za-z0-9]+)/) || [])[1];
        a.setAttribute('data-rzp', h);
        a.setAttribute('href', waLink(PAY[id] || 'to join'));
        a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener');
      } else if (/^(https:\/\/thedayzero\.in)?\/weekend-founder\/live\/?(#.*)?$/.test(h)){
        a.setAttribute('href', '/weekend-founder/live/global/' + (h.split('#')[1] ? '#' + h.split('#')[1] : ''));
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
    W.open(waLink(PAY[id] || 'to join'), '_blank', 'noopener');
  }, true);

  // The India workshop and the global workshop each send the other region to its own page.
  var path = location.pathname.replace(/index\.html$/, '');
  var stay = /[?&]stay=1/.test(location.search) || force;
  if (!BOT && !stay){
    if (!india && path === '/weekend-founder/live/'){ location.replace('/weekend-founder/live/global/' + location.search + location.hash); return; }
    if (india && path === '/weekend-founder/live/global/'){ location.replace('/weekend-founder/live/' + location.search + location.hash); return; }
  }

  W.TDZ = { india:india, tz:tz, money:money, usd:toUsd, wa:waLink, convert:convertText };

  function run(){
    if (!india){
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
        if (p && p !== '/' && here.indexOf(p) === 0) a.setAttribute('aria-current', 'page');
      });
    }
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', run); else run();
})();
