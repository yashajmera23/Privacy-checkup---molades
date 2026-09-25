// Demo state for the prototype, saved in this browser's localStorage.
// Loaded in <head> on every page so guards run before the page renders.
(() => {
  const KEY = 'pc-state-v1';
  const fresh = () => ({
    session: null,          // 'google' | 'microsoft' | null
    email: null,            // sign-in email
    name: 'Aarav Mehta',
    alertEmail: null,
    phone: '',
    lang: 'English',
    conns: { google: null, microsoft: null },   // connected email per provider
    extra: [],              // extra accounts added on Pro: [{ provider, email }]
    plan: 'free',           // 'free' | 'pro'
    billing: null,          // 'y' | 'm'
    renews: null,
    fixedBy: {},            // problem ids marked fixed, per signed-in email
    checked: false,         // has a check been run since connecting
    settings: { files: true, email: true, leaks: true, weekly: false, alerts: false, keep: false },
  });

  let state;
  try { state = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || '{}')); }
  catch { state = fresh(); }

  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };

  window.PC = {
    get: () => state,
    set(patch) { Object.assign(state, patch); save(); },
    signIn(provider, email) {
      state.session = provider;
      state.email = email;
      state.conns[provider] = email;
      if (!state.alertEmail) state.alertEmail = email;
      save();
    },
    // Main slot per provider first; further accounts (Pro) go in `extra`, up to 5 in total.
    addAccount(provider, email) {
      const all = [state.conns.google, state.conns.microsoft, ...state.extra.map(x => x.email)];
      if (all.includes(email)) return;
      if (!state.conns[provider]) state.conns[provider] = email;
      else if (all.filter(Boolean).length < 5) state.extra.push({ provider, email });
      save();
    },
    fixed: () => state.fixedBy[state.email] || [],
    setFixed(ids) { state.fixedBy[state.email] = ids; save(); },
    logout() { state.session = null; save(); },
    reset() { state = fresh(); save(); },
    provider: () => state.session || 'google',
    labels() {
      const ms = state.session === 'microsoft';
      return {
        name: ms ? 'Microsoft' : 'Google',
        files: ms ? 'OneDrive' : 'Google Drive',
        mail: ms ? 'Outlook' : 'Gmail',
        sharing: ms ? 'https://onedrive.live.com/?v=sharedby' : 'https://drive.google.com/drive/shared-with-me',
        devices: ms ? 'https://account.microsoft.com/devices' : 'https://myaccount.google.com/device-activity',
        security: ms ? 'https://account.microsoft.com/security' : 'https://myaccount.google.com/security',
        apps: ms ? 'https://account.live.com/consent/Manage' : 'https://myaccount.google.com/permissions',
      };
    },
  };

  // Demo findings. Filtered by the checks switched on in settings.
  PC.problems = () => {
    const L = PC.labels(), e = state.email || 'you@example.com';
    const all = [
      { id: 'leak-shopkart', cat: 'leaks', sev: 'urgent',
        title: 'Your email and password leaked from ShopKart',
        detail: `Leaked <b>Mar 2024</b> · also exposed: <b>password, phone number, home address</b>`,
        fix: ['Change your ShopKart password.', 'If you used the same password anywhere else, change it there too, starting with your email and bank.'],
        link: { label: `Secure my ${L.name} account`, href: L.security },
        avoid: ['Use a different password for every website. A password manager can remember them for you.', "Turn on 2-step verification so a leaked password alone can't get anyone in."] },
      { id: 'file-passport', cat: 'files', sev: 'urgent',
        title: 'Your passport scan can be opened by anyone with the link',
        detail: `<b>Trip-Passport-Scan.pdf</b> · ${L.files} · shared this way since <b>Jun 2023</b>`,
        fix: ["Open the file's sharing settings.", 'Change "Anyone with the link" to <b>Restricted</b>.'],
        link: { label: 'Open sharing settings', href: L.sharing },
        avoid: ['Share ID documents with specific people, not "anyone with the link." Links get forwarded.', 'When you share with someone outside, set an end date so access switches off by itself.'] },
      { id: 'mail-signin', cat: 'email', sev: 'soon',
        title: 'Someone signed in to your account from a new device',
        detail: `${L.name} security alert · <b>Windows PC, near Pune</b> · <b>2 Oct</b>`,
        fix: ['Check your list of signed-in devices.', "If you don't recognise it, sign it out and change your password."],
        link: { label: 'Review devices', href: L.devices },
        avoid: ['Turn on 2-step verification. Then a new sign-in also needs your phone.', `Don't ignore "new sign-in" emails. Open them the same day.`] },
      { id: 'file-salary', cat: 'files', sev: 'soon',
        title: 'A folder of salary slips is shared with 2 people outside',
        detail: `<b>Salary-Slips-2025</b> · ${L.files} · 14 files inside`,
        fix: ["Open the folder's sharing settings.", 'Remove anyone who no longer needs access.'],
        link: { label: 'Open sharing settings', href: L.sharing },
        avoid: ['Sharing a folder shares everything you add to it later, too. Share single files when you can.'] },
      { id: 'leak-quizfun', cat: 'leaks', sev: 'soon',
        title: 'Your email and phone number leaked from QuizFun',
        detail: `Leaked <b>Aug 2023</b> · <b>${e}</b> · also exposed: <b>phone number, date of birth</b> · no password`,
        fix: ["Your password wasn't leaked, so there's nothing to change.", 'Watch for fake calls or messages that mention QuizFun or know your birthday.'],
        link: null,
        avoid: ["Give fun apps and quizzes as little as possible. Skip the phone number and birthday when they're optional."] },
    ];
    return all.filter(p => state.settings[p.cat]);
  };
  PC.totals = () => {
    const ms = state.session === 'microsoft', s = state.settings;
    return { files: s.files ? (ms ? 188 : 214) : 0, emails: s.email ? (ms ? 29 : 37) : 0, leaks: s.leaks ? 900 : 0 };
  };

  // Pages that need a signed-in user send everyone else to the welcome screen.
  const page = location.pathname.split('/').pop() || 'connect.html';
  const needsLogin = ['ready.html', 'scanning.html', 'results.html', 'clear.html', 'account.html', 'checkout.html'];
  if (needsLogin.includes(page) && !state.session) location.replace('connect.html?signin=1');
})();
