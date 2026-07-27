/* ============================================================
   RESPAWN — interaction layer (vanilla, no deps)
   ------------------------------------------------------------
   VIDEO MAP — reorder the src attributes in index.html to
   reassign clips. Current assignment (by file size guess):
     Hero .........  19.49.48.mp4  (largest / most cinematic)
     Spaces 01 PC .  19.48.48.mp4
     Spaces 02 VIP.  19.49.22.mp4
     Spaces 03 PS5.  19.49.06.mp4
     Spaces 04 Cine  19.49.10.mp4
     Spaces 05 Loun  19.49.02.mp4
     Cinema  ......  19.49.16.mp4
   ============================================================ */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, n) { return a + (b - a) * n; };

  /* ---------- i18n ---------- */
  var DICT = {
    nav_spaces:['Spaces','Пространства'], nav_rigs:['Rigs','Сборки'], nav_cinema:['Cinema','Кинозал'],
    nav_pricing:['Pricing','Цены'], nav_visit:['Visit','Контакты'], nav_cta:['Reserve a Seat','Забронировать'],
    hero_kicker:['Limassol · Cyprus','Лимасол · Кипр'],
    hero_l1:['More Than a Club.','Больше, чем клуб.'], hero_l2:['A Residence.','Резиденция.'],
    hero_sub:['Premium esports & PlayStation lounge in the heart of Limassol.','Премиальный киберспорт и PlayStation-лаундж в сердце Лимасола.'],
    hero_cta1:['Reserve a Seat','Забронировать'], hero_cta2:['Take the Tour','Смотреть тур'],
    hero_stat1:['Peak refresh','Частота'], hero_stat2:['Private cinema','Кинозал'],
    man_1:['We didn’t build another computer club.','Мы построили не очередной компьютерный клуб.'],
    man_2:['We built a place with a door worth walking through —','Мы построили место, в дверь которого хочется войти —'],
    man_3:['where the hardware is quiet, the rooms are yours,','где техника молчит, а комнаты — только твои,'],
    man_4:['and every detail is chosen the way you’d choose it.','и каждая деталь выбрана так, как выбрал бы ты.'],
    stat_hz:['Highest refresh on the island','Самая высокая частота на острове'],
    stat_class:['Flagship-class rigs, every seat','Флагманские сборки на каждом месте'],
    stat_cinema:['Dolby Atmos private cinema','Приватный кинозал с Dolby Atmos'],
    stat_hours:['Open until 03:00','Открыто до 03:00'],
    spaces_kicker:['The Spaces','Пространства'], spaces_title:['Five rooms. One standard.','Пять зон. Один стандарт.'],
    sp1_t:['Premium Gaming PC','Премиальный ПК'],
    sp1_d:['i7 and i9 rigs on 2K high-refresh panels. Sit down and there is nothing between you and the frame.','Сборки на i7 и i9 и 2K-мониторы с высокой герцовкой. Садишься — и между тобой и кадром больше ничего нет.'],
    sp2_t:['The VIP Room','VIP-комната'],
    sp2_d:['Your own corner of the island. Superlight gear, a 260Hz panel and a door you can close.','Твой личный уголок острова. Superlight-периферия, панель на 260 Гц и дверь, которую можно закрыть.'],
    sp3_t:['PlayStation 5 Lounge','PlayStation 5 Лаундж'],
    sp3_d:['PS5 Pro, recliners, and friends. The couch you wish you had at home — with better sound.','PS5 Pro, реклайнеры и друзья. Тот самый диван, о котором мечтаешь дома — только со звуком лучше.'],
    sp4_t:['Private Cinema','Приватный кинозал'],
    sp4_d:['A 130-inch screen and Dolby Atmos. Book the room, dim the lights, and the rest disappears.','Экран 130 дюймов и Dolby Atmos. Бронируешь зал, гасишь свет — и всё остальное исчезает.'],
    sp5_t:['Hookah Lounge','Кальян-лаундж'],
    sp5_d:['Play. Pause. Indulge. A slow corner for the moments between rounds.','Играй. Пауза. Наслаждайся. Медленный уголок для моментов между раундами.'],
    rigs_kicker:['Choose Your Machine','Выбери свою машину'], rigs_title:['Spec it like you mean it.','Собери так, как считаешь нужным.'],
    rigs_lead:['Three builds, no compromise on any of them. Pick the one that matches how seriously you play.','Три сборки — и ни одной с компромиссом. Выбери ту, что подходит под то, насколько серьёзно ты играешь.'],
    rig_c_tag:['The everyday flagship','Флагман на каждый день'], rig_b_tag:['Built for the ranked grind','Создан для ранкеда'],
    rig_v_tag:['Everything, uncompromised','Всё, без компромиссов'],
    spec_cpu:['CPU','Процессор'], spec_gpu:['GPU','Видеокарта'], spec_mon:['Monitor','Монитор'],
    spec_mouse:['Mouse','Мышь'], spec_kb:['Keyboard','Клавиатура'], spec_hs:['Headset','Гарнитура'],
    from:['from','от'], rig_see:['See pricing →','Смотреть цены →'],
    cin_kicker:['PS5 Premium · Private Cinema','PS5 Premium · Приватный кинозал'],
    cin_t1:['Movie night,','Вечер кино,'], cin_t2:['but it’s yours.','но он только твой.'],
    cin_lead:['PS5 Pro on a 130-inch screen, six recliners, and a Samsung Dolby Atmos system that you feel more than hear.','PS5 Pro на экране 130 дюймов, шесть реклайнеров и система Samsung Dolby Atmos, которую скорее чувствуешь, чем слышишь.'],
    cin_s1:['Projection','Проекция'], cin_s2:['Recliners','Реклайнеры'], cin_s3:['Dolby Atmos','Dolby Atmos'],
    life_kicker:['Lounge & Kitchen','Лаундж и кухня'], life_title:['You won’t want to leave.','Уходить не захочется.'],
    life_lead:['Order straight to your seat from Hook Place, settle into the hookah lounge between matches, and let the night run long. Everything you need is already inside.','Заказывай прямо на место из Hook Place, отдыхай в кальян-лаундже между матчами и растягивай ночь. Всё, что нужно, уже внутри.'],
    life_c1:['Hookah Lounge','Кальян-лаундж'], life_c2:['Food by Hook Place','Еда от Hook Place'],
    life_c3:['Open till 3AM','Открыто до 3:00'], life_c4:['Table service','Обслуживание на месте'],
    life_quote:['“Play. Pause. Indulge.”','«Играй. Пауза. Наслаждайся.»'],
    pr_kicker:['Pricing','Цены'], pr_title:['Clear rates. No drama.','Прозрачные цены. Без драмы.'],
    pr_peak:['Peak','Пик'], pr_off:['Off-Peak','Вне пика'],
    pr_tier:['Tier','Тариф'], pr_1h:['1 hour','1 час'], pr_3h:['3 hours','3 часа'],
    pr_ps5:['PS5 Premium','PS5 Premium'], pr_ps5_sub:['Private cinema · per hour','Приватный кинозал · за час'],
    pr_people:['players','игроков'], pr_hour:['/ hour','/ час'],
    pr_peak_l:['Peak','Пик'], pr_off_l:['Off-Peak','Вне пика'],
    pr_bonus:['Top up & get bonus','Пополни и получи бонус'],
    pr_bonus_note:['Bonus credit is added instantly · in-club use only.','Бонус начисляется мгновенно · только для оплаты в клубе.'],
    vis_kicker:['Visit','Контакты'], vis_title:['In the heart of Limassol.','В сердце Лимасола.'],
    vis_where:['Where','Где'], vis_hours:['Hours','Часы'], vis_hours_v:['Daily · 13:00 – 03:00','Ежедневно · 13:00 – 03:00'],
    vis_social:['Social','Соцсети'], vis_map:['Open in Maps →','Открыть на карте →'],
    book_t1:['Your seat','Твоё место'], book_t2:['is waiting.','уже ждёт.'],
    book_sub:['DM us on Instagram to reserve a rig, the VIP room or the private cinema.','Напиши нам в Instagram, чтобы забронировать ПК, VIP-комнату или кинозал.'],
    book_cta:['Reserve on Instagram','Забронировать в Instagram']
  };

  var QUOTES = [
    { en:{t:'It’s the only place in Limassol that feels built by people who actually play. Fast, quiet, and you never want to leave.', n:'Andreas K.', r:'Regular · CS2'},
      ru:{t:'Единственное место в Лимасоле, которое сделано людьми, которые реально играют. Быстро, тихо, и уходить не хочется.', n:'Андреас К.', r:'Завсегдатай · CS2'} },
    { en:{t:'Booked the VIP room for my birthday. Superlight gear, our own door, food to the table. Nothing else comes close on the island.', n:'Maria P.', r:'VIP guest'},
      ru:{t:'Забронировала VIP-комнату на день рождения. Superlight-периферия, своя дверь, еда на стол. На острове рядом ничего нет.', n:'Мария П.', r:'VIP-гостья'} },
    { en:{t:'The 130-inch cinema with PS5 Pro is unreal. Six of us, reclined, Dolby Atmos shaking the room. Movie night is ruined everywhere else now.', n:'Dmitri S.', r:'Cinema · PS5'},
      ru:{t:'Кинозал 130 дюймов с PS5 Pro — это нечто. Вшестером, в реклайнерах, Dolby Atmos трясёт комнату. Теперь кино везде кажется скучным.', n:'Дмитрий С.', r:'Кинозал · PS5'} }
  ];

  var lang = localStorage.getItem('respawn_lang') || 'en';
  var qIndex = 0;

  function renderQuote() {
    var d = QUOTES[qIndex][lang];
    var t = $('[data-quote]'); if (t) t.textContent = d.t;
    var n = $('[data-quote-name]'); if (n) n.textContent = d.n;
    var r = $('[data-quote-role]'); if (r) r.textContent = d.r;
  }

  function applyLang() {
    document.documentElement.lang = lang;
    document.body.setAttribute('data-lang', lang);
    var i = lang === 'ru' ? 1 : 0;
    $$('[data-i18n]').forEach(function (el) {
      var v = DICT[el.getAttribute('data-i18n')];
      if (v) el.textContent = v[i];
    });
    $$('.lang__btn').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-lang-set') === lang);
    });
    renderQuote();
    updateStatus();
  }

  $$('.lang__btn').forEach(function (b) {
    b.addEventListener('click', function () {
      lang = b.getAttribute('data-lang-set');
      localStorage.setItem('respawn_lang', lang);
      applyLang();
    });
  });

  var yr = $('[data-year]'); if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- reveal engine ---------- */
  // wrap manifesto lines for masked reveal
  $$('.reveal-lines > span').forEach(function (s, k) {
    var inner = document.createElement('i');
    inner.className = 'ln';
    inner.style.transitionDelay = (k * 90) + 'ms';
    while (s.firstChild) inner.appendChild(s.firstChild);
    s.appendChild(inner);
    // keep i18n target on inner
    if (s.getAttribute('data-i18n')) { inner.setAttribute('data-i18n', s.getAttribute('data-i18n')); s.removeAttribute('data-i18n'); }
  });

  if (reduce) {
    $$('.reveal, .line, .reveal-lines').forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
    $$('.reveal, .line, .reveal-lines').forEach(function (el) { io.observe(el); });

    // stagger hero + heading lines
    $$('.hero__title .line, .cinema__title .line, .book__title .line').forEach(function (l, k) {
      var inner = l.querySelector('.line__in');
      if (inner) inner.style.transitionDelay = (k * 120) + 'ms';
    });
  }
  // re-apply lang after wrapping
  applyLang();

  /* ---------- count-up ---------- */
  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var suffix = el.getAttribute('data-suffix') || '';
    if (reduce) { el.textContent = target + suffix; return; }
    var start = performance.now(), dur = 1400;
    function step(now) {
      var p = clamp((now - start) / dur, 0, 1);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * e) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var cio = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { countUp(e.target); cio.unobserve(e.target); }
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach(function (el) { cio.observe(el); });

  /* ---------- nav hide / solid ---------- */
  var nav = $('#nav'), lastY = 0;
  function onNav() {
    var y = window.scrollY;
    nav.classList.toggle('is-solid', y > 60);
    if (y > lastY && y > 240) nav.classList.add('is-hidden');
    else nav.classList.remove('is-hidden');
    lastY = y;
  }

  /* ---------- rig spec stagger index ---------- */
  $$('.rig').forEach(function (rig) {
    $$('.rig__specs li', rig).forEach(function (li, k) { li.style.setProperty('--li', k); });
  });

  /* ---------- 3D tilt ---------- */
  if (!reduce && matchMedia('(pointer:fine)').matches) {
    $$('[data-tilt]').forEach(function (el) {
      el.addEventListener('mousemove', function (ev) {
        var r = el.getBoundingClientRect();
        var px = (ev.clientX - r.left) / r.width - 0.5;
        var py = (ev.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(900px) rotateY(' + (px * 6) + 'deg) rotateX(' + (-py * 6) + 'deg) translateY(-6px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------- magnetic + cursor ---------- */
  var cursor = $('.cursor'), cx = 0, cy = 0, rx = 0, ry = 0, ringRunning = false, lastMove = 0;
  if (!reduce && matchMedia('(pointer:fine)').matches) {
    var dotEl = cursor.querySelector('.cursor__dot'), ringEl = cursor.querySelector('.cursor__ring');
    function ring() {
      rx = lerp(rx, cx, 0.18); ry = lerp(ry, cy, 0.18);
      ringEl.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)';
      // keep looping only while the pointer is active — never spin idle
      if (performance.now() - lastMove < 300 || Math.hypot(cx - rx, cy - ry) > 0.5) requestAnimationFrame(ring);
      else ringRunning = false;
    }
    document.addEventListener('mousemove', function (e) {
      cx = e.clientX; cy = e.clientY; lastMove = performance.now();
      dotEl.style.transform = 'translate(' + cx + 'px,' + cy + 'px) translate(-50%,-50%)';
      if (!ringRunning) { ringRunning = true; requestAnimationFrame(ring); }
    });
    $$('a, button, [data-magnetic], [data-tilt]').forEach(function (el) {
      el.addEventListener('mouseenter', function () { cursor.classList.add('is-hover'); });
      el.addEventListener('mouseleave', function () { cursor.classList.remove('is-hover'); });
    });
    $$('[data-magnetic]').forEach(function (el) {
      el.addEventListener('mousemove', function (ev) {
        var r = el.getBoundingClientRect();
        el.style.transform = 'translate(' + ((ev.clientX - r.left - r.width / 2) * 0.28) + 'px,' + ((ev.clientY - r.top - r.height / 2) * 0.4) + 'px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  } else if (cursor) { cursor.style.display = 'none'; }

  /* ---------- hero mute ---------- */
  var heroVideo = $('.hero__video'), muteBtn = $('[data-mute]'), muteIco = $('[data-mute-ico]');
  if (muteBtn && heroVideo) {
    muteBtn.addEventListener('click', function () {
      heroVideo.muted = !heroVideo.muted;
      muteIco.textContent = heroVideo.muted ? '♪' : '◉';
      muteBtn.style.borderColor = heroVideo.muted ? '' : 'var(--amber-1)';
      if (!heroVideo.muted) heroVideo.play().catch(function(){});
    });
  }

  /* ---------- lazy video play ---------- */
  var vio = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting) { if (v.preload === 'none') v.preload = 'auto'; v.play().catch(function(){}); }
      else v.pause();
    });
  }, { threshold: 0.15 });
  $$('[data-bg-video]').forEach(function (v) { vio.observe(v); });

  /* ---------- horizontal pin (spaces) ---------- */
  var spaces = $('#spaces'), viewport = $('.spaces__viewport'),
      track = $('[data-track]'), rail = $('[data-rail]'), intro = $('.spaces__intro');
  var pinStart = 0, pinDist = 0;

  function absTop(el) { var t = 0; while (el) { t += el.offsetTop; el = el.offsetParent; } return t; }

  function layoutPin() {
    if (!spaces || reduce) {
      if (spaces && reduce) {
        viewport.style.position = 'static';
        viewport.style.height = 'auto';
        viewport.style.overflowX = 'auto';
        viewport.style.webkitOverflowScrolling = 'touch';
        track.style.transform = '';
      }
      return;
    }
    var vw = viewport.clientWidth;
    pinDist = Math.max(0, track.scrollWidth - vw + window.innerWidth * 0.04);
    spaces.style.height = (intro.offsetHeight + viewport.clientHeight + pinDist + 120) + 'px';
    pinStart = absTop(spaces) + intro.offsetHeight;
  }

  /* ---------- unified scroll loop ---------- */
  var heroMedia = $('[data-hero-media]');
  var parallaxEls = $$('[data-parallax]');
  var ticking = false;
  function frame() {
    var y = window.scrollY;
    // hero parallax + scale
    if (heroMedia && !reduce) {
      var hp = clamp(y / window.innerHeight, 0, 1);
      heroMedia.style.transform = 'scale(' + (1 + hp * 0.12) + ') translateY(' + (hp * 40) + 'px)';
      heroMedia.style.opacity = String(1 - hp * 0.35);
    }
    // ghost word parallax
    if (!reduce) parallaxEls.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var mid = (r.top + r.height / 2 - window.innerHeight / 2);
      var amt = parseFloat(el.getAttribute('data-parallax')) || 0.1;
      el.style.transform = 'translate(-50%,-50%) translateX(' + (mid * -amt) + 'px)';
    });
    // horizontal pin
    if (pinDist > 0 && !reduce) {
      var p = clamp((y - pinStart) / pinDist, 0, 1);
      track.style.transform = 'translateX(' + (-p * pinDist) + 'px)';
      if (rail) rail.style.width = (p * 100) + '%';
    }
    ticking = false;
  }
  function onScroll() {
    onNav();
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { layoutPin(); frame(); });

  /* ---------- pricing ---------- */
  var PC = {
    comfort: { peak: { 1: 5, 3: 12 }, off: { 1: 3, 3: 7 } },
    bootcamp:{ peak: { 1: 6, 3: 15 }, off: { 1: 4, 3: 10 } },
    vip:     { peak: { 1: 10, 3: 25 }, off: { 1: 8, 3: 20 } }
  };
  var PS5 = { peak: [15, 25, 35, 40, 45, 50], off: [7, 12, 17, 20, 22, 25] };
  var rate = 'peak', people = 2;

  function paintPC() {
    $$('.ptable__row[data-tier]').forEach(function (row) {
      var t = row.getAttribute('data-tier');
      var v1 = row.querySelector('[data-p1]'), v3 = row.querySelector('[data-p3]');
      [v1, v3].forEach(function (el) { el.classList.add('flip'); });
      setTimeout(function () {
        v1.textContent = '€' + PC[t][rate][1];
        v3.textContent = '€' + PC[t][rate][3];
        v1.classList.remove('flip'); v3.classList.remove('flip');
      }, 160);
    });
  }
  function paintPS5() {
    var amt = $('[data-ps5-amt]'), cnt = $('[data-people]'), dots = $('[data-dots]');
    if (cnt) cnt.textContent = people;
    if (amt) {
      amt.classList.add('flip');
      setTimeout(function () { amt.textContent = PS5[rate][people - 1]; amt.classList.remove('flip'); }, 160);
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
    if (pill && btn) { pill.style.width = btn.offsetWidth + 'px'; pill.style.transform = 'translateX(' + (btn.offsetLeft - 5) + 'px)'; }
  }
  $$('.toggle__btn').forEach(function (b) {
    b.addEventListener('click', function () {
      rate = b.getAttribute('data-rate');
      $$('.toggle__btn').forEach(function (x) { x.classList.remove('is-active'); });
      b.classList.add('is-active');
      movePill(b);
      paintPC(); paintPS5();
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
    var open = (h >= 13) || (h < 3);            // 13:00 – 03:00
    if (!open) return 'closed';
    var weekend = (day === 0 || day === 6);
    if (weekend) return 'peak';
    if (h >= 13 && h < 18) return 'off';         // weekday afternoon
    return 'peak';
  }
  function updateStatus() {
    var p = currentPeriod();
    var txt = {
      peak:  ['Open now · Peak', 'Открыто · Пик'],
      off:   ['Open now · Off-Peak', 'Открыто · Вне пика'],
      closed:['Closed now', 'Сейчас закрыто']
    }[p][lang === 'ru' ? 1 : 0];
    [['[data-status]', '[data-status-txt]'], ['[data-status2]', '[data-status2-txt]']].forEach(function (pair) {
      var wrap = $(pair[0]), t = $(pair[1]);
      if (t) t.textContent = txt;
      if (wrap) {
        var dot = wrap.querySelector('.dot');
        if (dot) dot.style.background = p === 'closed' ? 'var(--mute-2)' : 'var(--amber-1)';
        if (dot && p === 'closed') dot.style.animation = 'none';
      }
    });
  }

  /* ---------- testimonial nav ---------- */
  $('[data-q-next]') && $('[data-q-next]').addEventListener('click', function () {
    qIndex = (qIndex + 1) % QUOTES.length; renderQuote();
  });
  $('[data-q-prev]') && $('[data-q-prev]').addEventListener('click', function () {
    qIndex = (qIndex - 1 + QUOTES.length) % QUOTES.length; renderQuote();
  });

  /* ---------- init ---------- */
  window.addEventListener('load', function () { layoutPin(); frame(); });
  layoutPin();
  // set rate to current period on first load
  (function initRate() {
    var p = currentPeriod();
    rate = (p === 'off') ? 'off' : 'peak';
    var btn = $('.toggle__btn[data-rate="' + rate + '"]');
    if (btn) {
      $$('.toggle__btn').forEach(function (x) { x.classList.remove('is-active'); });
      btn.classList.add('is-active');
      requestAnimationFrame(function () { movePill(btn); });
    }
    paintPC(); paintPS5();
  })();
  updateStatus();
  onNav();
})();
