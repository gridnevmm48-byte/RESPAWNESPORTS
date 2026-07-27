/* ============================================================
   RESPAWN v2 — interaction layer (vanilla, no dependencies)

   Everything here has to survive being inlined into a single
   self-contained page: no imports, no CDN, no build-time magic.
   Media elements may arrive as <video> (local) or <img> (artifact),
   so anything touching them feature-tests instead of assuming.
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(pointer:fine)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  // sandboxed frames can throw on storage access
  var store = (function () {
    try { window.localStorage.getItem('respawn_probe'); return window.localStorage; }
    catch (e) {
      var mem = {};
      return { getItem: function (k) { return k in mem ? mem[k] : null; },
               setItem: function (k, v) { mem[k] = String(v); } };
    }
  })();

  /* ---------- i18n ---------- */
  var DICT = {
    nav_cta:['Write to us','Написать'], nav_menu:['Menu','Меню'],
    nav_spaces:['Spaces','Пространства'], nav_rigs:['Rigs','Сборки'],
    nav_pricing:['Pricing','Цены'], nav_visit:['Visit','Контакты'],
    menu_find:['Find us','Как найти'], menu_addr:['Limassol, Cyprus','Лимасол, Кипр'],
    menu_hours:['Daily 13:00 — 03:00','Ежедневно 13:00 — 03:00'],

    hero_l1:['More than a club.','Больше, чем клуб.'],
    hero_l2:['A residence.','Резиденция.'],
    hero_scroll:['Scroll','Листай'],
    c_call:['Call us','Позвонить'],
    c_note:['Answered on the floor, 13:00 — 03:00.','Отвечаем прямо из зала, 13:00 — 03:00.'],
    hero_fact1:['Peak refresh','Частота'],
    hero_fact2:['Flagship rigs<br />in every seat.','Флагманские сборки<br />на каждом месте.'],
    hero_sub:['Premium esports and PlayStation lounge in the heart of Limassol.','Премиальный киберспорт и PlayStation-лаундж в сердце Лимасола.'],

    about_eyebrow:['about','о клубе'],
    about_text:['We didn’t build another computer club. We built a room worth walking into — where the hardware stays quiet, the doors close behind you, and every detail was chosen the way you would have chosen it.','Мы построили не очередной компьютерный клуб. Мы построили место, в дверь которого хочется войти, — где техника молчит, дверь закрывается за тобой, и каждая деталь выбрана так, как выбрал бы ты.'],
    about_note:['Built for people who notice the details.','Для тех, кто замечает детали.'],
    about_lead:['Three build tiers, a VIP room, a 130-inch private cinema and a lounge that makes leaving the hard part.','Три уровня сборок, VIP-комната, приватный кинозал на 130 дюймов и лаундж, из которого не хочется уходить.'],
    about_cta:['See the rooms','Смотреть залы'],

    creed_kicker:['Quiet hardware.<br />Loud nights.','Тихая техника.<br />Громкие вечера.'],
    creed_1:['Play','Играй'], creed_2:['Perform','Побеждай'], creed_3:['Belong','Оставайся'],
    creed_foot:['+ From the door to the last round.','+ От двери до последнего раунда.'],

    facts_title:['Three reasons<br />to walk in.','Три причины<br />зайти.'],
    facts_lead:['Not only for the ones who play.','И не только для тех, кто играет.'],
    t1_label:['play','играть'],
    t1_t:['Sit down and go','Сел и играешь'],
    t1_d:['PC zones on i7 and i9, PlayStation 5 Pro in the lounge. Every launcher already signed in.','ПК-зоны на i7 и i9, PlayStation 5 Pro в лаундже. Лаунчеры уже залогинены.'],
    t2_label:['watch','смотреть'],
    t2_t:['The big screen<br />is bookable','Большой экран<br />можно забрать себе'],
    t2_d:['Football and big matches, finals, film nights. A 130-inch projection and Dolby Atmos you feel more than hear.','Футбол и крупные матчи, финалы, вечера кино. Проекция 130 дюймов и Dolby Atmos, который скорее чувствуешь, чем слышишь.'],
    occ1:['Football','Футбол'], occ2:['Champions League','Лига чемпионов'],
    occ3:['Finals','Финалы'], occ4:['Film nights','Вечера кино'],
    t3_label:['celebrate','отмечать'],
    t3_t:['Take the room','Забери зал'],
    t3_unit:['seats','мест'],
    t3_d:['Birthdays, company nights, in-house tournaments. Close the door on the VIP room or take the whole floor.','Дни рождения, вечера компанией, внутриклубные турниры. Закрой дверь VIP-комнаты или займи весь зал.'],
    t3_cta:['Ask about a date','Спросить про дату'],
    facts_brands:['On every desk','На каждом столе'],

    cases_eyebrow:['rooms','залы'],
    cases_title:['Six rooms.<br /><em>One standard.</em>','Шесть залов.<br /><em>Один стандарт.</em>'],
    c1_t:['Premium Gaming PC','Премиальный ПК'],
    c1_d:['Sit down and there is nothing between you and the frame.','Садишься — и между тобой и кадром больше ничего нет.'],
    c2_t:['The VIP Room','VIP-комната'],
    c2_d:['Superlight gear, a 260Hz panel, and a door you can close.','Superlight-периферия, панель на 260 Гц и дверь, которую можно закрыть.'],
    c2_chip:['Private','Приватно'],
    c3_t:['PlayStation 5 Lounge','PlayStation 5 Лаундж'],
    c3_d:['PS5 Pro, recliners, and friends. The couch you wish you had at home.','PS5 Pro, реклайнеры и друзья. Тот самый диван, о котором мечтаешь дома.'],
    c3_chip:['6 seats','6 мест'],
    c4_t:['Private Cinema','Приватный кинозал'],
    c4_d:['A 130-inch screen, Dolby Atmos, and the lights all the way down.','Экран 130 дюймов, Dolby Atmos и полностью погашенный свет.'],
    c5_t:['Lounge & Kitchen','Лаундж и кухня'],
    c5_d:['Hookah between rounds, food to the table from Hook Place.','Кальян между раундами, еда на стол из Hook Place.'],
    c5_chip1:['Hookah','Кальян'], c5_chip2:['Table service','Обслуживание'],
    c6_t:['The Games Library','Библиотека игр'],
    c6_d:['Every big title already installed and patched. Sit down and press play.','Все крупные тайтлы уже установлены и обновлены. Садись и запускай.'],
    c6_chip1:['Steam','Steam'], c6_chip2:['Epic','Epic'], c6_chip3:['Battle.net','Battle.net'],

    games_eyebrow:['library','игры'],
    games_title:['Nothing to install.<br /><em>Nothing to wait for.</em>','Ничего не ставить.<br /><em>Ничего не ждать.</em>'],
    games_lead:['The launchers are signed in, the shaders are cached, the updates ran overnight.','Лаунчеры залогинены, шейдеры скомпилированы, обновления прошли ночью.'],

    cmp_eyebrow:['compare','сравнение'],
    cmp_title:['Which zone<br /><em>is yours?</em>','Какая зона<br /><em>твоя?</em>'],
    cmp_zone:['Zone','Зона'], cmp_for:['Best for','Кому подойдёт'],
    cmp_gpu:['GPU','Видеокарта'], cmp_screen:['Screen','Экран'], cmp_from:['From','От'],
    cmp_r1:['Casual sessions, co-op nights','Спокойные сессии, вечера в ко-опе'],
    cmp_r2:['Ranked, scrims, five-stacks','Ранкед, сборы, катка впятером'],
    cmp_r3:['A closed door and the best gear','Закрытая дверь и лучшая периферия'],
    cmp_r4:['Birthdays, film nights, six friends','Дни рождения, вечер кино, шестеро друзей'],

    rigs_eyebrow:['machines','сборки'],
    rigs_title:['Spec it like<br /><em>you mean it.</em>','Собери так,<br /><em>как считаешь нужным.</em>'],
    rig_c:['the everyday flagship','флагман на каждый день'],
    rig_b:['built for the ranked grind','создан для ранкеда'],
    rig_v:['everything, uncompromised','всё, без компромиссов'],
    s_cpu:['CPU','Процессор'], s_gpu:['GPU','Видеокарта'], s_mon:['Monitor','Монитор'],
    s_mouse:['Mouse','Мышь'], s_kb:['Keyboard','Клавиатура'], s_hs:['Headset','Гарнитура'],
    from:['from','от'],

    pr_eyebrow:['rates','тарифы'],
    pr_title:['Clear rates.<br /><em>No drama.</em>','Прозрачные цены.<br /><em>Без сюрпризов.</em>'],
    pr_peak:['Peak','Пик'], pr_off:['Off-Peak','Вне пика'],
    pr_tier:['Tier','Тариф'], pr_1h:['1 hour','1 час'], pr_3h:['3 hours','3 часа'],
    pr_ps5:['PS5 Premium','PS5 Premium'],
    pr_ps5_sub:['private cinema · per hour','приватный кинозал · за час'],
    pr_players:['players','игроков'],
    pr_bonus:['Top up & get bonus','Пополни и получи бонус'],
    pr_bonus_note:['Added instantly · in-club use only.','Начисляется сразу · только внутри клуба.'],

    ig_eyebrow:['daily','каждый день'],
    ig_title:['The club posts<br /><em>every night.</em>','Клуб выкладывает<br /><em>каждый вечер.</em>'],
    ig_lead:['Tournaments, new builds, who took the cinema this weekend. The feed is the fastest way to see what a normal evening here looks like.','Турниры, новые сборки, кто занял кинозал в выходные. Лента — самый быстрый способ увидеть, как здесь выглядит обычный вечер.'],
    ig_cta:['Follow','Подписаться'],

    v_t1:['Write to us.','Напиши нам.'], v_t2:['Or just drop in.','Или просто зайди.'],
    v_lead:['Ask about a free seat, the VIP room or the cinema — we answer from the floor.','Спроси про свободное место, VIP-комнату или кинозал — отвечаем прямо из зала.'],
    v_addr:['Address','Адрес'], v_hours:['Hours','Часы'], v_phone:['Phone','Телефон'],
    v_map:['Open in Google Maps →','Открыть в Google Картах →'],
    foot_where:['Where','Адрес'], foot_contact:['Contact','Связь'], foot_go:['Go','Разделы']
  };

  var lang = store.getItem('respawn_lang') || 'en';

  function applyLang() {
    document.documentElement.lang = lang;
    document.body.setAttribute('data-lang', lang);
    // collapse the marquee to a single set first, so its copies get translated
    // once and cloned after, rather than being cloned in the old language
    resetMarquee();
    var i = lang === 'ru' ? 1 : 0;
    $$('[data-i18n]').forEach(function (el) {
      var v = DICT[el.getAttribute('data-i18n')];
      if (!v) return;
      if (v[i].indexOf('<') > -1) el.innerHTML = v[i];
      else el.textContent = v[i];
    });
    $$('.lang__btn').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-lang-set') === lang);
    });
    buildSplits();
    buildFill();
    cloneMarquee();
    updateStatus();
  }

  $$('.lang__btn').forEach(function (b) {
    b.addEventListener('click', function () {
      lang = b.getAttribute('data-lang-set');
      store.setItem('respawn_lang', lang);
      applyLang();
    });
  });

  var yr = $('[data-year]'); if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- per-character link hover ----------
     Two stacked copies of the label: the base rides up out of the mask
     while the clone rides in from below, one character at a time. */
  function splitLayer(text, cls) {
    var span = document.createElement('span');
    span.className = 'split ' + cls;
    text.split('').forEach(function (ch, k) {
      var c = document.createElement('span');
      c.className = 'split__c';
      c.style.setProperty('--i', k);
      c.textContent = ch;
      span.appendChild(c);
    });
    return span;
  }

  function buildSplits() {
    $$('[data-split]').forEach(function (el) {
      // a translated label was just rewritten, so its text is authoritative;
      // an untranslated one still holds last pass's two stacked copies, so the
      // cached original is the only clean source
      var cached = el.getAttribute('data-split-text');
      var text = ((el.hasAttribute('data-i18n') || !cached) ? el.textContent : cached).trim();
      if (!text) return;
      el.setAttribute('data-split-text', text);
      if (!fine || reduce) { el.textContent = text; return; }
      var row = document.createElement('span');
      row.className = 'split__row';
      row.appendChild(splitLayer(text, 'split--base'));
      row.appendChild(splitLayer(text, 'split--clone'));
      row.setAttribute('aria-label', text);
      el.textContent = '';
      el.appendChild(row);
    });
  }

  /* ---------- word-by-word fill on the manifest ---------- */
  var fillEl = $('[data-fill]'), fillWords = [];
  function buildFill() {
    if (!fillEl) return;
    var src = fillEl.querySelector('[data-i18n]') || fillEl;
    var parts = src.textContent.trim().split(/\s+/);
    src.innerHTML = '';
    parts.forEach(function (w, k) {
      var s = document.createElement('span');
      s.className = 'w';
      s.textContent = w;
      src.appendChild(s);
      if (k < parts.length - 1) src.appendChild(document.createTextNode(' '));
    });
    fillWords = $$('.w', fillEl);
    if (reduce) fillWords.forEach(function (w) { w.classList.add('on'); });
  }

  function paintFill() {
    if (!fillEl || reduce || !fillWords.length) return;
    var words = fillWords;
    var r = fillEl.getBoundingClientRect();
    var vh = window.innerHeight;
    // fills across the middle band of the viewport, finishing before it exits
    var p = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.32), 0, 1);
    var upto = Math.round(p * words.length);
    words.forEach(function (w, k) { w.classList.toggle('on', k < upto); });
  }

  /* ---------- reveal ---------- */
  if (reduce) {
    $$('.line,.rise').forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -6% 0px' });
    $$('.line,.rise').forEach(function (el) { io.observe(el); });
    $$('.hero__title .line,.book__title .line').forEach(function (l, k) {
      var inner = l.querySelector('.line__in');
      if (inner) inner.style.transitionDelay = (k * 130) + 'ms';
    });
  }

  /* ---------- count-up ---------- */
  var cio = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target, target = parseFloat(el.getAttribute('data-count'));
      cio.unobserve(el);
      if (reduce) { el.textContent = target; return; }
      var t0 = performance.now(), dur = 1500;
      (function step(now) {
        var p = clamp((now - t0) / dur, 0, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach(function (el) { cio.observe(el); });

  /* ---------- media: only run what is on screen ---------- */
  var mio = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var el = e.target;
      if (typeof el.play !== 'function') return;   // it is an <img> in the artifact
      if (e.isIntersecting) { if (el.preload === 'none') el.preload = 'auto'; el.play().catch(function () {}); }
      else el.pause();
    });
  }, { threshold: 0.1 });
  $$('[data-still],[data-clip-holder]').forEach(function (el) { mio.observe(el); });

  /* ---------- endless rows (creed marquee + games ticker) ---------- */
  var rows = [
    { el: $('[data-marquee] .marquee__row') || $('[data-marquee]'), speed: 0.035 },
    { el: $('[data-games] .ticker__row'), speed: 0.022 },
    { el: $('[data-occ] .occasions__row'), speed: 0.018 }
  ].filter(function (r) { return !!r.el; });

  rows.forEach(function (r) { r.html = r.el.innerHTML; r.x = 0; r.w = 0; });

  // one set only, so the copies are made after the labels are translated
  function resetMarquee() { rows.forEach(function (r) { r.el.innerHTML = r.html; }); }

  var rowsRunning = false;
  function cloneMarquee() {
    rows.forEach(function (r) {
      var set = r.el.firstElementChild;
      if (!set) return;
      r.w = set.getBoundingClientRect().width;
      if (!r.w) return;
      var need = Math.ceil((window.innerWidth * 2) / r.w) + 1;
      for (var i = 0; i < need; i++) r.el.appendChild(set.cloneNode(true));
    });
    if (reduce || rowsRunning || !rows.length) return;
    rowsRunning = true;
    var last = performance.now();
    (function tick(now) {
      var dt = Math.min(now - last, 50); last = now;
      rows.forEach(function (r) {
        if (!r.w) return;
        r.x -= dt * r.speed;
        if (r.x <= -r.w) r.x += r.w;
        r.el.style.transform = 'translate3d(' + r.x + 'px,0,0)';
      });
      requestAnimationFrame(tick);
    })(last);
  }

  /* ---------- nav auto-hide ---------- */
  var nav = $('#nav'), lastY = 0;
  function onNav() {
    var y = window.scrollY;
    nav.classList.toggle('is-hidden', y > lastY && y > 320);
    lastY = y;
  }

  /* ---------- menu ---------- */
  var menu = $('#menu');
  function openMenu() {
    menu.hidden = false;
    requestAnimationFrame(function () { menu.classList.add('is-open'); });
  }
  function closeMenu() {
    menu.classList.remove('is-open');
    setTimeout(function () { menu.hidden = true; }, reduce ? 0 : 700);
  }
  $$('[data-menu-open]').forEach(function (b) { b.addEventListener('click', openMenu); });
  $$('[data-menu-close]').forEach(function (b) { b.addEventListener('click', closeMenu); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !menu.hidden) closeMenu();
  });

  /* ---------- stripe wipe into the light section ---------- */
  var creed = $('#creed'), stripes = $$('.stripes i');
  function paintStripes() {
    if (!creed || !stripes.length) return;
    if (reduce) { stripes.forEach(function (s) { s.style.transform = 'scaleY(1)'; }); return; }
    var r = creed.getBoundingClientRect(), vh = window.innerHeight;
    // starts once the section's tail enters the viewport, done as it leaves
    var p = clamp((vh - r.bottom + vh * 0.85) / (vh * 0.85), 0, 1);
    stripes.forEach(function (s, k) {
      var local = clamp((p - k * 0.07) / 0.6, 0, 1);
      s.style.transform = 'scaleY(' + local + ')';
    });
  }

  /* ---------- scroll loop ---------- */
  var ticking = false;
  function frame() { paintFill(); paintStripes(); ticking = false; }
  function onScroll() {
    onNav();
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', frame);

  /* ---------- accent colours, read from CSS so the canvases never drift
     from the palette tokens ---------- */
  function cssColor(name) {
    var hex = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    var n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  var ACCENT = cssColor('--amber');   // red
  var HOT = cssColor('--ember');      // its hotter, orange end
  var FG_RGB = cssColor('--fg');

  /* ---------- hero object: a wireframe headset and gamepad ----------
     Real 3D — vertices, edges, a perspective projection — drawn on a 2D
     canvas. No library, no shaders, so it survives the artifact's CSP and
     costs nothing to load. Modelled after real product photos: a full
     headband arc, oval cups with a branding disc, a drooping boom mic;
     a controller with a touchpad, d-pad, diamond of face buttons and
     shoulder triggers. Written to be swapped for WebGL later. */
  (function heroObject() {
    var cv = $('[data-object]');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0;

    var V = [];   // vertices: [x, y, z]
    var E = [];   // edges: [from, to, accent]

    function vtx(x, y, z) { V.push([x, y, z]); return V.length - 1; }
    function edge(a, b, acc) { E.push([a, b, acc ? 1 : 0]); }
    function chain(ids, closed, acc) {
      for (var i = 0; i < ids.length - 1; i++) edge(ids[i], ids[i + 1], acc);
      if (closed) edge(ids[ids.length - 1], ids[0], acc);
    }
    function rungs(a, b, acc) { for (var i = 0; i < a.length; i++) edge(a[i], b[i], acc); }
    // a circle lying perpendicular to the given axis
    function ring(cx, cy, cz, r, axis, n) {
      var ids = [];
      for (var i = 0; i < n; i++) {
        var t = i / n * Math.PI * 2, c = Math.cos(t) * r, s = Math.sin(t) * r;
        if (axis === 'x') ids.push(vtx(cx, cy + c, cz + s));
        else if (axis === 'y') ids.push(vtx(cx + c, cy, cz + s));
        else ids.push(vtx(cx + c, cy + s, cz));
      }
      return ids;
    }
    function seg(x1, y1, z1, x2, y2, z2, acc) {
      edge(vtx(x1, y1, z1), vtx(x2, y2, z2), acc);
    }

    /* ── headset ── */
    var HS = 0.86, HY = 0.50;
    function band(z) {
      var ids = [];
      for (var i = 0; i <= 20; i++) {
        var t = Math.PI * (0.05 + 0.90 * (i / 20));
        ids.push(vtx(Math.cos(t) * HS, Math.sin(t) * 0.94 * HS + HY, z));
      }
      return ids;
    }
    var bandOut = band(-0.13 * HS), bandIn = band(0.02 * HS);
    chain(bandOut); chain(bandIn); rungs(bandOut, bandIn);
    // hinge clips where the band meets each cup, like the metal yokes in the photos
    [-1, 1].forEach(function (side) {
      var t = Math.PI * (side < 0 ? 0.95 : 0.05);
      var hx = Math.cos(t) * HS, hy = Math.sin(t) * 0.94 * HS + HY;
      chain(ring(hx, hy, -0.02 * HS, 0.06 * HS, 'y', 8), true);
    });

    var cupY = Math.sin(Math.PI * 0.05) * 0.94 * HS + HY - 0.08 * HS;
    function cup(side) {
      var cx = side * (Math.cos(Math.PI * 0.05) * HS + 0.02);
      // an oval cup, slightly taller than wide, like a real ear cup
      var outer = [];
      for (var i = 0; i < 16; i++) {
        var t = i / 16 * Math.PI * 2;
        outer.push(vtx(cx + Math.sin(t) * 0.05 * HS,
                       cupY + Math.sin(t) * 0.34 * HS,
                       Math.cos(t) * 0.30 * HS));
      }
      chain(outer, true);
      // the branding disc sits proud of the cup, on the outward face
      var discZ = side * 0.30 * HS;
      var disc = ring(cx, cupY, discZ, 0.13 * HS, 'x', 12);
      chain(disc, true, true);
      chain(ring(cx, cupY, discZ, 0.05 * HS, 'x', 8), true, true);
      return { cx: cx, y: cupY };
    }
    cup(1);
    var left = cup(-1);

    // boom mic: droops down and forward from the left cup, foam tip at the end
    var micPts = [
      [left.cx + 0.02 * HS, left.y - 0.10 * HS, 0.20 * HS],
      [left.cx + 0.20 * HS, left.y + 0.14 * HS, 0.34 * HS],
      [left.cx + 0.46 * HS, left.y + 0.30 * HS, 0.36 * HS],
      [left.cx + 0.66 * HS, left.y + 0.34 * HS, 0.30 * HS]
    ];
    var micIds = micPts.map(function (p) { return vtx(p[0], p[1], p[2]); });
    chain(micIds, false, true);
    var tip = micPts[micPts.length - 1];
    chain(ring(tip[0] + 0.04 * HS, tip[1] + 0.02 * HS, tip[2], 0.06 * HS, 'y', 8), true, true);

    /* ── gamepad ── */
    var GS = 0.60, GY = -0.86;
    var shell = [
      [-1.30, 0.14], [-1.08, 0.40], [-0.64, 0.46], [-0.26, 0.30],
      [0.26, 0.30], [0.64, 0.46], [1.08, 0.40], [1.30, 0.14],
      [1.36, -0.22], [1.06, -0.54], [0.70, -0.46], [0.40, -0.18],
      [-0.40, -0.18], [-0.70, -0.46], [-1.06, -0.54], [-1.36, -0.22]
    ];
    function plate(z) {
      var ids = [];
      for (var i = 0; i < shell.length; i++) {
        ids.push(vtx(shell[i][0] * GS, shell[i][1] * GS + GY, z));
      }
      return ids;
    }
    var padA = plate(-0.14 * GS), padB = plate(0.14 * GS);
    chain(padA, true); chain(padB, true); rungs(padA, padB);

    // shoulder triggers — short ticks rising off the rear-top corners
    [-1, 1].forEach(function (side) {
      seg(side * 1.15 * GS, 0.40 * GS + GY, -0.10 * GS,
          side * 1.06 * GS, 0.58 * GS + GY, -0.16 * GS, true);
    });

    // thumbsticks
    [-0.36, 0.36].forEach(function (sx) {
      var base = ring(sx * GS, -0.04 * GS + GY, 0.14 * GS, 0.17 * GS, 'z', 10);
      var top = ring(sx * GS, -0.04 * GS + GY, 0.36 * GS, 0.12 * GS, 'z', 10);
      chain(base, true, true); chain(top, true, true); rungs(base, top, true);
    });

    // touchpad, riding between the sticks like a DualSense
    (function touchpad() {
      var cx = 0, cy = 0.32 * GS + GY, hw = 0.30 * GS, hh = 0.12 * GS, z = 0.14 * GS;
      var pts = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
      chain(pts.map(function (p) { return vtx(cx + p[0], cy + p[1], z); }), true);
    })();

    // d-pad
    (function dpad() {
      var cx = -0.96 * GS, cy = 0.06 * GS + GY, s = 0.17 * GS, a = s * 0.34;
      var pts = [[-a, -s], [a, -s], [a, -a], [s, -a], [s, a], [a, a],
                 [a, s], [-a, s], [-a, a], [-s, a], [-s, -a], [-a, -a]];
      var ids = [];
      for (var i = 0; i < pts.length; i++) {
        ids.push(vtx(cx + pts[i][0], cy + pts[i][1], 0.15 * GS));
      }
      chain(ids, true);
    })();

    // face buttons, diamond layout — one carries the accent, like a highlighted press
    [[0, 0.20, false], [0.20, 0, false], [0, -0.20, true], [-0.20, 0, false]]
      .forEach(function (o) {
        chain(ring(0.96 * GS + o[0] * GS, (0.04 + o[1]) * GS + GY, 0.15 * GS,
                   0.058 * GS, 'z', 8), true, o[2]);
      });

    // home button
    chain(ring(0, -0.12 * GS + GY, 0.15 * GS, 0.045 * GS, 'z', 8), true);

    /* ── render ── */
    var px = 0, py = 0, yaw = 0.5, pitch = -0.1, running = false, t0 = performance.now();

    function size() {
      var r = cv.getBoundingClientRect();
      w = r.width; h = r.height;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      var cy = Math.cos(yaw), sy = Math.sin(yaw);
      var cp = Math.cos(pitch), sp = Math.sin(pitch);
      var scale = Math.min(w, h) * 0.32, ox = w / 2, oy = h / 2, dist = 4.4;
      var P = [], i;
      for (i = 0; i < V.length; i++) {
        var x = V[i][0], y = V[i][1], z = V[i][2];
        var x1 = x * cy + z * sy, z1 = -x * sy + z * cy;   // yaw around Y
        var y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;  // pitch around X
        var k = dist / (dist + z2);
        P.push([ox + x1 * k * scale, oy - y2 * k * scale, z2]);
      }
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;
      for (i = 0; i < E.length; i++) {
        var a = P[E[i][0]], b = P[E[i][1]];
        // nearer edges read solid, far ones fall away — that is the whole depth cue
        var f = clamp((1.3 - (a[2] + b[2]) / 2) / 2.6, 0, 1);
        ctx.strokeStyle = E[i][2]
          ? 'rgba(' + ACCENT.join(',') + ',' + (0.20 + f * 0.68).toFixed(3) + ')'
          : 'rgba(' + FG_RGB.join(',') + ',' + (0.05 + f * 0.34).toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
        ctx.stroke();
      }
    }

    function loop(now) {
      var el = (now - t0) / 1000;
      var tYaw = 0.5 + Math.sin(el * 0.17) * 0.55 + px * 0.55;
      var tPitch = -0.10 + py * 0.4;
      yaw += (tYaw - yaw) * 0.05;
      pitch += (tPitch - pitch) * 0.05;
      draw();
      if (running) requestAnimationFrame(loop);
    }

    size();
    window.addEventListener('resize', function () { size(); draw(); });

    if (reduce) { draw(); return; }

    if (fine) {
      var hero = $('#hero');
      (hero || window).addEventListener('pointermove', function (e) {
        px = e.clientX / window.innerWidth - 0.5;
        py = e.clientY / window.innerHeight - 0.5;
      });
    }

    // spin only while the hero is on screen
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && !running) { running = true; requestAnimationFrame(loop); }
        else if (!e.isIntersecting) running = false;
      });
    }, { threshold: 0.01 }).observe(cv);
  })();

  /* ---------- embers: sparks drifting off the hero object, like the
     reference shot of the pad floating over a bed of coals ---------- */
  (function embers() {
    var cv = $('[data-embers]');
    if (!cv || reduce) return;
    var ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, running = false;
    var particles = [], MAX = 70;

    function size() {
      var r = cv.getBoundingClientRect();
      w = r.width; h = r.height;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn() {
      // mostly a bed of embers under the object, with a few drifting anywhere
      // in frame — reads as ambient rather than a single jet
      var wide = Math.random() < 0.3;
      var cx = wide ? w * Math.random() : w * (0.28 + Math.random() * 0.6);
      var cy = wide ? h * Math.random() : h * (0.55 + Math.random() * 0.4);
      return {
        x: cx, y: cy,
        vx: (Math.random() - 0.5) * 9,
        vy: -14 - Math.random() * 24,
        r: 0.7 + Math.random() * 1.9,
        life: 0, max: 1.5 + Math.random() * 2.0,
        hot: Math.random() < 0.45
      };
    }

    var last = performance.now();
    function step(now) {
      var dt = Math.min((now - last) / 1000, 0.05); last = now;
      last = now;
      while (particles.length < MAX) particles.push(spawn());
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.life += dt;
        if (p.life > p.max) { particles[i] = spawn(); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vy += dt * 6;                 // sparks lose their lift as they cool
        p.vx += (Math.random() - 0.5) * 14 * dt;
        var t = p.life / p.max;
        var a = Math.sin(t * Math.PI) * (p.hot ? 0.95 : 0.6);
        var c = p.hot ? HOT : ACCENT;
        var rr = p.r * (1 - t * 0.4);
        // a soft halo behind the core makes small dots read as glowing embers
        ctx.beginPath();
        ctx.arc(p.x, p.y, rr * 2.6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + c.join(',') + ',' + (a * 0.18).toFixed(3) + ')';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + c.join(',') + ',' + a.toFixed(3) + ')';
        ctx.fill();
      }
      if (running) requestAnimationFrame(step);
    }

    size();
    window.addEventListener('resize', size);

    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && !running) { running = true; last = performance.now(); requestAnimationFrame(step); }
        else if (!e.isIntersecting) running = false;
      });
    }, { threshold: 0.01 }).observe(cv);
  })();

  /* ---------- preloader ---------- */
  (function preloader() {
    var pl = $('#pl');
    if (!pl) return;
    document.body.style.overflow = 'hidden';

    $$('.pl__belts i', pl).forEach(function (b, k) { b.style.setProperty('--b', k); });
    $$('.pl__p', pl).forEach(function (p) {
      var len = Math.ceil(p.getTotalLength());
      p.style.setProperty('--len', len);
    });

    var strips = $$('.reel__strip', pl);
    function setCount(n) {
      var s = String(Math.min(100, Math.round(n))).padStart(3, '0');
      strips.forEach(function (strip, k) {
        strip.style.transform = 'translateY(' + (-parseInt(s[k], 10) * 10) + '%)';
      });
    }
    // each strip holds "0123456789" stacked, so one digit is 10% of its height
    strips.forEach(function (strip) {
      strip.innerHTML = '0123456789'.split('').map(function (d) { return '<span>' + d + '</span>'; }).join('');
    });
    setCount(0);

    function finish() {
      pl.classList.add('is-done');
      document.body.style.overflow = '';
      setTimeout(function () { pl.remove(); }, 1600);
      frame();
    }

    if (reduce) { pl.classList.add('is-drawn'); setCount(100); finish(); return; }

    requestAnimationFrame(function () { pl.classList.add('is-drawn'); });

    var t0 = performance.now(), dur = 2100;
    (function tick(now) {
      var p = clamp((now - t0) / dur, 0, 1);
      setCount(100 * (1 - Math.pow(1 - p, 2.2)));
      if (p < 1) requestAnimationFrame(tick);
      else setTimeout(finish, 260);
    })(t0);
  })();

  /* ---------- pricing ---------- */
  var PC = {
    comfort:  { peak: { 1: 5,  3: 12 }, off: { 1: 3, 3: 7  } },
    bootcamp: { peak: { 1: 6,  3: 15 }, off: { 1: 4, 3: 10 } },
    vip:      { peak: { 1: 10, 3: 25 }, off: { 1: 8, 3: 20 } }
  };
  var PS5 = { peak: [15, 25, 35, 40, 45, 50], off: [7, 12, 17, 20, 22, 25] };
  var rate = 'peak', people = 2;

  function paintPC() {
    $$('.ptable__row[data-tier]').forEach(function (row) {
      var t = row.getAttribute('data-tier');
      var v1 = row.querySelector('[data-p1]'), v3 = row.querySelector('[data-p3]');
      v1.classList.add('flip'); v3.classList.add('flip');
      setTimeout(function () {
        v1.textContent = '€' + PC[t][rate][1];
        v3.textContent = '€' + PC[t][rate][3];
        v1.classList.remove('flip'); v3.classList.remove('flip');
      }, 150);
    });
  }
  function paintPS5() {
    var amt = $('[data-ps5-amt]'), cnt = $('[data-people]'), dots = $('[data-dots]');
    if (cnt) cnt.textContent = people;
    if (amt) {
      amt.classList.add('flip');
      setTimeout(function () {
        amt.textContent = PS5[rate][people - 1];
        amt.classList.remove('flip');
      }, 150);
    }
    if (dots) {
      dots.innerHTML = '';
      for (var i = 1; i <= 6; i++) {
        var d = document.createElement('i');
        if (i <= people) d.className = 'on';
        dots.appendChild(d);
      }
    }
  }
  function movePill(btn) {
    var pill = $('[data-pill]');
    if (pill && btn) {
      pill.style.width = btn.offsetWidth + 'px';
      pill.style.transform = 'translateX(' + (btn.offsetLeft - 4) + 'px)';
    }
  }
  $$('.toggle__btn').forEach(function (b) {
    b.addEventListener('click', function () {
      rate = b.getAttribute('data-rate');
      $$('.toggle__btn').forEach(function (x) { x.classList.remove('is-active'); });
      b.classList.add('is-active');
      movePill(b); paintPC(); paintPS5();
    });
  });
  $$('.ps5__step').forEach(function (b) {
    b.addEventListener('click', function () {
      people = clamp(people + parseInt(b.getAttribute('data-step'), 10), 1, 6);
      paintPS5();
    });
  });

  /* ---------- open-now status ---------- */
  function currentPeriod() {
    var now = new Date(), day = now.getDay(), h = now.getHours();
    if (!((h >= 13) || (h < 3))) return 'closed';    // 13:00 – 03:00
    if (day === 0 || day === 6) return 'peak';
    return (h >= 13 && h < 18) ? 'off' : 'peak';
  }
  function updateStatus() {
    var p = currentPeriod();
    var txt = {
      peak:   ['Open now · Peak', 'Открыто · Пик'],
      off:    ['Open now · Off-Peak', 'Открыто · Вне пика'],
      closed: ['Closed now', 'Сейчас закрыто']
    }[p][lang === 'ru' ? 1 : 0];
    $$('[data-status-txt]').forEach(function (t) { t.textContent = txt; });
    $$('[data-status]').forEach(function (wrap) {
      var dot = wrap.querySelector('.dot');
      wrap.style.color = p === 'closed' ? 'var(--fg-dim)' : 'var(--live)';
      if (dot) {
        dot.style.background = p === 'closed' ? 'var(--fg-dim)' : 'var(--live)';
        dot.style.animation = p === 'closed' ? 'none' : '';
      }
    });
  }

  /* ---------- init ---------- */
  applyLang();
  (function initRate() {
    rate = currentPeriod() === 'off' ? 'off' : 'peak';
    var btn = $('.toggle__btn[data-rate="' + rate + '"]');
    if (btn) {
      $$('.toggle__btn').forEach(function (x) { x.classList.remove('is-active'); });
      btn.classList.add('is-active');
      requestAnimationFrame(function () { movePill(btn); });
    }
    paintPC(); paintPS5();
  })();
  onNav(); frame();
  window.addEventListener('load', function () {
    var b = $('.toggle__btn.is-active'); if (b) movePill(b);
    frame();
  });
})();
