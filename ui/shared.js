// Shared UI for the app screens: account menu, footer, demo bar, toasts, confirm dialogs.
// Needs state.js (window.PC) to be loaded first.
(() => {
  const st = PC.get();
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  window.toast = msg => {
    const t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 3300);
  };

  window.confirmBox = ({ title, body, ok, danger }) => new Promise(res => {
    const prev = document.activeElement;
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mTitle"><h2 id="mTitle"></h2><p></p><div class="row-btns">
      <button class="btn btn-ghost" data-v="0">Cancel</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-v="1"></button></div></div>`;
    bg.querySelector('h2').textContent = title;
    bg.querySelector('p').textContent = body;
    bg.querySelector('[data-v="1"]').textContent = ok;
    const close = v => { bg.remove(); document.removeEventListener('keydown', onKey); prev?.focus?.(); res(v); };
    const onKey = e => { if (e.key === 'Escape') close(false); };
    bg.addEventListener('click', e => {
      if (e.target === bg) return close(false);
      const v = e.target.closest('[data-v]')?.dataset.v;
      if (v) close(v === '1');
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(bg);
    bg.querySelector('[data-v="1"]').focus();
  });

  window.logout = async () => {
    const ok = await confirmBox({ title: 'Log out?', body: 'You will be signed out of Privacy Checkup on this device. Your connected accounts stay connected until you remove them.', ok: 'Log out' });
    if (ok) { PC.logout(); location.href = 'connect.html?loggedout=1'; }
  };

  window.resetDemo = async () => {
    const ok = await confirmBox({ title: 'Reset the demo?', body: 'Clears everything saved in this browser (sign-in, profile, plan, fixed problems) and starts from the welcome screen.', ok: 'Reset demo', danger: true });
    if (ok) { PC.reset(); try { localStorage.removeItem('pc-unclear'); } catch {} location.href = 'connect.html?reset=1'; }
  };

  // Top-right: account menu when signed in, sign-in button when not.
  const acc = document.querySelector('nav .account');
  if (acc && st.session) {
    const name = st.name || 'You';
    acc.outerHTML = `<div class="acct-wrap">
      <button class="acct-btn" aria-haspopup="menu" aria-expanded="false"><span class="avatar">${esc(name[0].toUpperCase())}</span><span id="acc">${esc(st.email)}</span>${st.plan === 'pro' ? '<span class="pro-tag">PRO</span>' : ''}<span aria-hidden="true">▾</span></button>
      <div class="menu" role="menu" hidden>
        <div class="menu-head"><strong>${esc(name)}</strong><span>${esc(st.email)}</span></div>
        <a role="menuitem" href="account.html">Account &amp; connections</a>
        <a role="menuitem" href="account.html#profile">Edit profile</a>
        <a role="menuitem" href="${st.checked ? 'results.html' : 'ready.html'}">${st.checked ? 'Last check results' : 'Run a check'}</a>
        <a role="menuitem" href="pricing.html">${st.plan === 'pro' ? 'Your plan: Pro' : 'Upgrade to Pro'}</a>
        <hr>
        <a role="menuitem" href="privacy.html">Privacy policy</a>
        <a role="menuitem" href="terms.html">Terms of service</a>
        <a role="menuitem" href="mailto:support@privacycheckup.example">Help &amp; support</a>
        <hr>
        <button class="item" role="menuitem" onclick="logout()">Log out <span class="kbd">⇧Q</span></button>
      </div></div>`;
    const btn = document.querySelector('.acct-btn'), menu = document.querySelector('.menu');
    const setOpen = open => { menu.hidden = !open; btn.setAttribute('aria-expanded', open); };
    btn.addEventListener('click', e => { e.stopPropagation(); setOpen(menu.hidden); });
    document.addEventListener('click', e => { if (!menu.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') setOpen(false);
      if (e.shiftKey && e.key === 'Q' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) logout();
    });
  } else if (acc) {
    acc.outerHTML = `<a class="btn btn-primary btn-sm" href="connect.html">Sign in</a>`;
  }

  // Footer
  const wrap = document.querySelector('.wrap');
  if (wrap && !document.querySelector('.site-foot')) {
    const f = document.createElement('footer');
    f.className = 'site-foot';
    f.innerHTML = `<span>© 2026 Privacy Checkup</span><nav>
      <a href="pricing.html">Pricing</a><a href="privacy.html">Privacy policy</a><a href="terms.html">Terms of service</a>
      <a href="privacy.html#google">Google &amp; Microsoft data use</a><a href="privacy.html#grievance">Grievance officer</a>
      <a href="mailto:support@privacycheckup.example">Contact</a></nav>`;
    wrap.appendChild(f);
  }

  // Demo bar: jump between screens while presenting, plus a reset.
  const page = location.pathname.split('/').pop() || 'connect.html';
  const bar = document.querySelector('.demo-bar') || document.body.appendChild(Object.assign(document.createElement('div'), { className: 'demo-bar' }));
  bar.setAttribute('aria-label', 'Demo screens');
  const links = [['connect.html', 'Welcome'], ['ready.html', 'Start'], ['scanning.html', 'Checking'], ['results.html', 'Problems'], ['clear.html', 'All clear'], ['account.html', 'Account'], ['pricing.html', 'Pricing']];
  bar.innerHTML = links.map(([h, t], i) => `<a href="${h}"${h === page ? ' aria-current="page"' : ''}>${i < 5 ? i + 1 + ' ' : ''}${t}</a>`).join('') +
    `<button type="button" onclick="resetDemo()">Reset</button>`;

  const qs = new URLSearchParams(location.search);
  if (qs.has('loggedout')) toast('You have been logged out.');
  if (qs.has('deleted')) toast('Your account and data have been deleted.');
  if (qs.has('reset')) toast('Demo reset. Everything is back to the start.');
  if (qs.has('signin')) toast('Please connect an account first.');
  if (qs.has('alreadypro')) toast("You're already on Pro.");
  if (qs.has('removed')) toast('Account removed. You have been signed out.');
})();
