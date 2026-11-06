/* Fonctions communes : mode sombre, recherche, haut de page, progression, copier, imprimer, UTM, confirmations. Aucune donnée envoyée. */
(function () {
  var root = document.documentElement, me = document.currentScript, cfg = (me && me.dataset) || {};
  var V = (me && me.src.split('?')[1]) || 'v=1';
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  if (get('ux-theme') === 'dark') root.setAttribute('data-theme', 'dark');
  var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/ux.css?' + V; document.head.appendChild(css);

  /* UTM : gardés le temps de la visite, ajoutés aux formulaires */
  var UK = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'], utm = {};
  try {
    var q = new URLSearchParams(location.search);
    utm = JSON.parse(sessionStorage.getItem('ux-utm') || '{}');
    UK.forEach(function (k) { if (q.get(k)) utm[k] = q.get(k).slice(0, 120); });
    sessionStorage.setItem('ux-utm', JSON.stringify(utm));
  } catch (e) {}

  function el(tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt) n.textContent = txt; return n; }
  function ico(p) { return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }
  function btn(cls, label, svg) { var b = el('button', cls); b.type = 'button'; b.setAttribute('aria-label', label); b.title = label; b.innerHTML = svg; return b; }
  var SUN = ico('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>');
  var MOON = ico('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>');
  var LOUPE = ico('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>');

  function ask(texte, oui, non, ok) {
    var d = el('dialog', 'ux-dlg'), p = el('p', '', texte), r = el('div', 'ux-row');
    var a = el('button', 'ux-b', non), b = el('button', 'ux-b ux-main', oui);
    a.type = b.type = 'button'; r.appendChild(a); r.appendChild(b); d.appendChild(p); d.appendChild(r); document.body.appendChild(d);
    function fin() { d.close(); d.remove(); }
    a.onclick = fin; b.onclick = function () { fin(); ok(); };
    d.addEventListener('cancel', function () { d.remove(); });
    d.showModal();
  }

  function norm(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function search(host) {
    var d = el('dialog', 'ux-search'), f = el('div', 'ux-s-top'), inp = el('input'), x = el('button', 'ux-b', 'Fermer'), res = el('div', 'ux-s-res'), idx = null;
    d.setAttribute('aria-label', 'Rechercher sur le site');
    inp.type = 'search'; inp.placeholder = 'Rechercher sur le site'; inp.setAttribute('aria-label', 'Rechercher sur le site'); x.type = 'button';
    res.setAttribute('aria-live', 'polite');
    f.appendChild(inp); f.appendChild(x); d.appendChild(f); d.appendChild(res); document.body.appendChild(d);
    x.onclick = function () { d.close(); };
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    function show() {
      var v = norm(inp.value).trim(); res.textContent = '';
      if (!idx) { res.appendChild(el('div', 'ux-spin')); return; }
      if (v.length < 2) { res.appendChild(el('p', 'ux-s-info', 'Tapez au moins 2 lettres.')); return; }
      var mots = v.split(/\s+/), out = idx.map(function (p) {
        var t = norm(p.t), h = norm(p.h), o = norm(p.d), s = 0;
        for (var i = 0; i < mots.length; i++) { var m = mots[i], c = (t.indexOf(m) > -1 ? 5 : 0) + (h.indexOf(m) > -1 ? 2 : 0) + (o.indexOf(m) > -1 ? 1 : 0); if (!c) return null; s += c; }
        return { p: p, s: s };
      }).filter(Boolean).sort(function (a, b) { return b.s - a.s; }).slice(0, 8);
      if (!out.length) { res.appendChild(el('p', 'ux-s-info', 'Aucun résultat.')); return; }
      out.forEach(function (r) { var a = el('a', 'ux-s-item'); a.href = r.p.u; a.appendChild(el('strong', '', r.p.t)); a.appendChild(el('span', '', r.p.d)); res.appendChild(a); });
    }
    inp.addEventListener('input', show);
    var b = btn('ux-tool', 'Rechercher sur le site', LOUPE);
    b.onclick = function () {
      d.showModal(); inp.focus(); show();
      if (!idx) fetch('/search-index.json?' + V).then(function (r) { return r.json(); }).then(function (j) { idx = j; show(); }).catch(function () { res.textContent = ''; res.appendChild(el('p', 'ux-s-info', 'La recherche est indisponible pour le moment.')); });
    };
    host.appendChild(b);
  }

  /* Mode sombre : éclaircit les textes dont la couleur est écrite en dur */
  function lum(c) { var m = c.match(/[\d.]+/g); if (!m || (m[3] !== undefined && +m[3] === 0)) return null; return 0.3 * m[0] + 0.59 * m[1] + 0.11 * m[2]; }
  function fond(e) { for (; e && e.nodeType === 1; e = e.parentElement) { var l = lum(getComputedStyle(e).backgroundColor); if (l !== null) return l; } return 255; }
  function lisible() {
    var tous = document.querySelectorAll('.ux-lite'), i;
    for (i = 0; i < tous.length; i++) tous[i].classList.remove('ux-lite');
    if (root.getAttribute('data-theme') !== 'dark') return;
    var n = document.body.querySelectorAll('*');
    for (i = 0; i < n.length; i++) {
      var e = n[i], t = false, c = e.childNodes;
      for (var k = 0; k < c.length; k++) if (c[k].nodeType === 3 && c[k].textContent.trim()) { t = true; break; }
      if (t && lum(getComputedStyle(e).color) < 125 && fond(e) < 110) e.classList.add('ux-lite');
    }
  }

  function ready() {
    var body = document.body, main = document.querySelector('main') || document.querySelector('.page') || body;
    var brand = document.querySelector('.brand'), tn = document.querySelector('.topnav');
    if (brand && tn && brand.parentNode === tn.parentNode) {
      var hb = el('header', 'ux-bar'); brand.parentNode.insertBefore(hb, brand); hb.appendChild(brand); hb.appendChild(tn);
    }
    if (document.querySelector('.wa-float')) body.classList.add('ux-has-wa');
    var head = document.querySelector('.ux-bar') || document.querySelector('header .wrap') || document.querySelector('header .container') || document.querySelector('header');

    /* Lien d'évitement */
    if (!document.querySelector('a[href="#contenu"], .skip, .skip-link')) {
      if (!main.id) main.id = 'contenu';
      var sk = el('a', 'ux-skip', 'Aller au contenu'); sk.href = '#' + main.id; body.insertBefore(sk, body.firstChild);
    }

    /* Boutons d'en-tête */
    var tools = el('div', 'ux-tools');
    search(tools);
    var th = btn('ux-tool', 'Changer de thème', root.getAttribute('data-theme') === 'dark' ? SUN : MOON);
    th.onclick = function () {
      var dk = root.getAttribute('data-theme') !== 'dark';
      if (dk) root.setAttribute('data-theme', 'dark'); else root.removeAttribute('data-theme');
      set('ux-theme', dk ? 'dark' : 'light'); th.innerHTML = dk ? SUN : MOON;
      setTimeout(lisible, 60);
    };
    tools.appendChild(th);
    if (tn) {
      var mb = el('button', 'ux-b ux-menu', 'Menu'); mb.type = 'button'; mb.setAttribute('aria-expanded', 'false');
      mb.onclick = function () { var o = tn.classList.toggle('ux-open'); mb.setAttribute('aria-expanded', o ? 'true' : 'false'); };
      tools.appendChild(mb);
    }
    if (head) { var mn = head.querySelector('.menu, .burger, .menu-toggle'); if (mn && mn.parentNode === head) head.insertBefore(tools, mn); else head.appendChild(tools); }
    else { tools.classList.add('ux-tools-float'); body.appendChild(tools); }

    /* Progression et haut de page */
    var bar = null;
    if (!document.querySelector('.readbar, .scroll-progress')) { var w = el('div', 'ux-progress'); bar = el('i'); w.appendChild(bar); body.appendChild(w); }
    var up = btn('ux-up', 'Remonter en haut de la page', ico('<path d="m6 15 6-6 6 6"/>'));
    up.onclick = function () { window.scrollTo({ top: 0, behavior: 'smooth' }); };
    body.appendChild(up);
    var mbar = document.querySelector('.mbar, .mobile-bar');
    if (mbar) body.classList.add('ux-has-mbar');
    var tick = false;
    function onS() {
      var h = root, m = h.scrollHeight - h.clientHeight, y = h.scrollTop || body.scrollTop;
      if (bar) bar.style.transform = 'scaleX(' + (m > 0 ? Math.min(1, y / m) : 0) + ')';
      up.classList.toggle('on', y > 500); tick = false;
    }
    window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(onS); } }, { passive: true });
    onS();

    /* Copier le lien, imprimer */
    var h1 = main.querySelector('h1');
    function copie(b, txt, lib) {
      b.onclick = function () {
        var fait = function () { b.textContent = 'Copié'; setTimeout(function () { b.textContent = lib; }, 1600); };
        if (navigator.clipboard) navigator.clipboard.writeText(txt()).then(fait, function () { b.textContent = 'Copie impossible'; });
      };
    }
    if (h1 && location.pathname !== '/' && main.querySelectorAll('h2').length > 1) {
      var bx = el('div', 'ux-page'), c = el('button', 'ux-b', 'Copier le lien'), pr = el('button', 'ux-b', 'Imprimer');
      c.type = pr.type = 'button'; copie(c, function () { return location.href.split('#')[0]; }, 'Copier le lien');
      pr.onclick = function () { window.print(); };
      bx.appendChild(c); bx.appendChild(pr); h1.parentNode.insertBefore(bx, h1.nextSibling);
    }
    Array.prototype.forEach.call(main.querySelectorAll('pre, [data-copy], .modele, .template'), function (t) {
      var b = el('button', 'ux-b ux-copy', 'Copier'); b.type = 'button';
      copie(b, function () { return t.getAttribute('data-copy') || t.innerText; }, 'Copier');
      t.classList.add('ux-copyable'); t.parentNode.insertBefore(b, t.nextSibling);
    });

    /* Afficher le mot de passe */
    Array.prototype.forEach.call(document.querySelectorAll('input[type=password]'), function (i) {
      var b = el('button', 'ux-b ux-pwd', 'Afficher'); b.type = 'button';
      b.onclick = function () { var v = i.type === 'password'; i.type = v ? 'text' : 'password'; b.textContent = v ? 'Masquer' : 'Afficher'; };
      i.parentNode.insertBefore(b, i.nextSibling);
    });

    /* Formulaires : UTM, confirmation avant de quitter */
    var sale = false;
    Array.prototype.forEach.call(document.forms, function (f) {
      if (f.closest('dialog') || f.getAttribute('role') === 'search') return;
      UK.forEach(function (k) { if (utm[k]) { var i = el('input'); i.type = 'hidden'; i.name = k; i.value = utm[k]; f.appendChild(i); } });
      f.addEventListener('input', function (e) { if (e.target.type !== 'search') sale = true; });
      f.addEventListener('submit', function () { setTimeout(function () { var b = f.querySelector('button[disabled]'); if (b || f.style.display === 'none') sale = false; }, 0); });
    });
    window.addEventListener('beforeunload', function (e) { if (sale && !leaving()) { e.preventDefault(); e.returnValue = ''; } });
    var part = false; function leaving() { return part; }
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
      var h = a.getAttribute('href'), bon = a.host === location.host && h.charAt(0) !== '#' && a.pathname !== location.pathname && !a.target && !a.hasAttribute('download') && !e.ctrlKey && !e.metaKey;
      if (!bon) return;
      if (sale && !document.querySelector('form[style*="none"]')) {
        e.preventDefault();
        ask('Votre demande n’est pas envoyée. Quitter cette page ?', 'Quitter', 'Rester', function () { part = true; location.href = a.href; });
        return;
      }
      body.classList.add('ux-loading');
    });
    window.addEventListener('pageshow', function () { body.classList.remove('ux-loading'); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-confirm]'), function (n) {
      n.addEventListener('click', function (e) {
        if (n.dataset.uxOk) { delete n.dataset.uxOk; return; }
        e.preventDefault(); ask(n.getAttribute('data-confirm'), 'Confirmer', 'Annuler', function () { n.dataset.uxOk = '1'; n.click(); });
      });
    });

    /* Bandeau cookies et contact : seulement si configurés */
    if (cfg.cookies && !get('ux-cookies')) {
      var ck = el('div', 'ux-cookie'), t = el('p', '', cfg.cookies + ' '), l = el('a', '', 'En savoir plus'), ok = el('button', 'ux-b ux-main', 'Compris');
      l.href = cfg.cookiesLien || '/confidentialite'; t.appendChild(l); ok.type = 'button';
      ok.onclick = function () { set('ux-cookies', '1'); ck.remove(); };
      ck.setAttribute('role', 'region'); ck.setAttribute('aria-label', 'Cookies'); ck.appendChild(t); ck.appendChild(ok); body.appendChild(ck);
    }
    if (cfg.dates && !/mis à jour|mise à jour/i.test(main.innerText)) {
      fetch('/dates.json?' + V).then(function (r) { return r.json(); }).then(function (j) {
        var d = j[location.pathname.replace(/\/$/, '') || '/']; if (!d) return;
        var a = d.split('-'), p = el('p', 'ux-maj', 'Dernière mise à jour : ' + a[2] + '/' + a[1] + '/' + a[0]);
        (document.querySelector('footer') || main).appendChild(p);
      }).catch(function () {});
    }
    if (cfg.contact && !document.querySelector('.wa-float')) {
      var fab = el('a', 'ux-fab', cfg.contactTexte || 'Contact');
      var cible = cfg.contact.charAt(0) === '#' && !document.querySelector(cfg.contact) ? '/' + cfg.contact : cfg.contact;
      fab.href = cible; body.appendChild(fab);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
  window.addEventListener('load', lisible);
})();

/* Bouton Google Sources preferees */
(function(){var h=location.hostname.replace(/^www\./,'');if(['gagnerdutemps.fr','fideliqr.fr','reperes-assainissement.fr','exterieur-clair.fr'].indexOf(h)<0)return;function go(){if(document.getElementById('gs-pref'))return;var t=document.querySelector('article')||document.querySelector('footer')||document.querySelector('nav.site-plan');if(!t)return;var d=document.createElement('p');d.id='gs-pref';d.style.cssText='text-align:center;margin:24px 0';var a=document.createElement('a');a.href='https://www.google.com/preferences/source?q='+h;a.target='_blank';a.rel='noopener';a.textContent='\u2606 Ajouter \u00e0 mes sources pr\u00e9f\u00e9r\u00e9es sur Google';a.style.cssText='display:inline-block;padding:10px 16px;border:1px solid #dadce0;border-radius:999px;background:#fff;color:#1a73e8;font:500 15px/1.3 system-ui,sans-serif;text-decoration:none';d.appendChild(a);t.appendChild(d);}if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',go);}else{go();}})();
