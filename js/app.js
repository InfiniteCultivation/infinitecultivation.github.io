(() => {
  'use strict';

  const cfg = window.CULTIVATION_CONFIG;
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true }
  });

  // ---------- Game data ----------
  const REALMS = [
    'Qi Condensation', 'Foundation Establishment', 'Core Formation', 'Nascent Soul',
    'Soul Formation', 'Void Refinement', 'Body Integration', 'Mahayana',
    'Tribulation Transcendence', 'Immortal Ascension'
  ];

  const ELEMENTS = {
    Metal: { color: '#d7dbe4', glyph: '金' },
    Wood: { color: '#5fbf6a', glyph: '木' },
    Water: { color: '#3fa7d6', glyph: '水' },
    Fire: { color: '#ee5a36', glyph: '火' },
    Earth: { color: '#c9a043', glyph: '土' },
    // Divine elements: each born from two basic elements
    Lightning: { color: '#b48cff', glyph: '雷', parents: ['Fire', 'Metal'] },
    Ice: { color: '#9fe6ff', glyph: '冰', parents: ['Water', 'Earth'] },
    Nature: { color: '#7ee08a', glyph: '森', parents: ['Wood', 'Water'] }
  };

  const GRADE_TEXT = {
    Mutant: 'A divine element, born once in ten thousand. It walks its own path and carries the gifts of both its parent elements.',
    Heavenly: 'A single, flawless element. Your talent is the envy of the world.',
    Earth: 'Two elements in harmony. A gifted cultivator.',
    Human: 'Three elements. A solid foundation for a determined cultivator.',
    Mixed: 'Many elements, muddied together. Your path will be hard — but not closed.'
  };

  // ---------- Helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const fmt = (n) => Number(n).toLocaleString('en-US');
  function duration(sec) {
    sec = Math.max(0, Math.ceil(sec));
    const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    if (d) return `${d}d ${h}h`;
    if (h) return `${h}h ${m}m`;
    if (m) return `${m}m ${s}s`;
    return `${s}s`;
  }
  const toEmail = (username) => `${username.trim().toLowerCase()}@${cfg.loginDomain}`;
  let currentProfile = null;

  function selectTab(name) {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
    $('#form-signin').hidden = name !== 'signin';
    $('#form-signup').hidden = name !== 'signup';
  }

  function show(id) {
    if (id === 'screen-auth') selectTab('signin');
    if (id === 'screen-create') {
      $('#create-step-name').hidden = false;
      $('#create-step-reveal').hidden = true;
    }
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
    window.scrollTo(0, 0);
  }

  function setError(form, msg) {
    const el = form.querySelector('.error');
    el.textContent = msg || '';
    el.hidden = !msg;
  }

  function setBusy(form, busy, label) {
    const btn = form.querySelector('button[type="submit"]');
    if (busy) { btn.dataset.label = btn.textContent; btn.textContent = label; }
    else if (btn.dataset.label) btn.textContent = btn.dataset.label;
    btn.disabled = busy;
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 3000);
  }

  function friendly(err) {
    const m = (err && (err.message || err.error_description)) || String(err);
    if (/invalid login credentials/i.test(m)) return 'Wrong account name or password.';
    if (/already registered|already exists/i.test(m)) return 'That account name is taken.';
    if (/email not confirmed/i.test(m)) return 'Account sign-in is not switched on yet. Ask the admin.';
    if (/rate limit|too many/i.test(m)) return 'Too many attempts. Wait a minute and try again.';
    if (/failed to fetch|network/i.test(m)) return 'Could not reach the server. Check your connection.';
    return m.replace(/^.*?:\s*/, '') || 'Something went wrong.';
  }

  function orbs(container, roots) {
    container.innerHTML = '';
    roots.forEach((r, i) => {
      const e = ELEMENTS[r] || { color: '#ccc', glyph: '?' };
      const d = document.createElement('div');
      d.className = 'orb';
      d.style.setProperty('--c', e.color);
      d.style.animationDelay = `${i * 0.18}s`;
      const sub = e.parents ? `<span class="orb-sub">${e.parents.join(' + ')}</span>` : '';
      d.innerHTML = `<span class="glyph">${e.glyph}</span><span class="orb-name">${r}</span>${sub}`;
      container.appendChild(d);
    });
  }

  // ---------- Data ----------
  async function loadProfile(userId) {
    const { data, error } = await sb.from('profiles').select('username,is_admin').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data;
  }

  // The server keeps the real qi; the app just counts up between checks.
  async function loadCharacter() {
    const { data, error } = await sb.rpc('my_character');
    if (error) throw error;
    return data;
  }

  async function loadLog(characterId) {
    const { data } = await sb.from('breakthrough_log')
      .select('from_realm,from_stage,major,success,qi_lost,created_at')
      .eq('character_id', characterId).order('created_at', { ascending: false }).limit(5);
    return data || [];
  }

  async function route() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { show('screen-auth'); return; }
    try {
      currentProfile = await loadProfile(session.user.id);
      const ch = await loadCharacter();
      if (!ch) { show('screen-create'); return; }
      if (ch.gained > 0 && ch.away_seconds >= 60) {
        toast(`While you were away (${duration(ch.away_seconds)}) you gathered ${fmt(ch.gained)} qi.`);
      }
      renderHome(ch);
    } catch (e) {
      toast(friendly(e));
      show('screen-auth');
    }
  }

  // ---------- Cultivation ----------
  let state = null;       // last character data from the server
  let syncedAt = 0;       // when we got it (local clock)
  let ticker = null;

  function liveQi() {
    if (!state) return 0;
    const est = state.qi + Math.floor(((Date.now() - syncedAt) / 1000) * state.qi_rate);
    return Math.min(state.qi_needed, est);
  }

  function nextLabel() {
    if (state.realm === 10 && state.stage === 10) return 'Peak of cultivation';
    if (state.stage < 10) return `Advance to Stage ${state.stage + 1}`;
    return `Break through to ${REALMS[state.realm]}`;
  }

  function tick() {
    if (!state) return;
    const qi = liveQi();
    const need = state.qi_needed;
    const full = qi >= need;
    $('#home-qi').textContent = `${fmt(qi)} / ${fmt(need)}`;
    $('#home-qi-bar').style.width = `${Math.min(100, (qi / need) * 100)}%`;
    $('#home-qi-bar').classList.toggle('full', full);
    $('#home-rate').textContent = `+${Number(state.qi_rate).toLocaleString('en-US', { maximumFractionDigits: 2 })} qi/sec`;
    $('#home-eta').textContent = full ? 'Your qi is full. Further qi is wasted.' : `Full in ${duration((need - qi) / state.qi_rate)}`;
    $('#home-eta').classList.toggle('warn', full);

    const btn = $('#btn-breakthrough');
    const peak = state.realm === 10 && state.stage === 10;
    btn.disabled = !full || peak || btn.dataset.busy === '1';
    if (btn.dataset.busy !== '1') btn.textContent = nextLabel();
    const chanceEl = $('#home-chance');
    if (state.stage === 10 && !peak) {
      chanceEl.hidden = false;
      chanceEl.textContent = `Major breakthrough · ${Math.round(state.major_chance * 100)}% success · failure scatters half your qi`;
    } else chanceEl.hidden = true;

    renderTox();
    if ($('#pane-world').classList.contains('active')) renderWorld();
  }

  function renderLog(rows) {
    const ul = $('#home-log');
    ul.innerHTML = '';
    $('#home-log-card').hidden = rows.length === 0;
    rows.forEach((r) => {
      const li = document.createElement('li');
      const when = new Date(r.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      let what;
      if (!r.major) what = `${REALMS[r.from_realm - 1]} Stage ${r.from_stage} → ${r.from_stage + 1}`;
      else if (r.success) what = `Broke through to ${REALMS[r.from_realm]}`;
      else what = `Failed to reach ${REALMS[r.from_realm]} (−${fmt(r.qi_lost)} qi)`;
      li.className = r.major ? (r.success ? 'major ok' : 'major fail') : '';
      li.innerHTML = `<span>${what}</span><time>${when}</time>`;
      ul.appendChild(li);
    });
  }

  function renderHome(ch) {
    state = ch;
    syncedAt = Date.now();
    if (ch.server_time) clockOffset = new Date(ch.server_time).getTime() - Date.now();
    $('#home-username').textContent = currentProfile ? currentProfile.username + (currentProfile.is_admin ? ' · Admin' : '') : '';
    $('#home-name').textContent = ch.name;
    $('#home-realm').textContent = `${REALMS[ch.realm - 1]} · Stage ${ch.stage}`;
    $('#home-root').textContent = `${ch.root_grade} Root`;
    $('#home-mult').textContent = `×${Number(ch.root_multiplier).toFixed(2)}`;
    $('#home-stones').textContent = fmt(ch.spirit_stones);
    $('#home-realm-num').textContent = `${ch.realm} of 10`;
    orbs($('#home-orbs'), ch.spirit_root);
    tick();
    clearInterval(ticker);
    ticker = setInterval(tick, 1000);
    loadLog(ch.id).then(renderLog);
    if (!$('#screen-home').classList.contains('active')) show('screen-home');
  }

  $('#btn-breakthrough').addEventListener('click', async () => {
    const btn = $('#btn-breakthrough');
    btn.dataset.busy = '1';
    btn.disabled = true;
    btn.textContent = state.stage === 10 ? 'Facing the heavens…' : 'Circulating qi…';
    const { data, error } = await sb.rpc('breakthrough');
    btn.dataset.busy = '';
    if (error) { toast(friendly(error)); tick(); return; }
    if (data.major && data.success) toast(`Breakthrough! You have entered ${REALMS[data.realm - 1]}.`);
    else if (data.major) toast(`The breakthrough failed. ${fmt(data.qi_lost)} qi scattered.`);
    else toast(`You reached Stage ${data.stage}.`);
    const card = $('#home-card');
    card.classList.remove('flash-ok', 'flash-fail');
    void card.offsetWidth;
    card.classList.add(data.success ? 'flash-ok' : 'flash-fail');
    renderHome(data);
  });

  // ---------- Time helpers (server clock) ----------
  let clockOffset = 0; // server time minus local time, ms
  const serverNow = () => Date.now() + clockOffset;
  const secsSince = (iso) => (serverNow() - new Date(iso).getTime()) / 1000;

  function liveStamina() {
    if (!state) return 0;
    if (state.stamina >= state.stamina_max) return state.stamina_max;
    return Math.min(state.stamina_max, state.stamina + Math.floor(secsSince(state.stamina_updated_at) / state.stamina_regen_sec));
  }
  function liveToxTemp() {
    if (!state) return 0;
    return Math.max(0, Number(state.tox_temp) - secsSince(state.tox_updated_at) / state.tox_decay_sec);
  }

  function dangerInfo(danger) {
    const d = danger - (state ? state.realm : 1);
    if (d <= -2) return { label: 'Trivial', cls: 'd0' };
    if (d === -1) return { label: 'Safe', cls: 'd1' };
    if (d === 0) return { label: 'Fair', cls: 'd2' };
    if (d === 1) return { label: 'Dangerous', cls: 'd3' };
    return { label: 'Deadly', cls: 'd4' };
  }

  function renderTox() {
    const t = liveToxTemp();
    const p = Number(state.tox_perm);
    $('#tox-temp-bar').style.width = `${t}%`;
    $('#tox-perm-bar').style.width = `${p}%`;
    $('#tox-temp-val').textContent = t < 0.5 ? '0' : Math.round(t);
    $('#tox-perm-val').textContent = p < 0.5 ? '0' : Math.round(p);
    $('#home-tox').classList.toggle('clean', t < 0.5 && p < 0.5);
    const slow = Math.round((1 - state.qi_rate / state.qi_rate_base) * 100);
    const note = $('#tox-note');
    note.hidden = slow < 1;
    note.textContent = `Toxins are slowing your cultivation by ${slow}%.`;
  }

  // ---------- World ----------
  let world = null; // { continents, regions }
  let viewContinent = null;

  async function loadWorld() {
    if (world) return world;
    const [c, r] = await Promise.all([
      sb.from('continents').select('*').order('sort'),
      sb.from('regions').select('id,continent_id,name,danger,description').order('id')
    ]);
    if (c.error || r.error) throw (c.error || r.error);
    world = { continents: c.data, regions: r.data };
    return world;
  }

  function renderWorld() {
    if (!state || !state.region) return;
    const reg = state.region;
    $('#world-continent').textContent = reg.continent;
    $('#world-region').textContent = reg.name;
    const di = dangerInfo(reg.danger);
    const dz = $('#world-danger');
    dz.textContent = `Danger ${reg.danger} · ${di.label} for you`;
    dz.className = `danger ${di.cls}`;
    $('#world-desc').textContent = reg.description;

    const st = liveStamina();
    $('#world-stamina').textContent = `${st} / ${state.stamina_max}`;
    $('#world-stamina-bar').style.width = `${(st / state.stamina_max) * 100}%`;
    if (st >= state.stamina_max) $('#world-stamina-note').textContent = 'Fully rested';
    else {
      const intoNext = secsSince(state.stamina_updated_at) % state.stamina_regen_sec;
      const toFull = (state.stamina_max - st) * state.stamina_regen_sec - intoNext;
      $('#world-stamina-note').textContent = `Full in ${duration(toFull)}`;
    }

    const tb = $('#world-travel');
    const btn = $('#btn-explore');
    if (state.travel) {
      const left = (new Date(state.travel.arrive_at).getTime() - serverNow()) / 1000;
      tb.hidden = false;
      tb.textContent = left > 0 ? `Travelling to ${state.travel.name} · arrives in ${duration(left)}` : `Arriving at ${state.travel.name}…`;
      if (left <= 0 && !arrivalCheck) {
        arrivalCheck = true;
        loadCharacter().then((ch) => { arrivalCheck = false; renderHome(ch); renderRegions(); }).catch(() => { arrivalCheck = false; });
      }
    } else tb.hidden = true;

    if (btn.dataset.busy !== '1') {
      btn.disabled = !!state.travel || st < state.explore_cost;
      btn.textContent = state.travel ? 'Travelling…' : st < state.explore_cost ? 'Too tired — rest a while' : `Explore (−${state.explore_cost} stamina)`;
    }
  }
  let arrivalCheck = false;

  function renderRegions() {
    if (!world || !state) return;
    if (viewContinent == null) viewContinent = state.region.continent_id;
    const chips = $('#world-continents');
    chips.innerHTML = '';
    world.continents.forEach((c) => {
      const b = document.createElement('button');
      b.className = 'chip' + (c.id === viewContinent ? ' active' : '');
      b.textContent = c.name.replace(/ (Continent|Wilds|Desert|Highlands)$/, '');
      b.title = c.name;
      b.onclick = () => { viewContinent = c.id; renderRegions(); };
      chips.appendChild(b);
    });
    const ul = $('#world-regions');
    ul.innerHTML = '';
    const cont = world.continents.find((c) => c.id === viewContinent);
    const head = document.createElement('li');
    head.className = 'cont-desc';
    head.textContent = cont ? cont.description : '';
    ul.appendChild(head);
    world.regions.filter((r) => r.continent_id === viewContinent).forEach((r) => {
      const di = dangerInfo(r.danger);
      const here = r.id === state.region_id;
      const going = state.travel && state.travel.id === r.id;
      const li = document.createElement('li');
      li.className = here ? 'here' : '';
      li.innerHTML = `<div class="r-main"><strong>${r.name}</strong><span class="danger ${di.cls}">Danger ${r.danger} · ${di.label}</span></div>`;
      const b = document.createElement('button');
      b.className = 'btn ghost small';
      b.textContent = here ? 'You are here' : going ? 'On the way' : 'Travel';
      b.disabled = here || !!state.travel;
      b.onclick = () => doTravel(r);
      li.appendChild(b);
      ul.appendChild(li);
    });
  }

  async function doTravel(r) {
    const sameCont = r.continent_id === state.region.continent_id;
    const { data, error } = await sb.rpc('travel', { p_region: r.id });
    if (error) return toast(friendly(error));
    renderHome(data);
    renderRegions();
    toast(`You set out for ${r.name}${sameCont ? '' : ' — a long journey across continents'}.`);
  }

  $('#btn-explore').addEventListener('click', async () => {
    const btn = $('#btn-explore');
    btn.dataset.busy = '1';
    btn.disabled = true;
    btn.textContent = 'Exploring…';
    const { data, error } = await sb.rpc('explore');
    btn.dataset.busy = '';
    if (error) { toast(friendly(error)); renderWorld(); return; }
    const box = $('#world-result');
    const bits = [];
    if (data.qi > 0) bits.push(`<span class="gain qi">+${fmt(data.qi)} qi</span>`);
    if (data.qi_wasted) bits.push('<span class="gain warn">Your qi is full — advance to stop wasting it</span>');
    if (data.qi_lost > 0) bits.push(`<span class="gain bad">−${fmt(data.qi_lost)} qi</span>`);
    if (data.stones > 0) bits.push(`<span class="gain stone">+${fmt(data.stones)} spirit stones</span>`);
    if (data.item_name) bits.push(`<span class="gain item">+1 ${data.item_name}</span>`);
    if (data.extra_cost > 0) bits.push(`<span class="gain bad">−${data.extra_cost} extra stamina</span>`);
    box.className = `card story k-${data.kind}`;
    box.innerHTML = `<p>${data.story}</p><div class="gains">${bits.join('')}</div>`;
    box.hidden = false;
    renderHome(data.character);
  });

  // ---------- Bag ----------
  let itemCatalog = null;

  async function loadBag() {
    if (!state) return;
    if (!itemCatalog) {
      const { data } = await sb.from('items').select('*');
      itemCatalog = Object.fromEntries((data || []).map((i) => [i.id, i]));
    }
    const { data, error } = await sb.from('inventory').select('item_id,qty').eq('character_id', state.id).gt('qty', 0);
    if (error) return toast(friendly(error));
    $('#bag-stones').textContent = `${fmt(state.spirit_stones)} spirit stones`;
    const ul = $('#bag-list');
    ul.innerHTML = '';
    const order = { legendary: 0, rare: 1, uncommon: 2, common: 3 };
    const rows = (data || []).map((r) => ({ ...itemCatalog[r.item_id], qty: r.qty }))
      .sort((a, b) => (a.kind === b.kind ? order[a.rarity] - order[b.rarity] : a.kind === 'consumable' ? -1 : 1));
    $('#bag-empty').hidden = rows.length > 0;
    rows.forEach((it) => {
      const li = document.createElement('li');
      li.className = `rar-${it.rarity}`;
      const fx = [];
      if (it.effects.qi_pct) fx.push(`+${Math.round(it.effects.qi_pct * 100)}% of stage qi`);
      if (it.effects.tox) fx.push(`+${it.effects.tox} toxicity`);
      if (it.effects.tox_clear) fx.push(`−${it.effects.tox_clear} toxicity`);
      if (it.effects.perm_clear) fx.push(`−${it.effects.perm_clear} deep toxicity`);
      li.innerHTML = `<div class="it-main"><div class="it-top"><strong>${it.name}</strong><span class="qty">×${it.qty}</span></div>
        <span class="rarity">${it.rarity} ${it.kind === 'material' ? 'material' : ''}</span>
        <p>${it.description}</p>${fx.length ? `<p class="fx">${fx.join(' · ')}</p>` : ''}</div>`;
      if (it.kind === 'consumable') {
        const b = document.createElement('button');
        b.className = 'btn primary small';
        b.textContent = 'Use';
        b.onclick = () => useItem(it, b);
        li.appendChild(b);
      }
      ul.appendChild(li);
    });
  }

  async function useItem(it, btn) {
    if (it.effects.tox) {
      const after = liveToxTemp() + it.effects.tox;
      if (after > 100 && !confirmOverflow(it, after)) return;
    }
    btn.disabled = true;
    const { data, error } = await sb.rpc('use_item', { p_item: it.id });
    if (error) { btn.disabled = false; return toast(friendly(error)); }
    toast(data.message);
    renderHome(data.character);
    loadBag();
  }

  // Warn before a pill would push toxicity past the limit (that part becomes permanent).
  function confirmOverflow(it, after) {
    const box = $('#bag-warning');
    if (box && box.dataset.item === it.id) { box.remove(); return true; }
    if (box) box.remove();
    const w = document.createElement('div');
    w.id = 'bag-warning';
    w.dataset.item = it.id;
    w.className = 'warn-box';
    w.textContent = `Your body can only hold so much. ${it.name} would push your toxicity to ${Math.round(after)} — anything over 100 sinks in as permanent deep toxicity. Tap Use again to take it anyway.`;
    $('#bag-list').before(w);
    return false;
  }

  // ---------- Tabs ----------
  function showPane(id) {
    document.querySelectorAll('.pane').forEach((p) => p.classList.toggle('active', p.id === id));
    document.querySelectorAll('.tabbar-btn').forEach((b) => b.classList.toggle('active', b.dataset.pane === id));
    window.scrollTo(0, 0);
    if (id === 'pane-world') loadWorld().then(() => { renderRegions(); renderWorld(); }).catch((e) => toast(friendly(e)));
    if (id === 'pane-bag') { const w = $('#bag-warning'); if (w) w.remove(); loadBag(); }
  }
  document.querySelectorAll('.tabbar-btn').forEach((b) => b.addEventListener('click', () => showPane(b.dataset.pane)));

  // Re-check with the server when the app comes back to the screen.
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible' || !state) return;
    try { renderHome(await loadCharacter()); } catch (e) { /* keep local estimate */ }
  });

  // ---------- Auth ----------
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => selectTab(tab.dataset.tab));
  });

  $('#form-signin').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const f = ev.target;
    setError(f, '');
    const username = f.username.value.trim();
    if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) return setError(f, 'Wrong account name or password.');
    setBusy(f, true, 'Entering…');
    const { error } = await sb.auth.signInWithPassword({ email: toEmail(username), password: f.password.value });
    setBusy(f, false);
    if (error) return setError(f, friendly(error));
    f.reset();
    route();
  });

  $('#form-signup').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const f = ev.target;
    setError(f, '');
    const username = f.username.value.trim();
    if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) return setError(f, 'Account name must be 3–16 letters, numbers or _.');
    if (f.password.value.length < 6) return setError(f, 'Password must be at least 6 characters.');
    if (f.password.value !== f.confirm.value) return setError(f, 'Passwords do not match.');
    setBusy(f, true, 'Creating…');
    try {
      const { data: free, error: e1 } = await sb.rpc('username_available', { p_username: username });
      if (e1) throw e1;
      if (!free) throw new Error('That account name is taken.');
      const { data, error } = await sb.auth.signUp({
        email: toEmail(username),
        password: f.password.value,
        options: { data: { username } }
      });
      if (error) throw error;
      if (!data.session) throw new Error('Email not confirmed');
      f.reset();
      route();
    } catch (e) {
      setError(f, friendly(e));
    } finally {
      setBusy(f, false);
    }
  });

  $('#btn-signout').addEventListener('click', async () => {
    clearInterval(ticker);
    state = null;
    viewContinent = null;
    itemCatalog = null;
    $('#world-result').hidden = true;
    showPane('pane-cultivate');
    await sb.auth.signOut();
    currentProfile = null;
    show('screen-auth');
  });

  // ---------- Character creation ----------
  let createdCharacter = null;

  $('#form-create').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const f = ev.target;
    setError(f, '');
    const name = f.name.value.trim().replace(/\s+/g, ' ');
    if (!/^[A-Za-z]+( [A-Za-z]+)?$/.test(name) || name.length < 2 || name.length > 20) {
      return setError(f, 'Name must be 2–20 letters (one space allowed).');
    }
    setBusy(f, true, 'Awakening…');
    const { data, error } = await sb.rpc('create_character', { p_name: name });
    setBusy(f, false);
    if (error) return setError(f, friendly(error));
    createdCharacter = data;
    $('#reveal-name').textContent = data.name;
    $('#reveal-grade').textContent = `${data.root_grade} Spirit Root`;
    $('#reveal-grade').dataset.grade = data.root_grade;
    $('#reveal-desc').textContent = GRADE_TEXT[data.root_grade] || '';
    orbs($('#reveal-orbs'), data.spirit_root);
    $('#create-step-name').hidden = true;
    $('#create-step-reveal').hidden = false;
  });

  $('#btn-begin').addEventListener('click', () => {
    if (createdCharacter) route();
  });

  // ---------- Start ----------
  sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') show('screen-auth');
  });

  route();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
