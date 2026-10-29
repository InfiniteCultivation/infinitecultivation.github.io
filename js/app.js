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
    $('#tab-home-dot').hidden = unread === 0;
    $('#hq-noti-val').textContent = String(unread);
    $('#hq-noti').classList.toggle('has-new', unread > 0);
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

  $('#hq-noti').addEventListener('click', () => {
    const n = $('#notes');
    n.open = true;
    n.scrollIntoView({ behavior: 'smooth', block: 'start' });
    markNotesRead();
  });
  async function markNotesRead() {
    await sb.rpc('mark_notifications_read');
    $('#notes-badge').hidden = true;
    $('#tab-home-dot').hidden = true;
    $('#hq-noti-val').textContent = '0';
    $('#hq-noti').classList.remove('has-new');
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
      loadDuels();
      loadRaid();
      loadWar();
      loadTour();
      refreshDmBadge();
      checkBattle();
    } catch (e) {
      toast(friendly(e));
      show('screen-auth');
    }
  }

  // ---------- Cultivation ----------
  let state = null;       // last character data from the server
  let syncedAt = 0;       // when we got it (local clock)
  let ticker = null;
  let tickCount = 0;

  // Qi only flows while actively cultivating or in seclusion.
  function modeNow() {
    if (!state) return 'idle';
    const t = serverNow();
    if (state.seclusion_until && new Date(state.seclusion_until).getTime() > t) return 'seclusion';
    if (state.cultivate_until && new Date(state.cultivate_until).getTime() > t) {
      // a training session started after this cultivation tap replaces it
      if (trainingActive() && new Date(trainInfo().until).getTime() - TRAIN_SEC * 1000 > new Date(state.cultivate_until).getTime() - 3600 * 1000) return 'training';
      return 'active';
    }
    if (trainingActive()) return 'training';
    return 'idle';
  }
  const TRAIN_SEC = 3600;
  // Stat training or skill practice, whichever is running.
  function trainInfo() {
    if (!state) return null;
    if (state.training) return { label: STAT_NAMES[state.training.stat], until: state.training.until };
    if (state.practice) return { label: state.practice.name, until: state.practice.until };
    return null;
  }
  function trainingActive() {
    const ti = trainInfo();
    if (!ti) return false;
    const t = serverNow();
    const until = new Date(ti.until).getTime();
    if (until <= t) return false;
    // a Cultivate tap after training began ends the training
    if (state.cultivate_until) {
      const cultStart = new Date(state.cultivate_until).getTime() - 3600 * 1000;
      if (cultStart > until - TRAIN_SEC * 1000 && cultStart <= t) return false;
    }
    return true;
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

  // Home shows only whether you are cultivating, with one button.
  function renderHomeButton(full) {
    const mode = modeNow();
    const btn = $('#btn-home-cultivate');
    const st = $('#home-state');
    st.className = `slim-state m-${mode}`;
    st.textContent = mode === 'seclusion' ? 'In seclusion' : mode === 'active' ? 'Cultivating' : mode === 'training' ? 'Training' : 'Idle';
    btn.dataset.mode = '';
    btn.className = 'btn jade';
    if (full && !(state.realm === 10 && state.stage === 10)) {
      btn.textContent = 'Qi full · Advance ›'; btn.dataset.mode = 'advance'; btn.className = 'btn primary'; btn.disabled = false;
    } else if (mode === 'seclusion') {
      btn.textContent = `In seclusion · ${duration(secsLeft(state.seclusion_until))} left`; btn.disabled = true;
    } else if (mode === 'training') {
      btn.textContent = `Training ${trainInfo().label} · ${duration(secsLeft(trainInfo().until))} · tap to cultivate`; btn.disabled = btn.dataset.busy === '1';
    } else if (mode === 'active') {
      btn.textContent = `Cultivating · ${duration(secsLeft(state.cultivate_until))} left · tap to reset`; btn.disabled = btn.dataset.busy === '1';
    } else {
      btn.textContent = 'Cultivate · 1 hour'; btn.disabled = btn.dataset.busy === '1';
    }
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
      if (mode === 'training') {
        status.textContent = `Training ${trainInfo().label} · ${duration(secsLeft(trainInfo().until))} left. No qi is gathered while training.`;
        cult.textContent = 'Stop training and cultivate · 1 hour';
      } else if (mode === 'active') {
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
    ['home', 'char'].forEach((k) => {
      $(`#${k}-qi`).textContent = `${fmt(qi)} / ${fmt(need)}`;
      $(`#${k}-qi-bar`).style.width = `${Math.min(100, (qi / need) * 100)}%`;
      $(`#${k}-qi-bar`).classList.toggle('full', full);
    });
    renderHomeButton(full);
    const mode = modeNow();
    const rate = mode === 'seclusion' ? state.qi_rate * state.seclusion_mult : mode === 'active' ? state.qi_rate : 0;  // training gathers no qi
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

    renderPools($('#char-pools'), state.pools);
    renderTox();
    $('#home-stamina').textContent = `${liveStamina()} / ${state.stamina_max}`;
    renderTown();
    $('#home-loc').textContent = state.travel ? `→ ${state.travel.name}` : (state.region ? state.region.name : '');
    // Home quick bar
    const pl = state.pools || {};
    $('#hq-hp').textContent = `${fmt(pl.hp ?? 0)} / ${fmt(pl.hp_max ?? 0)}`;
    $('#hq-en').textContent = `${fmt(pl.energy ?? 0)} / ${fmt(pl.energy_max ?? 0)}`;
    $('#hq-st').textContent = `${liveStamina()} / ${state.stamina_max}`;
    $('#hq-stones').textContent = fmt(state.spirit_stones);
    let travelText = '';
    if (state.travel) {
      const left = (new Date(state.travel.arrive_at).getTime() - serverNow()) / 1000;
      travelText = left > 0 ? `Travelling to ${state.travel.name} · arrives in ${duration(left)}` : `Arriving at ${state.travel.name}…`;
    }
    $('#hq-loc').textContent = state.travel ? `→ ${state.travel.name}` : (state.region ? state.region.name : '');
    const tt = $('#travel-top');
    tt.hidden = !state.travel;
    if (state.travel) tt.textContent = travelText;
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
    $('#char-name').textContent = ch.name;
    $('#char-realm').textContent = `${REALMS[ch.realm - 1]} · Stage ${ch.stage}`;
    $('#char-sect').textContent = ch.sect ? ch.sect.name : 'None';
    const pts = ch.free_points || 0;
    $('#hub-points').hidden = !pts;
    $('#hub-points').textContent = pts;
    orbs($('#home-orbs'), ch.spirit_root);
    tick();
    clearInterval(ticker);
    ticker = setInterval(() => {
      tick();
      loadNotes();
      tickCount += 1;
      if (tickCount % 20 === 0) { loadDuels(); refreshDmBadge(); }
      if (tickCount % 10 === 3) refreshChatDots();
      if (tickCount % (duelWaiting ? 4 : 20) === 0) checkBattle();
    }, 1000);
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
    if (data.major && data.success) toast(`Breakthrough! You have entered ${REALMS[data.realm - 1]}. +${data.points} free stat points.`);
    else if (data.major) toast(`The breakthrough failed. ${fmt(data.qi_lost)} qi scattered.`);
    else toast(`You reached Stage ${data.stage}.${data.points ? ` +${data.points} free stat points.` : ''}`);
    const card = $('#home-card');
    card.classList.remove('flash-ok', 'flash-fail');
    void card.offsetWidth;
    card.classList.add(data.success ? 'flash-ok' : 'flash-fail');
    renderHome(data);
  });

  // ---------- Cultivation sessions ----------
  async function startCultivating(b) {
    b.dataset.busy = '1'; b.disabled = true;
    const { data, error } = await sb.rpc('start_cultivating');
    b.dataset.busy = '';
    if (error) { toast(friendly(error)); tick(); return; }
    toast('You sit cross-legged and begin circulating your qi.');
    renderHome(data);
  }
  $('#btn-cultivate').addEventListener('click', () => startCultivating($('#btn-cultivate')));
  $('#btn-home-cultivate').addEventListener('click', () => {
    const b = $('#btn-home-cultivate');
    if (b.dataset.mode === 'advance') return showPane('pane-character');
    startCultivating(b);
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
    const label = ctl.relation === 'mine' ? `★ ${ctl.sect}` : ctl.relation === 'ally' ? `◆ Ally · ${ctl.sect}`
      : ctl.relation === 'npc' ? (ctl.freed_until ? `Freed · ${ctl.sect} gone` : `${ctl.temperament === 'demonic' ? '☠ ' : ctl.temperament === 'righteous' ? '☯ ' : ''}${ctl.sect}`) : ctl.sect;
    const cls = ctl.relation === 'npc' ? `npc t-${ctl.freed_until ? 'freed' : ctl.temperament}` : ctl.relation;
    return `<span class="ctl c-${cls}"${id ? ` id="${id}"` : ''}>${esc(label)}</span>`;
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
    const slow = Math.round((1 - Math.max(0.1, (1 - t / 200) * (1 - p / 150))) * 100);
    // timed boosts and penalties from fights
    const ul = $('#effects');
    const now = serverNow();
    const live = (state.effects || []).filter((e) => new Date(e.ends_at).getTime() > now);
    const html = live.map((e) => {
      const left = (new Date(e.ends_at).getTime() - now) / 1000;
      const pct = Number(e.pct);
      return `<li class="${pct >= 0 ? 'up' : 'down'}"><span>${pct >= 0 ? '▲ +' : '▼ '}${pct}% cultivation</span><span class="muted">${esc(e.source)} · ${left > 3.15e8 ? 'permanent' : duration(left)}</span></li>`;
    }).join('');
    if (ul.dataset.html !== html) { ul.innerHTML = html; ul.dataset.html = html; }
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
        loadCharacter().then(async (ch) => {
          arrivalCheck = false; renderHome(ch); renderRegions();
          const { data: amb } = await sb.rpc('raid_arrival_check');
          if (amb && amb.battle) openBattle(amb.battle, amb.story);
          loadRaid();
        }).catch(() => { arrivalCheck = false; });
      }
    } else tb.hidden = true;

    if (btn.dataset.busy !== '1') {
      const secluded = modeNow() === 'seclusion';
      btn.disabled = secluded || !!state.travel || st < state.explore_cost;
      btn.textContent = secluded ? 'In seclusion' : state.travel ? 'Travelling…' : st < state.explore_cost ? 'Too tired — rest a while' : `Explore (−${state.explore_cost} stamina)`;
    }
    const hb = $('#btn-hunt');
    if (hb && hb.dataset.busy !== '1') {
      const cost = state.explore_cost * 2;
      hb.hidden = !!reg.is_town;
      hb.disabled = modeNow() === 'seclusion' || !!state.travel || st < cost;
      hb.textContent = st < cost ? `Hunt beasts (needs ${cost} stamina)` : `Hunt beasts (−${cost} stamina)`;
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
    if (data.battle) {
      renderHome(data.character);
      const box0 = $('#world-result');
      box0.className = 'card story k-beast';
      box0.innerHTML = `<p>${esc(data.story)}</p>${data.gift ? `<p class="gift">✿ ${esc(data.gift)}</p>` : ''}`;
      box0.hidden = false;
      openBattle(data.battle, data.story);
      return;
    }
    const box = $('#world-result');
    const bits = [];
    if (data.qi > 0) bits.push(`<span class="gain qi">+${fmt(data.qi)} qi</span>`);
    if (data.qi_wasted) bits.push('<span class="gain warn">Your qi is full — advance to stop wasting it</span>');
    if (data.qi_lost > 0) bits.push(`<span class="gain bad">−${fmt(data.qi_lost)} qi</span>`);
    if (data.stones > 0) bits.push(`<span class="gain stone">+${fmt(data.stones)} spirit stones</span>`);
    if (data.item_name) bits.push(`<span class="gain item">+1 ${data.item_name}</span>`);
    if (data.manual) bits.push(`<span class="gain item">+1 ${esc(data.manual)}!</span>`);
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
    const order = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
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
      if (it.effects.boost_pct) fx.push(`+${it.effects.boost_pct}% cultivation for ${it.effects.minutes / 60}h`);
      li.innerHTML = `<div class="it-main"><div class="it-top"><strong>${it.name}</strong><span class="qty">×${it.qty}</span></div>
        <span class="rarity">${it.rarity} ${it.kind === 'material' ? 'material' : it.kind === 'manual' ? 'manual' : it.kind === 'gear' ? (it.effects.slot === 'weapon' ? `weapon · best for ${WFIT[it.effects.wtype]}` : 'armor') : ''}${it.min_realm > 1 ? ` · realm ${it.min_realm}+` : ''}</span>
        <p>${it.description}</p>${fx.length ? `<p class="fx">${fx.join(' · ')}</p>` : ''}</div>`;
      if (it.kind === 'manual') {
        const b = document.createElement('button');
        b.className = 'btn primary small';
        b.textContent = 'Read';
        b.onclick = async () => {
          const r = await sectCall('read_manual', { p_item: it.id });
          if (r) { toast(r.message); loadBag(); }
        };
        li.appendChild(b);
      }
      if (it.kind === 'gear') {
        const b = document.createElement('button');
        b.className = 'btn primary small';
        b.textContent = 'Equip';
        b.onclick = async () => {
          const r = await sectCall('equip_gear', { p_item: it.id }, `${it.name} equipped.`);
          if (r) loadBag();
        };
        li.appendChild(b);
      }
      if (it.kind === 'consumable' && it.effects.battle_only) {
        li.insertAdjacentHTML('beforeend', '<span class="muted small-text battle-only">Use in battle</span>');
      } else if (it.kind === 'consumable') {
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
    loadWar();
  }

  // ---------- Sect wars ----------
  async function loadWar() {
    const { data } = await sb.rpc('my_war');
    renderWar(data);
  }

  function warBanner(d) {
    const al = $('#war-alert');
    const w = d && d.war;
    al.hidden = !w;
    if (!w) return;
    const foe = (w.my_side === 'A' ? w.defenders : w.attackers)[0].name;
    const mine = w.my_side === 'A' ? w.a_pool : w.d_pool, theirs = w.my_side === 'A' ? w.d_pool : w.a_pool;
    const line = w.status === 'active' ? `Score ${mine} : ${theirs} · ${duration(secsLeft(w.ends_at))} left`
      : w.status === 'countdown' ? `Begins in ${duration(secsLeft(w.starts_at))}`
      : w.status === 'counter' ? 'Allies are being called' : w.can_respond ? 'Your leader must answer' : 'Waiting for an answer';
    al.innerHTML = `<span class="a-ico">⚔</span><span><strong>War with ${esc(foe)}</strong><small>${line} · tap for details</small></span>`;
    al.onclick = () => showPane('pane-sect');
  }

  function renderWar(d) {
    warBanner(d);
    const card = $('#war-card');
    const body = $('#war-body');
    if (!d || !card) return;
    const w = d.war;
    card.hidden = !w && !d.leader && !d.last;
    body.innerHTML = '';
    const p = (html) => { const e = document.createElement('div'); e.innerHTML = html; body.appendChild(e); return e; };
    if (!w) {
      if (d.last) p(`<p class="muted small-text">Last war: ${esc(d.last.result)}</p>`);
      if (!d.leader) return;
      const targets = d.targets.filter((t) => !t.ally && !t.busy);
      p(`<p class="muted small-text">Declare war on another sect. They may accept (calling allies, which lets you call as many) or decline and pay you 5% of their treasury. After a 1-hour countdown the war lasts 48 hours: beat enemies to take points — a duel is worth about 3× an ambush, and beating a stronger foe is worth more. A side that starts no fight for an hour loses points. The winner takes the stake.</p>`);
      if (!targets.length) { p('<p class="muted small-text">There is no sect you can declare war on right now.</p>'); return; }
      const box = p(`<div class="war-form">
        <select class="mini-select" id="war-target">${targets.map((t) => `<option value="${t.id}">${esc(t.name)} (${t.members})</option>`).join('')}</select>
        <select class="mini-select" id="war-stake"></select>
        <button class="btn danger-btn small" id="btn-war">Declare war</button></div>`);
      const fillStake = () => {
        const t = targets.find((x) => x.id === $('#war-target').value);
        $('#war-stake').innerHTML = '<option value="r">Stake: reparations (20% of treasury)</option>' + t.regions.map((r) => `<option value="${r.id}">Stake: take ${esc(r.name)}</option>`).join('');
      };
      fillStake();
      $('#war-target').onchange = fillStake;
      $('#btn-war').onclick = function () {
        armed(this, 'Tap again to declare war', async () => {
          const v = $('#war-stake').value;
          const r = await sectCall('war_declare', { p_target: $('#war-target').value, p_stake: v === 'r' ? 'reparations' : 'region', p_region: v === 'r' ? null : Number(v) }, 'War declared.');
          if (r) renderWar(r);
        });
      };
      return;
    }
    const side = (list, tag) => list.map((x, i) => `${i ? '◆ ' : ''}${esc(x.name)} <span class="muted">(${x.members})</span>`).join(', ');
    const mineA = w.my_side === 'A';
    const status = { declared: `Declared — ${w.can_respond ? 'you must answer' : 'waiting for an answer'} within ${duration(secsLeft(w.phase_until))}.`,
      counter: `Accepted with allies — ${w.can_counter ? 'you may call allies' : 'the attacker may call allies'} within ${duration(secsLeft(w.phase_until))}.`,
      countdown: `Begins in ${duration(secsLeft(w.starts_at))}.`, active: `${duration(secsLeft(w.ends_at))} left.` }[w.status];
    const total = Math.max(1, w.a_pool + w.d_pool);
    p(`<div class="war-sides"><div class="${mineA ? 'mine' : ''}"><span class="eyebrow">Attackers</span>${side(w.attackers)}</div><div class="vs">vs</div><div class="${mineA ? '' : 'mine'}"><span class="eyebrow">Defenders</span>${side(w.defenders)}</div></div>
      <p class="small-text">${status} Stake: ${w.stake === 'region' ? `the region ${esc(w.stake_region)}` : 'reparations (20% of the loser’s treasury)'}.</p>`);
    if (w.status === 'active') {
      const myIdle = mineA ? w.a_idle_at : w.d_idle_at;
      p(`<div class="war-score"><span>${w.a_pool}</span><div class="war-bar"><i style="width:${(100 * w.a_pool / total).toFixed(1)}%"></i></div><span>${w.d_pool}</span></div>
        <p class="muted small-text">Your side must start a fight (an ambush, or a duel you challenged) within <strong>${duration(Math.max(0, secsLeft(myIdle)))}</strong> or lose points.${d.lock_until ? ` Towns are closed to you for ${duration(secsLeft(d.lock_until))}.` : ''}</p>`);
      if (w.fights.length) p(`<ul class="war-log">${w.fights.map((f) => `<li><strong>${esc(f.w)}</strong> beat ${esc(f.l)} <span class="muted">(${f.kind}, +${f.pts} for ${f.side === 'A' ? 'attackers' : 'defenders'})</span></li>`).join('')}</ul>`);
    }
    if (w.can_respond || w.can_counter) {
      const allies = (w.allies || []).filter((a) => !a.busy);
      const limit = w.can_counter ? w.counter_limit : allies.length;
      if (allies.length) p(`<p class="muted small-text">${w.can_counter ? `Call up to ${limit} of your allies:` : 'Call allies to fight beside you (the attacker may then call as many):'}</p>
        <div class="war-allies">${allies.map((a) => `<label><input type="checkbox" value="${a.id}"> ${esc(a.name)}</label>`).join('')}</div>`);
      const picked = () => [...body.querySelectorAll('.war-allies input:checked')].map((x) => x.value).slice(0, limit);
      const row = document.createElement('div'); row.className = 'war-form';
      if (w.can_respond) {
        row.append(smallBtn('Accept war', 'primary', function () { armed(this, 'Tap again to accept', async () => { const r = await sectCall('war_respond', { p_war: w.id, p_accept: true, p_allies: picked() }); if (r) renderWar(r); }); }),
          smallBtn('Decline (pay 5%)', 'ghost', function () { armed(this, 'Tap again to decline', async () => { const r = await sectCall('war_respond', { p_war: w.id, p_accept: false, p_allies: [] }); if (r) renderWar(r); }); }));
      } else {
        row.append(smallBtn('Confirm allies', 'primary', async () => { const r = await sectCall('war_counter', { p_war: w.id, p_allies: picked() }); if (r) renderWar(r); }));
      }
      body.appendChild(row);
    }
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
      const boost = r.stronghold ? s.stronghold_mult : 1;
      const every = Math.round((s.tribute_hours / boost) * 10) / 10;
      const tribute = r.specialty === 'item' ? ` · 1 ${esc(r.item)} every ${every}h` : '';
      const sh = r.stronghold ? `<span class="spec s-strong">🏯 Stronghold ×${s.stronghold_mult}</span>` : '';
      rg.appendChild(personRow(`<strong>${esc(r.name)}</strong><div class="tags">${sh}${specialtyTag(r)}</div>
        <span class="muted small-text">Danger ${r.danger} · +${fmt(Math.round(r.danger * Number(r.tax_mult) * s.tax_per_danger_hour * boost))} stones / hour${tribute}</span>`,
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
        const home = here.id === s.home.id ? ` This is your sect's home — owning it makes it a Stronghold: its taxes, tribute and gifts are boosted ×${s.stronghold_mult}.` : '';
        p.textContent = `Claim the region you are standing in. Paid from the treasury. Its people will pay taxes, and disciples exploring there may receive gifts.${perk}${home}`;
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

  async function fillDonateSelect() {
    if (!state) return;
    if (!itemCatalog) {
      const { data } = await sb.from('items').select('*');
      itemCatalog = Object.fromEntries((data || []).map((i) => [i.id, i]));
    }
    const { data } = await sb.from('inventory').select('item_id,qty').eq('character_id', state.id).gt('qty', 0);
    const sel = $('#don-item');
    sel.innerHTML = '<option value="">Donate from your bag…</option>' + (data || [])
      .filter((r) => itemCatalog[r.item_id])
      .map((r) => `<option value="${r.item_id}">${esc(itemCatalog[r.item_id].name)} (${r.qty})</option>`).join('');
  }
  $('#btn-don-item').addEventListener('click', async () => {
    const item = $('#don-item').value;
    const qty = parseInt($('#don-qty').value, 10) || 1;
    if (!item) return toast('Choose an item from your bag.');
    const d = await sectCall('donate_item', { p_item: item, p_qty: qty }, `Donated ${qty} × ${itemCatalog[item] ? itemCatalog[item].name : item} to the storehouse.`);
    if (d) { sectData = d; renderMySect(d); }
  });

  function renderStoreAndMove(s, leader, officer) {
    fillDonateSelect();
    // storehouse
    $('#store-note').textContent = s.storage.length
      ? (officer ? 'Tribute from your territory. Each disciple can receive one item per day, and only items they are strong enough to use.' : 'Tribute from your territory. The leader and elders hand these out.')
      : 'Empty. Regions that produce materials send tribute here.';
    const ul = $('#sect-storage');
    ul.innerHTML = '';
    s.storage.forEach((it) => {
      const btns = [];
      if (officer) {
        const sel = document.createElement('select');
        sel.className = 'mini-select';
        sel.innerHTML = s.members.map((m) => `<option value="${m.id}"${m.gift_today || m.realm < (it.min_realm || 1) ? ' disabled' : ''}>${esc(m.name)}${m.id === s.my_id ? ' (you)' : ''}${m.gift_today ? ' · got one today' : m.realm < (it.min_realm || 1) ? ' · too weak' : ''}</option>`).join('');
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

  // ---------- PvP ----------
  const REL_MARK = { mine: '★ ', ally: '◆ ', enemy: '⚔ ', other: '', none: '' };

  async function loadOpponents() {
    const btn = $('#btn-look');
    btn.disabled = true; btn.textContent = 'Searching…';
    const [{ data, error }, npc, mine] = await Promise.all([sb.rpc('look_for_opponents'), sb.rpc('npcs_here'), sb.rpc('my_arts')]);
    mySupport = ((mine && mine.data && mine.data.arts) || []).filter((a) => a.type === 'support' && a.slot != null);
    btn.disabled = false; btn.textContent = 'Look again';
    if (error) return toast(friendly(error));
    renderOpponents(data || [], (npc && npc.data) || []);
  }

  let mySupport = [];
  const TEMPER = { friendly: ['Friendly', 'qi'], neutral: ['Neutral', ''], hostile: ['Hostile', 'bad'] };
  function renderOpponents(list, npcs) {
    const ul = $('#opp-list');
    ul.innerHTML = '';
    npcs = npcs || [];
    $('#opp-note').textContent = list.length || npcs.length ? '' : `Nobody else is in ${state.region.name} right now.`;
    $('#opp-note').hidden = !!(list.length || npcs.length);
    npcs.forEach((n) => {
      const t = TEMPER[n.temperament];
      const btns = [];
      if (n.role === 'guardian') {
        const ch = smallBtn('Challenge guardian', 'primary', function () { armed(this, 'Confirm challenge', () => doAttackNpc(n)); });
        ch.disabled = !!n.block;
        btns.push(ch);
      } else {
        const atk = smallBtn('Attack', 'danger-btn ghost', function () { armed(this, 'Confirm attack', () => doAttackNpc(n)); });
        atk.disabled = !!n.block;
        btns.push(atk);
      }
      if (n.temperament !== 'hostile' && n.role !== 'guardian') {
        const talk = smallBtn(n.talked ? 'Talked today' : 'Talk', 'ghost', async () => {
          const r = await sectCall('talk_npc', { p_npc: n.id });
          if (!r) return;
          toast(r.gift ? `${r.message} ${r.gift}` : r.message);
          renderHome(r.character);
          talk.disabled = true; talk.textContent = 'Talked today';
        });
        talk.disabled = n.talked;
        btns.push(talk);
      }
      ul.appendChild(personRow(`<strong>${n.role === 'guardian' ? '⛩ ' : n.role === 'raider' ? '🔥 ' : ''}${esc(n.name)}</strong>
        <div class="tags"><span class="npc-tag">${esc(n.title)}</span><span class="gain ${t[1]} tmp">${t[0]}</span><span class="odds o-${n.odds.toLowerCase()}">${n.odds}</span></div>
        <span class="muted small-text">${REALMS[n.realm - 1]} ${n.stage} · ${n.role === 'guardian' ? `guards this region for ${esc(n.sect)}. Defeat them (sect leader or elder) to free the land for 3 days.` : n.role === 'raider' ? '<span class="hurt">raiding your sect — defeat them!</span>' : n.sect ? `disciple of ${esc(n.sect)}` : 'wandering cultivator'}</span>
        ${n.block ? `<span class="muted small-text block">${esc(n.block)}</span>` : ''}`, btns));
    });
    list.forEach((o) => {
      const sect = o.sect ? `<span class="rel r-${o.relation}">${REL_MARK[o.relation]}${esc(o.sect)}</span>` : '<span class="rel r-none">No sect</span>';
      const warn = o.relation === 'mine' ? '<span class="warn-tag">Same sect</span>' : o.relation === 'ally' ? '<span class="warn-tag">Ally</span>' : o.relation === 'enemy' ? '<span class="enemy-tag">Enemy</span>' : '';
      const li = personRow(`<strong>${esc(o.name)}</strong>
        <div class="tags">${sect}${warn}<span class="odds o-${o.odds.toLowerCase()}">${o.odds}</span></div>
        <span class="muted small-text">${REALMS[o.realm - 1]} ${o.stage} · ${esc(o.root)} root${o.secluded ? ' · in seclusion' : ''}${o.hurt > 0 ? ` · <span class="hurt">wounded ${o.hurt}%</span>` : ''}</span>
        ${o.block ? `<span class="muted small-text block">${esc(o.block)}</span>` : ''}`, []);
      const box = document.createElement('div');
      box.className = 'p-actions';
      const atk = smallBtn('Attack', 'danger-btn ghost', function () {
        const label = o.relation === 'mine' ? 'Attack your own sect-mate?' : o.relation === 'ally' ? 'Attack an ally?' : 'Confirm attack';
        armed(this, label, () => doAttack(o));
      });
      atk.disabled = !!o.block;
      const bet = document.createElement('input');
      bet.type = 'number'; bet.min = '0'; bet.inputMode = 'numeric'; bet.placeholder = 'Bet'; bet.className = 'bet-input';
      const duel = smallBtn('Duel', 'ghost', async () => {
        const amount = Math.max(0, parseInt(bet.value || '0', 10) || 0);
        const d = await sectCall('challenge_duel', { p_target: o.id, p_bet: amount },
          `Challenge sent to ${o.name}${amount ? ` for ${fmt(amount)} stones` : ''}. They have 10 minutes to answer.`);
        if (d) { renderDuels(d); try { renderHome(await loadCharacter()); } catch (e) { /* */ } }
      });
      const guide = smallBtn('Seek guidance', 'ghost', () => openGuidance(o));
      const inv = smallBtn('Invite to party', 'ghost', async () => { const r = await sectCall('party_invite', { p_target: o.id }, `Party invitation sent to ${o.name}.`); if (r) renderParty(r); });
      box.appendChild(inv);
      box.append(atk, bet, duel, guide);
      const sup = smallBtn('Support', 'ghost heal-btn', () => {
        const open = li.querySelector('.support-pick');
        if (open) { open.remove(); return; }
        if (!mySupport.length) { toast('Equip a support art first (Character › Arts).'); return; }
        const pick = document.createElement('div');
        pick.className = 'support-pick';
        pick.innerHTML = '<span class="muted small-text">Use a support art:</span>';
        mySupport.forEach((sa) => pick.appendChild(smallBtn(sa.name, 'ghost heal-btn', async () => {
          const r = await sectCall('use_support_art', { p_art: sa.id, p_target: o.id });
          if (r) { toast(r.message); loadOpponents(); }
        })));
        li.appendChild(pick);
      });
      box.appendChild(sup);
      li.appendChild(box);
      ul.appendChild(li);
    });
  }

  // ---------- Tournaments ----------
  let tourData = null;
  let tourHostOpen = false;
  async function loadTour() {
    const { data } = await sb.rpc('my_tournament');
    if (!data) return;
    tourData = data;
    renderTour(data);
    const live = data.list.some((t) => t.status === 'running' && t.matches.some((m) => m.mine && m.live));
    if (live) checkBattle();
  }
  setInterval(() => {
    if (!tourData || document.hidden) return;
    if (tourData.list.some((t) => (t.entered || t.is_host) && (t.status === 'open' || t.status === 'running'))) loadTour();
  }, 8000);

  function tourBanner(d) {
    const al = $('#tour-alert');
    const t = d.list.find((x) => x.status === 'open' || (x.status === 'running' && (x.entered || x.is_host)));
    al.hidden = !t;
    if (!t) return;
    const live = t.matches.some((m) => m.mine && m.live);
    const line = t.status === 'open' ? `${t.entered ? 'You are entered · ' : ''}entries close in ${duration(Math.max(0, secsLeft(t.closes_at)))}`
      : live ? 'Your match is live — tap to fight!' : `Round ${t.round} under way`;
    al.innerHTML = `<span class="a-ico">🏆</span><span><strong>Tournament at ${esc(t.town)}</strong><small>${line} · 1st: ${esc(t.prizes[0])}</small></span>`;
    al.onclick = () => (live ? checkBattle() : showPane('pane-world'));
  }

  function renderTour(d) {
    tourBanner(d);
    const body = $('#tour-body');
    if (!body) return;
    body.innerHTML = '';
    const add = (html) => { const e = document.createElement('div'); e.innerHTML = html; body.appendChild(e); return e; };
    if (!d.list.length) add('<p class="muted small-text">No tournament right now. Anyone can host one from a town: put up three prizes and the whole world is invited to fight for them.</p>');
    d.list.forEach((t) => {
      const head = t.status === 'open' ? `Entries close in ${duration(Math.max(0, secsLeft(t.closes_at)))}` : t.status === 'running' ? `Round ${t.round}` : t.status === 'done' ? 'Finished' : 'Called off';
      const box = add(`<div class="tour">
        <div class="tour-head"><strong>${esc(t.town)}</strong><span class="muted small-text">${esc(t.continent)} · hosted by ${esc(t.host)}</span></div>
        <p class="small-text">${head}</p>
        <div class="tour-prizes"><span>🥇 ${esc(t.prizes[0])}</span><span>🥈 ${esc(t.prizes[1])}</span><span>🥉 ${esc(t.prizes[2])}</span></div>
        <p class="muted small-text">${t.entrants.length} entered${t.entrants.length ? `: ${t.entrants.map(esc).join(', ')}` : ''}</p>
        ${t.results && t.results.message ? `<p class="small-text">${esc(t.results.message)}</p>` : ''}
      </div>`);
      if (t.matches.length) {
        const rounds = {};
        t.matches.forEach((m) => { (rounds[m.round] = rounds[m.round] || []).push(m); });
        box.querySelector('.tour').insertAdjacentHTML('beforeend', `<div class="bracket">${Object.keys(rounds).map((r) => `<div class="b-round"><span class="eyebrow">Round ${r}</span>${rounds[r].map((m) =>
          `<div class="b-match ${m.mine ? 'mine' : ''}">${m.third ? '<span class="muted">3rd place · </span>' : ''}${m.b ? `<span class="${m.winner === m.a ? 'w' : m.winner ? 'l' : ''}">${esc(m.a)}</span> vs <span class="${m.winner === m.b ? 'w' : m.winner ? 'l' : ''}">${esc(m.b)}</span>` : `<span class="w">${esc(m.a)}</span> <span class="muted">— bye</span>`}${m.live ? ' <span class="live">LIVE</span>' : ''}</div>`).join('')}</div>`).join('')}</div>`);
      }
      const btns = document.createElement('div'); btns.className = 'war-form';
      if (t.status === 'open' && t.entered) btns.append(smallBtn('Withdraw', 'ghost', async () => { const r = await sectCall('tournament_leave', { p_id: t.id }); if (r) { tourData = r; renderTour(r); } }));
      else if (t.can_join) btns.append(smallBtn('Enter tournament', 'primary', async () => { const r = await sectCall('tournament_join', { p_id: t.id }, 'You are entered. Stay nearby — matches start when entries close.'); if (r) { tourData = r; renderTour(r); } }));
      else if (t.status === 'open' && !t.is_host) add(`<p class="muted small-text">Travel to ${esc(t.town)} to enter.</p>`);
      if (btns.children.length) box.appendChild(btns);
    });
    if (!d.here_town) { add('<p class="muted small-text">You can host a tournament while in a town.</p>'); return; }
    const toggle = smallBtn(tourHostOpen ? 'Close' : 'Host a tournament', 'ghost', () => { tourHostOpen = !tourHostOpen; renderTour(d); });
    const tr = document.createElement('div'); tr.className = 'war-form'; tr.appendChild(toggle); body.appendChild(tr);
    if (!tourHostOpen) return;
    const form = add(`<div class="tour-host">
      <p class="muted small-text">Hosting costs ${d.fee} spirit stones plus the prizes, which are held until the end. Entrants have 10 minutes to reach this town and enter, then single-elimination matches are fought in the arena (fresh health, no injuries). If fewer than 2 enter, prizes come back to you.</p>
      ${['🥇 1st', '🥈 2nd', '🥉 3rd'].map((l, i) => `<div class="prize-row"><span>${l}</span><input type="number" min="0" inputmode="numeric" class="bet-input" data-st="${i}" placeholder="Stones"><select class="mini-select" data-it="${i}"><option value="">+ no item</option></select><input type="number" min="1" value="1" inputmode="numeric" class="bet-input qty" data-q="${i}"></div>`).join('')}
      <button class="btn primary small" id="btn-host">Host tournament</button></div>`);
    (async () => {
      if (!itemCatalog) { const { data } = await sb.from('items').select('*'); itemCatalog = Object.fromEntries((data || []).map((i) => [i.id, i])); }
      const { data: inv } = await sb.from('inventory').select('item_id,qty').eq('character_id', state.id).gt('qty', 0);
      const opts = (inv || []).map((x) => `<option value="${x.item_id}">+ ${esc((itemCatalog[x.item_id] || {}).name || x.item_id)} (have ${x.qty})</option>`).join('');
      form.querySelectorAll('select[data-it]').forEach((sel) => { sel.insertAdjacentHTML('beforeend', opts); });
    })();
    form.querySelector('#btn-host').onclick = function () {
      const prizes = [0, 1, 2].map((i) => {
        const st = Math.max(0, parseInt(form.querySelector(`[data-st="${i}"]`).value || '0', 10) || 0);
        const it = form.querySelector(`[data-it="${i}"]`).value;
        const q = Math.max(1, parseInt(form.querySelector(`[data-q="${i}"]`).value || '1', 10) || 1);
        return it ? { stones: st, item: it, qty: q } : { stones: st };
      });
      armed(this, 'Tap again to announce', async () => {
        const r = await sectCall('host_tournament', { p_prizes: prizes }, 'Tournament announced to the whole world!');
        if (r) { tourHostOpen = false; tourData = r; renderTour(r); try { renderHome(await loadCharacter()); } catch (e) { /* */ } }
      });
    };
  }

  // ---------- NPC raids on my sect ----------
  async function loadRaid() {
    const { data: r } = await sb.rpc('my_raid');
    const al = $('#raid-alert');
    $('#raid-card').hidden = !r;
    al.hidden = !r;
    if (!r) return;
    const where = r.sightings.map((x) => `${esc(x.region)}${x.count > 1 ? ` (${x.count})` : ''}`).join(', ');
    al.innerHTML = `<span class="a-ico">🔥</span><span><strong>The ${esc(r.name)} raid your lands</strong><small>${r.left} of ${r.total} raiders left · ${duration(secsLeft(r.ends_at))} before they plunder the treasury · tap for details</small></span>`;
    al.onclick = () => showPane('pane-world');
    $('#raid-body').innerHTML = `<p class="muted small-text">The <strong>${esc(r.name)}</strong> have invaded. Defeat every raider within <strong>${duration(secsLeft(r.ends_at))}</strong> and their loot goes to the treasury — otherwise they carry off 15% of it. They ambush sect members who explore or arrive where they lurk, and move every hour.</p>
      <p class="small-text"><strong>${r.left} of ${r.total}</strong> raiders left · last seen in: ${where || '—'}</p>`;
  }

  // ---------- NPC sects based here ----------
  const TIER = { easy: ['Easy', 'qi'], medium: ['Medium', 'item'], hard: ['Hard', 'bad'] };
  async function loadNpcSects() {
    const { data } = await sb.rpc('npc_sects_here');
    const list = data || [];
    $('#nsect-card').hidden = !list.length;
    const ul = $('#nsect-list');
    ul.innerHTML = '';
    list.forEach((x) => {
      const cd = x.cooldown_until && new Date(x.cooldown_until).getTime() > serverNow();
      const b = smallBtn(cd ? `Again in ${duration(secsLeft(x.cooldown_until))}` : x.party_size > 1 ? `Challenge with party (${x.party_size})` : 'Challenge', 'primary', function () {
        armed(this, 'Tap again to challenge', async () => {
          const r = await sectCall('challenge_npc_sect', { p_sect: x.id });
          if (r) openBattle(r.battle, `You challenge ${r.sect}!`);
        });
      });
      b.disabled = cd;
      ul.appendChild(personRow(`<strong>${esc(x.name)}</strong>
        <div class="tags"><span class="gain ${TIER[x.tier][1]} tmp">${TIER[x.tier][0]}</span><span class="npc-tag">${x.temperament}</span></div>
        <span class="muted small-text">“${esc(x.motto)}”</span>`, [b]));
    });
  }

  // ---------- Party ----------
  let partyData = null;
  async function loadParty() {
    const { data } = await sb.rpc('my_party');
    if (data) renderParty(data);
  }
  function renderParty(d) {
    partyData = d;
    const card = $('#party-card');
    const ul = $('#party-list');
    ul.innerHTML = '';
    const p = d.party;
    card.hidden = !p && !d.invites.length;
    d.invites.forEach((x) => ul.appendChild(personRow(`<strong>${esc(x.from)} invites you to their party</strong>`, [
      smallBtn('Join', 'primary', async () => { const r = await sectCall('party_respond', { p_invite: x.id, p_accept: true }, 'You joined the party.'); if (r) renderParty(r); }),
      smallBtn('Decline', 'ghost', async () => { const r = await sectCall('party_respond', { p_invite: x.id, p_accept: false }); if (r) renderParty(r); })
    ])));
    const acts = $('#party-actions');
    acts.innerHTML = '';
    if (!p) return;
    const lead = state && p.leader === state.id;
    p.members.forEach((m) => {
      const btns = [];
      if (lead && m.id !== state.id) btns.push(smallBtn('Remove', 'ghost', async () => { const r = await sectCall('party_kick', { p_char: m.id }); if (r) renderParty(r); }));
      ul.appendChild(personRow(`<strong>${m.id === p.leader ? '♛ ' : ''}${esc(m.name)}${state && m.id === state.id ? ' <small class="muted">(you)</small>' : ''}</strong>
        <span class="muted small-text">${REALMS[m.realm - 1]} ${m.stage}${m.class && CLASSES[m.class] ? ` · ${CLASSES[m.class].name}` : ''} · ${m.here ? 'here' : esc(m.region)}${m.hurt > 0 ? ` · <span class="hurt">wounded ${m.hurt}%</span>` : ''}</span>`, btns));
    });
    if (lead) acts.appendChild(smallBtn(`Hunt together (−${state.explore_cost * 2} stamina each)`, 'primary', async () => {
      const r = await sectCall('party_hunt', {});
      if (r) openBattle(r.battle, 'Your party sets out on a hunt!');
    }));
    acts.appendChild(smallBtn('Leave party', 'ghost', function () { armed(this, 'Tap again to leave', async () => { const r = await sectCall('party_leave', {}, 'You left the party.'); if (r) renderParty(r); }); }));
  }

  // ---------- Masters ----------
  async function openGuidance(o) {
    const d = await sectCall('master_options', { p_master: o.id });
    if (!d) return;
    const card = $('#guide-card');
    card.hidden = false;
    $('#guide-title').textContent = `Seek guidance from ${d.master}`;
    const ul = $('#guide-list');
    ul.innerHTML = '';
    if (!d.options.length) {
      ul.innerHTML = `<li class="empty">${esc(d.master)} cannot help you right now. A master can break you through a tier only if they are at least two tiers above it, and can teach skills or arts they have at Mid tier or higher.</li>`;
    }
    d.options.forEach((x) => {
      const fee = document.createElement('input');
      fee.type = 'number'; fee.min = '0'; fee.inputMode = 'numeric'; fee.placeholder = 'Fee'; fee.className = 'bet-input';
      const ask = smallBtn('Ask', 'primary', async () => {
        const amount = Math.max(0, parseInt(fee.value || '0', 10) || 0);
        const r = await sectCall('request_master', { p_master: o.id, p_kind: x.kind, p_target: x.target, p_action: x.action, p_fee: amount },
          `Request sent to ${d.master}${amount ? ` with ${fmt(amount)} stones (returned if they decline)` : ''}.`);
        if (r) { renderGuidance(r); card.hidden = true; try { renderHome(await loadCharacter()); } catch (e) { /* */ } }
      });
      ul.appendChild(personRow(`<strong>${esc(x.label)}</strong>`, [fee, ask]));
    });
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $('#guide-close').addEventListener('click', () => { $('#guide-card').hidden = true; });
  async function loadGuidance() {
    const { data } = await sb.rpc('my_master_requests');
    if (data) renderGuidance(data);
  }
  function renderGuidance(d) {
    const ul = $('#mreq-list');
    ul.innerHTML = '';
    $('#mreq-card').hidden = !(d.incoming.length + d.outgoing.length);
    d.incoming.forEach((x) => ul.appendChild(personRow(`<strong>${esc(x.pupil)} seeks your guidance</strong>
      <span class="small-text">${esc(x.label)}</span><span class="muted small-text">${x.fee ? `Offers ${fmt(x.fee)} spirit stones` : 'No fee offered'}</span>`, [
      smallBtn('Accept', 'primary', async () => { const r = await sectCall('respond_master', { p_request: x.id, p_accept: true }, `You guided ${x.pupil}.`); if (r) { renderGuidance(r); try { renderHome(await loadCharacter()); } catch (e) { /* */ } } }),
      smallBtn('Decline', 'ghost', async () => { const r = await sectCall('respond_master', { p_request: x.id, p_accept: false }); if (r) renderGuidance(r); })
    ])));
    d.outgoing.forEach((x) => ul.appendChild(personRow(`<strong>Waiting for ${esc(x.master)}</strong>
      <span class="small-text">${esc(x.label)}</span><span class="muted small-text">${x.fee ? `${fmt(x.fee)} stones held` : 'No fee'}</span>`, [
      smallBtn('Cancel', 'ghost', async () => { const r = await sectCall('cancel_master_request', { p_request: x.id }, 'Request withdrawn.'); if (r) { renderGuidance(r); try { renderHome(await loadCharacter()); } catch (e) { /* */ } } })
    ])));
  }

  async function doAttackNpc(n) {
    const { data, error } = await sb.rpc('attack_npc', { p_npc: n.id });
    if (error) return toast(friendly(error));
    showSub(null);
    renderHome(data.character);
    $('#opp-list').innerHTML = '';
    openBattle(data.battle, `You challenge ${data.opponent}!`);
  }

  async function doAttack(o) {
    const { data, error } = await sb.rpc('attack', { p_target: o.id });
    if (error) return toast(friendly(error));
    showSub(null);
    renderHome(data.character);
    $('#opp-list').innerHTML = '';
    openBattle(data.battle, `You attack ${data.opponent}!`);
  }

  async function loadDuels() {
    const { data } = await sb.rpc('my_duels');
    if (data) renderDuels(data);
  }

  function renderDuels(d) {
    const ul = $('#duels-list');
    ul.innerHTML = '';
    const total = d.incoming.length + d.outgoing.length;
    $('#duels-card').hidden = total === 0;
    const hb = $('#hub-duels');
    hb.hidden = d.incoming.length === 0;
    hb.textContent = d.incoming.length;
    const al = $('#home-alert');
    if (d.incoming.length) {
      const x = d.incoming[0];
      al.hidden = false;
      al.innerHTML = `<span class="a-ico">⚔</span><span><strong>${esc(x.name)} challenges you to a duel</strong><small>${x.bet ? `${fmt(x.bet)} stones each · ` : ''}expires in ${duration(secsLeft(x.expires_at))} · tap to answer</small></span>`;
      al.onclick = () => showPane('pane-world');
    } else al.hidden = true;
    duelWaiting = d.outgoing.length > 0;
    d.incoming.forEach((x) => {
      ul.appendChild(personRow(`<strong>${esc(x.name)} challenges you</strong>
        <span class="muted small-text">${REALMS[x.realm - 1]} ${x.stage} · ${x.bet ? `${fmt(x.bet)} stones each` : 'no bet'} · <span class="odds o-${x.odds.toLowerCase()}">${x.odds}</span></span>`, [
        smallBtn('Accept', 'primary', async () => {
          const r = await sectCall('respond_duel', { p_duel: x.id, p_accept: true });
          if (!r) return;
          showSub(null);
          renderHome(r.character); renderDuels(r.duels);
          openBattle(r.battle, `You face ${r.opponent} in a duel.`);
        }),
        smallBtn('Decline', 'ghost', async () => { const r = await sectCall('respond_duel', { p_duel: x.id, p_accept: false }); if (r) renderDuels(r.duels); })
      ]));
    });
    d.outgoing.forEach((x) => {
      ul.appendChild(personRow(`<strong>Waiting for ${esc(x.name)}</strong>
        <span class="muted small-text">${x.bet ? `${fmt(x.bet)} stones staked` : 'no bet'} · expires in ${duration(secsLeft(x.expires_at))}</span>`, [
        smallBtn('Cancel', 'ghost', async () => { const r = await sectCall('cancel_duel', { p_duel: x.id }, 'Challenge withdrawn.'); if (r) { renderDuels(r); try { renderHome(await loadCharacter()); } catch (e) { /* */ } } })
      ]));
    });
  }

  $('#btn-look').addEventListener('click', loadOpponents);

  // ---------- Pools (HP / Energy) ----------
  function renderPools(el, p) {
    if (!el || !p) return;
    const hpPct = Math.min(100, (p.hp / Math.max(1, p.hp_max)) * 100);
    const enPct = Math.min(100, (p.energy / Math.max(1, p.energy_max)) * 100);
    const heal = p.heal_until && secsLeft(p.heal_until) > 0 ? ` · healer: ${duration(secsLeft(p.heal_until))}` : '';
    const html = `<div class="pool"><div class="meter-label"><span>Health${p.injured ? ' <b class="inj">· injured</b>' : ''}${heal}</span><span>${fmt(p.hp)} / ${fmt(p.hp_max)}</span></div>
        <div class="meter-track thin"><div class="meter-fill hp" style="width:${hpPct}%"></div></div></div>
      <div class="pool"><div class="meter-label"><span>Energy</span><span>${fmt(p.energy)} / ${fmt(p.energy_max)}</span></div>
        <div class="meter-track thin"><div class="meter-fill en" style="width:${enPct}%"></div></div></div>`;
    if (el.dataset.html !== html) { el.innerHTML = html; el.dataset.html = html; }
  }

  // ---------- Skills ----------
  const SLOTS = [
    { id: 'attack', type: 'attack', label: 'Primary attack', group: 'Attack' },
    { id: 'au1', type: 'attack_util', label: 'Utility', group: 'Attack' },
    { id: 'au2', type: 'attack_util', label: 'Utility', group: 'Attack' },
    { id: 'au3', type: 'attack_util', label: 'Utility', group: 'Attack' },
    { id: 'defense', type: 'defense', label: 'Primary defense', group: 'Defense' },
    { id: 'du1', type: 'defense_util', label: 'Utility', group: 'Defense' },
    { id: 'du2', type: 'defense_util', label: 'Utility', group: 'Defense' },
    { id: 'du3', type: 'defense_util', label: 'Utility', group: 'Defense' },
    { id: 'p1', type: 'passive', label: 'Passive', group: 'Passives' },
    { id: 'p2', type: 'passive', label: 'Passive', group: 'Passives' },
    { id: 'p3', type: 'passive', label: 'Passive', group: 'Passives' }
  ];
  const TYPE_LABEL = { attack: 'Primary attack', attack_util: 'Attack utility', defense: 'Primary defense', defense_util: 'Defense utility', passive: 'Passive' };
  let skillsData = null;
  let skillsTimer = null;

  async function loadSkills() {
    const { data, error } = await sb.rpc('my_skills');
    if (error) return toast(friendly(error));
    skillsData = data;
    renderSkills();
  }
  const WFIT = { sword: 'Swordsman', gauntlets: 'Body Cultivator', staff: 'Spellcaster', bell: 'Soul Cultivator' };
  async function loadGear() {
    const { data, error } = await sb.rpc('my_gear');
    if (!error && data) renderGear(data);
    if (!itemCatalog) {
      const r = await sb.from('items').select('*');
      itemCatalog = Object.fromEntries((r.data || []).map((i) => [i.id, i]));
    }
    const inv = await sb.from('inventory').select('item_id,qty').eq('character_id', state.id).gt('qty', 0);
    const ul = $('#gear-bag');
    ul.innerHTML = '';
    const gear = (inv.data || []).map((r) => ({ ...itemCatalog[r.item_id], qty: r.qty })).filter((it) => it.kind === 'gear');
    if (!gear.length) ul.innerHTML = '<li class="empty">No spare gear. Buy Iron gear in a town market (Gear tab) or have a Blacksmith forge some.</li>';
    gear.forEach((it) => {
      const fit = it.effects.slot === 'weapon' && data && it.effects.wtype === data.fits ? '<span class="lead">Suits your class</span>' : '';
      ul.appendChild(personRow(`<strong class="rar-t-${it.rarity}">${esc(it.name)} <span class="qty">×${it.qty}</span></strong>
        <div class="tags"><span class="slot-tag">${it.effects.slot === 'weapon' ? 'Weapon' : 'Armor'}</span>${fit}</div>
        <span class="muted small-text">${esc(it.description)}</span>`, [smallBtn('Equip', 'primary', async () => {
          const r = await sectCall('equip_gear', { p_item: it.id }, `${it.name} equipped.`);
          if (r) loadGear();
        })]));
    });
  }
  function renderGear(g) {
    const ul = $('#gear-list');
    ul.innerHTML = '';
    [['weapon', 'Weapon'], ['armor', 'Armor']].forEach(([slot, label]) => {
      const it = g[slot];
      const fit = it && slot === 'weapon' && it.effects.wtype === g.fits ? '<span class="lead">Suits your class</span>' : '';
      ul.appendChild(personRow(it
        ? `<span class="muted small-text">${label}</span><strong class="rar-t-${it.rarity}">${esc(it.name)}</strong><div class="tags">${fit}</div><span class="muted small-text">${esc(it.description)}</span>`
        : `<span class="muted small-text">${label}</span><span class="muted">Nothing equipped</span>`,
        it ? [smallBtn('Unequip', 'ghost', async () => { const r = await sectCall('unequip_gear', { p_slot: slot }); if (r) loadGear(); })] : []));
    });
  }

  function renderSkills() {
    const d = skillsData;
    if (!d) return;
    renderPools($('#sk-pools'), d.pools);
    const pb = $('#sk-practice');
    if (d.practicing) {
      const sk = d.skills.find((x) => x.id === d.practicing.skill);
      pb.hidden = false;
      pb.innerHTML = `<span>Practising <strong>${esc(sk ? sk.name : '')}</strong> · ${duration(secsLeft(d.practicing.until))} left</span>`;
    } else pb.hidden = true;

    const lo = $('#sk-loadout');
    lo.innerHTML = '';
    let group = '';
    SLOTS.forEach((sl) => {
      if (sl.group !== group) {
        group = sl.group;
        const h = document.createElement('p');
        h.className = 'lo-group';
        h.textContent = group;
        lo.appendChild(h);
      }
      const sk = d.skills.find((x) => x.equipped === sl.id);
      const b = document.createElement('button');
      b.className = `lo-slot${sk ? '' : ' empty'}${sl.type === 'attack' || sl.type === 'defense' ? ' primary' : ''}`;
      b.innerHTML = `<span class="lo-label">${sl.label}</span><span class="lo-name">${sk ? esc(sk.name) : 'Empty'}</span>${sk ? `<span class="lo-lvl">${sk.tier} · ${sk.level}</span>` : ''}`;
      b.onclick = () => openPicker(sl);
      lo.appendChild(b);
    });

    const ul = $('#sk-list');
    ul.innerHTML = '';
    d.skills.forEach((sk) => {
      const pct = Math.min(100, (sk.level_exact / sk.tier_cap) * 100);
      const btns = [];
      const practising = d.practicing && d.practicing.skill === sk.id;
      if (sk.can_breakthrough) {
        const bt = smallBtn(`Breakthrough · ${fmt(d.breakthrough_cost)}`, 'primary', () => breakSkill(sk));
        bt.disabled = !d.in_town;
        btns.push(bt);
      } else if (sk.level >= sk.tier_cap && sk.tier_cap === 50) {
        btns.push(trainerBtn('skill', sk.id, 50, loadSkills));
      } else if (sk.level < sk.tier_cap) {
        const pr = smallBtn(practising ? 'Practising…' : 'Practise', practising ? 'ghost' : 'ghost', () => practise(sk));
        pr.disabled = practising || (state && modeNow() === 'seclusion');
        btns.push(pr);
      }
      const li = personRow(`<strong>${esc(sk.name)}</strong>
        <div class="tags"><span class="slot-tag">${TYPE_LABEL[sk.slot_type]}</span>${sk.element ? `<span class="el-tag">${sk.element}</span>` : ''}${sk.equipped ? '<span class="lead">Equipped</span>' : ''}</div>
        <div class="sk-bar"><div class="meter-track thin"><div class="meter-fill sk" style="width:${pct}%"></div></div><span class="muted small-text">${sk.tier} · ${sk.level} / ${sk.tier_cap}</span></div>
        <span class="muted small-text">${esc(sk.description)}${sk.can_breakthrough && !d.in_town ? ' · Find a trainer in a town to break through.' : ''}${sk.level >= sk.tier_cap && sk.tier_cap > 25 && sk.tier_cap < 100 ? ` · ${trainerNote(sk.tier_cap)}` : ''}</span>`, btns);
      ul.appendChild(li);
    });
  }

  function openPicker(sl) {
    const d = skillsData;
    $('#sk-picker').hidden = false;
    $('#sk-picker-title').textContent = `Choose: ${sl.label}`;
    const ul = $('#sk-picker-list');
    ul.innerHTML = '';
    const opts = d.skills.filter((x) => x.slot_type === sl.type);
    if (!opts.length) ul.innerHTML = '<li class="empty">You have not learned any skills for this slot. Buy manuals at a town market, or find them while exploring.</li>';
    opts.forEach((sk) => {
      const here = sk.equipped === sl.id;
      ul.appendChild(personRow(`<strong>${esc(sk.name)}</strong><span class="muted small-text">${sk.tier} · ${sk.level}${sk.equipped && !here ? ' · in another slot' : ''} — ${esc(sk.description)}</span>`,
        [smallBtn(here ? 'Equipped' : 'Equip', here ? 'ghost' : 'primary', async () => {
          if (here) return;
          const r = await sectCall('equip_skill', { p_slot: sl.id, p_skill: sk.id }, `${sk.name} equipped.`);
          if (r) { skillsData = r; $('#sk-picker').hidden = true; renderSkills(); }
        })]));
    });
    if (sl.type !== 'attack' && sl.type !== 'defense' && d.skills.some((x) => x.equipped === sl.id)) {
      ul.appendChild(personRow('<span class="muted small-text">Leave this slot empty</span>', [smallBtn('Remove', 'ghost', async () => {
        const r = await sectCall('equip_skill', { p_slot: sl.id, p_skill: null });
        if (r) { skillsData = r; $('#sk-picker').hidden = true; renderSkills(); }
      })]));
    }
    $('#sk-picker').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $('#sk-picker-close').addEventListener('click', () => { $('#sk-picker').hidden = true; });

  async function practise(sk) {
    const r = await sectCall('practice_skill', { p_skill: sk.id }, `You practise ${sk.name} for an hour. Cultivation pauses meanwhile.`);
    if (r) { skillsData = r; renderSkills(); try { renderHome(await loadCharacter()); } catch (e) { /* */ } }
  }
  async function breakSkill(sk) {
    const r = await sectCall('skill_breakthrough', { p_skill: sk.id }, `The trainer guides you. ${sk.name} can now grow to level 50.`);
    if (r) { skillsData = r; renderSkills(); try { renderHome(await loadCharacter()); } catch (e) { /* */ } }
  }

  // ---------- Town: market and healer ----------
  let mkTab = 'attack';
  let mkData = null;
  async function loadMarket() {
    const { data, error } = await sb.rpc('market_list');
    if (error) return toast(friendly(error));
    mkData = data;
    renderMarket();
  }
  function renderMarket() {
    if (!mkData) return;
    document.querySelectorAll('#mk-tabs .chip').forEach((b) => b.classList.toggle('active', b.dataset.mk === mkTab));
    const ul = $('#mk-list');
    ul.innerHTML = '';
    if (!mkData.in_town) { ul.innerHTML = '<li class="empty">Markets are only found in towns.</li>'; return; }
    mkData.items.filter((x) => x.slot_type === mkTab).forEach((it) => {
      const b = smallBtn(`Buy · ${fmt(it.price)}`, 'primary', async () => {
        const r = await sectCall('market_buy', { p_item: it.id }, it.slot_type === 'pill' ? `Bought ${it.name}. Use it in battle as your action.` : `Bought ${it.name}. Read it from your Bag.`);
        if (r) { mkData = r; renderMarket(); try { renderHome(await loadCharacter()); } catch (e) { /* */ } }
      });
      b.disabled = state && state.spirit_stones < it.price;
      ul.appendChild(personRow(`<strong>${esc(it.name)}</strong>
        <div class="tags">${it.known ? '<span class="lead">Known</span>' : ''}${it.profession ? `<span class="prof-tag">${PROFS[it.profession] ? PROFS[it.profession].name : it.profession} only</span>` : ''}${it.combat_class ? `<span class="prof-tag cls">${CLASSES[it.combat_class] ? CLASSES[it.combat_class].name : it.combat_class} only</span>` : ''}${it.min_realm > 1 ? `<span class="req">Needs realm ${it.min_realm}</span>` : ''}</div>
        <span class="muted small-text">${esc(it.description)}</span>`, [b]));
    });
  }
  document.querySelectorAll('#mk-tabs .chip').forEach((b) => b.addEventListener('click', () => { mkTab = b.dataset.mk; renderMarket(); }));

  function renderTown() {
    const card = $('#town-card');
    if (!card || !state || !state.region) return;
    card.hidden = !state.region.is_town || !!state.travel;
    if (card.hidden) return;
    const p = state.pools || {};
    $('#town-note').textContent = `${state.region.name} is a safe town. Buy manuals at the market, or have the healer treat your wounds.`;
    const healing = p.heal_until && secsLeft(p.heal_until) > 0;
    $('#healer-note').textContent = healing ? `Treating · ${duration(secsLeft(p.heal_until))}` : p.hp < p.hp_max ? `${fmt(p.hp_max - p.hp)} HP to heal` : 'You are healthy';
    $('#btn-healer').disabled = healing || !(p.hp < p.hp_max);
  }
  $('#btn-healer').addEventListener('click', async () => {
    const r = await sectCall('visit_healer', {});
    if (r) { toast(`The healer begins treating you for ${fmt(r.cost)} spirit stones. You will be fully healed in a few minutes.`); try { renderHome(await loadCharacter()); } catch (e) { /* */ } }
  });

  // ---------- Stats ----------
  const STAT_NAMES = { str: 'Strength', agi: 'Agility', dex: 'Dexterity', con: 'Constitution', endu: 'Endurance',
    intl: 'Intelligence', per: 'Perception', soul: 'Soul Power', wil: 'Willpower', fort: 'Fortitude' };
  const STAT_GROUPS = [
    { title: 'Physical attack', note: 'Martial arts and physical skills', keys: ['str', 'agi', 'dex'] },
    { title: 'Physical defense', note: 'Resists martial attacks', keys: ['con', 'endu'] },
    { title: 'Mental attack', note: 'Magic arts', keys: ['intl', 'per', 'soul'] },
    { title: 'Mental defense', note: 'Resists magic', keys: ['wil', 'fort'] }
  ];
  let statsData = null;
  let statsTimer = null;

  async function loadStats() {
    const { data, error } = await sb.rpc('my_stats');
    if (error) return toast(friendly(error));
    statsData = data;
    renderStats();
  }

  function renderStats() {
    const d = statsData;
    if (!d) return;
    $('#st-free').textContent = d.free_points;
    $('#st-next').textContent = `+${d.next_points} points`;
    $('#st-body').textContent = `Level ${Math.floor(d.body_level)}`;
    $('#st-mind').textContent = `Level ${Math.floor(d.mind_level)}`;
    const tb = $('#st-training');
    if (d.training) {
      tb.hidden = false;
      tb.innerHTML = `<span>Training <strong>${STAT_NAMES[d.training.stat]}</strong> · ${duration(secsLeft(d.training.until))} left</span>`;
      const stop = smallBtn('Stop', 'ghost', async () => {
        const r = await sectCall('stop_training', {}, 'Training stopped.');
        if (r) { statsData = r; renderStats(); try { renderHome(await loadCharacter()); } catch (e) { /* */ } }
      });
      tb.appendChild(stop);
    } else tb.hidden = true;

    const wrap = $('#st-groups');
    wrap.innerHTML = '';
    STAT_GROUPS.forEach((g) => {
      const card = document.createElement('div');
      card.className = 'card stat-group';
      card.innerHTML = `<h4 class="card-title">${g.title}</h4><p class="muted small-text g-note">${g.note}</p>`;
      g.keys.forEach((k) => {
        const v = d.stats[k];
        const pct = Math.min(100, (v.value / Math.max(1, v.cap)) * 100);
        const row = document.createElement('div');
        row.className = 'stat-row' + (d.training && d.training.stat === k ? ' training' : '');
        row.innerHTML = `<div class="sr-top"><strong>${STAT_NAMES[k]}</strong><span>${fmt(v.value)} <span class="muted">/ ${fmt(v.cap)}</span></span></div>
          <div class="meter-track thin"><div class="meter-fill ${['str','agi','dex','con','endu'].includes(k) ? 'phys' : 'ment'}" style="width:${pct}%"></div></div>
          <div class="sr-bottom"><span class="muted small-text">${v.rate > 0 ? `Training: +${v.rate} / hour` : 'At its cap'}</span><span class="sr-btns"></span></div>`;
        const btns = row.querySelector('.sr-btns');
        if (d.free_points > 0 && v.value < v.cap) {
          btns.appendChild(smallBtn('+1', 'ghost', () => allocate(k, 1)));
          if (d.free_points >= 5 && v.value + 5 <= v.cap) btns.appendChild(smallBtn('+5', 'ghost', () => allocate(k, 5)));
        }
        const training = d.training && d.training.stat === k;
        const tbtn = smallBtn(training ? 'Training…' : 'Train', training ? 'ghost' : 'primary', () => train(k));
        tbtn.disabled = training || v.rate <= 0 || (state && modeNow() === 'seclusion');
        btns.appendChild(tbtn);
        card.appendChild(row);
      });
      wrap.appendChild(card);
    });
  }

  async function allocate(k, n) {
    const r = await sectCall('allocate_points', { p_points: { [k]: n } });
    if (r) { statsData = r; renderStats(); if (state) { state.free_points = r.free_points; $('#hub-points').hidden = !r.free_points; $('#hub-points').textContent = r.free_points; } }
  }

  async function train(k) {
    const r = await sectCall('start_training', { p_stat: k }, `You begin training ${STAT_NAMES[k]} for an hour. Cultivation pauses while you train.`);
    if (r) { statsData = r; renderStats(); try { renderHome(await loadCharacter()); } catch (e) { /* */ } }
  }

  // ---------- Chat (shared by Chat and Sect Chat) ----------
  const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  };

  function makeChat({ logEl, inputEl, formEl, labelEl, channel, onLabel, onSeen }) {
    let lastId = 0;
    let currentKey = null;
    let timer = null;
    function line(m, meId) {
      const div = document.createElement('div');
      const me = m.sender_id === meId;
      div.className = `msg${me ? ' me' : ''}`;
      const mark = m.rel === 'mine' ? '★ ' : m.rel === 'ally' ? '◆ ' : '';
      div.innerHTML = `<div class="m-head"><span class="m-name r-${m.rel || 'none'}"></span><span class="m-meta"></span></div><div class="m-body"></div>`;
      div.querySelector('.m-name').textContent = `${mark}${m.sender_name || ''}`;
      div.querySelector('.m-meta').textContent = `${m.sender_realm ? REALMS[m.sender_realm - 1].split(' ')[0] + ' · ' : ''}${fmtTime(m.created_at)}`;
      div.querySelector('.m-body').textContent = m.body;
      return div;
    }
    async function poll(reset) {
      const ch = channel();
      if (!ch) return;
      if (reset) { lastId = 0; logEl.innerHTML = ''; }
      const { data, error } = await sb.rpc('get_chat', { p_channel: ch, p_after: lastId });
      if (error || !data) return;
      const key = `${ch}:${data.label}`;
      if (currentKey && key !== currentKey && !reset) { currentKey = key; return poll(true); } // moved region etc.
      currentKey = key;
      if (labelEl) labelEl.textContent = data.label || '';
      if (onLabel) onLabel(data);
      const near = logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight < 60;
      data.messages.forEach((m) => { logEl.appendChild(line(m, data.me)); lastId = Math.max(lastId, m.id); });
      if (reset && !data.messages.length) logEl.innerHTML = '<p class="muted center small-text empty-chat">No messages yet. Say hello.</p>';
      else if (data.messages.length) { const e = logEl.querySelector('.empty-chat'); if (e) e.remove(); }
      if (reset || near) logEl.scrollTop = logEl.scrollHeight;
      if (onSeen && timer) onSeen(ch, lastId);
    }
    formEl.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const body = inputEl.value.trim();
      if (!body) return;
      const { error } = await sb.rpc('send_chat', { p_channel: channel(), p_body: body });
      if (error) return toast(friendly(error));
      inputEl.value = '';
      poll(false);
    });
    return {
      start() { currentKey = null; clearInterval(timer); timer = setInterval(() => poll(false), 4000); poll(true); },
      stop() { clearInterval(timer); timer = null; },
      switchTo() { currentKey = null; poll(true); }
    };
  }

  // ---- new-message dots ----
  let chatLatest = {};
  function seenKey(ch) { return chatLatest[ch] ? `seen:${ch}:${chatLatest[ch].key}` : null; }
  function markChatSeen(ch, id) {
    const k = seenKey(ch);
    if (!k) return;
    const prev = Number(store.get(k) || 0);
    if (id > prev) store.set(k, String(id));
    paintChatDots();
  }
  function unseen(ch) {
    const L = chatLatest[ch];
    if (!L || !L.id) return false;
    const k = seenKey(ch);
    const v = store.get(k);
    if (v == null) { store.set(k, String(L.id)); return false; }   // first visit: nothing is "new"
    return L.id > Number(v);
  }
  function paintChatDots() {
    const onChat = $('#pane-chat').classList.contains('active');
    const onSect = $('#pane-sectchat').classList.contains('active');
    let any = false;
    ['region', 'continent', 'global'].forEach((ch) => {
      const showing = onChat && chatChannel === ch;
      const u = !showing && unseen(ch);
      const chip = document.querySelector(`#chat-tabs .chip[data-ch="${ch}"] .chip-dot`);
      if (chip) chip.hidden = !u;
      any = any || u;
    });
    $('#tab-chat-dot').hidden = !any;
    $('#tab-schat-dot').hidden = onSect || !unseen('sect');
  }
  let chatDotsBusy = false;
  async function refreshChatDots() {
    if (chatDotsBusy || !state) return;
    chatDotsBusy = true;
    try { const { data } = await sb.rpc('chat_latest'); if (data) { chatLatest = data; paintChatDots(); } } catch (e) { /* ignore */ }
    chatDotsBusy = false;
  }

  let chatChannel = store.get('chat_channel') || 'region';
  const chat = makeChat({
    logEl: $('#chat-log'), inputEl: $('#chat-input'), formEl: $('#chat-send'), labelEl: $('#chat-label'),
    channel: () => chatChannel,
    onSeen: (ch, id) => markChatSeen(ch, id)
  });
  function markChatTabs() {
    document.querySelectorAll('#chat-tabs .chip').forEach((b) => b.classList.toggle('active', b.dataset.ch === chatChannel));
  }
  document.querySelectorAll('#chat-tabs .chip').forEach((b) => b.addEventListener('click', () => {
    chatChannel = b.dataset.ch;
    store.set('chat_channel', chatChannel);
    markChatTabs();
    chat.switchTo();
    paintChatDots();
  }));

  const sectChat = makeChat({
    logEl: $('#schat-log'), inputEl: $('#schat-input'), formEl: $('#schat-send'), labelEl: $('#schat-label'),
    channel: () => (state && state.sect ? 'sect' : null),
    onSeen: (ch, id) => markChatSeen(ch, id)
  });
  function startSectChat() {
    const has = !!(state && state.sect);
    $('#schat-none').hidden = has;
    $('#schat-send').hidden = !has;
    $('#schat-log').hidden = !has;
    $('#schat-label').textContent = has ? state.sect.name : 'Sect chat';
    if (has) sectChat.start();
  }

  // ---------- Direct messages ----------
  let dmOther = null;
  let dmLast = 0;
  let dmTimer = null;

  async function loadInbox() {
    $('#dm-inbox').hidden = false;
    $('#dm-thread').hidden = true;
    $('#dm-back').textContent = '‹ Character';
    dmOther = null;
    clearInterval(dmTimer);
    const { data, error } = await sb.rpc('dm_conversations');
    if (error) return toast(friendly(error));
    const ul = $('#dm-list');
    ul.innerHTML = '';
    $('#dm-empty').hidden = data.length > 0;
    data.forEach((c) => {
      const li = personRow(`<strong></strong><span class="muted small-text last"></span>`,
        [smallBtn(c.unread ? `Open · ${c.unread} new` : 'Open', c.unread ? 'primary' : 'ghost', () => openThread(c.id))]);
      li.querySelector('strong').textContent = c.name;
      li.querySelector('.last').textContent = c.last || '';
      ul.appendChild(li);
    });
    refreshDmBadge();
  }

  function dmLine(m, meId) {
    const div = document.createElement('div');
    div.className = `msg${m.sender_id === meId ? ' me' : ''}`;
    div.innerHTML = '<div class="m-head"><span class="m-meta"></span></div><div class="m-body"></div>';
    div.querySelector('.m-meta').textContent = fmtTime(m.created_at);
    div.querySelector('.m-body').textContent = m.body;
    return div;
  }

  async function pollThread(reset) {
    if (!dmOther) return;
    if (reset) { dmLast = 0; $('#dm-log').innerHTML = ''; }
    const { data, error } = await sb.rpc('get_dm', { p_other: dmOther, p_after: dmLast });
    if (error) return toast(friendly(error));
    $('#dm-with').textContent = `${data.other.name} · ${REALMS[data.other.realm - 1]} ${data.other.stage}`;
    const log = $('#dm-log');
    data.messages.forEach((m) => { log.appendChild(dmLine(m, data.me)); dmLast = Math.max(dmLast, m.id); });
    if (reset && !data.messages.length) log.innerHTML = '<p class="muted center small-text empty-chat">Start the conversation.</p>';
    else if (data.messages.length) { const e = log.querySelector('.empty-chat'); if (e) e.remove(); }
    if (data.messages.length || reset) log.scrollTop = log.scrollHeight;
  }

  function openThread(id) {
    dmOther = id;
    $('#dm-inbox').hidden = true;
    $('#dm-thread').hidden = false;
    $('#dm-back').textContent = '‹ Messages';
    pollThread(true).then(refreshDmBadge);
    clearInterval(dmTimer);
    dmTimer = setInterval(() => pollThread(false), 4000);
  }

  $('#dm-back').addEventListener('click', () => {
    if (dmOther) loadInbox(); else showPane('pane-character');
  });

  $('#dm-new').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const name = $('#dm-to').value.trim();
    if (!name) return;
    // look the character up by name (not case-sensitive)
    const { data, error } = await sb.from('characters').select('id,name').ilike('name', name).limit(1);
    if (error || !data || !data.length) return toast(`No cultivator named ${name}.`);
    if (state && data[0].id === state.id) return toast('You cannot message yourself.');
    $('#dm-to').value = '';
    openThread(data[0].id);
  });

  $('#dm-send').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const body = $('#dm-input').value.trim();
    if (!body || !dmOther) return;
    const { error } = await sb.rpc('send_dm', { p_to: dmOther, p_body: body });
    if (error) return toast(friendly(error));
    $('#dm-input').value = '';
    pollThread(false);
  });

  async function refreshDmBadge() {
    const { data } = await sb.rpc('dm_unread');
    const n = data || 0;
    $('#hub-dms').hidden = !n;
    $('#hub-dms').textContent = n;
    $('#tab-dm-dot').hidden = !n;
  }

  // ---------- Trade (auction house) ----------
  let ahTab = 'browse';
  let ahData = null;

  async function loadAuctions() {
    const { data, error } = await sb.rpc('list_auctions');
    if (error) return toast(friendly(error));
    ahData = data;
    renderAuctions();
  }

  function aRow(a) {
    const left = secsLeft(a.ends_at);
    const price = a.current_bid ? `Top bid ${fmt(a.current_bid)} · ${a.bids} bid${a.bids === 1 ? '' : 's'}` : `Starts at ${fmt(a.start_price)} · no bids`;
    const tooLow = state && state.realm < a.min_realm;
    const li = personRow(`<strong></strong>
      <div class="tags"><span class="rarity r-${a.rarity}">${a.rarity}</span>${a.min_realm > 1 ? `<span class="req${tooLow ? ' bad' : ''}">Needs realm ${a.min_realm}</span>` : ''}${a.leading ? '<span class="lead">You lead</span>' : ''}</div>
      <span class="muted small-text">${price} · ends in ${duration(left)}${a.mine ? '' : ` · by ${esc(a.seller)}`}</span>`, []);
    li.querySelector('strong').textContent = `${a.name} ×${a.qty}`;
    return li;
  }

  function renderAuctions() {
    if (!ahData) return;
    document.querySelectorAll('#ah-tabs .chip').forEach((b) => b.classList.toggle('active', b.dataset.ah === ahTab));
    $('#ah-note').textContent = `Auctions run ${ahData.hours} hours. The highest bid wins. The auction house keeps ${ahData.fee_pct}% of the sale. There is no direct trading.`;
    const ul = $('#ah-list');
    ul.innerHTML = '';
    $('#ah-sell').hidden = ahTab !== 'sell';
    ul.hidden = ahTab === 'sell';
    if (ahTab === 'sell') return fillSellForm();
    const rows = ahTab === 'browse' ? ahData.open : ahData.mine;
    if (!rows.length) ul.innerHTML = `<li class="empty">${ahTab === 'browse' ? 'Nothing for sale right now.' : 'You have no auctions running.'}</li>`;
    rows.forEach((a) => {
      const li = aRow(a);
      const box = document.createElement('div');
      box.className = 'p-actions';
      if (a.mine) {
        if (!a.bids) box.appendChild(smallBtn('Cancel', 'ghost', function () {
          armed(this, 'Confirm', async () => { const d = await sectCall('cancel_auction', { p_auction: a.id }, 'Auction cancelled. The item is back in your bag.'); if (d) { ahData = d; renderAuctions(); } });
        }));
      } else {
        const inp = document.createElement('input');
        inp.type = 'number'; inp.min = String(a.min_bid); inp.value = String(a.min_bid); inp.inputMode = 'numeric'; inp.className = 'bet-input';
        box.appendChild(inp);
        box.appendChild(smallBtn(a.leading ? 'Raise' : 'Bid', 'primary', async () => {
          const amount = parseInt(inp.value, 10);
          const d = await sectCall('place_bid', { p_auction: a.id, p_amount: amount }, `You bid ${fmt(amount)} spirit stones.`);
          if (d) { ahData = d; renderAuctions(); try { renderHome(await loadCharacter()); } catch (e) { /* */ } }
        }));
      }
      li.appendChild(box);
      ul.appendChild(li);
    });
  }

  async function fillSellForm() {
    const { data } = await sb.from('inventory').select('item_id,qty').eq('character_id', state.id).gt('qty', 0);
    if (!itemCatalog) {
      const r = await sb.from('items').select('*');
      itemCatalog = Object.fromEntries((r.data || []).map((i) => [i.id, i]));
    }
    const sel = $('#ah-item');
    sel.innerHTML = (data || []).length
      ? data.map((r) => `<option value="${r.item_id}" data-max="${r.qty}">${esc(itemCatalog[r.item_id] ? itemCatalog[r.item_id].name : r.item_id)} (you have ${r.qty})</option>`).join('')
      : '<option value="">Your bag is empty</option>';
  }

  document.querySelectorAll('#ah-tabs .chip').forEach((b) => b.addEventListener('click', () => { ahTab = b.dataset.ah; renderAuctions(); }));

  $('#ah-sell').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const f = ev.target;
    setError(f, '');
    const item = $('#ah-item').value;
    const qty = parseInt($('#ah-qty').value, 10);
    const price = parseInt($('#ah-price').value, 10);
    if (!item) return setError(f, 'You have nothing to sell.');
    const { data, error } = await sb.rpc('create_auction', { p_item: item, p_qty: qty, p_start: price });
    if (error) return setError(f, friendly(error));
    toast('Your item is up for auction for 24 hours.');
    ahData = data;
    ahTab = 'mine';
    renderAuctions();
  });

  // NPC trainers beyond the town: the Grand Elder (Imperial Capital) takes Low -> Mid.
  const ELDER_REGION = 21;
  function trainerBtn(kind, target, cap, after) {
    const town = cap === 25;
    const here = town ? !!(state && state.region && state.region.is_town) : !!(state && state.region_id === ELDER_REGION);
    const b = smallBtn(town ? 'Breakthrough · 250' : 'Grand Elder · 2,000', 'primary', async () => {
      const r = await sectCall('trainer_breakthrough', { p_kind: kind, p_target: target }, 'The breakthrough succeeds — a new tier opens.');
      if (r) { try { renderHome(await loadCharacter()); } catch (e) { /* */ } after(); }
    });
    b.disabled = !here;
    b.title = town ? 'Any town trainer' : 'Only in the Imperial Capital';
    return b;
  }
  function trainerNote(cap) {
    return cap === 25 ? 'Find a trainer in any town to break through.' : cap === 50 ? 'The Grand Elder in the Imperial Capital, or a master, can take you to Mid.' : 'Only a player master can take you further.';
  }

  // ---------- Arts ----------
  const ART_TYPE = { strike: 'Strike', technique: 'Technique', reaction: 'Reaction', ultimate: 'Ultimate', support: 'Support' };
  let artsData = null;
  async function loadArts() {
    const { data, error } = await sb.rpc('my_arts');
    if (error) return toast(friendly(error));
    artsData = data;
    renderArts();
  }
  function artTags(a) {
    return `<span class="slot-tag t-${a.type}">${ART_TYPE[a.type] || a.type}</span>${a.type === 'support' ? '' : ''}${a.profession ? `<span class="prof-tag">${PROFS[a.profession] ? PROFS[a.profession].name : a.profession}</span>` : ''}${a.combat_class ? `<span class="prof-tag cls">${CLASSES[a.combat_class] ? CLASSES[a.combat_class].name : a.combat_class}</span>` : ''}${a.element ? `<span class="el-tag">${esc(a.element)}</span>` : ''}<span class="req">${a.type === 'support' ? 'energy as needed' : `${a.energy} energy`}</span>`;
  }
  function renderArts() {
    const d = artsData;
    if (!d) return;
    renderPools($('#ar-pools'), d.pools);
    const slots = $('#ar-slots');
    slots.innerHTML = '';
    for (let i = 1; i <= 6; i += 1) {
      const a = d.arts.find((x) => x.slot === i);
      const li = document.createElement('li');
      li.className = a ? '' : 'empty-slot';
      li.innerHTML = `<span class="slot-n">${i}</span><div class="p-main">${a ? `<strong>${esc(a.name)}</strong><div class="tags">${artTags(a)}<span class="lvl">Lv ${a.level}</span></div>` : '<span class="muted">Empty</span>'}</div>`;
      if (a) {
        const box = document.createElement('div');
        box.className = 'p-actions';
        if (i > 1) box.appendChild(smallBtn('↑', 'ghost', () => equipArt(a.id, i - 1)));
        if (i < 6) box.appendChild(smallBtn('↓', 'ghost', () => equipArt(a.id, i + 1)));
        box.appendChild(smallBtn('Remove', 'ghost', () => equipArt(a.id, null)));
        li.appendChild(box);
      }
      slots.appendChild(li);
    }
    const ult = d.arts.find((x) => x.slot === 7);
    const ub = $('#ar-ult');
    ub.innerHTML = '';
    if (ult) {
      ub.appendChild(personRow(`<strong>${esc(ult.name)}</strong><div class="tags">${artTags(ult)}<span class="lvl">Lv ${ult.level} · charges in ${(ult.effect && ult.effect.charge) || 4} turns</span></div>`,
        [smallBtn('Remove', 'ghost', () => equipArt(ult.id, null))]));
    } else {
      ub.innerHTML = `<p class="muted small-text">${d.arts.some((x) => x.type === 'ultimate') ? 'Empty — choose one of your ultimates below.' : 'Empty — you have not learned an ultimate art yet.'}</p>`;
    }
    ['monster', 'pvp'].forEach((k) => {
      document.querySelectorAll(`#ar-${k} .chip`).forEach((b) => b.classList.toggle('active', b.dataset.v === d[`${k}_mode`]));
    });
    const ul = $('#ar-list');
    ul.innerHTML = '';
    if (!d.arts.length) { ul.innerHTML = '<li class="empty">You have not learned any arts yet. Art scrolls are sold in town markets and very rarely found while exploring.</li>'; return; }
    const free = [1, 2, 3, 4, 5, 6].find((n) => !d.arts.some((x) => x.slot === n));
    d.arts.forEach((a) => {
      const btns = [];
      if (a.level >= a.tier_cap && a.tier_cap <= 50) btns.push(trainerBtn('art', a.id, a.tier_cap, loadArts));
      if (a.type === 'support' && a.slot != null && a.id === 'restoring_hands') {
        btns.push(smallBtn('Heal yourself', 'ghost', async () => {
          const r = await sectCall('use_support_art', { p_art: a.id, p_target: state.id });
          if (r) { toast(r.message); loadArts(); }
        }));
      }
      if (a.slot == null && a.type === 'ultimate') {
        btns.push(smallBtn(ult ? 'Make my ultimate' : 'Equip as ultimate', 'primary', () => equipArt(a.id, 7)));
      } else if (a.slot == null) {
        const b = smallBtn(free ? 'Equip' : 'Slots full', 'primary', () => equipArt(a.id, free));
        b.disabled = !free;
        btns.push(b);
      }
      ul.appendChild(personRow(`<strong>${esc(a.name)}</strong>
        <div class="tags">${artTags(a)}<span class="lvl">Lv ${a.level} · ${esc(a.tier)}</span>${a.slot === 7 ? '<span class="lead">Ultimate</span>' : a.slot ? `<span class="lead">Slot ${a.slot}</span>` : ''}</div>
        <span class="muted small-text">${esc(a.description || '')}${a.level >= a.tier_cap && a.tier_cap < 100 ? ` · ${trainerNote(a.tier_cap)}` : ''}</span>`, btns));
    });
  }
  async function equipArt(id, slot) {
    const r = await sectCall('equip_art', { p_art: id, p_slot: slot });
    if (r) { artsData = r; renderArts(); }
  }
  ['monster', 'pvp'].forEach((k) => {
    document.querySelectorAll(`#ar-${k} .chip`).forEach((b) => b.addEventListener('click', async () => {
      if (!artsData) return;
      const m = k === 'monster' ? b.dataset.v : artsData.monster_mode;
      const p = k === 'pvp' ? b.dataset.v : artsData.pvp_mode;
      const r = await sectCall('set_combat_modes', { p_monster: m, p_pvp: p });
      if (r) { artsData = r; renderArts(); }
    }));
  });

  // ---------- Cultivation styles & upgrades ----------
  async function loadStyles() {
    const { data, error } = await sb.rpc('my_stats');
    if (error) return toast(friendly(error));
    $('#sy-soul').innerHTML = state ? `<strong>${REALMS[state.realm - 1]} · Stage ${state.stage}</strong> <span class="muted">(stage ${data.stage_index} of 100)</span>` : '';
    $('#sy-body').innerHTML = `<strong>Level ${fmt(Math.floor(data.body_level))}</strong> <span class="muted">· physical caps +${Math.floor(data.body_level)}%</span>`;
    $('#sy-mind').innerHTML = `<strong>Level ${fmt(Math.floor(data.mind_level))}</strong> <span class="muted">· mental caps +${Math.floor(data.mind_level)}%</span>`;
  }
  let upData = null;
  async function loadUpgrades() {
    const { data, error } = await sb.rpc('my_upgrades');
    if (error) return toast(friendly(error));
    upData = data;
    renderUpgrades();
  }
  function renderUpgrades() {
    const d = upData;
    if (!d) return;
    $('#up-points').textContent = `${d.points} point${d.points === 1 ? '' : 's'}`;
    const hb = $('#hub-up');
    hb.hidden = !d.points; hb.textContent = d.points;
    const ul = $('#up-list');
    ul.innerHTML = '';
    d.nodes.forEach((n) => {
      const pips = Array.from({ length: n.max }, (_, i) => `<span class="pip${i < n.rank ? ' on' : ''}"></span>`).join('');
      const maxed = n.rank >= n.max;
      const b = smallBtn(maxed ? 'Maxed' : `Rank ${n.rank + 1} · ${n.next_cost} pt${n.next_cost === 1 ? '' : 's'}`, 'primary', async () => {
        const r = await sectCall('buy_upgrade', { p_node: n.id }, `${n.name} rank ${n.rank + 1}!`);
        if (r) { upData = r; renderUpgrades(); try { renderHome(await loadCharacter()); } catch (e) { /* */ } }
      });
      b.disabled = maxed || d.points < n.next_cost;
      ul.appendChild(personRow(`<strong>${esc(n.name)}</strong><div class="pips">${pips}</div>
        <span class="small-text up-now">Now: +${n.rank * n.per}${n.unit}${maxed ? '' : ` → +${(n.rank + 1) * n.per}${n.unit}`}</span>
        <span class="muted small-text">${esc(n.description)}</span>`, [b]));
    });
  }

  // ---------- Combat class ----------
  const CLASSES = {
    swordsman: { name: 'Swordsman', ico: '劍', blurb: 'Fast martial strikes. Critical hits, bleeding wounds and deadly ripostes.' },
    body: { name: 'Body Cultivator', ico: '體', blurb: 'Temper the flesh into a weapon. Tough, hard-hitting, drains life and shrugs off stuns.' },
    spellcaster: { name: 'Spellcaster', ico: '術', blurb: 'Elemental magic. Choose a primary element: its arts hit harder and always build Resonance.' },
    soul: { name: 'Soul Cultivator', ico: '魂', blurb: 'Strike the spirit itself. Steals energy, weakens foes and resists mental attacks.' },
    healer: { name: 'Physician', ico: '醫', blurb: 'Support and healing magic. Heals, shields and cleanses in battle, and restores the health and stamina of others with support arts.' }
  };
  const BASIC_ELEMENTS = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
  let clData = null;
  async function loadClass() {
    const { data, error } = await sb.rpc('my_class');
    if (error) return toast(friendly(error));
    clData = data;
    renderClass();
  }
  async function pickClass(id, el, msg) {
    const r = await sectCall('choose_class', { p_class: id, p_element: el || null }, msg);
    if (r) { clData = r; renderClass(); try { renderHome(await loadCharacter()); } catch (e) { /* */ } }
  }
  function classButtons(box, current, armedChange) {
    Object.entries(CLASSES).forEach(([id, c]) => {
      if (id === 'spellcaster') {
        BASIC_ELEMENTS.forEach((el) => {
          if (current && current.class === id && current.element === el) return;
          const label = `${c.name} · ${el}${clData.roots.includes(el) ? ' ★' : ''}`;
          const b = smallBtn(label, armedChange ? 'ghost' : 'ghost', function () {
            if (armedChange) armed(this, 'Tap again to change', () => pickClass(id, el, `You are now a ${el} Spellcaster.`));
            else pickClass(id, el, `You are now a ${el} Spellcaster.`);
          });
          box.appendChild(b);
        });
      } else {
        if (current && current.class === id) return;
        const b = smallBtn(`${an(c.name)}`.replace(/^./, (x) => x.toUpperCase()), armedChange ? 'ghost' : 'primary', function () {
          if (armedChange) armed(this, 'Tap again to change', () => pickClass(id, null, `You are now ${an(c.name)}.`));
          else pickClass(id, null, `You are now ${an(c.name)}.`);
        });
        box.appendChild(b);
      }
    });
  }
  function renderClass() {
    const d = clData;
    if (!d) return;
    $('#cl-choose').hidden = !!d.class;
    $('#cl-main').hidden = !d.class;
    if (!d.class) {
      const box = $('#cl-choices');
      box.innerHTML = '';
      Object.entries(CLASSES).forEach(([id, c]) => {
        const card = document.createElement('div');
        card.className = 'card prof-card';
        card.innerHTML = `<div class="prof-head"><span class="h-ico">${c.ico}</span><h4 class="card-title">${c.name}</h4></div><p class="small-text">${c.blurb}</p>`;
        if (id === 'spellcaster') {
          card.insertAdjacentHTML('beforeend', '<p class="muted small-text">Pick your primary element (★ = in your spirit root):</p>');
          const chips = document.createElement('div');
          chips.className = 'chips wrap';
          BASIC_ELEMENTS.forEach((el) => chips.appendChild(smallBtn(`${el}${d.roots.includes(el) ? ' ★' : ''}`, 'ghost', function () { armed(this, `Confirm ${el}`, () => pickClass(id, el, `You are now a ${el} Spellcaster.`)); })));
          card.appendChild(chips);
        } else {
          card.appendChild(smallBtn(`Become ${an(c.name)}`, 'primary', function () { armed(this, 'Tap again to confirm', () => pickClass(id, null, `You are now ${an(c.name)}.`)); }));
        }
        box.appendChild(card);
      });
      return;
    }
    const c = CLASSES[d.class];
    $('#cl-title').textContent = d.class === 'spellcaster' ? `${d.element} Spellcaster` : c.name;
    $('#cl-tier').textContent = d.tier;
    $('#cl-level').textContent = `${d.level} / ${d.cap}`;
    $('#cl-bar').style.width = `${Math.min(100, (d.level_exact / d.cap) * 100)}%`;
    $('#cl-cap').textContent = d.level_exact >= d.cap ? 'At the top of this tier — a breakthrough is needed.' : `Tier cap ${d.cap}`;
    $('#cl-blurb').textContent = c.blurb;
    $('#cl-bonuses').innerHTML = d.bonuses.map((x) => `<li>${esc(x)}</li>`).join('');
    const bt = $('#cl-bt');
    bt.innerHTML = '';
    if (d.can_breakthrough) {
      const b = smallBtn(`Break through with the town trainer · ${fmt(d.breakthrough_cost)} stones`, 'primary', async () => {
        const r = await sectCall('class_breakthrough', {}, 'Breakthrough! Your next tier is open.');
        if (r) { clData = r; renderClass(); try { renderHome(await loadCharacter()); } catch (e) { /* */ } }
      });
      b.disabled = !d.in_town;
      bt.appendChild(b);
      if (!d.in_town) bt.insertAdjacentHTML('beforeend', '<p class="muted small-text">Visit a town to find a trainer.</p>');
    } else if (d.level_exact >= d.cap && d.cap >= 50) {
      bt.innerHTML = `<p class="muted small-text">${trainerNote(d.cap)}</p>`;
      if (d.cap === 50) bt.appendChild(trainerBtn('class', d.class, 50, loadClass));
    }
    const ch = $('#cl-change');
    ch.innerHTML = '';
    ch.classList.add('wrap');
    classButtons(ch, d, true);
  }

  // ---------- Profession ----------
  const PROFS = {
    gatherer: { name: 'Gatherer', ico: '採', blurb: 'Read the land and harvest what others miss: herbs, ores, jade and rarer treasures from the wilds. Learns trap arts that punish enemies who strike you.' },
    alchemist: { name: 'Alchemist', ico: '丹', blurb: 'Refine herbs and beast cores into pills. A Fire root helps greatly. Learns arts that strike and swallow pills in the same move.' },
    talisman: { name: 'Talisman Master', ico: '符', blurb: 'Draw talismans that burn, bind and shield in battle. A Water root helps greatly. Learns arts that loose storms of charged paper.' },
    array: { name: 'Array Master', ico: '陣', blurb: 'Build formations from jade and spirit wood that speed up cultivation. An Earth root helps greatly. Learns battle arrays that weaken foes.' },
    blacksmith: { name: 'Blacksmith', ico: '鍛', blurb: 'Forge weapons and armor from ore, jade and crystal. A Metal root helps greatly. Learns arts that shatter the enemy\'s defenses.' }
  };
  let pfData = null;
  async function loadProfession() {
    const { data, error } = await sb.rpc('my_profession');
    if (error) return toast(friendly(error));
    pfData = data;
    renderProfession();
  }
  function renderProfession() {
    const d = pfData;
    if (!d) return;
    $('#pf-choose').hidden = !!d.profession;
    $('#pf-main').hidden = !d.profession;
    if (!d.profession) {
      const box = $('#pf-choices');
      box.innerHTML = '';
      Object.entries(PROFS).forEach(([id, p]) => {
        const aff = d.choices[id];
        const card = document.createElement('div');
        card.className = 'card prof-card';
        card.innerHTML = `<div class="prof-head"><span class="h-ico">${p.ico}</span><h4 class="card-title">${p.name}</h4></div>
          <p class="small-text">${p.blurb}</p>
          <p class="muted small-text">For your root: ${esc(aff.note)} Can reach <strong>${tierOf(aff.max_cap)}</strong>.</p>`;
        card.appendChild(smallBtn(`Become ${an(p.name)}`, 'primary', function () {
          armed(this, 'Tap again to confirm', async () => {
            const r = await sectCall('choose_profession', { p_prof: id }, `You are now ${an(p.name)}.`);
            if (r) { pfData = r; renderProfession(); }
          });
        }));
        box.appendChild(card);
      });
      return;
    }
    const p = PROFS[d.profession];
    $('#pf-title').textContent = p.name;
    $('#pf-tier').textContent = d.tier;
    $('#pf-level').textContent = `${d.level} / ${d.cap}`;
    $('#pf-bar').style.width = `${Math.min(100, (d.level_exact / d.cap) * 100)}%`;
    $('#pf-cap').textContent = d.at_ceiling ? 'Your spirit root allows no higher tier.' : d.level_exact >= d.cap ? 'At the top of this tier — a breakthrough is needed.' : `Tier cap ${d.cap}`;
    $('#pf-aff').textContent = `${d.affinity.note} Your root allows up to ${tierOf(d.affinity.max_cap)}.`;
    const bt = $('#pf-bt');
    bt.innerHTML = '';
    if (d.can_breakthrough) {
      const b = smallBtn(`Break through with the town trainer · ${fmt(d.breakthrough_cost)} stones`, 'primary', async () => {
        const r = await sectCall('prof_breakthrough', {}, 'Breakthrough! Your next tier is open.');
        if (r) { pfData = r; renderProfession(); try { renderHome(await loadCharacter()); } catch (e) { /* */ } }
      });
      b.disabled = !d.in_town;
      bt.appendChild(b);
      if (!d.in_town) bt.insertAdjacentHTML('beforeend', '<p class="muted small-text">Visit a town to find a trainer.</p>');
    } else if (d.level_exact >= d.cap && d.cap >= 50 && !d.at_ceiling) {
      bt.innerHTML = `<p class="muted small-text">${trainerNote(d.cap)}</p>`;
      if (d.cap === 50) bt.appendChild(trainerBtn('profession', d.profession, 50, loadProfession));
    }

    renderProfChange();
    const g = $('#pf-gather');
    g.hidden = d.profession !== 'gatherer';
    if (!g.hidden) {
      $('#pf-g-where').textContent = d.in_town ? 'Nothing grows inside the town walls. Travel to the wilds to gather.' : `In ${d.region} you may find: ${d.finds.join(', ')}.`;
      $('#pf-g-search').textContent = `${d.search_pct}%`;
      $('#pf-g-multi').textContent = `${d.multi_pct}%`;
      const gb = $('#btn-gather');
      gb.disabled = d.in_town || d.stamina < d.gather_cost;
      gb.textContent = d.stamina < d.gather_cost ? 'Too tired — rest a while' : `Gather (−${d.gather_cost} stamina · ${d.stamina} left)`;
    }

    const al = $('#pf-alchemy');
    al.hidden = !['alchemist', 'blacksmith', 'talisman', 'array'].includes(d.profession);
    if (!al.hidden) {
      const CRAFT = { alchemist: ['Pill refining', 'Refine'], blacksmith: ['Forging', 'Forge'], talisman: ['Talisman drawing', 'Draw'], array: ['Array building', 'Build'] }[d.profession];
      $('#pf-al-title').textContent = CRAFT[0];
      $('#pf-al-note').textContent = d.profession === 'talisman' ? 'Drawing costs energy, which recovers over time. A failed talisman burns up its materials. Talismans are used in battle as your action.' : d.profession === 'array' ? 'Building costs energy, which recovers over time. A failed array cracks its materials. Use an array from your Bag for a cultivation speed boost.' : d.profession === 'blacksmith' ? 'Forging costs energy, which recovers over time. A failed forging ruins the materials. Gear you forge can be equipped from your Bag or sold at the auction house.' : 'Refining costs energy, which recovers over time. Failed attempts lose the ingredients. Alchemists also get 30% more from pills they take in battle.';
      $('#pf-energy').textContent = `Energy ${fmt(d.energy)} / ${fmt(d.energy_max)}`;
      const ul = $('#pf-recipes');
      ul.innerHTML = '';
      d.recipes.forEach((r) => {
        const enough = r.inputs.every((x) => x.have >= x.need);
        const locked = d.level < r.min_level;
        const b = smallBtn(locked ? `Level ${r.min_level}` : `${CRAFT[1]} · ${r.energy} energy`, 'primary', async () => {
          b.disabled = true;
          const { data, error } = await sb.rpc('craft', { p_recipe: r.id });
          if (error) { toast(friendly(error)); b.disabled = false; return; }
          showProfResult(data.story, data.success ? [`<span class="gain item">+${data.made} ${esc(data.name)}</span>`] : ['<span class="gain bad">Ingredients lost</span>'], data.gain, data.success ? 'k-encounter' : 'k-beast_lost');
          pfData = data.profession;
          renderProfession();
        });
        b.disabled = locked || !enough || d.energy < r.energy;
        const ins = r.inputs.map((x) => `<span class="${x.have >= x.need ? '' : 'short'}">${x.need}× ${esc(x.name)} (${x.have})</span>`).join(' · ');
        ul.appendChild(personRow(`<strong>${esc(r.name)}</strong>
          <div class="tags">${locked ? `<span class="req">Needs level ${r.min_level}</span>` : `<span class="lead">${r.chance}% success</span>`}</div>
          <span class="muted small-text recipe-in">${ins}</span>`, [b]));
      });
    }
  }
  function an(w) { return `${/^[aeiou]/i.test(w) ? 'an' : 'a'} ${w}`; }
  function tierOf(cap) { return cap >= 100 ? 'Peak' : cap >= 99 ? 'High' : cap >= 75 ? 'Mid' : cap >= 50 ? 'Low' : 'Early'; }
  function showProfResult(story, bits, gain, cls) {
    const box = $('#pf-result');
    box.className = `card story ${cls}`;
    box.innerHTML = `<p>${esc(story)}</p><div class="gains">${bits.join('')}${gain > 0 ? `<span class="gain qi">+${gain} profession</span>` : ''}</div>`;
    box.hidden = false;
  }
  $('#btn-gather').addEventListener('click', async () => {
    const gb = $('#btn-gather');
    gb.disabled = true;
    gb.textContent = 'Gathering…';
    const { data, error } = await sb.rpc('gather');
    if (error) { toast(friendly(error)); return renderProfession(); }
    showProfResult(data.story, data.found.map((x) => `<span class="gain item">+${x.qty} ${esc(x.name)}${x.rare ? ' ✦' : ''}</span>`), data.gain, 'k-herb');
    pfData = data.profession;
    renderProfession();
    renderHome(data.character);
  });
  function renderProfChange() {
    const box = $('#pf-change-box');
    if (!box || !pfData) return;
    box.querySelectorAll('button').forEach((b) => b.remove());
    Object.keys(PROFS).filter((k) => k !== pfData.profession).forEach((other) => {
      box.appendChild(smallBtn(PROFS[other].name, 'ghost', function () {
        armed(this, `Tap again: become ${an(PROFS[other].name)}`, async () => {
          const r = await sectCall('choose_profession', { p_prof: other }, `You are now ${an(PROFS[other].name)}.`);
          if (r) { pfData = r; $('#pf-result').hidden = true; renderProfession(); try { renderHome(await loadCharacter()); } catch (e) { /* */ } }
        });
      }));
    });
  }

  // ---------- Battle ----------
  let duelWaiting = false;
  let bTarget = null;
  function teamCard(x, isMe, isEnemy, v, targeted) {
    const pct = x.hpmax > 0 ? Math.max(0, Math.min(100, (x.hp / x.hpmax) * 100)) : 0;
    const turn = v.active === x.idx && v.status === 'active';
    return `<div class="tcard${x.alive ? '' : ' down'}${targeted ? ' targeted' : ''}${turn ? ' turn' : ''}"${isEnemy ? ` data-idx="${x.idx}"` : ''}>
      <div class="tc-top"><span class="tc-name">${esc(x.name)}${isMe ? ' <small>(you)</small>' : ''}</span><span class="tc-hp">${x.alive ? `${fmt(x.hp)}/${fmt(x.hpmax)}` : (x.gone ? 'fled' : 'down')}</span></div>
      <div class="meter-track thin"><div class="meter-fill hp" style="width:${pct}%"></div></div>
      ${isMe && x.enmax > 0 ? `<div class="meter-track thin en-line"><div class="meter-fill en" style="width:${(x.en / x.enmax) * 100}%"></div></div>` : ''}
    </div>`;
  }
  let bv = null;           // current battle view from the server
  let bPoll = null;         // polling while waiting on the opponent
  let bTick = null;         // countdown
  let bIntro = '';
  let bChoiceSeen = {};
  let bBusy = false;
  let bChecking = false;

  function stopBattle() { clearTimeout(bPoll); clearInterval(bTick); bPoll = null; bTick = null; }

  function openBattle(view, intro) {
    if (!view) return;
    bIntro = intro || '';
    bTarget = null;
    showPane('pane-battle');
    renderBattle(view);
  }

  // Pop into a fight that needs us (e.g. a duel that was accepted while we were elsewhere).
  async function checkBattle() {
    if (bChecking || !state) return;
    if ($('#pane-battle').classList.contains('active')) return;
    bChecking = true;
    try {
      const { data } = await sb.rpc('my_battle');
      if (data && data.status === 'active' && !(data.kind === 'attack' && data.me === 2)) openBattle(data, 'Your fight is still going!');
    } catch (e) { /* ignore */ }
    bChecking = false;
  }

  async function battleCall(fn, args) {
    if (bBusy) return;
    bBusy = true;
    document.querySelectorAll('#pane-battle .art-btn, #bt-misc button').forEach((b) => { b.disabled = true; });
    const { data, error } = await sb.rpc(fn, args);
    bBusy = false;
    if (error) { toast(friendly(error)); return refreshBattle(); }
    renderBattle(data);
  }
  async function refreshBattle() {
    if (!bv) return;
    const { data, error } = await sb.rpc('battle_state', { p_id: bv.id });
    if (!error && data) renderBattle(data);
  }
  function act(action) { battleCall('battle_act', { p_id: bv.id, p_action: action }); }

  function bar(cur, max, cls) {
    const pct = max > 0 ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0;
    return `<div class="meter-track thin"><div class="meter-fill ${cls}" style="width:${pct}%"></div></div>`;
  }
  function fighterHtml(f, mine) {
    const tags = [];
    if (f.shield > 0) tags.push(`<span class="ft shield">Shield ${fmt(f.shield)}</span>`);
    if (f.stun) tags.push('<span class="ft bad">Stunned</span>');
    if (f.bleed) tags.push('<span class="ft bad">Wounded</span>');
    if (f.weak) tags.push('<span class="ft bad">Weakened</span>');
    if (f.atkb) tags.push('<span class="ft good">Empowered</span>');
    if (f.defb) tags.push('<span class="ft good">Guarded</span>');
    if (f.res > 0) tags.push(`<span class="ft good">Resonance ${f.res}</span>`);
    if (f.trap) tags.push('<span class="ft good">Snare set</span>');
    return `<p class="f-name">${esc(f.name)}${mine ? ' <small>(you)</small>' : ''}</p>
      <div class="f-line"><span>HP</span><span>${fmt(f.hp)} / ${fmt(f.hpmax)}</span></div>${bar(f.hp, f.hpmax, 'hp')}
      ${f.enmax > 0 ? `<div class="f-line"><span>Energy</span><span>${fmt(f.en)} / ${fmt(f.enmax)}</span></div>${bar(f.en, f.enmax, 'en')}` : ''}
      <div class="f-tags">${tags.join('')}</div>`;
  }

  function renderBattle(v) {
    bv = v;
    stopBattle();
    const me = v.sides[v.me - 1];
    const myTeam = v.my_team || v.me;
    const enemies = v.sides.filter((x) => (x.team !== undefined ? x.team !== myTeam : x !== me));
    if (bTarget && !(enemies.find((x) => x.idx === bTarget && x.alive))) bTarget = null;
    const foe = (bTarget && enemies.find((x) => x.idx === bTarget)) || enemies.find((x) => x.focus && x.alive) || enemies.find((x) => x.alive !== false) || v.sides[2 - v.me];
    const kindName = v.kind === 'monster' ? 'Beast encounter' : v.kind === 'duel' ? 'Duel' : v.kind === 'npc' ? 'Wandering cultivator' : v.kind === 'group_monster' ? 'Party hunt' : v.kind === 'npc_sect' ? 'Sect challenge' : v.kind === 'tournament' ? 'Tournament match' : 'Ambush';
    $('#bt-title').textContent = `${kindName} · Round ${Math.max(1, v.round)}`;
    const fightersEl = document.querySelector('#pane-battle .fighters');
    if (v.team_battle) {
      fightersEl.classList.add('teams');
      const allies = v.sides.filter((x) => x.team === myTeam);
      $('#bt-me').innerHTML = '<p class="team-label">Your side</p>' + allies.map((x) => teamCard(x, x.idx === v.me, false, v)).join('');
      $('#bt-foe').innerHTML = '<p class="team-label">Enemies · tap to target</p>' + enemies.map((x) => teamCard(x, false, true, v, foe && x.idx === foe.idx)).join('');
      document.querySelectorAll('#bt-foe .tcard[data-idx]').forEach((el) => el.addEventListener('click', () => {
        const idx = Number(el.dataset.idx);
        const t = v.sides.find((x) => x.idx === idx);
        if (!t || !t.alive) return;
        bTarget = idx;
        renderBattle(bv);
      }));
    } else {
      fightersEl.classList.remove('teams');
      $('#bt-me').innerHTML = fighterHtml(me, true);
      $('#bt-foe').innerHTML = fighterHtml(foe, false);
    }
    const ab = $('#bt-auto');
    ab.textContent = v.auto ? 'Auto: On — tap to take control' : 'Auto: Off';
    ab.classList.toggle('on', !!v.auto);
    ab.hidden = v.status !== 'active';
    const active = v.status === 'active';

    // the first-turn choice when a beast jumps you
    const ch = $('#bt-choice');
    ch.hidden = !(active && (v.kind === 'monster' || v.kind === 'npc') && !v.auto && !bChoiceSeen[v.id] && v.turn <= 2);
    if (!ch.hidden) $('#bt-choice-text').textContent = `${bIntro || 'A beast attacks!'} Fight it turn by turn, or let instinct take over?`;

    // action panel
    const acts = $('#bt-actions');
    acts.hidden = !(active && v.need === 'action' && !v.auto) || !ch.hidden;
    if (!acts.hidden) {
      const grid = $('#bt-arts');
      grid.innerHTML = '';
      v.arts.filter((a) => a.type !== 'reaction' && a.type !== 'ultimate').forEach((a) => {
        const b = document.createElement('button');
        b.className = `art-btn t-${a.type}`;
        let why = '';
        if (!a.usable) {
          if (a.type === 'ultimate' && me.charge < a.charge_need) why = `Charging ${me.charge}/${a.charge_need}`;
          else if (a.cd > 0) why = `Recovering ${a.cd}`;
          else why = 'Not enough energy';
        }
        b.innerHTML = `<strong>${esc(a.name)}</strong><small>${a.energy} energy${a.element ? ` · ${esc(a.element)}` : ''}</small>${why ? `<em>${why}</em>` : ''}`;
        b.disabled = !a.usable;
        b.onclick = () => act({ type: 'art', art: a.id, target: bTarget || undefined });
        grid.appendChild(b);
      });
      if (!v.arts.some((a) => a.type !== 'reaction' && a.type !== 'ultimate')) grid.innerHTML = '<p class="muted small-text">No arts equipped — set them up under Character › Arts.</p>';
      const u = v.arts.find((a) => a.type === 'ultimate');
      const ubar = $('#bt-ult');
      ubar.hidden = !u;
      if (u) {
        const need = u.charge_need || 4;
        const have = Math.min(need, me.charge);
        const ready = have >= need;
        ubar.className = `ult-bar${ready ? ' ready' : ''}`;
        ubar.innerHTML = `<div class="ult-top"><strong>${esc(u.name)}</strong><span>${ready ? (me.en >= u.energy ? 'Ready!' : `Ready · needs ${u.energy} energy`) : `Charging ${have}/${need}`}</span></div>
          <div class="meter-track"><div class="meter-fill ult" style="width:${(have / need) * 100}%"></div></div>`;
        const ubtn = document.createElement('button');
        ubtn.className = 'btn primary small ult-btn';
        ubtn.textContent = `Unleash · ${u.energy} energy`;
        ubtn.disabled = !u.usable;
        ubtn.onclick = () => act({ type: 'art', art: u.id, target: bTarget || undefined });
        ubar.appendChild(ubtn);
      }
      const misc = $('#bt-misc');
      misc.innerHTML = '';
      misc.appendChild(smallBtn('Meditate (+energy)', 'ghost', () => act({ type: 'meditate' })));
      (v.items || []).forEach((x) => misc.appendChild(smallBtn(`${x.name} ×${x.left}`, 'ghost', () => act({ type: 'item', item: x.id }))));
      const flee = smallBtn(v.kind === 'duel' || v.kind === 'tournament' ? 'Yield' : 'Flee', 'ghost danger-btn', function () {
        armed(this, v.kind === 'monster' ? 'Tap again to run' : 'Tap again — counts as a loss', () => act({ type: 'flee' }));
      });
      misc.appendChild(flee);
    }

    // reaction prompt
    const rc = $('#bt-react');
    rc.hidden = !(active && v.need === 'reaction' && !v.auto);
    if (!rc.hidden) {
      const pend = v.pending || {};
      $('#bt-react-text').innerHTML = `<strong>${esc(pend.attacker || foe.name)}</strong> uses <strong>${esc(pend.name)}</strong>${pend.element ? ` (${esc(pend.element)})` : ''}${v.team_battle && !pend.target_is_me ? ` on <strong>${esc(pend.target || '')}</strong>` : ''}! ${v.team_battle && !pend.target_is_me ? 'Shield your teammate?' : 'Answer it?'}`;
      const grid = $('#bt-react-arts');
      grid.innerHTML = '';
      v.arts.filter((a) => a.type === 'reaction').forEach((a) => {
        const b = document.createElement('button');
        b.className = 'art-btn t-reaction';
        b.innerHTML = `<strong>${esc(a.name)}</strong><small>${a.energy} energy</small>${a.usable ? '' : `<em>${a.cd > 0 ? `Recovering ${a.cd}` : 'Not enough energy'}</em>`}`;
        b.disabled = !a.usable;
        b.onclick = () => act({ type: 'react', art: a.id });
        grid.appendChild(b);
      });
      const pass = document.createElement('button');
      pass.className = 'art-btn pass';
      pass.innerHTML = '<strong>Take it</strong><small>Save your energy</small>';
      pass.onclick = () => act({ type: 'pass' });
      grid.appendChild(pass);
    }

    // log, newest on top
    const log = $('#bt-log');
    log.innerHTML = v.log.slice().reverse().map((x) => `<li class="l-${x.t} ${x.s === v.me ? 'mine' : 'theirs'}">${esc(x.text)}</li>`).join('');
    log.scrollTop = 0;

    // result
    const res = $('#bt-result');
    res.hidden = active;
    if (!active) renderBattleResult(v);

    // status line, countdown and polling
    const statusEl = $('#bt-status');
    const deadline = v.deadline ? new Date(v.deadline).getTime() : 0;
    const clockFix = new Date(v.now).getTime() - Date.now();
    const left = () => Math.max(0, Math.ceil((deadline - (Date.now() + clockFix)) / 1000));
    const paint = () => {
      if (!active) { statusEl.textContent = 'The fight is over.'; return; }
      if (v.auto) { statusEl.textContent = v.need ? 'Autopilot is choosing…' : `Waiting for ${foe.name}… ${left()}s`; return; }
      if (v.need === 'action') statusEl.textContent = `Your move · ${left()}s before instinct takes over`;
      else if (v.need === 'reaction') statusEl.textContent = `React · ${left()}s`;
      else statusEl.textContent = `${foe.name} is choosing… ${left()}s`;
    };
    paint();
    if (active) {
      bTick = setInterval(paint, 1000);
      // waiting on them: poll; our turn: refresh once the clock runs out
      const wait = v.need && !v.auto ? Math.max(1500, left() * 1000 + 1500) : 2000;
      bPoll = setTimeout(refreshBattle, wait);
    }
  }

  function renderBattleResult(v) {
    let r = v.result || {};
    const won = v.winner === (v.my_team || v.me);
    if (r.team && r.members) {
      const mine = r.members.find((x) => state && x.id === state.id) || {};
      r = { ...mine, story: r.story, won: r.won };
    }
    const res = $('#bt-result');
    const bits = [];
    if (r.qi > 0) bits.push(`<span class="gain qi">+${fmt(r.qi)} qi</span>`);
    if (r.qi_lost > 0) bits.push(`<span class="gain bad">−${fmt(r.qi_lost)} qi</span>`);
    if (r.stones > 0) bits.push(`<span class="gain stone">+${fmt(r.stones)} spirit stones</span>`);
    if (r.item_name) bits.push(`<span class="gain item">+1 ${esc(r.item_name)}</span>`);
    if (r.stones_lost > 0) bits.push(`<span class="gain bad">−${fmt(r.stones_lost)} spirit stones</span>`);
    if (v.kind === 'attack' && r.effect_pct != null) {
      const pct = v.me === 1 ? r.effect_pct : null;
      if (pct != null) bits.push(`<span class="gain ${pct > 0 ? 'qi' : 'bad'}">${pct > 0 ? '+' : ''}${pct}% cultivation for ${r.effect_min} min</span>`);
    }
    if (v.kind === 'duel' && r.bet > 0) bits.push(`<span class="gain ${won ? 'stone' : 'bad'}">${won ? '+' : '−'}${fmt(won ? r.bet * 2 : r.bet)} spirit stones</span>`);
    if (r.woke_in && !won) bits.push(`<span class="gain bad">Woke in ${esc(r.woke_in)} · 1 HP</span>`);
    const title = r.fled && !won ? 'Escaped' : won ? 'Victory' : 'Defeat';
    res.className = `card story ${won ? 'k-encounter' : 'k-beast_lost'}`;
    res.innerHTML = `<p class="fight-title">${title}</p><p>${esc(r.story || '')}</p><div class="gains">${bits.join('')}</div>
      <button class="btn primary" id="bt-done">Continue</button>`;
    $('#bt-done').onclick = async () => {
      try { renderHome(await loadCharacter()); } catch (e) { /* */ }
      $('#world-result').hidden = true;
      showPane('pane-world');
    };
  }

  $('#bt-auto').addEventListener('click', () => { if (bv) battleCall('battle_auto', { p_id: bv.id, p_on: !bv.auto }); });
  $('#bt-fight').addEventListener('click', () => { if (bv) { bChoiceSeen[bv.id] = true; renderBattle(bv); } });
  $('#bt-autofight').addEventListener('click', () => { if (bv) { bChoiceSeen[bv.id] = true; battleCall('battle_auto', { p_id: bv.id, p_on: true }); } });

  $('#btn-hunt').addEventListener('click', async () => {
    const btn = $('#btn-hunt');
    btn.dataset.busy = '1';
    btn.disabled = true;
    btn.textContent = 'Tracking…';
    const { data, error } = await sb.rpc('hunt');
    btn.dataset.busy = '';
    if (error) { toast(friendly(error)); renderWorld(); return; }
    renderHome(data.character);
    const foe = data.battle.sides[1].name;
    openBattle(data.battle, `You track down ${/^[aeiou]/i.test(foe) ? 'an' : 'a'} ${foe}.`);
  });

  // ---------- Tabs ----------
  // Sub-pages inside the World tab (Travel, Cultivators nearby).
  function showSub(sub) {
    $('#world-main').hidden = !!sub;
    document.querySelectorAll('#pane-world .sub').forEach((x) => { x.hidden = x.id !== sub; });
    window.scrollTo(0, 0);
    if (sub === 'sub-nearby' && !$('#opp-list').children.length) loadOpponents();
  }

  function showPane(id, sub) {
    chat.stop();
    sectChat.stop();
    clearInterval(dmTimer);
    if (id !== 'pane-battle') stopBattle();
    if (id === 'pane-arts') loadArts();
    if (id === 'pane-class') loadClass();
    if (id === 'pane-gear') loadGear();
    if (id === 'pane-styles') loadStyles();
    if (id === 'pane-upgrade') loadUpgrades();
    if (id === 'pane-character') sb.rpc('my_upgrades').then(({ data }) => { if (data) { upData = data; const hb = $('#hub-up'); hb.hidden = !data.points; hb.textContent = data.points; } });
    if (id === 'pane-profession') { $('#pf-result').hidden = true; loadProfession(); }
    document.querySelectorAll('.pane').forEach((p) => p.classList.toggle('active', p.id === id));
    document.querySelectorAll('.tabbar-btn').forEach((b) => b.classList.toggle('active', b.dataset.pane === id));
    window.scrollTo(0, 0);
    if (id === 'pane-world') {
      $('#opp-list').innerHTML = '';
      $('#btn-look').textContent = 'Look for opponents';
      showSub(sub || null);
      Promise.all([loadWorld(), loadControl()]).then(() => { renderRegions(); renderWorld(); }).catch((e) => toast(friendly(e)));
      loadDuels();
      loadGuidance();
      loadParty();
      loadNpcSects();
      loadRaid();
      loadWar();
      loadTour();
    }
    if (id === 'pane-sect') Promise.all([loadWorld(), loadControl()]).then(loadSect).catch((e) => toast(friendly(e)));
    if (id === 'pane-bag') { const w = $('#bag-warning'); if (w) w.remove(); loadBag(); }
    clearInterval(statsTimer);
    if (id === 'pane-stats') { loadStats(); statsTimer = setInterval(() => {
      if (!statsData || !statsData.training) return;
      const left = secsLeft(statsData.training.until);
      if (left <= 0) return loadStats();
      const sp = $('#st-training span');
      if (sp) sp.innerHTML = `Training <strong>${STAT_NAMES[statsData.training.stat]}</strong> · ${duration(left)} left`;
    }, 1000); }
    clearInterval(skillsTimer);
    if (id === 'pane-skills') { $('#sk-picker').hidden = true; loadSkills(); skillsTimer = setInterval(() => {
      if (!skillsData || !skillsData.practicing) return;
      if (secsLeft(skillsData.practicing.until) <= 0) return loadSkills();
      const sp = $('#sk-practice span'); const sk = skillsData.skills.find((x) => x.id === skillsData.practicing.skill);
      if (sp) sp.innerHTML = `Practising <strong>${esc(sk ? sk.name : '')}</strong> · ${duration(secsLeft(skillsData.practicing.until))} left`;
    }, 1000); }
    if (id === 'pane-market') loadMarket();
    if (id === 'pane-trade') loadAuctions();
    if (id === 'pane-messages') loadInbox();
    if (id === 'pane-chat') { markChatTabs(); chat.start(); }
    paintChatDots();
    if (id === 'pane-sectchat') startSectChat();
  }
  document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => showPane(b.dataset.go, b.dataset.sub)));
  document.querySelectorAll('#world-main [data-sub]').forEach((b) => b.addEventListener('click', () => showSub(b.dataset.sub)));
  document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => showSub(null)));
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
    // Auto-update: when a new version is published, the new service worker takes over
    // and the page reloads itself onto it. Checks on open, every 5 minutes, and on return.
    let hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) { hadController = true; return; }   // first install takes control: not an update
      if (reloading) return;
      reloading = true;
      try { sessionStorage.setItem('updated', '1'); } catch (e) { /* */ }
      window.location.reload();
    });
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').then((reg) => {
      setInterval(() => reg.update().catch(() => {}), 5 * 60 * 1000);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    }).catch(() => {}));
    try { if (sessionStorage.getItem('updated')) { sessionStorage.removeItem('updated'); setTimeout(() => toast('The game was updated to the newest version.'), 1500); } } catch (e) { /* */ }
  }
})();
