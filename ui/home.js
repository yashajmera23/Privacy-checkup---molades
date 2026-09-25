// Welcome page: count-up numbers and the interactive "what happens after a leak" story.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Count-up numbers ----------
  const fmt = (el, v) => {
    const d = +el.dataset.dec || 0;
    el.innerHTML = (el.dataset.prefix || '') + v.toFixed(d) +
      (el.dataset.suffix ? `<small>${el.dataset.suffix}</small>` : '') +
      (el.dataset.after ? `<small>${el.dataset.after}</small>` : '');
  };
  const run = stat => {
    stat.classList.add('in');
    const el = stat.querySelector('.num'), to = +el.dataset.to, bar = stat.querySelector('.bar i');
    bar.style.width = bar.dataset.w + '%';
    if (reduce) return fmt(el, to);
    const t0 = performance.now(), dur = 1600;
    const tick = now => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      fmt(el, to * e);
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const statIO = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) { run(en.target); statIO.unobserve(en.target); }
  }), { threshold: .4 });
  document.querySelectorAll('.stat').forEach((s, i) => { fmt(s.querySelector('.num'), 0); s.style.transitionDelay = i * 80 + 'ms'; statIO.observe(s); });

  // ---------- Story ----------
  const box = document.getElementById('storyBox');
  if (!box) return;
  const cells = (n, hits) => Array.from({ length: n }, (_, i) => `<i class="${hits.includes(i) ? 'hit' : ''}" style="--d:${i}"></i>`).join('');
  const hitList = [...Array(60).keys()].filter(i => (i * 7) % 11 < 5);
  const STEPS = [
    { title: 'A company you used gets hacked', body: 'An online shop you signed up for years ago is breached. Your email and password are copied along with millions of others.',
      label: 'shopkart-db · breach',
      scene: `<div class="db" aria-hidden="true">${cells(60, hitList)}</div>
        <div class="term">
          <p style="--i:0">▸ connecting to shopkart-prod…</p>
          <p style="--i:1">▸ dumping table <b>users</b></p>
          <p style="--i:2">▸ <span class="r">2,104,331 rows copied</span></p>
          <p style="--i:3">▸ includes: <b>email, password, phone, address</b></p>
        </div>`,
      catchTitle: 'Leak check', catch: 'We spot your email in the leak and tell you straight away, with which company and what leaked.' },
    { title: 'Your details are sold online', body: 'The stolen list is bundled up and sold cheaply, so anyone can buy it. Your line is in there with everyone else\'s.',
      label: 'listing · combo list',
      scene: `<div class="listing">
          <div class="listing-h"><span>shop_combo_2026.txt</span><b>$40 · 1.2M lines</b></div>
          <div class="rows">
            <p>rohit.k84@…  : ********</p><p>meera_s@…  : ********</p>
            <p class="you">▸ you@gmail.com  : ******** (your password)</p>
            <p>ankit.v@…  : ********</p><p>sana.m22@…  : ********</p><p>dev.p@…  : ********</p>
          </div></div>`,
      catchTitle: 'Fix it now', catch: 'You change that password, and anywhere you reused it. The list you\'re on becomes useless.' },
    { title: 'Bots try it everywhere', body: 'Automated tools try the same email and password on email, banking and shopping sites. If you reused it anywhere, one of them works.',
      label: 'login bot · 4 sites',
      scene: `<div class="attempts">
          <div class="attempt" style="--i:0"><span class="site">Bank</span><span class="track"><i></i></span><span class="res no">✕ failed</span></div>
          <div class="attempt" style="--i:1"><span class="site">Shopping</span><span class="track"><i></i></span><span class="res no">✕ failed</span></div>
          <div class="attempt" style="--i:2"><span class="site">Social</span><span class="track"><i></i></span><span class="res no">✕ failed</span></div>
          <div class="attempt" style="--i:3"><span class="site">Your email</span><span class="track"><i></i></span><span class="res yes">✓ worked</span></div>
        </div>
        <div class="term" style="margin-top:14px"><p style="--i:5">▸ <span class="r">same password reused on your email</span></p></div>`,
      blocked: true, catchTitle: 'Blocked', catch: 'You already changed that password at step 2, so every one of these logins fails. Our tip: a different password for every site, plus 2-step verification.' },
    { title: 'A warning arrives, and gets buried', body: 'Your email provider sends "New sign-in from a Windows PC". It lands between offers and newsletters, and nobody opens it.',
      label: 'inbox · 2,381 unread',
      scene: `<div class="inbox-wrap"><div class="inbox">
          <p><span>Flipkart</span><span>Big savings this weekend</span><span>09:12</span></p>
          <p><span>Swiggy</span><span>Your order is on the way</span><span>09:02</span></p>
          <p class="alert"><span>Security alert</span><span>New sign-in on Windows PC</span><span>08:47</span></p>
          <p><span>Newsletter</span><span>Top 10 stories today</span><span>08:30</span></p>
          <p><span>LinkedIn</span><span>You appeared in 4 searches</span><span>08:11</span></p>
          <p><span>Zomato</span><span>50% off tonight</span><span>07:58</span></p>
          <p><span>Bank</span><span>Your statement is ready</span><span>07:40</span></p>
        </div></div><p class="unread">▸ alert unopened · pushed down by 6 newer emails</p>`,
      catchTitle: 'Email check', catch: 'We pull that sign-in alert out of your inbox and put it at the top, so you can sign the stranger out.' },
    { title: 'The account is taken over', body: 'The attacker changes your password and recovery phone, then uses your email to reset your other accounts, including payments.',
      label: 'account · activity',
      scene: `<div class="events">
          <p style="--i:0"><span>Password changed</span><b>not you</b></p>
          <p style="--i:1"><span>Recovery phone changed</span><b>not you</b></p>
          <p style="--i:2"><span>Wallet password reset via email</span><b>not you</b></p>
          <p style="--i:3"><span>₹48,000 transferred</span><b>not you</b></p>
        </div><p class="loss" style="opacity:0;animation:show .01s forwards 2.4s">You're locked out.</p>`,
      blocked: true, catchTitle: 'Never happens', catch: 'The leaked password was changed and the stranger was signed out. There is nothing left to take over.' },
  ];

  const steps = document.getElementById('storySteps'), scenes = document.getElementById('scenes'), dots = document.getElementById('storyDots');
  STEPS.forEach((s, i) => {
    steps.insertAdjacentHTML('beforeend', `<li class="step-item" data-i="${i}" tabindex="0" role="button" aria-label="Step ${i + 1}: ${s.title}">
      <span class="node" aria-hidden="true"></span>
      <p class="n">STEP ${String(i + 1).padStart(2, '0')}</p><h3>${s.title}</h3><p>${s.body}</p>
      <div class="catch"><b>✓ ${s.catchTitle}</b>${s.catch}</div></li>`);
    scenes.insertAdjacentHTML('beforeend', `<div class="scene" data-i="${i}">${s.scene}</div>`);
    dots.insertAdjacentHTML('beforeend', `<button type="button" data-i="${i}" aria-label="Step ${i + 1}"></button>`);
  });

  const items = [...steps.querySelectorAll('.step-item')], sceneEls = [...scenes.children], dotEls = [...dots.children];
  let cur = -1, guarded = false;
  const shield = document.getElementById('shield');
  const catchBar = document.createElement('div');
  catchBar.className = 'catchbar';
  document.querySelector('.screen').appendChild(catchBar);

  function show(i) {
    if (i === cur) return;
    cur = i;
    items.forEach((el, k) => el.classList.toggle('on', k <= i));
    // Restart the scene's animation each time it's shown.
    sceneEls.forEach((el, k) => { el.classList.remove('on'); if (k === i) { void el.offsetWidth; el.classList.add('on'); } });
    dotEls.forEach((d, k) => { if (k === i) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current'); });
    document.getElementById('sceneLabel').textContent = `${STEPS[i].label} · step ${i + 1} of ${STEPS.length}`;
    document.getElementById('railFill').style.height = (i / (STEPS.length - 1) * 100) + '%';
    document.getElementById('prevStep').disabled = i === 0;
    document.getElementById('nextStep').disabled = i === STEPS.length - 1;
    paintShield();
  }
  function paintShield() {
    const s = STEPS[cur], on = guarded && cur >= 0;
    shield.classList.toggle('on', on && !!s.blocked);
    catchBar.classList.toggle('on', on && !s.blocked);
    if (on) {
      document.getElementById('shieldTitle').textContent = s.catchTitle;
      document.getElementById('shieldBody').textContent = s.catch;
      catchBar.innerHTML = '<b>✓ ' + s.catchTitle + '</b>' + s.catch;
    }
  }

  // Scroll drives the story on wide screens; clicks, dots, arrows and keys work everywhere.
  const io = new IntersectionObserver(es => {
    const vis = es.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (vis) show(+vis.target.dataset.i);
  }, { rootMargin: '-40% 0px -50% 0px' });
  if (matchMedia('(min-width: 961px)').matches) items.forEach(el => io.observe(el));

  const go = (i, scroll) => {
    i = Math.max(0, Math.min(STEPS.length - 1, i));
    show(i);
    if (scroll && matchMedia('(min-width: 961px)').matches) items[i].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  };
  items.forEach(el => {
    el.addEventListener('click', () => go(+el.dataset.i, true));
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(+el.dataset.i, true); } });
  });
  dotEls.forEach(d => d.addEventListener('click', () => go(+d.dataset.i, true)));
  document.getElementById('prevStep').addEventListener('click', () => go(cur - 1, true));
  document.getElementById('nextStep').addEventListener('click', () => go(cur + 1, true));
  box.addEventListener('keydown', e => {
    if (e.target.closest('.step-item, .story-view')) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1, true); items[cur].focus({ preventScroll: true }); }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1, true); items[cur].focus({ preventScroll: true }); }
    }
  });

  const tgl = document.getElementById('guardTgl');
  tgl.addEventListener('click', () => {
    guarded = !guarded;
    tgl.setAttribute('aria-checked', guarded);
    box.classList.toggle('guarded', guarded);
    document.getElementById('guardTxt').innerHTML = guarded ? '<b>With</b> Privacy Checkup' : '<b>Without</b> Privacy Checkup';
    items.forEach((el, k) => el.classList.toggle('blocked', !!STEPS[k].blocked));
    paintShield();
  });

  show(0);
})();

// Header turns frosted once you scroll.
(() => {
  const bar = document.getElementById('topbar');
  if (!bar) return;
  const set = () => bar.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', set, { passive: true });
  set();
})();
