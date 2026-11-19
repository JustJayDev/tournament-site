/* XT Esports — ELITE SERIES S1 Admin Panel
   Local-first control room. State in localStorage `xt_admin_v1`.
   Publish writes to Firestore via AdminFirebase (tournament/xt-elite-series). */

"use strict";

const STORAGE_KEY = "xt_admin_v1";
const DEFAULT_DATA = {
  schema: 1,
  tournament: {
    title: "ELITE SERIES S1",
    organizer: "XT Esports",
    status: "live",
    format: "Group stage → Finals",
    prize: { label: "₹500", payouts: { "1": 500 } },
    schedule: [
      { id: "grp-a", label: "Group A", date: "2026-11-14", time: "6:00 PM", status: "done" },
      { id: "grp-b", label: "Group B", date: "2026-11-15", time: "6:00 PM", status: "done" },
      { id: "grp-c", label: "Group C", date: "2026-11-19", time: "5:30 PM", status: "today" },
    ],
    finals: { label: "Finals", date: "", time: "", status: "tbd" },
    points: { kill: 1, placement: [12, 9, 7, 6, 5, 4, 3, 2, 1, 0, 0, 0] },
    tiebreak: "Booyah > Kills > Placement",
    stream: { channel: "XT Esports", url: "https://youtube.com/@XT-SAAZ", time: "5:30 PM" },
    rules: [
      "Squad entry only (4 players per team)",
      "Keep all maps downloaded before the match",
      "No random invites — penalty −15 points",
      "Abuse/misbehaviour — penalty −10 points",
      "Same active character skill not allowed for teammates",
      "Be respectful in lobby and game",
    ],
    whatsapp: "",
  },
  groups: {
    A: { id: "grp-a", label: "Group A", status: "done", teams: [], matches: [], qualifiers: 4 },
    B: { id: "grp-b", label: "Group B", status: "done", teams: [], matches: [], qualifiers: 4 },
    C: { id: "grp-c", label: "Group C", status: "today", teams: [], matches: [], qualifiers: 4 },
  },
};

let state = loadState();
let currentTab = "overview";
let editingMatchGroup = "A";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return structuredClone(DEFAULT_DATA);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderShell();
}

const $ = (id) => document.getElementById(id);

function toast(msg, ok = true) {
  const el = $("toast");
  if (!el) return;
  el.textContent = msg;
  el.className = "toast show " + (ok ? "ok" : "err");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.className = "toast";
  }, 2600);
}

/* ---------- standings computation (same as live site) ---------- */
function computeStandings(group) {
  const teams = group.teams || [];
  const matches = group.matches || [];
  const standings = teams.map((team) => ({
    team, matches: 0, wins: 0, kills: 0, points: 0,
  }));
  const byTeam = {};
  standings.forEach((s) => (byTeam[s.team] = s));
  matches.forEach((m) => {
    (m.results || []).forEach((r) => {
      const s = byTeam[r.team];
      if (!s) return;
      s.matches += 1;
      const place = Number(r.placement);
      const kills = Number(r.kills) || 0;
      const placePoints = state.tournament.points.placement[place - 1] || 0;
      s.points += placePoints + kills * (state.tournament.points.kill || 1);
      s.kills += kills;
      if (place === 1) s.wins += 1;
    });
  });
  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.kills - a.kills;
  });
  return standings;
}

/* ---------- tab switching ---------- */
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".nav-item").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });
  document.querySelectorAll(".tab-panel").forEach((p) => {
    p.classList.toggle("active", p.id === "tab-" + tab);
  });
  renderTab();
}

function renderTab() {
  if (currentTab === "overview") renderOverview();
  else if (currentTab === "groups") renderGroupsEdit();
  else if (currentTab === "matches") renderMatches();
  else if (currentTab === "standings") renderStandings();
  else if (currentTab === "settings") renderSettings();
  else if (currentTab === "publish") renderPublish();
}

function renderShell() {
  $("status-pill").textContent = { live: "LIVE", upcoming: "UPCOMING", completed: "COMPLETED" }[state.tournament.status] || "LIVE";
  $("status-pill").className = "status-pill " + (state.tournament.status || "live");
  if (currentTab) renderTab();
}

/* ---------- overview ---------- */
function renderOverview() {
  let teams = 0;
  let matches = 0;
  Object.keys(state.groups).forEach((k) => {
    teams += (state.groups[k].teams || []).length;
    matches += (state.groups[k].matches || []).length;
  });
  $("stat-teams").textContent = teams;
  $("stat-groups").textContent = Object.keys(state.groups).length;
  $("stat-matches").textContent = matches;
  $("stat-qual").textContent = 4 * Object.keys(state.groups).length;
  const radios = document.querySelectorAll('input[name="status"]');
  radios.forEach((r) => (r.checked = r.value === state.tournament.status));
}

/* ---------- groups edit ---------- */
function renderGroupsEdit() {
  const wrap = $("groups-edit");
  wrap.innerHTML = "";
  Object.keys(state.groups).forEach((key) => {
    const g = state.groups[key];
    const card = document.createElement("div");
    card.className = "card";

    const head = document.createElement("div");
    head.className = "group-edit-head";
    const title = document.createElement("h2");
    title.className = "card-title";
    title.textContent = g.label;
    const statusSel = document.createElement("select");
    statusSel.className = "field field-sm";
    ["done", "today", "upcoming", "tbd"].forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s.charAt(0).toUpperCase() + s.slice(1);
      opt.selected = s === g.status;
      statusSel.appendChild(opt);
    });
    statusSel.addEventListener("change", () => {
      g.status = statusSel.value;
      saveState();
    });
    head.append(title, statusSel);

    const teamList = document.createElement("div");
    teamList.className = "team-list";
    (g.teams || []).forEach((team, i) => {
      const row = document.createElement("div");
      row.className = "team-row";
      const num = document.createElement("span");
      num.className = "team-num";
      num.textContent = String(i + 1);
      const name = document.createElement("span");
      name.className = "team-name";
      name.textContent = team;
      const del = document.createElement("button");
      del.className = "btn btn-sm btn-danger-ghost";
      del.textContent = "Remove";
      del.addEventListener("click", () => {
        g.teams.splice(i, 1);
        saveState();
      });
      row.append(num, name, del);
      teamList.appendChild(row);
    });

    const addRow = document.createElement("div");
    addRow.className = "field-group team-add";
    const input = document.createElement("input");
    input.className = "field";
    input.placeholder = "Team name";
    const btn = document.createElement("button");
    btn.className = "btn btn-primary";
    btn.textContent = "Add team";
    btn.addEventListener("click", () => {
      const name = input.value.trim();
      if (!name) return;
      if (g.teams.includes(name)) {
        toast("Team already in group", false);
        return;
      }
      g.teams.push(name);
      input.value = "";
      saveState();
    });
    addRow.append(input, btn);

    card.append(head, teamList, addRow);
    wrap.appendChild(card);
  });
}

/* ---------- matches ---------- */
function renderMatches() {
  const sel = $("match-group");
  sel.innerHTML = "";
  Object.keys(state.groups).forEach((key) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = state.groups[key].label;
    sel.appendChild(opt);
  });
  sel.value = editingMatchGroup;
  sel.addEventListener("change", () => {
    editingMatchGroup = sel.value;
    renderMatchRows();
  });
  renderMatchRows();
  renderMatchesList();
}

function renderMatchRows() {
  const container = $("match-rows");
  container.innerHTML = "";
  const g = state.groups[editingMatchGroup];
  const teams = g.teams || [];
  function addRow(team = "") {
    const row = document.createElement("div");
    row.className = "match-row";
    const sel = document.createElement("select");
    sel.className = "field";
    sel.innerHTML = '<option value="">Select team…</option>';
    teams.forEach((t) => {
      const o = document.createElement("option");
      o.value = t;
      o.textContent = t;
      o.selected = t === team;
      sel.appendChild(o);
    });
    const place = document.createElement("input");
    place.className = "field field-num";
    place.type = "number";
    place.min = "1";
    place.max = String(teams.length);
    place.placeholder = "Placement";
    const kills = document.createElement("input");
    kills.className = "field field-num";
    kills.type = "number";
    kills.min = "0";
    kills.placeholder = "Kills";
    const del = document.createElement("button");
    del.className = "btn btn-sm btn-danger-ghost";
    del.textContent = "×";
    del.addEventListener("click", () => row.remove());
    row.append(sel, place, kills, del);
    container.appendChild(row);
  }
  addRow();
  const addBtn = $("match-add-row");
  addBtn.onclick = () => addRow();
  $("match-save").onclick = () => saveMatch();
}

function saveMatch() {
  const g = state.groups[editingMatchGroup];
  const rows = document.querySelectorAll("#match-rows .match-row");
  const results = [];
  let ok = true;
  rows.forEach((row) => {
    const team = row.querySelector("select").value;
    const placement = row.querySelector('input[placeholder="Placement"]').value;
    const kills = row.querySelector('input[placeholder="Kills"]').value;
    if (!team) return;
    if (!placement) {
      toast("Every team needs a placement", false);
      ok = false;
      return;
    }
    results.push({ team, placement: Number(placement), kills: Number(kills) || 0 });
  });
  if (!ok) return;
  if (!results.length) {
    toast("Add at least one team result", false);
    return;
  }
  const places = results.map((r) => r.placement);
  const uniq = new Set(places);
  if (uniq.size !== places.length) {
    toast("Placements must be unique (1–12)", false);
    return;
  }
  g.matches.push({ id: Date.now().toString(36), results });
  toast("Match saved — standings updated");
  saveState();
  renderMatches();
}

function renderMatchesList() {
  const wrap = $("matches-wrap");
  wrap.innerHTML = "";
  Object.keys(state.groups).forEach((key) => {
    const g = state.groups[key];
    (g.matches || []).forEach((m, mi) => {
      const card = document.createElement("div");
      card.className = "card match-card";
      const head = document.createElement("div");
      head.className = "match-card-head";
      const title = document.createElement("strong");
      title.textContent = `${g.label} — Match ${mi + 1}`;
      const del = document.createElement("button");
      del.className = "btn btn-sm btn-danger-ghost";
      del.textContent = "Delete";
      del.addEventListener("click", () => {
        g.matches.splice(mi, 1);
        saveState();
        renderMatches();
      });
      head.append(title, del);
      const list = document.createElement("div");
      list.className = "match-results";
      m.results.forEach((r) => {
        const line = document.createElement("div");
        line.className = "match-result-line";
        line.innerHTML = `<span>${r.team}</span><span class="m-place">#${r.placement}</span><span class="m-kills">${r.kills} kills</span>`;
        list.appendChild(line);
      });
      card.append(head, list);
      wrap.appendChild(card);
    });
  });
  if (!wrap.children.length) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "No matches logged yet. Add one above.";
    wrap.appendChild(empty);
  }
}

/* ---------- standings ---------- */
function renderStandings() {
  const wrap = $("standings-wrap");
  wrap.innerHTML = "";
  Object.keys(state.groups).forEach((key) => {
    const g = state.groups[key];
    const standings = computeStandings(g);
    const card = document.createElement("div");
    card.className = "card";
    const title = document.createElement("h2");
    title.className = "card-title";
    title.textContent = g.label;
    const table = document.createElement("div");
    table.className = "standings";

    const head = document.createElement("div");
    head.className = "s-row s-head";
    ["#", "Team", "P", "W", "K", "Pts"].forEach((h, i) => {
      const c = document.createElement("span");
      c.className = i === 1 ? "s-team" : "s-num";
      c.textContent = h;
      head.appendChild(c);
    });
    table.appendChild(head);

    if (standings.length) {
      standings.forEach((s, i) => {
        const row = document.createElement("div");
        row.className = "s-row" + (i < g.qualifiers ? " qual" : "");
        const r = document.createElement("span");
        r.className = "s-num s-rank";
        r.textContent = String(i + 1);
        const t = document.createElement("span");
        t.className = "s-team";
        t.textContent = s.team;
        const p = document.createElement("span");
        p.className = "s-num"; p.textContent = s.matches;
        const w = document.createElement("span");
        w.className = "s-num"; w.textContent = s.wins;
        const k = document.createElement("span");
        k.className = "s-num"; k.textContent = s.kills;
        const pts = document.createElement("span");
        pts.className = "s-num s-pts"; pts.textContent = s.points;
        row.append(r, t, p, w, k, pts);
        table.appendChild(row);
      });
    } else {
      const empty = document.createElement("div");
      empty.className = "s-empty";
      empty.textContent = "No teams in this group yet";
      table.appendChild(empty);
    }
    card.append(title, table);
    wrap.appendChild(card);
  });
}

/* ---------- settings ---------- */
function renderSettings() {
  const t = state.tournament;
  $("set-prize").value = t.prize.label;
  $("set-format").value = t.format || "";
  $("set-kill").value = t.points.kill;
  $("set-tiebreak").value = t.tiebreak || "";
  $("set-finals-date").value = t.finals.date || "";
  $("set-finals-time").value = t.finals.time || "";
  $("set-stream-url").value = t.stream.url || "";
  $("set-stream-time").value = t.stream.time || "";

  // schedule editor
  const schedWrap = $("set-schedule");
  schedWrap.innerHTML = "";
  (t.schedule || []).forEach((s, i) => {
    const row = document.createElement("div");
    row.className = "sched-row";
    const label = document.createElement("input");
    label.className = "field";
    label.value = s.label;
    const date = document.createElement("input");
    date.className = "field";
    date.placeholder = "Date";
    date.value = s.date || "";
    const time = document.createElement("input");
    time.className = "field";
    time.placeholder = "Time";
    time.value = s.time || "";
    const status = document.createElement("select");
    status.className = "field field-sm";
    ["done", "today", "upcoming", "tbd"].forEach((st) => {
      const o = document.createElement("option");
      o.value = st; o.textContent = st;
      o.selected = st === s.status;
      status.appendChild(o);
    });
    const del = document.createElement("button");
    del.className = "btn btn-sm btn-danger-ghost";
    del.textContent = "×";
    del.addEventListener("click", () => {
      t.schedule.splice(i, 1);
      saveState();
    });
    const apply = () => {
      s.label = label.value;
      s.date = date.value;
      s.time = time.value;
      s.status = status.value;
    };
    [label, date, time, status].forEach((el) => el.addEventListener("change", apply));
    row.append(label, date, time, status, del);
    schedWrap.appendChild(row);
  });
  const addBtn = document.createElement("button");
  addBtn.className = "btn btn-sm";
  addBtn.textContent = "+ Add schedule row";
  addBtn.addEventListener("click", () => {
    t.schedule.push({ id: "s" + Date.now(), label: "New", date: "", time: "", status: "upcoming" });
    saveState();
  });
  schedWrap.appendChild(addBtn);

  // rules editor
  const rulesWrap = $("set-rules");
  rulesWrap.innerHTML = "";
  (t.rules || []).forEach((rule, i) => {
    const row = document.createElement("div");
    row.className = "rule-row";
    const input = document.createElement("input");
    input.className = "field";
    input.value = rule;
    const del = document.createElement("button");
    del.className = "btn btn-sm btn-danger-ghost";
    del.textContent = "×";
    del.addEventListener("click", () => {
      t.rules.splice(i, 1);
      saveState();
    });
    input.addEventListener("change", () => { t.rules[i] = input.value; });
    row.append(input, del);
    rulesWrap.appendChild(row);
  });
  const addRule = document.createElement("button");
  addRule.className = "btn btn-sm";
  addRule.textContent = "+ Add rule";
  addRule.addEventListener("click", () => {
    t.rules.push("New rule");
    saveState();
  });
  rulesWrap.appendChild(addRule);

  $("settings-save").onclick = () => {
    t.prize.label = $("set-prize").value || "₹500";
    t.format = $("set-format").value;
    t.points.kill = Number($("set-kill").value) || 1;
    t.tiebreak = $("set-tiebreak").value;
    t.finals.date = $("set-finals-date").value;
    t.finals.time = $("set-finals-time").value;
    t.stream.url = $("set-stream-url").value;
    t.stream.time = $("set-stream-time").value;
    saveState();
    toast("Settings saved");
  };
}

/* ---------- publish ---------- */
function buildExport() {
  return {
    schema: 1,
    generatedAt: new Date().toISOString(),
    tournament: structuredClone(state.tournament),
    groups: structuredClone(state.groups),
  };
}

function renderPublish() {
  const data = buildExport();
  $("pub-json").textContent = JSON.stringify(data, null, 2);
  let teams = 0;
  let matches = 0;
  Object.keys(state.groups).forEach((k) => {
    teams += (state.groups[k].teams || []).length;
    matches += (state.groups[k].matches || []).length;
  });
  $("pub-summary").textContent = `${teams} teams · ${matches} matches · ${Object.keys(state.groups).length} groups`;
  updateSyncStatus();
}

function updateSyncStatus() {
  const el = $("sync-status");
  if (!el) return;
  const st = window.AdminFirebase ? window.AdminFirebase.getStatus() : { status: "idle", error: "" };
  const map = {
    idle: ["Not synced", ""],
    loading: ["Connecting to Firebase…", "loading"],
    ready: ["Connected — changes go live on Sync", "ready"],
    error: [st.error ? "Sync error: " + st.error : "Sync error", "error"],
  };
  const [text, cls] = map[st.status] || map.idle;
  el.textContent = text;
  el.className = "sync-status " + cls;
}

async function syncToFirebase() {
  const btn = $("pub-sync");
  const st = $("sync-status");
  if (btn) { btn.disabled = true; btn.textContent = "Syncing…"; }
  if (st) { st.textContent = "Syncing…"; st.className = "sync-status loading"; }
  try {
    if (!window.AdminFirebase) throw new Error("Firebase module not loaded — check network and reload.");
    const res = await window.AdminFirebase.publish(buildExport());
    if (res.status === "ready") {
      toast("Live site updated — standings and settings synced");
    } else {
      throw new Error(res.error || "Sync failed");
    }
  } catch (e) {
    toast(e.message || "Sync failed", false);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Sync now"; }
    updateSyncStatus();
  }
}

function copyExport() {
  const json = JSON.stringify(buildExport());
  if (navigator.clipboard) {
    navigator.clipboard.writeText(json).then(() => toast("JSON copied"), () => fallbackCopy(json));
  } else {
    fallbackCopy(json);
  }
}
function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  ta.remove();
  toast("JSON copied");
}
function downloadExport() {
  const blob = new Blob([JSON.stringify(buildExport(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "xt-elite-series.json";
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- modal ---------- */
function confirmModal(title, body, onConfirm) {
  $("modal-title").textContent = title;
  $("modal-body").textContent = body;
  $("modal-overlay").classList.add("show");
  $("modal-confirm").onclick = () => {
    $("modal-overlay").classList.remove("show");
    onConfirm();
  };
  $("modal-cancel").onclick = () => $("modal-overlay").classList.remove("show");
}

function resetAll() {
  confirmModal("Reset all data?", "This wipes all local admin data. The live site is untouched until you publish again.", () => {
    state = structuredClone(DEFAULT_DATA);
    saveState();
    toast("All data reset");
  });
}

/* ---------- boot ---------- */
function bindEvents() {
  document.querySelectorAll(".nav-item").forEach((b) => {
    b.addEventListener("click", () => switchTab(b.dataset.tab));
  });
  const syncBtn = $("pub-sync");
  if (syncBtn) syncBtn.addEventListener("click", syncToFirebase);
  $("pub-copy").addEventListener("click", copyExport);
  $("pub-download").addEventListener("click", downloadExport);
  $("pub-reset").addEventListener("click", resetAll);
  $("view-site").addEventListener("click", (e) => {
    e.preventDefault();
    window.open("./index.html", "_blank");
  });
  document.querySelectorAll('input[name="status"]').forEach((r) => {
    r.addEventListener("change", () => {
      state.tournament.status = r.value;
      saveState();
      toast("Status updated to " + r.value.toUpperCase());
    });
  });
}

function boot() {
  bindEvents();
  switchTab("overview");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}