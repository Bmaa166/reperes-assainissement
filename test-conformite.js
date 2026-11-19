/* Test de conformité de l'assainissement individuel.
   Grille : annexe II de l'arrêté du 27 avril 2012. Tout se passe dans le navigateur, rien n'est envoyé. */
(function () {
  'use strict';
  var root = document.querySelector('[data-tool="test-conformite"]');
  if (!root) return;
  var steps = [].slice.call(root.querySelectorAll('.quiz-step'));
  var bar = root.querySelector('.progress i');
  var out = root.querySelector('[data-res]');
  var st = {};
  var cur = 0;

  function show(i) {
    cur = i;
    steps.forEach(function (s, k) { s.classList.toggle('on', k === i); });
    if (bar) bar.style.width = Math.round((i + 1) / steps.length * 100) + '%';
    out.hidden = true;
  }

  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt) n.textContent = txt;
    return n;
  }

  function link(href, txt, cls) {
    var a = el('a', cls || '', txt);
    a.href = href;
    return a;
  }

  var V = {
    absence: {
      pill: ['Non conforme', 'warn'],
      titre: 'Absence d’installation : à créer sans attendre',
      delai: 'Travaux dans les meilleurs délais (mise en demeure possible)',
      pts: [
        'Des eaux usées rejetées sans traitement, c’est le cas le plus sévère de la grille : la commune peut vous mettre en demeure de créer une installation.',
        'Première étape : une étude de sol et de filière (350 à 800 €), puis le dossier de conception à faire valider par le SPANC avant tout chantier.',
        'Budget courant d’une installation complète pour une maison familiale : 8 000 à 12 000 €, avant frais annexes.'
      ],
      liens: [['/etapes-travaux', 'Les étapes des travaux'], ['/filieres', 'Choisir sa filière'], ['/aides', 'Simuler mes aides']]
    },
    danger: {
      pill: ['Non conforme probable', 'warn'],
      titre: 'Danger pour la santé ou la sécurité : travaux obligatoires',
      delai: '4 ans au plus après le contrôle',
      pts: [
        'Ce que vous décrivez correspond à la catégorie « danger pour la santé des personnes » de la grille officielle : contact possible avec des eaux usées, odeurs récurrentes, ouvrage abîmé ou puits d’eau potable trop proche.',
        'Le SPANC fixe la liste des travaux dans son rapport. Le délai est de 4 ans au maximum, et le maire peut le raccourcir si le risque est important.',
        'Sans travaux dans le délai, la pénalité est au moins égale à la redevance d’assainissement, majorable jusqu’à 400 %.'
      ],
      liens: [['/spanc-controle', 'Le contrôle du SPANC'], ['/prix', 'Estimer mon budget'], ['/aides', 'Simuler mes aides']]
    },
    incompletEnjeu: {
      pill: ['Non conforme probable', 'warn'],
      titre: 'Installation incomplète en zone à enjeu : travaux obligatoires',
      delai: '4 ans au plus après le contrôle',
      pts: [
        'Une fosse sans traitement derrière, ou un rejet vers un puisard, un fossé ou une mare, est une installation incomplète.',
        'Dans une zone à enjeu sanitaire ou environnemental (captage d’eau potable, baignade, conchyliculture, secteur désigné par le SDAGE ou le SAGE), la grille impose des travaux sous 4 ans.',
        'Le SPANC vous dit par écrit si votre terrain est dans une de ces zones : c’est lui qui tranche.'
      ],
      liens: [['/spanc-controle', 'Le contrôle du SPANC'], ['/filieres', 'Choisir sa filière'], ['/prix', 'Estimer mon budget']]
    },
    incomplet: {
      pill: ['Non conforme probable', 'warn'],
      titre: 'Installation incomplète : pas de délai imposé, sauf si vous vendez',
      delai: 'Aucun délai hors vente',
      pts: [
        'Une fosse sans traitement derrière, ou un rejet vers un puisard, un fossé ou une mare, est une installation incomplète : le SPANC la classera non conforme.',
        'Hors zone à enjeu et sans danger pour la santé, la grille n’impose pas de délai de travaux tant que la maison n’est pas vendue.',
        'Le rapport du SPANC liste quand même les travaux à prévoir : gardez-le, il servira le jour d’une vente.'
      ],
      liens: [['/spanc-controle', 'Le contrôle du SPANC'], ['/fosse-septique', 'Le guide de la fosse septique'], ['/prix', 'Estimer mon budget']]
    },
    incompletNsp: {
      pill: ['À vérifier', 'warn'],
      titre: 'Installation incomplète : le délai dépend de votre zone',
      delai: '4 ans en zone à enjeu, aucun délai ailleurs (hors vente)',
      pts: [
        'Une fosse sans traitement derrière, ou un rejet vers un puisard, un fossé ou une mare, est une installation incomplète : le SPANC la classera non conforme.',
        'En zone à enjeu sanitaire ou environnemental, les travaux sont à faire sous 4 ans. Ailleurs, aucun délai n’est imposé tant que la maison n’est pas vendue.',
        'Posez la question à votre SPANC : il sait si votre parcelle est dans un périmètre de captage, près d’une baignade ou dans un secteur désigné par le SDAGE ou le SAGE.'
      ],
      liens: [['/spanc-par-commune-loire-atlantique', 'Trouver mon SPANC (44)'], ['/spanc-par-commune-vendee', 'Trouver mon SPANC (85)'], ['/spanc-controle', 'Le contrôle du SPANC']]
    },
    entretien: {
      pill: ['Pas de non-conformité visible', 'ok'],
      titre: 'Rien d’alarmant, mais un entretien à rattraper',
      delai: 'Pas de travaux imposés',
      pts: [
        'Un simple défaut d’entretien ou d’usure ne rend pas l’installation non conforme : le SPANC émet des recommandations.',
        'La vidange se fait quand les boues dépassent 50 % du volume utile de la fosse, par un vidangeur agréé qui vous remet un bordereau à conserver. Comptez environ 200 à 350 €.',
        'Un entretien suivi allonge la durée de vie de l’installation et simplifie le prochain contrôle.'
      ],
      liens: [['/entretien-vidange', 'Quand et comment vidanger'], ['/vidangeurs-agrees-loire-atlantique', 'Vidangeurs agréés 44'], ['/vidangeurs-agrees-vendee', 'Vidangeurs agréés 85']]
    },
    ok: {
      pill: ['Pas de non-conformité visible', 'ok'],
      titre: 'D’après vos réponses, aucun signe de non-conformité',
      delai: 'Pas de travaux imposés',
      pts: [
        'Une installation complète, entretenue et sans nuisance n’appelle pas de travaux, même si elle est ancienne : l’âge seul ne la rend pas non conforme.',
        'Le SPANC repasse pour un contrôle périodique, au plus tous les 10 ans. Gardez les bordereaux de vidange : il les demande.',
        'Seul son rapport fait foi : ce test ne voit ni le dimensionnement, ni l’état des ouvrages enterrés.'
      ],
      liens: [['/entretien-vidange', 'Entretien et vidange'], ['/spanc-controle', 'Le contrôle du SPANC']]
    },
    inconnu: {
      pill: ['À vérifier', 'warn'],
      titre: 'Trop d’inconnues : faites passer le SPANC',
      delai: 'Selon le rapport du SPANC',
      pts: [
        'Sans savoir ce qui se trouve après la fosse, personne ne peut dire si l’installation est complète. C’est le point qui pèse le plus dans la grille.',
        'Vous pouvez demander un contrôle à votre SPANC sans attendre son passage périodique. Dans les SPANC de Loire-Atlantique et de Vendée relevés sur ce guide, un contrôle coûte en général entre 75 et 310 € selon le territoire et le type de visite.',
        'Retrouvez d’abord les papiers de la maison : rapport d’un contrôle précédent, plan, facture de vidange ou de pose.'
      ],
      liens: [['/spanc-par-commune-loire-atlantique', 'Trouver mon SPANC (44)'], ['/spanc-par-commune-vendee', 'Trouver mon SPANC (85)'], ['/spanc-controle', 'Le contrôle du SPANC']]
    }
  };

  function verdict() {
    if (st.install === 'non') return 'absence';
    if (st.danger === 'oui' || st.puits === 'oui') return 'danger';
    if (st.complet === 'non') {
      if (st.zone === 'oui') return 'incompletEnjeu';
      if (st.zone === 'non') return 'incomplet';
      return 'incompletNsp';
    }
    if (st.install === 'nsp' || st.complet === 'nsp') return 'inconnu';
    if (st.entretien === 'non') return 'entretien';
    return 'ok';
  }

  function render() {
    var key = verdict();
    var v = V[key];
    while (out.firstChild) out.removeChild(out.firstChild);
    var p = el('p');
    p.appendChild(el('span', 'pill ' + v.pill[1], v.pill[0]));
    out.appendChild(p);
    out.appendChild(el('p', 'big sm', v.titre));
    var d = el('p', 'sim-sub', 'Délai prévu par la grille : ' + v.delai);
    out.appendChild(d);
    var ul = el('ul', 'sim-list');
    v.pts.forEach(function (t) { ul.appendChild(el('li', '', t)); });
    if (st.vente === 'oui' && key !== 'ok' && key !== 'entretien') {
      ul.appendChild(el('li', '', 'Vous vendez : le délai devient 1 an après la signature de l’acte, à la charge de l’acquéreur. Vous devez lui fournir un rapport du SPANC de moins de 3 ans ; le coût des travaux entre souvent dans la négociation du prix.'));
    } else if (st.vente === 'oui') {
      ul.appendChild(el('li', '', 'Vous vendez : fournissez à l’acquéreur un rapport du SPANC de moins de 3 ans. S’il manque ou s’il est trop ancien, le contrôle est à votre charge.'));
    }
    if (st.puits === 'nsp' && key !== 'danger' && key !== 'absence') {
      ul.appendChild(el('li', '', 'Point à lever : un puits utilisé pour l’eau potable à moins de 35 m en aval de l’installation suffit à imposer des travaux sous 4 ans. Vérifiez chez vous et chez vos voisins.'));
    }
    out.appendChild(ul);
    var nav = el('p', 'sim-sub', 'Pour aller plus loin :');
    out.appendChild(nav);
    var ul2 = el('ul', 'sim-tips');
    v.liens.forEach(function (l) { var li = el('li'); li.appendChild(link(l[0], l[1])); ul2.appendChild(li); });
    if (st.vente === 'oui') { var lv = el('li'); lv.appendChild(link('/vente-achat-maison', 'Vente : ce que la loi impose')); ul2.appendChild(lv); }
    out.appendChild(ul2);
    out.appendChild(el('p', 'fine', 'Résultat indicatif, établi à partir de vos seules réponses et de la grille de l’arrêté du 27 avril 2012. Seul le rapport du SPANC de votre commune fait foi.'));
    if (key !== 'ok' && key !== 'entretien') {
      var cta = el('div', 'sim-cta');
      cta.appendChild(link('#demande', 'Recevoir un devis gratuit pour la mise en conformité', 'btn cta'));
      out.appendChild(cta);
    }
    var again = el('p');
    var b = el('button', 'btn ghost', 'Refaire le test');
    b.type = 'button';
    b.addEventListener('click', function () {
      st = {};
      [].forEach.call(root.querySelectorAll('.choices button'), function (x) { x.setAttribute('aria-pressed', 'false'); });
      show(0);
      root.scrollIntoView({ block: 'start' });
    });
    again.appendChild(b);
    out.appendChild(again);
    steps.forEach(function (s) { s.classList.remove('on'); });
    if (bar) bar.style.width = '100%';
    out.hidden = false;
    out.setAttribute('tabindex', '-1');
    out.focus({ preventScroll: true });
    root.scrollIntoView({ block: 'start' });
  }

  function next() {
    // Sans installation : inutile de poser la suite, sauf la vente (dernière étape).
    if (st.install === 'non' && cur === 0) { show(steps.length - 1); return; }
    // La zone ne compte que si l'installation est incomplète.
    var n = cur + 1;
    while (n < steps.length && steps[n].getAttribute('data-if') === 'incomplet' && st.complet !== 'non') n++;
    if (n >= steps.length) { render(); return; }
    show(n);
  }

  steps.forEach(function (s) {
    var key = s.getAttribute('data-q');
    [].forEach.call(s.querySelectorAll('.choices button'), function (b) {
      b.addEventListener('click', function () {
        [].forEach.call(s.querySelectorAll('.choices button'), function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        st[key] = b.getAttribute('data-v');
        window.setTimeout(next, 180);
      });
    });
    var back = s.querySelector('[data-prev]');
    if (back) back.addEventListener('click', function () {
      var p = cur - 1;
      if (st.install === 'non') p = 0;
      while (p > 0 && steps[p].getAttribute('data-if') === 'incomplet' && st.complet !== 'non') p--;
      show(Math.max(0, p));
    });
  });

  show(0);
})();
