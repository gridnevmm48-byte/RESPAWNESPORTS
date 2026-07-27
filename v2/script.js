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
    nav_cta:['Reserve','Забронировать'], nav_menu:['Menu','Меню'],
    nav_spaces:['Spaces','Пространства'], nav_rigs:['Rigs','Сборки'],
    nav_pricing:['Pricing','Цены'], nav_visit:['Visit','Контакты'],
    menu_find:['Find us','Как найти'], menu_addr:['Limassol, Cyprus','Лимасол, Кипр'],
    menu_hours:['Daily 13:00 — 03:00','Ежедневно 13:00 — 03:00'],

    hero_l1:['More than a club.','Больше, чем клуб.'],
    hero_l2:['A residence.','Резиденция.'],
    hero_cta:['Reserve a seat','Забронировать место'],
    hero_scroll:['Scroll','Листай'],
    hero_hint1:['Hold to ignite the floor.','Зажми — зал вспыхнет.'],
    hero_hint2:['Move to bend the lines.','Веди курсор — линии гнутся.'],
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

    facts_title:['Key facts','Коротко о главном'],
    facts_lead:['What the room is actually made of.','Из чего на самом деле сделан клуб.'],
    fact1_label:['the floor','основной зал'],
    fact1_note:['i7 and i9 rigs on high-refresh panels, every seat.','Сборки на i7 и i9 и высокогерцовые мониторы на каждом месте.'],
    fact2_label:['private cinema','приватный кинозал'],
    fact2_note:['Dolby Atmos, six recliners, PS5 Pro. Book the room and the rest disappears.','Dolby Atmos, шесть реклайнеров, PS5 Pro. Бронируешь зал — и всё остальное исчезает.'],
    fact3_label:['open daily','работаем каждый день'],
    fact3_note:['Thirteen hundred to three in the morning. Every day.','С часу дня до трёх ночи. Без выходных.'],
    facts_brands:['On every desk','На каждом столе'],

    cases_eyebrow:['rooms','залы'],
    cases_title:['Five rooms.<br /><em>One standard.</em>','Пять залов.<br /><em>Один стандарт.</em>'],
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

    book_t1:['Your seat','Твоё место'], book_t2:['is waiting.','ждёт.'],
    book_sub:['Message us on Instagram to hold a rig, the VIP room or the cinema.','Напиши в Instagram, чтобы забронировать сборку, VIP-комнату или кинозал.'],
    book_cta:['Reserve on Instagram','Забронировать в Instagram'],
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
  $$('[data-still]').forEach(function (el) { mio.observe(el); });

  /* ---------- endless rows (creed marquee + games ticker) ---------- */
  var rows = [
    { el: $('[data-marquee] .marquee__row') || $('[data-marquee]'), speed: 0.035 },
    { el: $('[data-games] .ticker__row'), speed: 0.022 }
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

  /* ---------- hero line field ----------
     Vertical rules that bend away from the pointer; holding the pointer
     charges a ring that pushes them further and burns amber. */
  (function field() {
    var cv = $('[data-field]');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var GAP = 38, STEP = 26, R = 190;
    var px = -9999, py = -9999, charge = 0, holding = false, running = false;

    function size() {
      var r = cv.getBoundingClientRect();
      w = r.width; h = r.height;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      var ring = charge * 340;
      for (var x = GAP; x < w; x += GAP) {
        ctx.beginPath();
        for (var y = 0; y <= h + STEP; y += STEP) {
          var dx = x - px, dy = y - py;
          var d = Math.sqrt(dx * dx + dy * dy) || 1;
          var push = Math.exp(-(d * d) / (2 * R * R)) * 46;
          if (ring > 0) {
            // a soft shell at the ring radius, not a hard edge
            push += Math.exp(-Math.pow(d - ring, 2) / 5200) * 60 * charge;
          }
          var ox = (dx / d) * push;
          var oy = (dy / d) * push * 0.28;
          if (y === 0) ctx.moveTo(x + ox, y + oy);
          else ctx.lineTo(x + ox, y + oy);
        }
        var near = Math.abs(x - px) < R * 1.4;
        ctx.strokeStyle = near
          ? 'rgba(216,214,209,' + (0.10 + charge * 0.20) + ')'
          : 'rgba(216,214,209,0.055)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      if (charge > 0.02) {
        ctx.beginPath();
        ctx.arc(px, py, ring, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(245,180,87,' + (charge * 0.32) + ')';
        ctx.stroke();
      }
    }

    function loop() {
      charge += ((holding ? 1 : 0) - charge) * 0.06;
      draw();
      if (running) requestAnimationFrame(loop);
    }

    size();
    window.addEventListener('resize', size);

    if (reduce || !fine) { draw(); return; }

    cv.addEventListener('pointermove', function (e) {
      var r = cv.getBoundingClientRect();
      px = e.clientX - r.left; py = e.clientY - r.top;
    });
    cv.addEventListener('pointerleave', function () { px = -9999; py = -9999; });
    cv.addEventListener('pointerdown', function () { holding = true; });
    window.addEventListener('pointerup', function () { holding = false; });

    // the loop only runs while the hero is actually on screen
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && !running) { running = true; requestAnimationFrame(loop); }
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
    var t = $('[data-status-txt]'), wrap = $('[data-status]');
    if (t) t.textContent = txt;
    if (wrap) {
      var dot = wrap.querySelector('.dot');
      wrap.style.color = p === 'closed' ? 'var(--fg-dim)' : 'var(--amber)';
      if (dot && p === 'closed') { dot.style.background = 'var(--fg-dim)'; dot.style.animation = 'none'; }
    }
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
