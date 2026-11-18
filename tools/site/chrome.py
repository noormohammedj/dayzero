#!/usr/bin/env python3
"""TheDayZero · one header, one footer, one head block for every page.

Run from the repo root after changing the header, footer or icons:

    python3 tools/site/chrome.py

It rewrites the blocks between <!--tdz:head-->, <!--tdz:nav--> and <!--tdz:foot-->
markers in each page (adding them the first time). Safe to run again and again.
"""
import pathlib, re

ROOT = pathlib.Path(__file__).resolve().parents[2]

# page -> (skin, show shared header + footer, header button)
PAGES = {
    'index.html':                         (None,   True,  'crash'),
    'weekend-founder/index.html':         ('wf',   True,  'os'),
    'weekend-founder/live/index.html':    ('live', True,  'register'),
    'weekend-founder/live/global/index.html': ('live', True, 'register'),
    'weekend-founder/book/index.html':    ('book', True,  'wa'),
    'weekend-founder/free-website/index.html': ('tool', True, 'os'),
    'weekend-founder/read/index.html':    ('read', False, None),
    'founder.html':                       ('about', True, 'crash'),
    'story.html':                         ('about', True, 'crash'),
    'privacy.html':                       ('legal', True, 'crash'),
    'terms.html':                         ('legal', True, 'crash'),
    'thank-you.html':                     (None,   False, None),
}

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900'
         '&family=Schibsted+Grotesk:ital,wght@0,400..800;1,400..600&display=swap">')

HEAD = '''<!--tdz:head-->
<link rel="icon" href="/assets/brand/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/assets/brand/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#FFC800">
{fonts}
<link rel="stylesheet" href="/assets/tdz.css?v=1">
<script src="/assets/tdz.js?v=1"></script>
<!--/tdz:head-->'''

CTA = {
    'crash':    ('/weekend-founder/live/', 'Crash course · ₹199', 'nav_crash'),
    'os':       ('https://rzp.io/rzp/UQYIUZL', 'Get the OS · ₹1,999', 'nav_os'),
    'register': ('#register', 'Save my seat', 'nav_register'),
    'wa':       ('https://wa.me/919629843122?text=Hi%20Noor%2C%20I%20need%20help%20booking%20my%201%3A1%20sessions', 'Help on WhatsApp', 'nav_wa'),
}

def nav(cta):
    href, label, key = CTA[cta]
    ext = ' target="_blank" rel="noopener"' if href.startswith('https://wa.me') else ''
    return f'''<!--tdz:nav-->
<header class="tdz-nav" id="tdzNav">
  <div class="tdz-w">
    <a class="tdz-brand" href="/" aria-label="TheDayZero home"><i aria-hidden="true"></i>TheDayZero</a>
    <nav class="tdz-links" aria-label="Main">
      <a href="/#learn">Courses</a>
      <a href="/weekend-founder/">Weekend Founder</a>
      <a href="/#teams">For organisations</a>
      <a href="/#products">Products</a>
      <a href="/founder.html">Founder</a>
    </nav>
    <a class="tdz-btn tdz-desk" href="{href}" data-cta="{key}"{ext}>{label}</a>
    <button class="tdz-menu" id="tdzMenu" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="tdzSheet"><span></span></button>
  </div>
</header>
<div class="tdz-sheet" id="tdzSheet">
  <a href="/#learn">Courses</a>
  <a href="/weekend-founder/">Weekend Founder</a>
  <a href="/#teams">For organisations</a>
  <a href="/#products">Products</a>
  <a href="/founder.html">Founder</a>
  <a class="tdz-btn ink" href="{href}" data-cta="{key}_menu"{ext}>{label}</a>
</div>
<!--/tdz:nav-->'''

FOOT = '''<!--tdz:foot-->
<footer class="tdz-foot">
  <div class="tdz-w">
    <div class="tdz-foot-top">
      <div>
        <a class="tdz-brand" href="/" aria-label="TheDayZero home"><i aria-hidden="true"></i>TheDayZero</a>
        <p class="tdz-foot-pitch">Hands-on AI coaching from someone who builds with it every weekend. For individuals, colleges, companies and CSR programmes, live online, anywhere in the world.</p>
        <a class="tdz-btn" href="https://wa.me/919629843122?text=Hi%20Noor%2C%20I%20saw%20thedayzero.in" target="_blank" rel="noopener" data-cta="foot_wa">WhatsApp Noor</a>
      </div>
      <div>
        <h3>Learn</h3>
        <ul>
          <li><a href="/weekend-founder/live/">Weekend crash course</a></li>
          <li><a href="/weekend-founder/">Weekend Founder OS</a></li>
          <li><a href="/#learn">1:1 coaching</a></li>
          <li><a href="/weekend-founder/#plans">Group cohort</a></li>
          <li><a href="/weekend-founder/read/">Read a free sample</a></li>
        </ul>
      </div>
      <div>
        <h3>For organisations</h3>
        <ul>
          <li><a href="/#teams">Colleges and universities</a></li>
          <li><a href="/#teams">Corporate teams</a></li>
          <li><a href="/#teams">NGOs and CSR programmes</a></li>
          <li><a href="https://wa.me/919629843122?text=Hi%20Noor%2C%20we%27d%20like%20an%20AI%20programme%20for%20our%20organisation" target="_blank" rel="noopener" data-cta="foot_b2b">Ask for a proposal</a></li>
        </ul>
      </div>
      <div>
        <h3>TheDayZero</h3>
        <ul>
          <li><a href="/founder.html">Founder</a></li>
          <li><a href="/story.html">Our story</a></li>
          <li><a href="https://www.instagram.com/thedayzero.in/" target="_blank" rel="noopener">Instagram</a></li>
          <li><a href="/privacy.html">Privacy</a></li>
          <li><a href="/terms.html">Terms</a></li>
        </ul>
      </div>
    </div>
    <div class="tdz-foot-bottom">
      <span>© 2026 TheDayZero · Coimbatore, India · Live online, worldwide</span>
      <span class="tdz-cur" data-keep-inr>Prices in ₹ in India, US$ everywhere else</span>
    </div>
  </div>
  <div class="tdz-foot-mark" aria-hidden="true">TheDay<span>Zero</span></div>
</footer>
<!--/tdz:foot-->'''

def put(html, tag, block, where):
    rx = re.compile(r'<!--tdz:%s-->.*?<!--/tdz:%s-->\n?' % (tag, tag), re.S)
    if rx.search(html):
        return rx.sub(lambda m: block + '\n', html, count=1)
    return where(html, block)

def before_head_end(html, block):
    i = html.lower().rfind('</head>')
    return html[:i] + block + '\n' + html[i:]

def after_body(html, block):
    m = re.search(r'<body[^>]*>\s*(<!-- Google Tag Manager \(noscript\) -->.*?<!-- End Google Tag Manager \(noscript\) -->\s*|<noscript><iframe[^<]*</iframe></noscript>\s*)?', html, re.S | re.I)
    return html[:m.end()] + block + '\n' + html[m.end():]

def before_body_end(html, block):
    i = html.lower().rfind('</body>')
    return html[:i] + block + '\n' + html[i:]

for rel, (skin, chrome, cta) in PAGES.items():
    p = ROOT / rel
    html = p.read_text(encoding='utf-8')
    # old icon / theme lines: the head block carries the new ones
    html = re.sub(r'[ \t]*<link rel="(?:icon|apple-touch-icon|shortcut icon)"[^>]*>\n?', '', html)
    html = re.sub(r'[ \t]*<meta name="theme-color"[^>]*>\n?', '', html)
    if skin:
        html = re.sub(r'<html([^>]*?)(\sdata-skin="[^"]*")?>', lambda m: '<html%s data-skin="%s">' % (m.group(1), skin), html, count=1)
    has_fonts = 'family=Archivo:wdth' in html.split('<!--tdz:head-->')[0]
    html = put(html, 'head', HEAD.format(fonts='' if has_fonts else FONTS).replace('\n\n', '\n'), before_head_end)
    if chrome:
        html = put(html, 'nav', nav(cta), after_body)
        html = put(html, 'foot', FOOT, before_body_end)
    p.write_text(html, encoding='utf-8')
    print('ok', rel)
