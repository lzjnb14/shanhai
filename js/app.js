/* =========================================================
   山海有灵 · 异兽人格图鉴
   ========================================================= */
(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const LETTER_NAMES = { E: '外向', I: '内向', S: '实感', N: '直觉', T: '思考', F: '情感', J: '判断', P: '感知' };
  const GROUP_CN = ['一', '二', '三', '四'];
  const STORE_KEY = 'shanhai.result.v1';
  const urlParams = new URLSearchParams(location.search);
  if (urlParams.get('static') === '1') document.documentElement.classList.add('no-anim');
  const showPart = urlParams.get('show');
  if (showPart) document.documentElement.classList.add('show-' + showPart);
  const beastByType = new Map(BEASTS.map(b => [b.type, b]));
  const beastById = new Map(BEASTS.map(b => [b.i, b]));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- 开场 · 入卷 ---------------- */
  const INTRO_KEY = 'shanhai.intro.v2';
  function initIntro() {
    const el = $('#intro');
    if (!el) return;
    const force = urlParams.get('intro') === '1';
    const isStatic = urlParams.get('static') === '1';
    let seen = false;
    try { seen = localStorage.getItem(INTRO_KEY) === '1'; } catch (e) { /* private mode */ }
    const deepLink = ['view', 'type', 'show', 'auto', 'card', 'nointro'].some(k => urlParams.has(k));
    if (!force && (seen || deepLink || isStatic || reducedMotion)) { el.remove(); return; }

    const root = document.documentElement;
    root.classList.add('intro-on');
    if (isStatic) root.classList.add('intro-static');
    requestAnimationFrame(() => el.classList.add('play'));

    let closed = false;
    const LEAVE_MS = 1180;
    const finish = () => {
      if (closed) return;
      closed = true;
      try { localStorage.setItem(INTRO_KEY, '1'); } catch (e) { /* ignore */ }
      el.classList.add('sealing');
      setTimeout(() => {
        el.classList.add('leaving');
        setTimeout(() => {
          el.remove();
          root.classList.remove('intro-on');
          root.classList.add('intro-done');
        }, LEAVE_MS);
      }, 230);
    };

    const enter = $('#introEnter');
    const skip = $('#introSkip');
    if (enter) enter.addEventListener('click', e => { e.stopPropagation(); finish(); });
    if (skip) skip.addEventListener('click', e => { e.stopPropagation(); finish(); });
    el.addEventListener('click', finish);
    const onKey = e => {
      if (closed) return;
      if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') { e.preventDefault(); finish(); }
    };
    document.addEventListener('keydown', onKey);

    if (urlParams.get('finish') === '1') setTimeout(finish, 900);

    if (!isStatic) setTimeout(() => { if (!closed && enter) enter.focus({ preventScroll: true }); }, 2200);
  }
  initIntro();

  const replayIntro = $('#replayIntro');
  if (replayIntro) {
    replayIntro.addEventListener('click', () => {
      try { localStorage.removeItem(INTRO_KEY); } catch (e) { /* ignore */ }
      location.href = location.href.split('?')[0].split('#')[0] + '?intro=1';
    });
  }

  const state = {
    quiz: {
      open: false, mode: 'full', questions: [], answers: [],
      idx: 0, phase: 'quiz', ties: [], tieIdx: 0, tieAns: {},
      locked: false, lastGroup: -1
    },
    current: null,
    art: 'gut',
    sound: false
  };

  /* ---------------- 小工具 ---------------- */
  const pad2 = n => String(n).padStart(2, '0');
  const artSrc = (b, kind = 'gut') => `assets/${kind}/${pad2(b.i)}.webp`;
  const letterName = ch => LETTER_NAMES[ch] || '';
  const hexToRgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };

  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  function lockBody() {
    document.body.classList.toggle('locked', !!$('.overlay.open'));
  }
  function openOverlay(el) {
    $$('.overlay.open').forEach(o => {
      if (o !== el) { o.classList.remove('open'); o.setAttribute('aria-hidden', 'true'); }
    });
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
    lockBody();
  }
  function closeOverlay(el) {
    if (!el) return;
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
    lockBody();
  }
  function closeAll() {
    $$('.overlay.open').forEach(o => { o.classList.remove('open'); o.setAttribute('aria-hidden', 'true'); });
    lockBody();
  }

  /* ---------------- 飞尘 ---------------- */
  (function motes() {
    const canvas = $('#motes');
    if (!canvas || reducedMotion) return;
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dots = [], raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = w < 700 ? 22 : 46;
      dots = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 1.5 + 0.4,
        vy: -(Math.random() * 0.16 + 0.03),
        vx: (Math.random() - 0.5) * 0.12,
        a: Math.random() * 0.25 + 0.06,
        red: Math.random() > 0.86,
        ph: Math.random() * Math.PI * 2
      }));
    }
    function frame(t) {
      ctx.clearRect(0, 0, w, h);
      dots.forEach(d => {
        d.y += d.vy; d.x += d.vx + Math.sin(t / 3200 + d.ph) * 0.08;
        if (d.y < -10) { d.y = h + 10; d.x = Math.random() * w; }
        if (d.x < -10) d.x = w + 10;
        if (d.x > w + 10) d.x = -10;
        ctx.beginPath();
        ctx.fillStyle = d.red ? `rgba(165,51,42,${d.a * 0.8})` : `rgba(92,72,44,${d.a})`;
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      });
      raf = requestAnimationFrame(frame);
    }
    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(frame);
    });
  })();

  /* ---------------- 滚动 / 入场 ---------------- */
  const topbar = $('#topbar');
  const onScroll = () => topbar.classList.toggle('scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  function observeReveals(root = document) {
    $$('.reveal', root).forEach(el => {
      if (el.classList.contains('in')) return;
      io.observe(el);
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92 && r.bottom > 0) el.classList.add('in');
    });
  }
  observeReveals();

  /* ---------------- 卷首圆盘 ---------------- */
  let discIndex = 0, discTimer = 0, discBusy = false;
  const discEl = $('#beastDisc');
  const discCaption = $('#discCaption');

  function renderDisc(index, withAnim = true) {
    const b = BEASTS[index % BEASTS.length];
    discIndex = index % BEASTS.length;
    const apply = () => {
      const img = $('#discImg');
      img.src = artSrc(b);
      img.alt = `${b.name}工笔插画`;
      $('#capType').textContent = b.type;
      $('#capName').textContent = b.name;
      $('#capChapter').textContent = b.chapter;
      discEl.classList.remove('swapping');
      discCaption.classList.remove('swapping');
      const prev = BEASTS[(index + 1) % BEASTS.length];
      const next = BEASTS[(index + 15) % BEASTS.length];
      [prev, next].forEach(nb => { const i = new Image(); i.src = artSrc(nb); });
    };
    if (!withAnim) { apply(); return; }
    if (discBusy) return;
    discBusy = true;
    discEl.classList.add('swapping');
    discCaption.classList.add('swapping');
    setTimeout(() => { apply(); setTimeout(() => { discBusy = false; }, 240); }, 330);
  }
  function nextDisc() { renderDisc(discIndex + 1); }
  function startDiscTimer() {
    stopDiscTimer();
    if (reducedMotion) return;
    discTimer = setInterval(nextDisc, 6200);
  }
  function stopDiscTimer() { clearInterval(discTimer); }

  $('#discNext').addEventListener('click', e => { e.stopPropagation(); nextDisc(); startDiscTimer(); });
  discEl.addEventListener('click', () => openDetail(BEASTS[discIndex]));
  discEl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(BEASTS[discIndex]); } });
  $('.orbit').addEventListener('mouseenter', stopDiscTimer);
  $('.orbit').addEventListener('mouseleave', startDiscTimer);
  startDiscTimer();

  /* ---------------- 走马灯 ---------------- */
  (function buildMarquee() {
    const track = $('#marqueeTrack');
    if (!track) return;
    const html = BEASTS.map(b => `
      <span class="m-item">
        <img src="${artSrc(b, 'q')}" alt="" loading="lazy">
        <b>${b.name}</b>
        <em>${b.type}</em>
        <span>${b.kanji}</span>
        <span class="m-sep">/</span>
      </span>`).join('');
    track.innerHTML = html + html;
  })();

  /* ---------------- 图鉴 ---------------- */
  let currentFilter = 'all';

  function renderCodex(filter = 'all') {
    const grid = $('#codexGrid');
    const list = filter === 'all' ? BEASTS : BEASTS.filter(b => b.family === filter);
    grid.innerHTML = list.map((b, idx) => `
      <article class="beast-card" data-id="${b.i}" tabindex="0" role="button"
        aria-label="查看${b.name}的图鉴" style="--fam:${FAMILIES[b.family].color};animation-delay:${Math.min(idx * 45, 360)}ms">
        <div class="card-media">
          <img src="${artSrc(b)}" alt="${b.name}工笔插画" loading="lazy">
          <span class="card-num">${b.kanji}</span>
          <span class="card-type">${b.type}</span>
        </div>
        <div class="card-body">
          <h3>${b.name}</h3>
          <p class="card-line">${b.one}</p>
          <div class="card-foot">
            <span class="card-chapter">${b.chapter}</span>
            <span class="card-open">展开 ↗</span>
          </div>
        </div>
      </article>`).join('');
  }
  renderCodex();

  $('#codexGrid').addEventListener('click', e => {
    const card = e.target.closest('.beast-card');
    if (card) openDetail(beastById.get(Number(card.dataset.id)));
  });
  $('#codexGrid').addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.beast-card');
    if (card) { e.preventDefault(); openDetail(beastById.get(Number(card.dataset.id))); }
  });

  $$('.filter').forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilter = btn.dataset.family;
      $$('.filter').forEach(b => b.classList.toggle('on', b === btn));
      renderCodex(currentFilter);
    });
  });

  /* ---------------- 图鉴详情 ---------------- */
  function detailMarkup(b) {
    const fam = FAMILIES[b.family];
    return `
      <div class="detail-head">
        <div class="dh-glow" style="background:radial-gradient(circle,${hexToRgba(fam.color, .26)},transparent 62%)"></div>
        <div class="dh-char">${b.name.slice(-1)}</div>
        <div class="dh-inner">
          <p class="dh-type">图鉴 ${b.kanji} · ${b.type}</p>
          <h1 class="dh-name">${b.name}</h1>
          <p class="res-alias" style="color:rgba(244,233,210,.55)">
            <span>${b.alias}</span><i>·</i><span>${b.chapter}</span><i>·</i><span>${fam.name}</span>
          </p>
          <p class="dh-one">「${b.one}」</p>
          <span class="dh-family">${fam.seal} · ${fam.motto}</span>
        </div>
      </div>
      <div class="detail-grid">
        <div class="detail-figure">
          <figure class="art-frame">
            <img src="${artSrc(b)}" alt="${b.name}工笔插画" data-detail-img>
            <span class="art-corner tl"></span><span class="art-corner tr"></span>
            <span class="art-corner bl"></span><span class="art-corner br"></span>
            <figcaption class="art-caption"><span data-detail-caption>图 · ${b.name}</span><i data-detail-style>工笔淡彩</i></figcaption>
          </figure>
          <div class="art-switch" role="group" aria-label="切换画风">
            <button data-art="gut" class="on">工笔</button>
            <button data-art="q">Q版</button>
          </div>
          <div class="detail-actions">
            <button class="btn btn-primary" data-detail-start><span>测一测</span><i>三十二问</i></button>
            <button class="btn btn-ghost" data-close-detail>收起</button>
          </div>
          <p class="detail-note">据《山海经》十八卷通行本 · 原文引用已标篇目</p>
        </div>
        <div class="detail-body">
          <blockquote class="res-quote">
            <span class="quote-mark">“</span>
            <p>${b.quote}</p>
            <cite>${b.source}</cite>
          </blockquote>
          <section class="res-field">
            <h3><span class="fnum">壹</span>性情关键词</h3>
            <div class="chips">${b.keys.map(k => `<span>${k}</span>`).join('')}</div>
          </section>
          <section class="res-field">
            <h3><span class="fnum">贰</span>对应关系</h3>
            <p>${b.why}</p>
          </section>
          <section class="res-field shadow">
            <h3><span class="fnum">叁</span>阴影面</h3>
            <p>${b.shadow}</p>
          </section>
          <section class="res-field tip">
            <h3><span class="fnum">肆</span>相处提示</h3>
            <p>${b.tip}</p>
          </section>
        </div>
      </div>`;
  }

  function openDetail(b) {
    if (!b) return;
    state.current = b;
    state.art = 'gut';
    $('#detailInner').innerHTML = detailMarkup(b);
    openOverlay($('#detailOverlay'));
    $('#detailScroll').scrollTop = 0;
    observeReveals($('#detailOverlay'));
  }

  $('#detailOverlay').addEventListener('click', e => {
    if (e.target.closest('[data-close-detail]') || e.target.id === 'detailClose') {
      closeOverlay($('#detailOverlay'));
    }
    const artBtn = e.target.closest('[data-art]');
    if (artBtn) setArt(artBtn.dataset.art, $('#detailOverlay'));
    if (e.target.closest('[data-detail-start]')) {
      closeAll();
      setTimeout(() => startQuiz('full'), 120);
    }
  });

  /* ---------------- 画风切换 ---------------- */
  function setArt(kind, scope) {
    if (!state.current) return;
    state.art = kind;
    const b = state.current;
    const img = $('[data-detail-img]', scope) || $('#resImg', scope);
    if (img) {
      img.style.opacity = '0';
      setTimeout(() => {
        img.src = artSrc(b, kind);
        img.style.opacity = '1';
      }, 160);
    }
    const cap = $('[data-detail-caption]', scope) || $('#resArtCaption', scope);
    if (cap) cap.textContent = `图 · ${b.name}`;
    const style = $('[data-detail-style]', scope) || $('.art-caption i', scope);
    if (style) style.textContent = kind === 'gut' ? '工笔淡彩' : 'Q版稚趣';
    $$('.art-switch', scope).forEach(sw => {
      $$('button', sw).forEach(btn => btn.classList.toggle('on', btn.dataset.art === kind));
    });
    const mainImg = $('#resImg');
    if (mainImg && scope === $('#resultOverlay')) mainImg.alt = `${b.name}${kind === 'gut' ? '工笔' : 'Q版'}插画`;
  }
  $('#resultOverlay').addEventListener('click', e => {
    const artBtn = e.target.closest('[data-art]');
    if (artBtn) setArt(artBtn.dataset.art, $('#resultOverlay'));
  });

  /* ---------------- 测灵 ---------------- */
  const quizState = state.quiz;

  function buildQuestions(mode) {
    const keys = ['EI', 'SN', 'TF', 'JP'];
    const list = [];
    keys.forEach((key, g) => {
      QUIZ[key].forEach(([stem, a, b], j) => {
        if (mode === 'quick' && j > 1) return;
        list.push({ g, stem, a, b });
      });
    });
    return list;
  }

  function groupLabel(g) {
    const p = POLES[g];
    return `第${GROUP_CN[g]}组 · ${p.axis}`;
  }

  function buildProgressTicks(n) {
    $('#progressTicks').innerHTML = Array.from({ length: n }, () => '<i></i>').join('');
    $('#quizDots').innerHTML = POLES.map((p, i) =>
      `<span class="qdot" data-g="${i}" title="${p.axis}"><b>${p.glyph}</b></span>`).join('');
  }

  function updateChrome() {
    const n = quizState.questions.length;
    const idx = quizState.idx;
    let pct = 0, label = '', group = '', stage = pad2(idx + 1);

    if (quizState.phase === 'tie') {
      pct = 100;
      label = `补问 ${pad2(quizState.tieIdx + 1)} / ${pad2(quizState.ties.length)}`;
      group = '补问 · 平票定夺';
      stage = '补';
    } else {
      pct = Math.round((idx / n) * 100);
      label = `第 ${pad2(idx + 1)} 问 / ${n}`;
      group = groupLabel(quizState.questions[idx].g);
    }
    $('#progressFill').style.width = pct + '%';
    $('#progressPct').textContent = pct + '%';
    $('#progressLabel').textContent = label;
    $('#quizGroup').textContent = group;
    $('#stageNum').textContent = stage;
    $('#qKicker').textContent = group;

    $$('#progressTicks i').forEach((t, i) => {
      t.classList.toggle('done', quizState.phase === 'tie' || i < idx);
      t.classList.toggle('now', quizState.phase !== 'tie' && i === idx);
    });
    const g = quizState.questions[idx] ? quizState.questions[idx].g : -1;
    $$('.qdot').forEach((d, i) => {
      d.classList.toggle('on', quizState.phase === 'tie' ? false : i === g);
      d.classList.toggle('done', quizState.phase === 'tie' ? true : i < g);
    });

    $('#quizMode').textContent = quizState.mode === 'quick' ? '速测 · 八问' : '测灵 · 三十二问';
    $('#quizFootNote').textContent = quizState.phase === 'tie'
      ? '这一组打成平票，凭第一直觉再答一题。'
      : '题目只描述日常倾向，没有对错。';
  }

  function splitStem(el, text) {
    el.innerHTML = '';
    Array.from(text).forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'ch';
      span.textContent = ch;
      span.style.animationDelay = Math.min(i * 13, 380) + 'ms';
      el.appendChild(span);
    });
  }

  function renderQuestion(withFlash = false) {
    const q = quizState.questions[quizState.idx];
    const p = POLES[q.g];
    splitStem($('#qStem'), q.stem);
    $('#qOptions').innerHTML = [
      { choice: 0, text: q.a, pole: p.a, name: p.aName, letter: 'A' },
      { choice: 1, text: q.b, pole: p.b, name: p.bName, letter: 'B' }
    ].map(o => `
      <button class="opt" data-choice="${o.choice}">
        <span class="opt-letter">${o.letter}</span>
        <span class="opt-text">${o.text}</span>
        <span class="opt-pole">${o.pole} · ${o.name}</span>
      </button>`).join('');
    $('#qBack').disabled = quizState.idx === 0;
    updateChrome();
    $('#qCard').style.animation = 'none';
    void $('#qCard').offsetWidth;
    $('#qCard').style.animation = '';

    const groupChanged = q.g !== quizState.lastGroup;
    quizState.lastGroup = q.g;
    if (withFlash && groupChanged) flashChapter(q.g, () => {});
  }

  function flashChapter(g, done) {
    const p = POLES[g];
    const flash = $('#chapterFlash');
    $('#cfGlyph').textContent = p.glyph;
    $('#cfRoman').textContent = `第${GROUP_CN[g]}组`;
    $('#cfAxis').textContent = p.axis;
    flash.classList.remove('show');
    void flash.offsetWidth;
    flash.classList.add('show');
    quizState.locked = true;
    setTimeout(() => {
      flash.classList.remove('show');
      quizState.locked = false;
      if (done) done();
    }, reducedMotion ? 100 : 1080);
  }

  function renderTie(withFlash = true) {
    const tie = quizState.ties[quizState.tieIdx];
    const p = POLES[tie.g];
    $('#qKicker').textContent = '补问 · 平票定夺';
    $('#quizGroup').textContent = '补问 · 平票定夺';
    splitStem($('#qStem'), tie.stem);
    $('#qOptions').innerHTML = [
      { choice: 0, text: tie.a, pole: p.a, name: p.aName, letter: 'A' },
      { choice: 1, text: tie.b, pole: p.b, name: p.bName, letter: 'B' }
    ].map(o => `
      <button class="opt" data-choice="${o.choice}">
        <span class="opt-letter">${o.letter}</span>
        <span class="opt-text">${o.text}</span>
        <span class="opt-pole">${o.pole} · ${o.name}</span>
      </button>`).join('');
    $('#qBack').disabled = false;
    updateChrome();
    $('#qCard').style.animation = 'none';
    void $('#qCard').offsetWidth;
    $('#qCard').style.animation = '';
    if (withFlash) {
      flashChapter(tie.g, () => {});
    }
  }

  function startQuiz(mode = 'full', jumpTo = null) {
    closeAll();
    const qs = buildQuestions(mode);
    quizState.open = true;
    quizState.mode = mode;
    quizState.questions = qs;
    quizState.answers = Array(qs.length).fill(null);
    quizState.idx = 0;
    quizState.phase = 'quiz';
    quizState.ties = [];
    quizState.tieIdx = 0;
    quizState.tieAns = {};
    quizState.locked = false;
    quizState.lastGroup = -1;
    buildProgressTicks(qs.length);
    openOverlay($('#quizOverlay'));
    if (jumpTo && jumpTo > 0) {
      quizState.idx = Math.min(qs.length - 1, jumpTo);
      for (let i = 0; i < quizState.idx; i++) quizState.answers[i] = 0;
      renderQuestion(false);
    } else {
      renderQuestion(true);
    }
    $('#qCard').scrollTop = 0;
  }

  $('#quizOverlay').addEventListener('click', e => {
    const opt = e.target.closest('.opt');
    if (opt) { pickChoice(Number(opt.dataset.choice)); return; }
    if (e.target.closest('#qBack')) { goBack(); return; }
    if (e.target.closest('#quizClose')) { closeQuiz(); }
  });

  function pickChoice(choice) {
    if (quizState.locked || !quizState.open) return;
    quizState.locked = true;
    const isTie = quizState.phase === 'tie';
    const q = isTie ? quizState.ties[quizState.tieIdx] : quizState.questions[quizState.idx];
    if (!q) return;
    if (!isTie) quizState.answers[quizState.idx] = choice;
    else quizState.tieAns[q.g] = choice;

    $$('.opt').forEach(o => o.classList.toggle('picked', Number(o.dataset.choice) === choice));
    const n = quizState.questions.length;
    if (!isTie) $('#progressFill').style.width = Math.round(((quizState.idx + 1) / n) * 100) + '%';
    playBell(choice === 0 ? 784 : 988);

    setTimeout(() => {
      quizState.locked = false;
      if (isTie) {
        if (quizState.tieIdx < quizState.ties.length - 1) {
          quizState.tieIdx++;
          renderTie(true);
        } else {
          finalize();
        }
      } else if (quizState.idx < n - 1) {
        quizState.idx++;
        renderQuestion(true);
      } else {
        finishMain();
      }
    }, reducedMotion ? 60 : 300);
  }

  function goBack() {
    if (quizState.locked) return;
    const n = quizState.questions.length;
    if (quizState.phase === 'tie') {
      if (quizState.tieIdx > 0) {
        quizState.tieIdx--;
        delete quizState.tieAns[quizState.ties[quizState.tieIdx].g];
        renderTie(false);
      } else {
        quizState.phase = 'quiz';
        quizState.idx = n - 1;
        quizState.answers[n - 1] = null;
        renderQuestion(false);
      }
      return;
    }
    if (quizState.idx === 0) return;
    quizState.idx--;
    quizState.answers[quizState.idx] = null;
    renderQuestion(false);
  }

  function tally() {
    const counts = [0, 0, 0, 0];
    quizState.questions.forEach((q, i) => {
      if (quizState.answers[i] === 0) counts[q.g]++;
    });
    return counts;
  }

  function perGroup() {
    return quizState.mode === 'quick' ? 2 : 8;
  }

  function finishMain() {
    const counts = tally();
    const total = perGroup();
    quizState.ties = [];
    for (let g = 0; g < 4; g++) {
      if (counts[g] * 2 === total) quizState.ties.push(TIEBREAKS.find(t => t.g === g));
    }
    if (quizState.ties.length) {
      quizState.phase = 'tie';
      quizState.tieIdx = 0;
      quizState.tieAns = {};
      renderTie(true);
    } else {
      finalize();
    }
  }

  function finalize() {
    const counts = tally();
    let total = perGroup();
    const dims = [];
    let type = '';
    for (let g = 0; g < 4; g++) {
      let c = counts[g], t = total;
      if (c * 2 === t) {
        const pick = quizState.tieAns[g];
        if (pick === 0) c += 1;
        t += 1;
      }
      const pct = Math.round((c / t) * 100);
      const p = POLES[g];
      type += pct > 50 ? p.a : p.b;
      dims.push(Math.max(6, Math.min(94, pct)));
    }
    const b = beastByType.get(type);
    if (!b) { toast('没有找到对应的异兽，请再试一次'); return; }
    saveResult({ type, dims });
    closeAll();
    setTimeout(() => openResult(b, dims), 180);
    playBell(660, 0.5);
  }

  function closeQuiz() {
    closeAll();
    quizState.open = false;
    if (quizState.idx > 0) toast('已退出测灵，本次作答未保存');
  }

  /* ---------------- 结果 ---------------- */
  const defaultDims = type => POLES.map((p, i) => {
    const first = type[i] === p.a;
    const base = 58 + ((i * 11) % 16);
    return first ? base : 100 - base;
  });

  function renderTypeLetters(type) {
    return Array.from(type).map((ch, i) => `
      <span class="tl-item" style="animation-delay:${0.25 + i * 0.11}s">
        <b>${ch}</b><i>${letterName(ch)}</i>
      </span>`).join('');
  }

  function renderDims(dims) {
    return POLES.map((p, g) => {
      const left = dims[g];
      const right = 100 - left;
      const leftOn = left >= right;
      return `
        <div class="dim">
          <div class="dim-top">
            <span class="${leftOn ? 'on' : ''}">${p.a} · ${p.aName}</span>
            <span class="dim-axis">${p.axis}</span>
            <span class="${!leftOn ? 'on' : ''}">${p.bName} · ${p.b}</span>
          </div>
          <div class="dim-track"><div class="dim-fill" data-pct="${left}"></div><span class="mid"></span></div>
          <div class="dim-pct"><span>${left}%</span><span>${right}%</span></div>
        </div>`;
    }).join('');
  }

  function fillResult(b, dims) {
    const fam = FAMILIES[b.family];
    state.current = b;
    state.art = 'gut';

    $('#resType').innerHTML = renderTypeLetters(b.type);
    $('#resName').textContent = b.name;
    $('#resAlias').textContent = b.alias;
    $('#resChapter').textContent = b.chapter;
    $('#resFamily').textContent = `${fam.name} · ${fam.motto}`;
    $('#resOne').textContent = `「${b.one}」`;
    $('#resBigChar').textContent = b.name.slice(-1);
    $('#resImg').src = artSrc(b);
    $('#resImg').alt = `${b.name}工笔插画`;
    $('#resArtCaption').textContent = `图 · ${b.name}`;
    $('.art-caption i', $('#resultOverlay')).textContent = '工笔淡彩';
    const qLines = b.quote.split('\n')
      .map(s => s.replace(/（《[^》]*》）\s*$/, '').trim())
      .filter(Boolean);
    const qBox = $('#resQuote');
    qBox.innerHTML = '';
    qLines.forEach(t => {
      const p = document.createElement('p');
      p.textContent = t;
      qBox.appendChild(p);
    });
    const vLine = (qLines[0] || b.one).replace(/^「|」$/g, '');
    let vText = '';
    for (const part of vLine.split('，')) {
      const next = vText ? vText + '，' + part : part;
      if (next.length > 10) break;
      vText = next;
    }
    $('#resVerse').textContent = vText || vLine.slice(0, 14);
    $('#resSource').textContent = b.source;
    $('#resKeys').innerHTML = b.keys.map(k => `<span>${k}</span>`).join('');
    $('#resWhy').textContent = b.why;
    $('#resShadow').textContent = b.shadow;
    $('#resTip').textContent = b.tip;
    const panel = $('.dim-panel', $('#resultOverlay'));
    if (dims) {
      panel.hidden = false;
      $('#resDims').innerHTML = renderDims(dims);
    } else {
      panel.hidden = true;
      $('#resDims').innerHTML = '';
    }
    $('.rh-glow', $('#resultOverlay')).style.background =
      `radial-gradient(circle, ${hexToRgba(fam.color, .34)}, transparent 62%)`;
    $$('.art-switch button', $('#resultOverlay')).forEach(btn => btn.classList.toggle('on', btn.dataset.art === 'gut'));
  }

  function openResult(b, dims, opts = {}) {
    fillResult(b, dims);
    openOverlay($('#resultOverlay'));
    const scroll = $('#resultScroll');
    scroll.scrollTop = 0;
    $$('#resultOverlay .reveal').forEach(el => el.classList.remove('in'));
    setTimeout(() => {
      $$('#resultOverlay .reveal').forEach(el => el.classList.add('in'));
      if (dims) {
        requestAnimationFrame(() => {
          $$('#resDims .dim-fill').forEach(el => { el.style.width = el.dataset.pct + '%'; });
        });
      }
    }, 120);
    document.title = `${b.name} · ${b.type}｜山海有灵 · 异兽人格图鉴`;
    if (!opts.silent) saveResult({ type: b.type, dims: dims || defaultDims(b.type) });
  }

  function saveResult(data) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ ...data, ts: Date.now() })); } catch (e) { /* ignore */ }
    refreshLastResult();
  }

  function refreshLastResult() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { saved = null; }
    const chip = $('#lastResult');
    const b = saved && beastByType.get(saved.type);
    if (!b) { chip.hidden = true; return; }
    chip.hidden = false;
    $('#lrType').textContent = b.type;
    $('#lrName').textContent = b.name;
    chip.dataset.type = b.type;
  }
  refreshLastResult();

  $('#lastResult').addEventListener('click', e => {
    e.preventDefault();
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (err) { saved = null; }
    const b = saved && beastByType.get(saved.type);
    if (b) openResult(b, saved.dims && saved.dims.length === 4 ? saved.dims : defaultDims(b.type));
  });

  $('#resultClose').addEventListener('click', () => {
    closeOverlay($('#resultOverlay'));
    document.title = '山海有灵 · 异兽人格图鉴｜你是《山海经》里的哪一只兽';
  });
  $('#backToCodex').addEventListener('click', () => {
    closeOverlay($('#resultOverlay'));
    document.title = '山海有灵 · 异兽人格图鉴｜你是《山海经》里的哪一只兽';
    setTimeout(() => $('#codex').scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
  });
  $('#copyResult').addEventListener('click', async () => {
    const b = state.current;
    if (!b) return;
    const text = `我的本命异兽是「${b.name}」${b.type}——${b.one}。\n${b.quote.split('\n')[0]}\n${b.why}\n—— 山海有灵 · 异兽人格图鉴`;
    try {
      await navigator.clipboard.writeText(text);
      toast('结果已复制，可以发给朋友了');
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('结果已复制，可以发给朋友了'); }
      catch (err) { toast('复制失败，请手动选择文字'); }
      ta.remove();
    }
  });

  /* ---------------- 保存灵签 ---------------- */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawSpaced(ctx, text, cx, y, spacing) {
    const chars = Array.from(text);
    const widths = chars.map(ch => ctx.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
    let x = cx - total / 2;
    chars.forEach((ch, i) => {
      ctx.fillText(ch, x, y);
      x += widths[i] + spacing;
    });
  }

  async function saveCard() {
    const b = state.current;
    if (!b) return;
    const btn = $('#saveCard');
    const old = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span>正在落款…</span>';

    try {
      if (!window.CARD_IMAGES) {
        try { await loadScript('js/cardimages.js'); } catch (e) { /* fallback */ }
      }
      const W = 1080, H = 1440;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');

      const src = (window.CARD_IMAGES && window.CARD_IMAGES[b.i]) || artSrc(b, 'gut');
      const img = new Image();
      img.src = src;
      await img.decode();
      if (document.fonts && document.fonts.ready) {
        try { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
      }

      // 纸底
      ctx.fillStyle = '#efe4cd';
      ctx.fillRect(0, 0, W, H);
      let g = ctx.createRadialGradient(880, 120, 40, 880, 120, 900);
      g.addColorStop(0, 'rgba(207,170,105,.30)');
      g.addColorStop(1, 'rgba(207,170,105,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      g = ctx.createRadialGradient(120, 300, 30, 120, 300, 700);
      g.addColorStop(0, 'rgba(255,252,242,.65)');
      g.addColorStop(1, 'rgba(255,252,242,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      // 细颗粒
      ctx.save();
      for (let i = 0; i < 11000; i++) {
        const x = Math.random() * W, y = Math.random() * H;
        ctx.fillStyle = `rgba(70,52,28,${Math.random() * 0.045})`;
        ctx.fillRect(x, y, 1, 1);
      }
      ctx.restore();

      // 边框
      ctx.strokeStyle = 'rgba(165,124,60,.85)'; ctx.lineWidth = 2;
      ctx.strokeRect(40, 40, W - 80, H - 80);
      ctx.strokeStyle = 'rgba(165,124,60,.4)'; ctx.lineWidth = 1;
      ctx.strokeRect(54, 54, W - 108, H - 108);

      // 顶部小印
      ctx.fillStyle = '#a5332a';
      ctx.fillRect(W / 2 - 19, 78, 38, 38);
      ctx.fillStyle = '#f4e9d2';
      ctx.font = '20px "KaiTi","STKaiti",serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('灵', W / 2, 98);

      ctx.fillStyle = '#5d4c35';
      ctx.font = '26px "Songti SC","SimSun",serif';
      ctx.textBaseline = 'alphabetic';
      drawSpaced(ctx, '山海经 · 异兽人格图鉴', W / 2, 172, 7);

      // 主图
      const ix = 220, iy = 208, iw = 640, ih = 640;
      ctx.save();
      roundRect(ctx, ix, iy, iw, ih, 4);
      ctx.clip();
      ctx.drawImage(img, ix, iy, iw, ih);
      ctx.restore();
      ctx.strokeStyle = 'rgba(165,124,60,.8)'; ctx.lineWidth = 2;
      ctx.strokeRect(ix - 6, iy - 6, iw + 12, ih + 12);
      ctx.strokeStyle = 'rgba(255,252,242,.5)'; ctx.lineWidth = 1;
      ctx.strokeRect(ix - 1, iy - 1, iw + 2, ih + 2);

      // 类型
      ctx.fillStyle = '#a57c3c';
      ctx.font = '58px "Songti SC","SimSun",serif';
      drawSpaced(ctx, b.type, W / 2, 930, 26);

      // 兽名
      ctx.fillStyle = '#241f18';
      ctx.font = '108px "KaiTi","STKaiti",serif';
      ctx.textAlign = 'center';
      drawSpaced(ctx, b.name, W / 2, 1052, 14);

      // 一句话
      ctx.fillStyle = '#4a3f31';
      ctx.font = '34px "KaiTi","STKaiti",serif';
      drawSpaced(ctx, `「${b.one}」`, W / 2, 1112, 4);

      // 关键词
      ctx.fillStyle = '#7c6d58';
      ctx.font = '24px "Songti SC","SimSun",serif';
      drawSpaced(ctx, b.keys.join('　·　'), W / 2, 1162, 2);

      // 分隔线
      ctx.strokeStyle = 'rgba(36,31,24,.18)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(300, 1200); ctx.lineTo(780, 1200); ctx.stroke();

      // 朱印
      ctx.save();
      ctx.translate(W / 2, 1290);
      ctx.rotate(-0.06);
      ctx.fillStyle = '#a5332a';
      ctx.fillRect(-52, -52, 104, 104);
      ctx.strokeStyle = 'rgba(239,228,205,.65)'; ctx.lineWidth = 2;
      ctx.strokeRect(-44, -44, 88, 88);
      ctx.fillStyle = '#f4e9d2';
      ctx.font = '34px "KaiTi","STKaiti",serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('山海', 0, -1);
      ctx.restore();

      // 页脚
      ctx.fillStyle = 'rgba(36,31,24,.48)';
      ctx.font = '21px "Songti SC","SimSun",serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      drawSpaced(ctx, '据《山海经》十八卷通行本 · 一兽一型 · 仅供娱乐', W / 2, 1382, 3);

      if (urlParams.get('card') === '1') {
        canvas.style.cssText = 'position:fixed;left:0;top:0;width:1080px;height:1440px;z-index:9999';
        document.body.appendChild(canvas);
        return;
      }

      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
      if (!blob) throw new Error('canvas empty');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `山海灵签_${b.type}_${b.name}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast('灵签已生成，正在下载');
    } catch (err) {
      console.error(err);
      toast('灵签生成失败，请用本地服务器打开页面重试');
    } finally {
      btn.disabled = false;
      btn.innerHTML = old;
    }
  }
  $('#saveCard').addEventListener('click', saveCard);

  /* ---------------- 声音 ---------------- */
  let audio = null;

  async function enableSound() {
    if (!audio) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      const ctx = new AC();
      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      const len = Math.floor(ctx.sampleRate * 4);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.015 * white) / 1.015;
        data[i] = last * 3.2;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 360; lp.Q.value = 0.6;
      const ng = ctx.createGain(); ng.gain.value = 0.7;
      src.connect(lp).connect(ng).connect(master);
      src.start();
      audio = { ctx, master };
    }
    if (audio.ctx.state === 'suspended') await audio.ctx.resume();
    audio.master.gain.cancelScheduledValues(audio.ctx.currentTime);
    audio.master.gain.setTargetAtTime(0.10, audio.ctx.currentTime, 0.8);
    return audio;
  }

  function playBell(freq = 880, dur = 1.4) {
    if (!state.sound || !audio) return;
    const { ctx, master } = audio;
    const t = ctx.currentTime;
    [1, 2.01, 2.99].forEach((mult, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * mult;
      const peak = 0.10 / (i + 1);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur * (1 - i * 0.18));
      osc.connect(g).connect(master);
      osc.start(t); osc.stop(t + dur);
    });
  }

  $('#soundBtn').addEventListener('click', async () => {
    state.sound = !state.sound;
    $('#soundBtn').setAttribute('aria-pressed', String(state.sound));
    $('#soundBtn').querySelector('.sound-label').textContent = state.sound ? '静声' : '风声';
    if (state.sound) {
      const a = await enableSound();
      if (!a) { state.sound = false; $('#soundBtn').setAttribute('aria-pressed', 'false'); return; }
      playBell(660, 1.2);
      toast('风声已开');
    } else if (audio) {
      audio.master.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.4);
    }
  });

  /* ---------------- 全局点击 ---------------- */
  document.addEventListener('click', e => {
    const start = e.target.closest('[data-start]');
    if (start) {
      const mode = start.dataset.start === 'quick' ? 'quick' : 'full';
      closeAll();
      setTimeout(() => startQuiz(mode), 80);
    }
  });

  /* ---------------- 键盘 ---------------- */
  document.addEventListener('keydown', e => {
    const quizOpen = $('#quizOverlay').classList.contains('open');
    const resultOpen = $('#resultOverlay').classList.contains('open');
    const detailOpen = $('#detailOverlay').classList.contains('open');

    if (e.key === 'Escape') {
      if (detailOpen) closeOverlay($('#detailOverlay'));
      else if (resultOpen) {
        closeOverlay($('#resultOverlay'));
        document.title = '山海有灵 · 异兽人格图鉴｜你是《山海经》里的哪一只兽';
      } else if (quizOpen) closeQuiz();
      return;
    }
    if (!quizOpen) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); goBack(); return; }
    if (quizState.locked) return;
    if (e.key === 'a' || e.key === 'A' || e.key === '1') { e.preventDefault(); pickChoice(0); }
    if (e.key === 'b' || e.key === 'B' || e.key === '2') { e.preventDefault(); pickChoice(1); }
  });

  /* ---------------- 卷首视差 ---------------- */
  if (!reducedMotion) {
    const hero = $('#hero');
    const giant = $('.hero-giant');
    const mountains = $('.hero-mountains');
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      giant.style.transform = `translate3d(${x * -18}px, ${y * -10}px, 0)`;
      mountains.style.transform = `translate3d(${x * 12}px, 0, 0)`;
    });
    hero.addEventListener('pointerleave', () => {
      giant.style.transform = '';
      mountains.style.transform = '';
    });
  }

  /* ---------------- 深链接（便于分享与调试） ---------------- */
  const params = urlParams;
  const view = params.get('view');
  const artParam = params.get('art');

  if (view === 'quiz') {
    const mode = params.get('mode') === 'quick' ? 'quick' : 'full';
    const q = Math.max(0, Number(params.get('q') || 1) - 1);
    startQuiz(mode, q);
  } else if (view === 'result') {
    const b = beastByType.get((params.get('type') || 'INTJ').toUpperCase()) || beastByType.get('INTJ');
    const raw = params.get('pct');
    const dims = raw ? raw.split(',').map(Number).filter(n => !isNaN(n)).slice(0, 4) : defaultDims(b.type);
    openResult(b, dims.length === 4 ? dims : defaultDims(b.type));
    if (artParam === 'q') setTimeout(() => setArt('q', $('#resultOverlay')), 700);
    if (params.get('card') === '1') setTimeout(saveCard, 800);
  } else if (view === 'detail') {
    const b = beastById.get(Number(params.get('i') || 1)) || BEASTS[0];
    openDetail(b);
    if (artParam === 'q') setTimeout(() => setArt('q', $('#detailOverlay')), 700);
  } else if (view === 'codex') {
    setTimeout(() => $('#codex').scrollIntoView({ block: 'start' }), 350);
  }

  if (params.get('auto') === '1') {
    if (view !== 'quiz') startQuiz('full', 0);
    let step = 0;
    const tick = setInterval(() => {
      if ($('#resultOverlay').classList.contains('open')) { clearInterval(tick); return; }
      if (!$('#quizOverlay').classList.contains('open')) { clearInterval(tick); return; }
      const opts = $$('#qOptions .opt');
      if (!opts.length) return;
      opts[step % 2].click();
      step++;
    }, 620);
  }

  const debugY = Number(params.get('y') || 0);
  if (debugY > 0) {
    setTimeout(() => {
      if ($('#resultOverlay').classList.contains('open')) $('#resultScroll').scrollTop = debugY;
      else if ($('#detailOverlay').classList.contains('open')) $('#detailScroll').scrollTop = debugY;
      else window.scrollTo(0, debugY);
    }, 900);
  }

  window.__shanhai = { state, startQuiz, openResult, openDetail, BEASTS };
})();
