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

  // ---------- Notifications ----------
  const NOTE_ICON = { system: '✦', seclusion: '☯', sect: '宗', attack: '⚔', trade: '⇄', gift: '✿' };
  let notesLoadedAt = 0;

  async function loadNotes(force) {
    if (!state || (!force && Date.now() - notesLoadedAt < 20000)) return;
    notesLoadedAt = Date.now();
    const { data } = await sb.from('notifications')
      .select('id,kind,title,body,created_at,read_at')
      .eq('character_id', state.id).order('created_at', { ascending: false }).limit(30);
    renderNotes(data || []);
  }

  function renderNotes(rows) {
    const unread = rows.filter((r) => !r.read_at).length;
    const badge = $('#notes-badge');
    badge.hidden = unread === 0;
    badge.textContent = unread > 9 ? '9+' : unread;
    $('#notes').classList.toggle('has-new', unread > 0);
    $('#notes-empty').hidden = rows.length > 0;
    const ul = $('#notes-list');
    ul.innerHTML = '';
    rows.forEach((r) => {
      const li = document.createElement('li');
      li.className = r.read_at ? '' : 'unread';
      const when = new Date(r.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      li.innerHTML = `<span class="n-ico">${NOTE_ICON[r.kind] || '•'}</span><div class="n-main"><div class="n-top"><strong></strong><time>${when}</time></div><p></p></div>`;
      li.querySelector('strong').textContent = r.title;
      li.querySelector('p').textContent = r.body;
      ul.appendChild(li);
    });
    if ($('#notes').open && unread) markNotesRead();
  }

  async function markNotesRead() {
    await sb.rpc('mark_notifications_read');
    $('#notes-badge').hidden = true;
    $('#notes').classList.remove('has-new');
  }

  $('#notes').addEventListener('toggle', () => {
    if ($('#notes').open && !$('#notes-badge').hidden) markNotesRead();
  });

  async function route() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { show('screen-auth'); return; }
    try {
      currentProfile = await loadProfile(session.user.id);
      const ch = await loadCharacter();
      if (!ch) { show('screen-create'); return; }
      if (ch.gained > 0 && ch.away_seconds >= 60) {
        toast(`In seclusion (${duration(ch.away_seconds)}) you gathered ${fmt(ch.gained)} qi.`);
      }
      renderHome(ch);
      loadWorld().then(tick).catch(() => {});
    } catch (e) {
      toast(friendly(e));
      show('screen-auth');
    }
  }

  // ---------- Cultivation ----------
  let state = null;       // last character data from the server
  let syncedAt = 0;       // when we got it (local clock)
  let ticker = null;

  // Qi only flows while actively cultivating or in seclusion.
  function modeNow() {
    if (!state) return 'idle';
    const t = serverNow();
    if (state.seclusion_until && new Date(state.seclusion_until).getTime() > t) return 'seclusion';
    if (state.cultivate_until && new Date(state.cultivate_until).getTime() > t) return 'active';
    return 'idle';
  }
  function secsLeft(iso) { return iso ? (new Date(iso).getTime() - serverNow()) / 1000 : 0; }
  function liveQi() {
    if (!state) return 0;
    const from = new Date(state.qi_updated_at).getTime();
    const t = serverNow();
    let gain = 0;
    if (state.cultivate_until) {
      gain += Math.max(0, (Math.min(t, new Date(state.cultivate_until).getTime()) - from) / 1000) * state.qi_rate;
    }
    if (state.seclusion_until && state.seclusion_started_at) {
      const s = Math.max(from, new Date(state.seclusion_started_at).getTime());
      gain += Math.max(0, (Math.min(t, new Date(state.seclusion_until).getTime()) - s) / 1000) * state.qi_rate * state.seclusion_mult;
    }
    return Math.min(state.qi_needed, state.qi + Math.floor(gain));
  }

  function renderSession() {
    const mode = modeNow();
    const status = $('#session-status');
    const cult = $('#btn-cultivate');
    const end = $('#btn-end-secl');
    const box = $('#seclusion-box');
    const leftToday = Math.max(0, state.seclusion_left_today);
    const atHome = !!(state.sect && state.region && state.sect.home_region === state.region.id);
    const town = (state.region && state.region.is_town) || atHome;
    status.className = `session-status m-${mode}`;
    if (mode === 'seclusion') {
      status.textContent = `In seclusion · ${duration(secsLeft(state.seclusion_until))} left · ×${state.seclusion_mult} speed`;
      cult.hidden = true; end.hidden = false; box.hidden = true;
    } else {
      end.hidden = true; cult.hidden = false; box.hidden = false;
      if (mode === 'active') {
        status.textContent = `Cultivating · ${duration(secsLeft(state.cultivate_until))} left`;
        cult.textContent = 'Keep cultivating · reset to 1 hour';
      } else {
        status.textContent = 'You are not cultivating. No qi is being gathered.';
        cult.textContent = 'Cultivate · 1 hour';
      }
      cult.disabled = cult.dataset.busy === '1';
      $('#secl-left').textContent = leftToday > 0 ? `${duration(leftToday)} left today` : 'None left today';
      document.querySelectorAll('#secl-hours .hour').forEach((b) => {
        b.disabled = !town || !!state.travel || Number(b.dataset.h) * 3600 > leftToday;
      });
      const note = $('#secl-note');
      if (state.travel) note.textContent = 'You cannot enter seclusion while travelling.';
      else if (!town) note.textContent = `Seclusion is only possible in a town or at your sect.${nearestTownText()}`;
      else if (leftToday < 7200) note.textContent = 'You have used today’s seclusion. It resets at midnight.';
      else if (atHome) note.textContent = `At your sect's home: qi ×${Math.round(state.seclusion_mult * state.sect_seclusion_bonus * 100) / 100} faster (sect bonus included). You cannot explore or travel while secluded.`;
      else note.textContent = `For when you go offline. Gathers qi ×${state.seclusion_mult} faster. You cannot explore or travel while secluded.`;
    }
  }

  function nearestTownText() {
    if (!world || !state.region) return '';
    const t = world.regions.find((r) => r.is_town && r.continent_id === state.region.continent_id);
    return t ? ` Nearest: ${t.name}.` : '';
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
    const mode = modeNow();
    const rate = mode === 'seclusion' ? state.qi_rate * state.seclusion_mult : mode === 'active' ? state.qi_rate : 0;
    $('#home-rate').textContent = rate ? `+${Number(rate).toLocaleString('en-US', { maximumFractionDigits: 2 })} qi/sec` : 'Not cultivating';
    let eta;
    if (full) eta = 'Your qi is full. Advance to keep growing.';
    else if (!rate) eta = '';
    else {
      const toFull = (need - qi) / rate;
      const sessionLeft = secsLeft(mode === 'seclusion' ? state.seclusion_until : state.cultivate_until);
      eta = toFull <= sessionLeft ? `Full in ${duration(toFull)}` : `+${fmt(Math.floor(rate * sessionLeft))} more this session`;
    }
    $('#home-eta').textContent = eta;
    $('#home-eta').classList.toggle('warn', full);
    renderSession();

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
    ticker = setInterval(() => { tick(); loadNotes(); }, 1000);
    loadNotes(true);
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

  // ---------- Cultivation sessions ----------
  $('#btn-cultivate').addEventListener('click', async () => {
    const b = $('#btn-cultivate');
    b.dataset.busy = '1'; b.disabled = true;
    const { data, error } = await sb.rpc('start_cultivating');
    b.dataset.busy = '';
    if (error) { toast(friendly(error)); tick(); return; }
    toast('You sit cross-legged and begin circulating your qi.');
    renderHome(data);
  });

  // Two taps to start or end seclusion, so it isn't triggered by accident.
  function armed(btn, label, action) {
    if (btn.dataset.armed === '1') { btn.dataset.armed = ''; return action(); }
    document.querySelectorAll('[data-armed="1"]').forEach((x) => { x.dataset.armed = ''; x.textContent = x.dataset.orig; });
    btn.dataset.orig = btn.textContent;
    btn.dataset.armed = '1';
    btn.textContent = label;
    setTimeout(() => { if (btn.dataset.armed === '1') { btn.dataset.armed = ''; btn.textContent = btn.dataset.orig; } }, 4000);
  }

  document.querySelectorAll('#secl-hours .hour').forEach((b) => b.addEventListener('click', () => {
    const h = Number(b.dataset.h);
    armed(b, 'Confirm', async () => {
      b.textContent = `${h}h`;
      const { data, error } = await sb.rpc('start_seclusion', { p_hours: h });
      if (error) return toast(friendly(error));
      toast(`You close the door and enter seclusion for ${h} hours.`);
      renderHome(data);
    });
  }));

  $('#btn-end-secl').addEventListener('click', () => {
    const b = $('#btn-end-secl');
    armed(b, 'Tap again to leave — unused time is returned', async () => {
      b.textContent = 'Leave seclusion early';
      const { data, error } = await sb.rpc('end_seclusion');
      if (error) return toast(friendly(error));
      toast('You leave seclusion. Unused time is added back to today.');
      renderHome(data);
    });
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

  // Mark for a region's controlling sect: yours, an ally, or another sect.
  function ctlTag(ctl, id) {
    const label = ctl.relation === 'mine' ? `★ ${ctl.sect}` : ctl.relation === 'ally' ? `◆ Ally · ${ctl.sect}` : ctl.sect;
    return `<span class="ctl c-${ctl.relation}"${id ? ` id="${id}"` : ''}>${esc(label)}</span>`;
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
    const [c, r, it] = await Promise.all([
      sb.from('continents').select('*').order('sort'),
      sb.from('regions').select('id,continent_id,name,danger,description,is_town,specialty,specialty_item,tax_mult').order('continent_id').order('danger').order('id'),
      sb.from('items').select('id,name')
    ]);
    if (c.error || r.error) throw (c.error || r.error);
    const names = Object.fromEntries((it.data || []).map((i) => [i.id, i.name]));
    r.data.forEach((x) => { x.item_name = names[x.specialty_item] || null; });
    world = { continents: c.data, regions: r.data };
    return world;
  }

  // What makes a region worth holding.
  function specialtyTag(r) {
    if (!r) return '';
    if (r.specialty === 'stones') return `<span class="spec s-stones">◉ Spirit vein · ×${Number(r.tax_mult)} taxes</span>`;
    if (r.specialty === 'item' && (r.item_name || r.item)) return `<span class="spec s-item">⚒ ${esc(r.item_name || r.item)}</span>`;
    return '';
  }
  function regionInfo(id) { return world ? world.regions.find((x) => x.id === id) : null; }

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
      const secluded = modeNow() === 'seclusion';
      btn.disabled = secluded || !!state.travel || st < state.explore_cost;
      btn.textContent = secluded ? 'In seclusion' : state.travel ? 'Travelling…' : st < state.explore_cost ? 'Too tired — rest a while' : `Explore (−${state.explore_cost} stamina)`;
    }
    const tag = $('#world-town');
    if (tag) tag.hidden = !reg.is_town;
    const specEl = $('#world-spec');
    const ri = regionInfo(reg.id);
    const specHtml = specialtyTag(ri);
    if (specEl.dataset.html !== specHtml) { specEl.innerHTML = specHtml; specEl.dataset.html = specHtml; }
    const ctlEl = $('#world-ctl');
    const ctl = control[String(reg.id)];
    ctlEl.hidden = !ctl;
    if (ctl) ctlEl.outerHTML = ctlTag(ctl, 'world-ctl');
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
      const ctl = control[String(r.id)];
      const townTag = (r.is_town ? '<span class="town-tag">Town · seclusion</span>' : '') + specialtyTag(r) + (ctl ? ctlTag(ctl) : '');
      li.innerHTML = `<div class="r-main"><strong>${r.name}</strong><div class="tags"><span class="danger ${di.cls}">Danger ${r.danger} · ${di.label}</span>${townTag}</div></div>`;
      const b = document.createElement('button');
      b.className = 'btn ghost small';
      b.textContent = here ? 'You are here' : going ? 'On the way' : 'Travel';
      b.disabled = here || !!state.travel || modeNow() === 'seclusion';
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
    if (data.bonus_item) bits.push(`<span class="gain item">+1 ${esc(data.bonus_item)} (local specialty)</span>`);
    if (data.extra_cost > 0) bits.push(`<span class="gain bad">−${data.extra_cost} extra stamina</span>`);
    box.className = `card story k-${data.kind}`;
    const gift = data.gift ? `<p class="gift">✿ ${esc(data.gift)}</p>` : '';
    box.innerHTML = `<p>${data.story}</p><div class="gains">${bits.join('')}</div>${gift}`;
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

  // ---------- Sect ----------
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const ROLE = { leader: 'Sect Leader', elder: 'Elder', member: 'Disciple' };
  let sectData = null;
  let control = {};

  async function loadControl() {
    const { data } = await sb.rpc('region_control');
    control = data || {};
  }

  async function loadSect() {
    if (!state) return;
    if (!state.sect) {
      const { data, error } = await sb.rpc('list_sects');
      if (error) return toast(friendly(error));
      renderSectList(data || []);
      return;
    }
    const { data, error } = await sb.rpc('my_sect');
    if (error) return toast(friendly(error));
    if (!data) { state.sect = null; return loadSect(); }
    sectData = data;
    renderMySect(data);
  }

  async function sectCall(fn, args, okMsg) {
    const { data, error } = await sb.rpc(fn, args || {});
    if (error) { toast(friendly(error)); return null; }
    if (okMsg) toast(okMsg);
    return data;
  }

  // refresh character (sect membership lives on it), then the sect screen
  async function refreshAll() {
    try { renderHome(await loadCharacter()); } catch (e) { /* ignore */ }
    await loadControl();
    loadSect();
  }

  function renderSectList(list) {
    $('#sect-none').hidden = false;
    $('#sect-mine').hidden = true;
    $('#btn-found').textContent = `Found sect · ${fmt(300)} spirit stones`;
    $('#sects-empty').hidden = list.length > 0;
    const ul = $('#sect-list');
    ul.innerHTML = '';
    list.forEach((s) => {
      const li = document.createElement('li');
      li.innerHTML = `<div class="s-main"><strong>${esc(s.name)}</strong>
        ${s.motto ? `<p class="motto">“${esc(s.motto)}”</p>` : ''}
        <span class="muted small-text">Leader ${esc(s.leader)} · ${s.members} disciple${s.members === 1 ? '' : 's'} · Home: ${esc(s.home)} · ${s.regions} region${s.regions === 1 ? '' : 's'}</span></div>`;
      const b = document.createElement('button');
      b.className = 'btn small ' + (s.requested ? 'ghost' : 'primary');
      b.textContent = s.requested ? 'Cancel request' : 'Ask to join';
      b.onclick = async () => {
        b.disabled = true;
        const data = await sectCall(s.requested ? 'cancel_request' : 'request_join', { p_sect: s.id },
          s.requested ? 'Request withdrawn.' : `Your request was sent to ${s.name}.`);
        if (data) renderSectList(data); else b.disabled = false;
      };
      li.appendChild(b);
      ul.appendChild(li);
    });
  }

  $('#form-sect').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const f = ev.target;
    setError(f, '');
    const name = f.name.value.trim().replace(/\s+/g, ' ');
    if (!/^[A-Za-z]+( [A-Za-z]+)*$/.test(name) || name.length < 3 || name.length > 24) return setError(f, 'Sect name must be 3–24 letters and spaces.');
    setBusy(f, true, 'Founding…');
    const { error } = await sb.rpc('create_sect', { p_name: name, p_motto: f.motto.value });
    setBusy(f, false);
    if (error) return setError(f, friendly(error));
    f.reset();
    toast(`${name} has been founded!`);
    refreshAll();
  });

  function personRow(html, buttons) {
    const li = document.createElement('li');
    li.innerHTML = `<div class="p-main">${html}</div>`;
    if (buttons && buttons.length) {
      const box = document.createElement('div');
      box.className = 'p-actions';
      buttons.forEach((b) => box.appendChild(b));
      li.appendChild(box);
    }
    return li;
  }
  function smallBtn(label, cls, onclick) {
    const b = document.createElement('button');
    b.className = `btn small ${cls}`;
    b.textContent = label;
    b.onclick = onclick;
    return b;
  }

  function renderMySect(s) {
    $('#sect-none').hidden = true;
    $('#sect-mine').hidden = false;
    const leader = s.my_role === 'leader';
    const officer = leader || s.my_role === 'elder';
    $('#sect-role').textContent = ROLE[s.my_role];
    $('#sect-name').textContent = s.name;
    $('#sect-motto').textContent = s.motto ? `“${s.motto}”` : '';
    $('#sect-treasury').textContent = `${fmt(s.treasury)} stones`;
    $('#sect-tax').textContent = s.tax_per_hour ? `+${fmt(s.tax_per_hour)} / hour` : 'None yet';
    $('#sect-home').textContent = s.home.name;
    $('#sect-count').textContent = `${s.members.length} / ${s.max_members}`;

    // requests
    $('#sect-requests-card').hidden = !(officer && s.requests.length);
    const rq = $('#sect-requests');
    rq.innerHTML = '';
    s.requests.forEach((r) => {
      rq.appendChild(personRow(`<strong>${esc(r.name)}</strong><span class="muted small-text">${esc(r.root)} root · ${REALMS[r.realm - 1]} ${r.stage}</span>`, [
        smallBtn('Accept', 'primary', async () => { const d = await sectCall('respond_request', { p_char: r.id, p_accept: true }, `${r.name} has joined.`); if (d) renderMySect(d); }),
        smallBtn('Decline', 'ghost', async () => { const d = await sectCall('respond_request', { p_char: r.id, p_accept: false }); if (d) renderMySect(d); })
      ]));
    });

    // territory
    const rg = $('#sect-regions');
    rg.innerHTML = '';
    if (!s.regions.length) rg.innerHTML = '<li class="empty">Your sect controls no land yet.</li>';
    s.regions.forEach((r) => {
      const tribute = r.specialty === 'item' ? ` · 1 ${esc(r.item)} every ${s.tribute_hours}h` : '';
      rg.appendChild(personRow(`<strong>${esc(r.name)}</strong><div class="tags">${specialtyTag(r)}</div>
        <span class="muted small-text">Danger ${r.danger} · +${fmt(r.danger * Number(r.tax_mult) * s.tax_per_danger_hour)} stones / hour${tribute}</span>`,
        leader ? [smallBtn('Give up', 'ghost', function () {
          armed(this, 'Confirm', async () => { const d = await sectCall('release_region', { p_region: r.id }, `${r.name} released.`); if (d) { await loadControl(); renderMySect(d); } });
        })] : []));
    });
    const cb = $('#claim-box');
    cb.innerHTML = '';
    if (officer && state.region) {
      const here = state.region;
      const ctl = control[String(here.id)];
      const p = document.createElement('p');
      p.className = 'muted small-text claim-note';
      if (state.travel) p.textContent = 'Arrive somewhere to claim it.';
      else if (here.is_town) p.textContent = `${here.name} is a town — neutral ground that cannot be claimed.`;
      else if (ctl && ctl.relation === 'mine') p.textContent = `Your sect already controls ${here.name}.`;
      else if (ctl) p.textContent = `${here.name} is controlled by ${ctl.sect}.`;
      else if (s.regions.length >= s.max_regions) p.textContent = `Your sect can control ${s.max_regions} regions for now.`;
      else {
        const cost = here.danger * s.claim_cost_per_danger;
        const ri = regionInfo(here.id);
        const perk = ri && ri.specialty === 'stones' ? ' It sits on a spirit vein: taxes here are doubled.'
          : ri && ri.specialty === 'item' ? ` It sends ${ri.item_name} to your storehouse as tribute.` : '';
        p.textContent = `Claim the region you are standing in. Paid from the treasury. Its people will pay taxes, and disciples exploring there may receive gifts.${perk}`;
        const b = smallBtn(`Claim ${here.name} · ${fmt(cost)} stones`, 'primary wide', async () => {
          const d = await sectCall('claim_region', {}, `${here.name} is now yours.`);
          if (d) { await loadControl(); renderMySect(d); }
        });
        b.disabled = s.treasury < cost;
        cb.appendChild(p);
        cb.appendChild(b);
        return renderMembersAndAllies(s, leader, officer);
      }
      cb.appendChild(p);
    } else if (!officer) {
      cb.innerHTML = '<p class="muted small-text claim-note">The leader and elders can claim new territory.</p>';
    }
    renderMembersAndAllies(s, leader, officer);
  }

  function renderStoreAndMove(s, leader, officer) {
    // storehouse
    $('#store-note').textContent = s.storage.length
      ? (officer ? 'Tribute from your territory. Hand items out to disciples.' : 'Tribute from your territory. The leader and elders hand these out.')
      : 'Empty. Regions that produce materials send tribute here.';
    const ul = $('#sect-storage');
    ul.innerHTML = '';
    s.storage.forEach((it) => {
      const btns = [];
      if (officer) {
        const sel = document.createElement('select');
        sel.className = 'mini-select';
        sel.innerHTML = s.members.map((m) => `<option value="${m.id}">${esc(m.name)}${m.id === s.my_id ? ' (you)' : ''}</option>`).join('');
        btns.push(sel);
        btns.push(smallBtn('Give 1', 'ghost', async () => {
          const d = await sectCall('give_from_storage', { p_char: sel.value, p_item: it.id, p_qty: 1 }, `Gave 1 ${it.name}.`);
          if (d) renderMySect(d);
        }));
      }
      ul.appendChild(personRow(`<strong>${esc(it.name)} <span class="qty">×${it.qty}</span></strong><span class="rarity">${it.rarity}</span>`, btns));
    });

    // moving home
    const mb = $('#move-box');
    mb.innerHTML = '';
    if (!leader || !state.region) return;
    const here = state.region;
    const p = document.createElement('p');
    p.className = 'muted small-text claim-note';
    const next = s.home_next_move ? new Date(s.home_next_move) : null;
    if (here.id === s.home.id) { p.textContent = 'To move your sect, travel to the new region first. You can move once every 7 days.'; mb.appendChild(p); return; }
    if (next && next.getTime() > serverNow()) {
      p.textContent = `Your sect can move again on ${next.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.`;
      mb.appendChild(p); return;
    }
    const b = smallBtn(`Move home to ${here.name} · ${fmt(s.home_move_cost)} stones`, 'ghost wide', function () {
      armed(this, 'Tap again to move — then 7 days before the next move', async () => {
        const d = await sectCall('move_home', {}, `Your sect now calls ${here.name} home.`);
        if (d) refreshAll();
      });
    });
    b.disabled = s.treasury < s.home_move_cost || !!state.travel;
    mb.appendChild(b);
  }

  function renderMembersAndAllies(s, leader, officer) {
    renderStoreAndMove(s, leader, officer);
    const ml = $('#sect-members');
    ml.innerHTML = '';
    s.members.forEach((m) => {
      const me = m.id === s.my_id;
      const btns = [];
      if (!me && leader) {
        if (m.role === 'member') btns.push(smallBtn('Make Elder', 'ghost', async () => { const d = await sectCall('set_role', { p_char: m.id, p_role: 'elder' }); if (d) renderMySect(d); }));
        if (m.role === 'elder') btns.push(smallBtn('Demote', 'ghost', async () => { const d = await sectCall('set_role', { p_char: m.id, p_role: 'member' }); if (d) renderMySect(d); }));
        btns.push(smallBtn('Make Leader', 'ghost', function () {
          armed(this, 'Confirm', async () => { const d = await sectCall('set_role', { p_char: m.id, p_role: 'leader' }, `${m.name} now leads the sect.`); if (d) refreshAll(); });
        }));
      }
      if (!me && (leader || (s.my_role === 'elder' && m.role === 'member'))) {
        btns.push(smallBtn('Expel', 'ghost danger-btn', function () {
          armed(this, 'Confirm', async () => { const d = await sectCall('expel_member', { p_char: m.id }, `${m.name} was expelled.`); if (d) renderMySect(d); });
        }));
      }
      ml.appendChild(personRow(`<strong>${esc(m.name)}${me ? ' <span class="you">you</span>' : ''}</strong>
        <span class="role-tag r-${m.role}">${ROLE[m.role]}</span>
        <span class="muted small-text">${REALMS[m.realm - 1]} ${m.stage} · ${esc(m.region)}</span>`, btns));
    });

    const al = $('#sect-allies');
    al.innerHTML = '';
    if (!s.alliances.length) al.innerHTML = '<li class="empty">No alliances.</li>';
    s.alliances.forEach((a) => {
      const btns = [];
      if (leader && a.status === 'pending' && a.incoming) {
        btns.push(smallBtn('Accept', 'primary', async () => { const d = await sectCall('respond_alliance', { p_sect: a.sect_id, p_accept: true }, `Allied with ${a.name}.`); if (d) { await loadControl(); renderMySect(d); } }));
        btns.push(smallBtn('Decline', 'ghost', async () => { const d = await sectCall('respond_alliance', { p_sect: a.sect_id, p_accept: false }); if (d) renderMySect(d); }));
      } else if (leader) {
        btns.push(smallBtn(a.status === 'active' ? 'End' : 'Withdraw', 'ghost', function () {
          armed(this, 'Confirm', async () => { const d = await sectCall('end_alliance', { p_sect: a.sect_id }); if (d) { await loadControl(); renderMySect(d); } });
        }));
      }
      const label = a.status === 'active' ? 'Allied' : a.incoming ? 'Wants to ally with you' : 'Proposal sent';
      al.appendChild(personRow(`<strong>${esc(a.name)}</strong><span class="ally-tag s-${a.status}">${label}</span>`, btns));
    });

    const pb = $('#propose-box');
    pb.hidden = !leader;
    if (leader) {
      sb.rpc('list_sects').then(({ data }) => {
        const taken = new Set(s.alliances.map((a) => a.sect_id));
        const opts = (data || []).filter((x) => x.relation === 'none' && !taken.has(x.id));
        const sel = $('#propose-select');
        sel.innerHTML = opts.length ? opts.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join('') : '<option value="">No other sects yet</option>';
        $('#btn-propose').disabled = !opts.length;
      });
    }
  }

  $('#btn-propose').addEventListener('click', async () => {
    const id = $('#propose-select').value;
    if (!id) return;
    const d = await sectCall('propose_alliance', { p_sect: id }, 'Alliance proposal sent.');
    if (d) renderMySect(d);
  });

  $('#btn-donate').addEventListener('click', async () => {
    const n = parseInt($('#donate-amount').value, 10);
    if (!n || n < 1) return toast('Enter how many spirit stones to donate.');
    const d = await sectCall('donate', { p_amount: n }, `You donated ${fmt(n)} spirit stones.`);
    if (d) { $('#donate-amount').value = ''; sectData = d; renderMySect(d); try { renderHome(await loadCharacter()); } catch (e) { /* */ } }
  });

  $('#btn-leave-sect').addEventListener('click', function () {
    const alone = sectData && sectData.members.length === 1;
    armed(this, alone ? 'Tap again — the sect will be disbanded' : 'Tap again to leave', async () => {
      const d = await sectCall('leave_sect', {}, alone ? 'Your sect has been disbanded.' : 'You have left the sect.');
      if (d) { sectData = null; refreshAll(); }
      this.textContent = 'Leave sect';
    });
  });

  // ---------- Tabs ----------
  function showPane(id) {
    document.querySelectorAll('.pane').forEach((p) => p.classList.toggle('active', p.id === id));
    document.querySelectorAll('.tabbar-btn').forEach((b) => b.classList.toggle('active', b.dataset.pane === id));
    window.scrollTo(0, 0);
    if (id === 'pane-world') Promise.all([loadWorld(), loadControl()]).then(() => { renderRegions(); renderWorld(); }).catch((e) => toast(friendly(e)));
    if (id === 'pane-sect') Promise.all([loadWorld(), loadControl()]).then(loadSect).catch((e) => toast(friendly(e)));
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
