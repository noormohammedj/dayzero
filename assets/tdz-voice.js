/* TheDayZero voice assistant ("Ask Noor's AI").
   Free and on-device: speech in through the browser's SpeechRecognition (Chrome, Edge, Safari),
   speech out through speechSynthesis. No API key, no server, nothing recorded or stored.
   Where the browser can't listen (Firefox, some in-app browsers) the visitor types instead.
   Answers come from the KB below: edit the facts there when prices, times or offers change.
   Load after tdz.js:  <script src="/assets/tdz-voice.js?v=1" defer></script> */
(function(){
  'use strict';
  var D = document, W = window;
  if (D.getElementById('tdzVa') || /^\/(weekend-founder\/read|admin)\//.test(location.pathname)) return;
  var T = W.TDZ || {}, india = T.india !== false;
  function money(n){ return T.money ? T.money(n) : '₹' + n.toLocaleString('en-IN'); }
  function track(n, p){ try { if (W.gtag) gtag('event', n, p || {}); } catch(e){} }
  var WA = 'https://wa.me/919629843122?text=';
  var RISE = new Date('2026-12-05T10:00:00+05:30'), pre = Date.now() < +RISE;
  var CLASS = pre ? 199 : 499;
  function nextSat(){
    var t = new Date(), ist = new Date(t.getTime() + 330 * 60000), add = (6 - ist.getUTCDay() + 7) % 7;
    var s = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + add, 11, 0) - 330 * 60000;
    if (t.getTime() > s - 3600000) s += 7 * 864e5;
    return new Date(s);
  }
  var sat = nextSat();
  var satIST = sat.toLocaleDateString('en-GB', {timeZone:'Asia/Kolkata', weekday:'long', day:'numeric', month:'long'});
  var satLocal = ''; try { satLocal = sat.toLocaleString('en-GB', {weekday:'long', hour:'numeric', minute:'2-digit'}); } catch(e){}
  var classPrice = india ? money(CLASS) : 'US$9';
  var BOOK = india ? '/weekend-founder/live/#register' : WA + encodeURIComponent('Hi Noor, I\'d like a seat in the Saturday AI class (US$9). How do I pay?');

  /* Knowledge base: [keywords, answer]. The highest keyword score wins. */
  var KB = [
    [['when','time','date','day','saturday','schedule','timing','start','next'],
      'The class is live every Saturday, 11 AM to 12 PM India time. The next one is ' + satIST + (india ? '' : ', which is ' + satLocal + ' your time') + '.'],
    [['price','cost','fee','fees','much','pay','charge','rupees','dollar','money','₹199','499','cheap','expensive'],
      india ? (pre ? 'It is ₹199 for the one-hour live class, but Saturday 5 December is the last class at that price. From 12 December it is ₹499, so book the 5 December class now to lock in ₹199.' : 'The class is ₹499 for one live hour, paid on Razorpay with UPI, card or net banking.')
            : 'Outside India it is 9 US dollars. You book on WhatsApp and Noor sends you a way to pay.'],
    [['what','learn','build','website','outcome','get','teach','cover','syllabus','topics'],
      'In one hour you build your own one-page website with Claude or ChatGPT, live, step by step. You keep the exact prompts, and in the last part Noor shows how to price it and sell one to a local business.'],
    [['code','coding','programming','developer','technical','beginner','experience','skills','know'],
      'No coding needed. You describe what you want in plain words and the AI writes it. Noor built a full iOS and Android app this way.'],
    [['where','online','zoom','meet','google','link','join','offline','location','venue'],
      'It is live online on Google Meet. After you pay, the Meet link comes to your email and WhatsApp.'],
    [['language','tamil','english','hindi'],
      'Noor teaches in English, with Tamil wherever it helps. You can ask questions in either.'],
    [['need','bring','laptop','phone','mobile','prepare','requirement','account'],
      'Bring a laptop if you can, a phone also works. Make a free Claude or ChatGPT account, and write five lines about yourself. The template comes on WhatsApp.'],
    [['refund','cancel','miss','reschedule','attend','cant','can\'t','busy'],
      'If you can\'t make it, message Noor on WhatsApp before the class starts for a refund or a seat the next Saturday.'],
    [['recording','record','replay','video','later'],
      'Please come live, the point is building alongside Noor. If a replay is shared, it goes only to that week\'s attendees.'],
    [['who','noor','teacher','trainer','instructor','founder','about','experience'],
      'Noor Mohammed J has 16 years in tech and still works a full-time job. On weekends he built four live products with AI: Murugaaa, Mentell, Plotskart and MandapKart. Together they earn ' + (india ? '₹50,000 to ₹75,000' : 'around 600 to 900 US dollars') + ' a month.'],
    [['one','1:1','personal','private','individual','mentor','coaching','own','product','startup','idea'],
      'For your own product, there is 1:1 coaching: four live sessions with Noor on weekend slots you pick, ' + money(4999) + ' instead of ' + money(9999) + '. You build until it is live and taking payments.'],
    [['business','shop','company','sme','owner','clinic','store','automation'],
      'For business owners there is AI for your business, ' + money(31999) + ' instead of ' + money(79999) + '. Noor sets up your website, lead capture, WhatsApp auto-replies, marketing videos and an AI assistant, and trains your team.'],
    [['college','school','students','staff','team','corporate','institution','group','training','workshop','faculty','csr','ngo'],
      'Noor runs group AI training for schools, colleges and companies, on-site in Tamil Nadu or online anywhere. Message Noor on WhatsApp or email noormohammed.j@gmail.com for a plan.'],
    [['agent','assistant','bot','voice','you','yourself','made','built','ai'],
      'I am a voice assistant Noor built with AI. In the Saturday class you start learning the same way of building, so you may be able to build agents like me to work for you too.'],
    [['seats','full','limit','how many','people','batch','size'],
      'Google Meet holds up to 100 people, and once the room is full, booking closes for that Saturday.'],
    [['contact','whatsapp','email','call','phone number','reach','talk'],
      'You can WhatsApp Noor on plus 91 96298 43122, or email noormohammed.j@gmail.com.'],
    [['book','register','enroll','enrol','signup','sign','seat','buy','join class','ready'],
      'Great. Tap Book my seat below and it takes about a minute.']
  ];
  var PITCH = 'Noor built this assistant with AI. In the Saturday class you can start building your own. Don\'t wait to build your AI agent. Book your class now.';
  var GREET = 'Hi, I\'m Noor\'s AI assistant. Noor built me for TheDayZero, and you can build one like me through the course. Ask me anything about the Saturday class: time, price, what you\'ll build, or anything else.';
  var STOP = /\b(the|a|an|is|are|do|does|i|me|my|can|will|to|of|for|in|on|it|this|that|there|what's|whats|please|tell|about)\b/g;

  function answer(q){
    var s = ' ' + q.toLowerCase().replace(/[?.!,]/g, ' ') + ' ', best = null, top = 0;
    KB.forEach(function(row, i){
      var sc = 0;
      row[0].forEach(function(k){ if (s.indexOf(k.length < 4 ? ' ' + k + ' ' : k) > -1) sc += k.length < 4 ? 1.5 : 1 + k.length / 10; });
      if (i === 2 && /\b(what|how)\b/.test(s) && sc < 2.2) sc *= .6; // "what" alone is weak
      if (sc > top){ top = sc; best = row[1]; }
    });
    if (!best || top < 1) return 'I\'m not sure about that one. Noor can answer it on WhatsApp. For the class: it\'s live every Saturday at 11 AM India time, ' + classPrice + ', and you build a real website with AI.';
    return best;
  }

  /* ---------- UI ---------- */
  var css = D.createElement('style');
  css.textContent = [
    /* Noor's face as the button: tap the avatar to talk */
    '.tdz-va-fab{position:fixed;z-index:930;right:20px;bottom:24px;width:78px;height:78px;padding:0;border:0;background:none;cursor:pointer;-webkit-tap-highlight-color:transparent}',
    '.tdz-va-fab .av{position:relative;display:block;width:100%;height:100%;border-radius:50%;animation:tdzVaBob 3.2s ease-in-out infinite}',
    '.tdz-va-fab img{display:block;width:100%;height:100%;border-radius:50%;object-fit:cover;border:3px solid #141414;box-shadow:0 0 0 4px #FFC800,0 0 0 5.5px #141414,0 18px 36px -14px rgba(60,40,0,.65);transition:transform .35s cubic-bezier(.16,1,.3,1)}',
    '.tdz-va-fab:hover img{transform:scale(1.06) rotate(-3deg)}',
    '.tdz-va-fab:active img{transform:scale(.96)}',
    '.tdz-va-fab:focus-visible{outline:none}.tdz-va-fab:focus-visible img{box-shadow:0 0 0 4px #FFC800,0 0 0 7px #141414}',
    '.tdz-va-fab .rg{position:absolute;inset:0;border-radius:50%;border:3px solid #FFC800;animation:tdzVaRing 2.6s cubic-bezier(.16,1,.3,1) infinite;pointer-events:none}',
    '.tdz-va-fab .rg + .rg{animation-delay:1.3s}',
    '.tdz-va-fab .on{position:absolute;right:3px;top:5px;width:16px;height:16px;border-radius:50%;background:#1fbf5b;border:3px solid #fff;box-shadow:0 0 0 1.5px #141414}',
    '.tdz-va-fab .tk{position:absolute;left:50%;bottom:-11px;transform:translateX(-50%);display:inline-flex;align-items:center;gap:5px;white-space:nowrap;padding:4px 10px;border-radius:999px;background:#141414;color:#FFC800;font:800 11.5px/1 "Schibsted Grotesk",system-ui,sans-serif;letter-spacing:.02em}',
    '.tdz-va-fab .tk i{display:inline-flex;gap:2px;align-items:center;height:10px}',
    '.tdz-va-fab .tk i b{display:block;width:2px;height:100%;border-radius:2px;background:#FFC800;animation:tdzVaBar 1s ease-in-out infinite}',
    '.tdz-va-fab .tk i b:nth-child(2){animation-delay:.2s}.tdz-va-fab .tk i b:nth-child(3){animation-delay:.4s}',
    '@keyframes tdzVaRing{0%{transform:scale(1);opacity:.9}100%{transform:scale(1.55);opacity:0}}',
    '@keyframes tdzVaBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}',
    '@keyframes tdzVaBar{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}',
    '@keyframes tdzVaPing{0%{transform:scale(.85);opacity:.6}80%,100%{transform:scale(1.35);opacity:0}}',
    '@media (max-width:860px){.tdz-va-fab .tk{left:auto;right:-4px;transform:none;font-size:11px;padding:4px 8px}html[data-has-mcta] .tdz-va-fab{bottom:92px}html[data-has-mcta] .tdz-va-tip{bottom:88px}.tdz-va-fab{width:68px;height:68px;right:16px}}',
    /* sticky callout with an arrow pointing at the button */
    '.tdz-va-tip{position:fixed;z-index:929;right:20px;bottom:20px;width:min(270px,calc(100vw - 40px));padding:12px 34px 12px 14px;margin-bottom:126px;background:#fff;color:#141414;border:1.5px solid #141414;border-radius:18px;box-shadow:5px 5px 0 #FFC800;font:500 13.5px/1.4 "Schibsted Grotesk",system-ui,sans-serif;animation:tdzVaTipIn .6s cubic-bezier(.16,1,.3,1) both}',
    '.tdz-va-tip b{display:block;font-weight:800;font-size:14px;margin-bottom:2px}',
    '.tdz-va-tip svg.ar{position:absolute;right:26px;bottom:-46px;width:30px;height:42px;color:#141414;animation:tdzVaPoint 1.6s ease-in-out infinite}',
    '.tdz-va-tip button{position:absolute;top:6px;right:6px;width:26px;height:26px;border:0;border-radius:50%;background:transparent;color:#6b675d;font:700 17px/1 system-ui;cursor:pointer}',
    '.tdz-va-tip button:hover{background:#FFF4C2;color:#141414}',
    '.tdz-va-tip.off{display:none}',
    '@keyframes tdzVaTipIn{from{opacity:0;transform:translateY(10px)}}',
    '@keyframes tdzVaPoint{0%,100%{transform:translateY(0)}50%{transform:translateY(5px)}}',
    '@media (max-width:860px){.tdz-va-tip{right:16px;margin-bottom:122px;width:min(250px,calc(100vw - 40px));font-size:13px}}',
    '.tdz-va{position:fixed;z-index:960;right:20px;bottom:20px;width:min(400px,calc(100vw - 32px));max-height:calc(100dvh - 40px);display:flex;flex-direction:column;background:#fff;color:#141414;border:1.5px solid #141414;border-radius:26px;box-shadow:0 30px 70px -28px rgba(60,40,0,.55),8px 8px 0 #FFC800;font-family:"Schibsted Grotesk",system-ui,sans-serif;transform:translateY(24px) scale(.98);opacity:0;pointer-events:none;transition:transform .45s cubic-bezier(.16,1,.3,1),opacity .25s}',
    '.tdz-va.on{transform:none;opacity:1;pointer-events:auto}',
    '@media (max-width:620px){.tdz-va{right:0;left:0;bottom:0;width:100%;border-radius:24px 24px 0 0;border-width:1.5px 0 0;box-shadow:0 -20px 50px -20px rgba(60,40,0,.45)}}',
    '.tdz-va-h{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px 18px 10px}',
    '.tdz-va-h .tdz-va-who{display:flex;align-items:center;gap:12px;min-width:0}',
    '.tdz-va-h .tdz-va-hav{position:relative;flex:none;width:48px;height:48px;border-radius:50%}',
    '.tdz-va-h .tdz-va-hav img{width:100%;height:100%;border-radius:50%;object-fit:cover;border:2px solid #141414;box-shadow:0 0 0 3px #FFC800}',
    '.tdz-va-h .tdz-va-hav::after{content:"";position:absolute;inset:-3px;border-radius:50%;border:3px solid #FFC800;opacity:0}',
    '.tdz-va.talking .tdz-va-h .tdz-va-hav::after{animation:tdzVaRing 1.1s cubic-bezier(.16,1,.3,1) infinite}',
    '.tdz-va-h b{font-family:Archivo,"Arial Black",sans-serif;font-stretch:112%;font-weight:850;font-size:19px;letter-spacing:-.02em}',
    '.tdz-va-h small{display:block;font-size:12.5px;color:#6f6b62}',
    '.tdz-va-x{width:36px;height:36px;border-radius:50%;border:1.5px solid #ece7d8;background:#fff;font-size:18px;line-height:1;cursor:pointer}',
    '.tdz-va-log{flex:1;overflow:auto;padding:4px 18px 10px;display:flex;flex-direction:column;gap:8px;min-height:120px;max-height:340px}',
    '.tdz-va-m{max-width:88%;padding:10px 14px;border-radius:18px;font-size:15px;line-height:1.4;animation:tdzVaIn .35s cubic-bezier(.16,1,.3,1)}',
    '@keyframes tdzVaIn{from{opacity:0;transform:translateY(6px)}}',
    '.tdz-va-m.bot{background:#FFFBEA;border:1px solid #ece7d8;border-bottom-left-radius:6px}',
    '.tdz-va-m.me{align-self:flex-end;background:#141414;color:#fff;border-bottom-right-radius:6px}',
    '.tdz-va-pitch{background:#FFC800;border-radius:18px;padding:14px;font-size:14.5px;line-height:1.4}',
    '.tdz-va-pitch b{display:block;font-size:15.5px;margin-bottom:8px}',
    '.tdz-va-lead{display:grid;gap:8px;background:#fff;border:1.5px solid #141414;border-radius:18px;padding:14px;font-size:14.5px;line-height:1.4}',
    '.tdz-va-lead input{min-height:44px;border:1.5px solid #d9d3c2;border-radius:12px;padding:0 12px;font:15px "Schibsted Grotesk",system-ui,sans-serif;color:#141414}',
    '.tdz-va-lead input:focus{outline:none;border-color:#141414}',
    '.tdz-va-lead button{min-height:44px;border:0;border-radius:999px;background:#141414;color:#fff;font:800 14.5px "Schibsted Grotesk",system-ui,sans-serif;cursor:pointer}',
    '.tdz-va-lead .err{margin:0;color:#b3261e;font-size:13px;font-weight:600}',
    '.tdz-va-pitch a{display:inline-flex;align-items:center;min-height:44px;padding:0 18px;border-radius:999px;background:#141414;color:#fff;font-weight:800;text-decoration:none}',
    '.tdz-va-chips{display:flex;gap:6px;overflow-x:auto;padding:0 18px 10px;scrollbar-width:none}',
    '.tdz-va-chips button{flex:none;font:700 13px inherit;font-family:inherit;padding:7px 11px;border-radius:999px;border:1.5px solid #ece7d8;background:#fff;color:#141414;cursor:pointer}',
    '.tdz-va-chips button:hover{border-color:#141414}',
    '.tdz-va-in{display:flex;align-items:center;gap:8px;padding:10px 12px 14px;border-top:1px solid #ece7d8}',
    '.tdz-va-in input{flex:1;min-width:0;min-height:46px;border:1.5px solid #d9d3c2;border-radius:999px;padding:0 16px;font:15px inherit;font-family:inherit;color:#141414}',
    '.tdz-va-in input:focus{outline:none;border-color:#141414}',
    '.tdz-va-mic{flex:none;width:54px;height:54px;border-radius:50%;border:0;background:#141414;color:#FFC800;display:grid;place-items:center;cursor:pointer;position:relative}',
    '.tdz-va-mic.rec{background:#e0362c;color:#fff}',
    '.tdz-va-mic.rec::after{content:"";position:absolute;inset:-6px;border-radius:50%;border:3px solid #e0362c;animation:tdzVaPing 1.2s infinite}',
    '.tdz-va-send{flex:none;min-height:46px;padding:0 14px;border-radius:999px;border:1.5px solid #141414;background:#fff;font:800 14px inherit;font-family:inherit;cursor:pointer}',
    '.tdz-va-wave{display:flex;gap:3px;align-items:center;height:16px;margin-left:6px}',
    '.tdz-va-wave i{width:3px;height:100%;border-radius:2px;background:#141414;animation:tdzVaWave .9s ease-in-out infinite}',
    '.tdz-va-wave i:nth-child(2){animation-delay:.15s}.tdz-va-wave i:nth-child(3){animation-delay:.3s}',
    '@keyframes tdzVaWave{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}',
    '.tdz-va-fine{padding:0 18px 12px;font-size:11.5px;color:#6f6b62}',
    '@media (prefers-reduced-motion:reduce){.tdz-va,.tdz-va-fab,.tdz-va-m{transition:none;animation:none}.tdz-va-fab .av,.tdz-va-fab .rg,.tdz-va-fab .tk i b,.tdz-va-mic.rec::after,.tdz-va-wave i,.tdz-va-tip,.tdz-va-tip svg.ar{animation:none}}',
    '@media print{.tdz-va,.tdz-va-fab,.tdz-va-tip{display:none!important}}'
  ].join('\n');
  D.head.appendChild(css);

  var MIC = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 2m0 3a3 3 0 0 1 3-3a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3a3 3 0 0 1-3-3z"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M8 21l8 0"/><path d="M12 17l0 4"/></svg>';
  var AV = '/assets/noor-avatar.webp';
  var fab = D.createElement('button');
  fab.type = 'button'; fab.className = 'tdz-va-fab'; fab.id = 'tdzVaFab';
  fab.innerHTML = '<span class="av"><span class="rg" aria-hidden="true"></span><span class="rg" aria-hidden="true"></span><img src="' + AV + '" alt="" width="78" height="78"><span class="on" aria-hidden="true"></span>' +
    '<span class="tk" aria-hidden="true"><i><b></b><b></b><b></b></i>Tap to talk</span></span>';
  fab.setAttribute('aria-label', 'Talk to Noor\'s AI about the class');

  var box = D.createElement('div');
  box.className = 'tdz-va'; box.id = 'tdzVa'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Noor\'s AI assistant');
  box.innerHTML =
    '<div class="tdz-va-h"><div class="tdz-va-who"><span class="tdz-va-hav"><img src="' + AV + '" alt="" width="48" height="48"></span><div><b>Noor\'s AI</b><small id="tdzVaSt">Built by Noor for TheDayZero. Ask by voice or text.</small></div></div><button class="tdz-va-x" type="button" aria-label="Close">×</button></div>' +
    '<div class="tdz-va-log" id="tdzVaLog" aria-live="polite"></div>' +
    '<div class="tdz-va-chips" id="tdzVaChips"></div>' +
    '<form class="tdz-va-in" id="tdzVaForm"><button class="tdz-va-mic" id="tdzVaMic" type="button" aria-label="Tap to talk">' + MIC + '</button>' +
    '<label class="sr" for="tdzVaQ" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Your question</label><input id="tdzVaQ" type="text" autocomplete="off" placeholder="Or type your question"><button class="tdz-va-send" type="submit">Ask</button></form>' +
    '<p class="tdz-va-fine">Answers come from TheDayZero\'s class details. Your voice is turned into text by your browser and isn\'t stored.</p>';

  var tip = D.createElement('div');
  tip.className = 'tdz-va-tip'; tip.id = 'tdzVaTip';
  tip.innerHTML = '<b>Hi, I\'m Noor\'s AI. Tap my face to talk.</b>Noor built me for TheDayZero. You can build an agent like me through the course.' +
    '<svg class="ar" viewBox="0 0 30 42" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2c-4 12 2 24 10 36"/><path d="M8 32l10 6 3-11"/></svg>' +
    '<button type="button" aria-label="Hide this note">×</button>';
  try { if (sessionStorage.getItem('tdz_va_tip') === '0') tip.classList.add('off'); } catch(e){}
  tip.addEventListener('click', function(e){
    if (e.target.closest('button')){ tip.classList.add('off'); try { sessionStorage.setItem('tdz_va_tip', '0'); } catch(err){} track('voice_agent_tip_hide'); return; }
    open();
  });
  tip.style.cursor = 'pointer';
  function mount(){ D.body.appendChild(tip); D.body.appendChild(fab); D.body.appendChild(box); }
  if (D.body) mount(); else D.addEventListener('DOMContentLoaded', mount);

  var log = box.querySelector('#tdzVaLog'), st = box.querySelector('#tdzVaSt'), input = box.querySelector('#tdzVaQ'), mic = box.querySelector('#tdzVaMic');
  var asked = 0, pitched = false, opened = false, asks = [];

  ['When is the next class?', 'How much is it?', 'What will I build?', 'Do I need coding?', 'Who built you?', '1:1 coaching?'].forEach(function(q){
    var b = D.createElement('button'); b.type = 'button'; b.textContent = q;
    b.addEventListener('click', function(){ ask(q, 'chip'); });
    box.querySelector('#tdzVaChips').appendChild(b);
  });

  /* speech out */
  var synth = W.speechSynthesis, voice = null;
  function pickVoice(){
    if (!synth) return;
    var vs = synth.getVoices() || [];
    var pref = india ? [/en-IN/i, /en-GB/i, /en-US/i] : [/en-GB/i, /en-US/i, /en-IN/i];
    for (var i = 0; i < pref.length && !voice; i++) voice = vs.filter(function(v){ return pref[i].test(v.lang); })[0] || null;
  }
  if (synth){ pickVoice(); if (synth.addEventListener) synth.addEventListener('voiceschanged', pickVoice); }
  function say(text){
    if (!synth) return;
    try { synth.cancel(); var u = new SpeechSynthesisUtterance(text.replace(/₹/g, ' rupees ').replace(/1:1/g, 'one to one')); if (voice) u.voice = voice; u.onstart = function(){ box.classList.add('talking'); }; u.onend = u.onerror = function(){ box.classList.remove('talking'); }; u.lang = voice ? voice.lang : 'en-IN'; u.rate = 1.02; synth.speak(u); } catch(e){}
  }

  function add(text, who){
    var m = D.createElement('div'); m.className = 'tdz-va-m ' + who; m.textContent = text; log.appendChild(m); log.scrollTop = log.scrollHeight; return m;
  }
  function pitch(){
    if (pitched) return; pitched = true;
    var p = D.createElement('div'); p.className = 'tdz-va-pitch';
    p.innerHTML = '<b>Noor built this assistant with AI.</b>By attending the Saturday class, you may be able to build agents like this to work for you. Don\'t wait to build your AI agent.<br><br>';
    var a = D.createElement('a'); a.href = BOOK; a.textContent = 'Book my seat · ' + classPrice + ' →'; a.setAttribute('data-cta', 'voice_agent_book');
    if (/^https:\/\/wa\.me/.test(BOOK)){ a.target = '_blank'; a.rel = 'noopener'; }
    a.addEventListener('click', function(){ track('voice_agent_book', {asked:asked}); close(); });
    p.appendChild(a); log.appendChild(p);
    /* lead capture: name + WhatsApp, straight to the lead sheet via TDZ.lead */
    var f = D.createElement('form'); f.className = 'tdz-va-lead'; f.noValidate = true;
    f.innerHTML = '<b>Not ready to book? Get the class details on WhatsApp.</b>' +
      '<input name="n" type="text" autocomplete="name" placeholder="Your name" aria-label="Your name">' +
      '<input name="w" type="tel" inputmode="tel" autocomplete="tel" placeholder="' + (india ? 'WhatsApp number' : 'WhatsApp with country code') + '" aria-label="WhatsApp number">' +
      '<p class="err" hidden>Please add your name and a WhatsApp number.</p><button type="submit">Send me the details</button>';
    f.addEventListener('submit', function(e){
      e.preventDefault();
      var n = f.n.value.trim(), w = f.w.value.trim(), dg = w.replace(/\D/g, '');
      if (n.length < 2 || dg.length < 8 || (india && !/^\+/.test(w) && dg.length !== 10 && !/^91\d{10}$/.test(dg))){ f.querySelector('.err').hidden = false; return; }
      var phone = /^\+/.test(w) ? '+' + dg : (dg.length === 10 ? (india ? '+91' : '+') + dg : '+' + dg);
      try { if (W.TDZ && W.TDZ.lead) W.TDZ.lead({ name:n, phone:phone, interest:'class', source:'voice_agent', note:asks.join(' | ') }); } catch(err){}
      track('voice_agent_lead', {asked:asked});
      f.innerHTML = '<b>Thanks, ' + n.replace(/[<>&"]/g, '') + '.</b>Noor will send the class details on WhatsApp soon.';
      var m = 'Thanks ' + n + '. Noor will send you the class details on WhatsApp soon.'; say(m);
    });
    log.appendChild(f); log.scrollTop = log.scrollHeight;
  }
  function ask(q, how){
    q = (q || '').trim(); if (!q) return;
    add(q, 'me'); asked++; asks.push(q.slice(0, 60));
    var a = answer(q);
    setTimeout(function(){
      add(a, 'bot');
      var extra = (asked === 2 && !pitched) ? ' ' + PITCH : '';
      say(a + extra);
      if (asked >= 2 || /book|register|seat|join/i.test(q)) pitch();
    }, 260);
    track('voice_agent_question', {how:how, n:asked});
  }

  /* speech in */
  var SR = W.SpeechRecognition || W.webkitSpeechRecognition, rec = null, listening = false;
  if (!SR){ mic.hidden = true; input.placeholder = 'Type your question'; }
  function setListening(on){
    listening = on; mic.classList.toggle('rec', on);
    st.innerHTML = on ? 'Listening<span class="tdz-va-wave" aria-hidden="true"><i></i><i></i><i></i></span>' : 'Built by Noor for TheDayZero. Ask by voice or text.';
  }
  mic.addEventListener('click', function(){
    if (!SR) return;
    if (listening){ try { rec.stop(); } catch(e){} return; }
    if (synth) synth.cancel();
    rec = new SR(); rec.lang = india ? 'en-IN' : (navigator.language || 'en-US'); rec.interimResults = true; rec.maxAlternatives = 1;
    var finalText = '', live = null;
    rec.onresult = function(e){
      var t = ''; for (var i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      input.value = t; if (e.results[e.results.length - 1].isFinal) finalText = t;
    };
    rec.onerror = function(e){ setListening(false); if (e.error === 'not-allowed' || e.error === 'service-not-allowed'){ add('I can\'t hear you: the microphone is blocked. You can type your question instead.', 'bot'); } };
    rec.onend = function(){ setListening(false); var t = finalText || input.value; input.value = ''; if (t) ask(t, 'voice'); };
    try { rec.start(); setListening(true); track('voice_agent_mic'); } catch(e){ setListening(false); }
  });
  box.querySelector('#tdzVaForm').addEventListener('submit', function(e){ e.preventDefault(); var q = input.value; input.value = ''; ask(q, 'text'); });

  function open(){
    box.classList.add('on'); fab.style.visibility = 'hidden'; tip.style.visibility = 'hidden';
    if (!opened){ opened = true; add(GREET, 'bot'); say(GREET); }
    track('voice_agent_open');
    setTimeout(function(){ (SR ? mic : input).focus(); }, 300);
  }
  function close(){ box.classList.remove('on', 'talking'); fab.style.visibility = ''; tip.style.visibility = ''; if (synth) synth.cancel(); if (listening && rec) try { rec.stop(); } catch(e){} }
  fab.addEventListener('click', open);
  box.querySelector('.tdz-va-x').addEventListener('click', close);
  D.addEventListener('keydown', function(e){ if (e.key === 'Escape' && box.classList.contains('on')) close(); });
  D.addEventListener('click', function(e){ var t = e.target.closest && e.target.closest('[data-voice]'); if (t){ e.preventDefault(); open(); } });
  W.TDZ = W.TDZ || {}; W.TDZ.voice = { open:open, answer:answer };
})();
