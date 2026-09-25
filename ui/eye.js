// Hero visual: an abstract sphere of dots on #orb. While exposures are open it's restless and
// leaks red streams; as you scroll, each exposure gets fixed and the sphere settles. When all
// three are fixed it goes still and the headline flips to "Your accounts are safe."
(() => {
  const canvas = document.getElementById('orb');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const stage = document.getElementById('eyeStage');
  const cap = document.getElementById('eyeCap'), capWrap = document.querySelector('.eye-caption'), capCount = document.getElementById('capCount');
  const split = document.querySelector('.split'), wRight = document.getElementById('wRight');
  const heroSub = document.querySelector('.hero-sub'), heroMain = document.getElementById('heroMain'), heroSubTxt = document.getElementById('heroSub');
  const xps = [...document.querySelectorAll('.xp')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Scroll position → story. Each stage: [from, headline, sub-line].
  const STAGES = [
    [0, 'Most people have something exposed and don’t know it.', 'A file shared too widely, a leaked password, a warning email you never opened.'],
    [0.1, 'This is what a free check usually finds.', 'Common, real examples. Keep scrolling to see them fixed.'],
    [0.36, 'Each one has a simple fix. Most take under a minute.', 'We show you exactly what to click.'],
    [0.8, 'Done. Nothing is leaking anymore.', 'One free check and a few clicks. Try it on your own accounts below.'],
  ];

  // Dots spread evenly over a sphere.
  const N = 1100, GOLD = Math.PI * (3 - Math.sqrt(5));
  const pts = Array.from({ length: N }, (_, i) => {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), a = i * GOLD;
    return { x: Math.cos(a) * r, y, z: Math.sin(a) * r, ph: Math.random() * 6.28, sp: 0.6 + Math.random() * 1.4,
      tx: Math.random(), ty: Math.random(), wait: Math.random() * 0.35, par: 0.3 + Math.random() * 0.7 };  // tx/ty: where it lands when the sphere bursts
  });
  const sparks = [];
  const FIX_TIME = 0.12;   // share of the scroll each fix takes, ending at the card's data-fix

  // Each card gets a Privacy Checkup status row: found → fixing (progress bar) → fixed.
  xps.forEach(x => x.querySelector('div').insertAdjacentHTML('beforeend',
    '<span class="xp-pc"><span class="pc-mark" aria-hidden="true"></span><span class="pc-txt">Found by Privacy Checkup</span><span class="pc-bar"><i></i></span></span>'));

  let W = 0, H = 0, dpr = 1;
  const fit = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
  };
  new ResizeObserver(fit).observe(canvas);
  fit();

  // After the story, the sphere bursts and its dots stay scattered behind the rest of the page.
  const field = document.createElement('canvas');
  field.className = 'dotfield';
  field.setAttribute('aria-hidden', 'true');
  document.body.prepend(field);
  const fctx = field.getContext('2d');
  let FW = 0, FH = 0;
  const fitField = () => { FW = innerWidth; FH = innerHeight; field.width = FW * dpr; field.height = FH * dpr; };
  addEventListener('resize', fitField);
  fitField();
  let burst = 0;

  let target = { x: 0, y: 0 }, look = { x: 0, y: 0 }, mouseSeen = false, scrollK = 0, calm = 0;
  let stageIdx = -1, lastFixed = -1, lastShown = -1, lastClosed = null, swapT = 0;
  addEventListener('pointermove', e => {
    mouseSeen = true;
    const r = canvas.getBoundingClientRect();
    target = { x: Math.max(-1, Math.min(1, (e.clientX - r.left - r.width / 2) / (r.width * 0.8))), y: Math.max(-1, Math.min(1, (e.clientY - r.top - r.height / 2) / (r.height * 0.8))) };
  }, { passive: true });
  document.addEventListener('pointerleave', () => { target = { x: 0, y: 0 }; });

  const onScroll = () => {
    const r = stage.getBoundingClientRect(), span = r.height - innerHeight;
    const p = span > 0 ? Math.min(Math.max(-r.top / span, 0), 1) : 0;
    scrollK = Math.min(Math.max((p - 0.03) / 0.9, 0), 1);
    burst = Math.min(Math.max((innerHeight - r.bottom) / (innerHeight * 0.7), 0), 1);  // 0 until the story ends
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  const frame = now => {
    const t = now / 1000;
    if (!mouseSeen && !reduce) target = { x: Math.sin(t * 0.4) * 0.5, y: Math.sin(t * 0.55) * 0.3 };

    // Which exposures are showing, and which are fixed.
    let shown = 0, fixed = 0, fixing = 0;
    const state = xps.map(x => {
      const f = +x.dataset.fix, on = scrollK >= +x.dataset.show, fx = scrollK >= f;
      const prog = Math.min(Math.max((scrollK - (f - FIX_TIME)) / FIX_TIME, 0), 1);   // 0 → 1 while being fixed
      const doing = on && !fx && prog > 0;
      x.classList.toggle('show', on);
      x.classList.toggle('fixed', fx);
      x.classList.toggle('fixing', doing);
      const sEl = x.querySelector('.xp-s'), want = fx ? sEl.dataset.closed : sEl.dataset.open;
      if (sEl.textContent !== want) sEl.textContent = want;
      const pc = x.querySelector('.pc-txt'), pcWant = fx ? 'Fixed with Privacy Checkup' : doing ? 'Fixing: ' + x.dataset.doing : 'Found by Privacy Checkup';
      if (pc.textContent !== pcWant) pc.textContent = pcWant;
      x.querySelector('.pc-bar i').style.width = (prog * 100).toFixed(0) + '%';
      shown += on; fixed += fx; fixing += doing;
      return { on, fx, prog, doing, since: scrollK - f };
    });
    calm += (fixed / xps.length - calm) * (reduce ? 1 : 0.05);
    const unrest = 1 - calm;

    look.x += (target.x - look.x) * 0.06;
    look.y += (target.y - look.y) * 0.06;

    // ---- Draw ----
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2 + look.x * W * 0.03, cy = H / 2 + look.y * H * 0.03;
    const R = Math.min(W, H) * (0.34 - calm * 0.03);
    const spin = reduce ? 0 : t * (0.12 + unrest * 0.18);
    const ry = spin + look.x * 0.6, rx = -0.25 + look.y * 0.4;
    const cyA = Math.cos(ry), syA = Math.sin(ry), cxA = Math.cos(rx), sxA = Math.sin(rx);
    const rot = (x, y, z) => {
      const x1 = x * cyA + z * syA, z1 = -x * syA + z * cyA;
      return [x1, y * cxA - z1 * sxA, y * sxA + z1 * cxA];
    };

    // Soft core glow; brighter once calm.
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.5);
    g.addColorStop(0, `rgba(255,255,255,${(0.07 + calm * 0.08) * (1 - burst)})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Orbit rings.
    ctx.lineWidth = 1;
    [[1.28, 0.28, 0.9, 0.16], [1.42, -0.5, -0.6, 0.1]].forEach(([k, tilt, dir, alpha]) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(tilt + (reduce ? 0 : t * 0.05 * dir));
      ctx.setLineDash([2, 7]);
      ctx.strokeStyle = `rgba(255,255,255,${(alpha + calm * 0.1) * (1 - burst)})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, R * k, R * k * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    // Dots: restless (jitter, flicker) while exposed, smooth once calm. Once the story is over they
    // fly out to their spot on the screen (drawn on the fixed field instead of the sphere canvas).
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fctx.clearRect(0, 0, FW, FH);
    const orbBox = burst > 0 ? canvas.getBoundingClientRect() : null;
    for (const p of pts) {
      if (burst > 0) {
        const [x, y, z] = rot(p.x, p.y, p.z);
        const depth = (z + 1) / 2;
        const k = Math.min(Math.max((burst - p.wait) / (1 - 0.35), 0), 1), e = 1 - Math.pow(1 - k, 3);
        const drift = reduce ? 0 : Math.sin(t * 0.3 * p.sp + p.ph) * 6;
        const ex = p.tx * FW + drift, ey = ((p.ty * FH - scrollY * 0.05 * p.par) % FH + FH) % FH;
        const sx = orbBox.left + cx + x * R, sy = orbBox.top + cy + y * R;
        const tw = reduce ? 1 : 0.6 + 0.4 * Math.sin(t * p.sp + p.ph);
        fctx.fillStyle = `rgba(255,255,255,${((0.12 + depth * 0.78) * (1 - e) + 0.32 * p.par * tw * e)})`;
        const s = (0.6 + depth * 1.3) * (1 - e) + (0.8 + p.par) * e;
        fctx.fillRect(sx + (ex - sx) * e - s / 2, sy + (ey - sy) * e - s / 2, s, s);
        continue;
      }
      const wob = reduce ? 0 : unrest * 0.09 * Math.sin(t * p.sp * 2 + p.ph);
      const [x, y, z] = rot(p.x * (1 + wob), p.y * (1 + wob), p.z * (1 + wob));
      const depth = (z + 1) / 2;
      const flick = reduce ? 1 : 1 - unrest * 0.5 * (0.5 + 0.5 * Math.sin(t * p.sp * 5 + p.ph));
      ctx.fillStyle = `rgba(255,255,255,${(0.12 + depth * 0.78) * flick})`;
      const s = 0.6 + depth * 1.3;
      ctx.fillRect(cx + x * R - s / 2, cy + y * R - s / 2, s, s);
    }

    // Each card is tied to its own leak: the point on the sphere facing that card.
    // Red stream while open; while Privacy Checkup fixes it, a white pulse runs down the line,
    // a ring closes over the leak and the stream stops; then a green dot fades out.
    const box = canvas.getBoundingClientRect(), ox = box.left + cx, oy = box.top + cy;
    const floating = xps[0] && getComputedStyle(xps[0]).position === 'absolute';   // on phones the cards stack, no lines
    xps.forEach((x, i) => {
      const st = state[i];
      if (!st.on || burst >= 1) return;
      const r = x.getBoundingClientRect();
      const ax = Math.min(Math.max(ox, r.left), r.right), ay = Math.min(Math.max(oy, r.top), r.bottom);
      const dx = ax - ox, dy = ay - oy, dl = Math.hypot(dx, dy) || 1;
      const STACKED = [-2.2, -1.57, -0.94];                              // stacked cards: fan the leaks out across the top
      const nx = floating ? dx / dl : Math.cos(STACKED[i]), ny = floating ? dy / dl : Math.sin(STACKED[i]);
      const lx = cx + nx * R * 0.86, ly = cy + ny * R * 0.86;          // leak point, in sphere-canvas space
      const px = box.left + lx, py = box.top + ly;                      // same point, on screen

      // Red particles leaving the sphere toward the card, thinning out as the fix progresses.
      if (!reduce && !st.fx && Math.random() < 0.9 * (1 - st.prog)) {
        const ang = Math.atan2(ny, nx) + (Math.random() - 0.5) * 0.7, v = 0.6 + Math.random() * 0.9;
        sparks.push({ x: lx, y: ly, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, life: 1 });
      }

      // Leak marker on the sphere.
      if (!st.fx) {
        const rr = st.doing ? 16 - st.prog * 11 : 6 + Math.sin(t * 4) * 1.5;
        ctx.strokeStyle = st.doing ? 'rgba(255,255,255,.9)' : 'rgba(255,80,80,.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(lx, ly, rr, 0, 6.283); ctx.stroke();
        if (st.doing) { ctx.fillStyle = `rgba(255,255,255,${0.15 + st.prog * 0.6})`; ctx.beginPath(); ctx.arc(lx, ly, rr, 0, 6.283); ctx.fill(); }
      } else if (st.since < 0.08) {
        ctx.fillStyle = `rgba(69,165,87,${1 - st.since / 0.08})`;
        ctx.beginPath(); ctx.arc(lx, ly, 4, 0, 6.283); ctx.fill();
      }

      // Line from card to leak (screen space, on the fixed layer behind the sphere).
      if (!floating) return;
      const fade = st.fx ? Math.max(0, 1 - st.since / 0.08) : 1;
      if (fade <= 0) return;
      fctx.lineWidth = 1;
      fctx.setLineDash(st.doing || st.fx ? [] : [3, 4]);
      fctx.strokeStyle = st.fx ? `rgba(69,165,87,${0.7 * fade})` : st.doing ? 'rgba(255,255,255,.6)' : 'rgba(255,90,90,.45)';
      fctx.beginPath(); fctx.moveTo(ax, ay); fctx.lineTo(px, py); fctx.stroke();
      fctx.setLineDash([]);
      if (st.doing && !reduce) for (let k = 0; k < 3; k++) {             // the fix travelling from card to sphere
        const q = (t * 0.9 + k / 3) % 1;
        fctx.fillStyle = 'rgba(255,255,255,.95)';
        fctx.beginPath(); fctx.arc(ax + (px - ax) * q, ay + (py - ay) * q, 2.2, 0, 6.283); fctx.fill();
      }
    });
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx; s.y += s.vy; s.life -= 0.02;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      ctx.fillStyle = `rgba(255,80,80,${s.life})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, 1.6, 0, 6.283); ctx.fill();
    }

    // Status chip under the sphere: "3 exposed", then "1 of 3 closed"...
    if (fixed !== lastFixed || shown !== lastShown) {
      lastFixed = fixed; lastShown = shown;
      capCount.textContent = fixed === xps.length ? '' : fixed ? `· ${fixed} of ${xps.length} fixed` : shown ? `· ${shown} found` : '';
    }

    // The line under the sphere follows the story.
    const idx = STAGES.reduce((i, st, k) => (scrollK >= st[0] ? k : i), 0);
    if (idx !== stageIdx) {
      stageIdx = idx;
      heroSub.classList.add('fade');
      setTimeout(() => { heroMain.textContent = STAGES[idx][1]; heroSubTxt.textContent = STAGES[idx][2]; heroSub.classList.remove('fade'); }, 220);
    }

    { const want = fixed === xps.length ? 'All fixed' : fixing ? 'Privacy Checkup is fixing it' : shown ? 'Leaking right now' : 'Privacy Checkup is scanning';
      if (cap.textContent !== want) cap.textContent = want; }
    // All fixed: headline flips to "Your accounts are safe."
    const closed = fixed === xps.length;
    if (closed !== lastClosed) {
      lastClosed = closed;
      capWrap.classList.toggle('safe', closed);
      split.classList.add('swap');
      clearTimeout(swapT);
      swapT = setTimeout(() => {
        wRight.textContent = closed ? 'are safe.' : 'are leaking.';
        split.classList.remove('swap');
      }, 260);
    }

    // Side words drift gently against the cursor, for depth.
    split.style.transform = `translate(${(-look.x * 10).toFixed(1)}px, ${(-look.y * 6).toFixed(1)}px)`;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();
