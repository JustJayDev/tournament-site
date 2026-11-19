/* KAIZEN ₹200 Solo — Admin Panel
   Local-first control room. State lives in localStorage;
   Publish tab exports a tournament-data.json for the live site.
   Honesty rule: standings are ONLY computed from entered match
   results. There is no pre-filled/demo data path. */

"use strict";
const STORE_KEY = "kaizen_admin_v1";

/* safe deep clone (polyfill for older WebViews) */
const clone = typeof structuredClone === "function"
  ? (v) => structuredClone(v)
  : (v) => JSON.parse(JSON.stringify(v));

/* ---------- default state ---------- */
const DEFAULTS = {
  schema: 1,
  status: "live", // live | upcoming | completed
  settings: {
    maxSlots: 48,
    prizeLabel: "₹200",
    payouts: { "1": 100, "2": 60, "3": 40 },
    killPoints: 1,
    placementPoints: [12, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0],
    whatsapp: "918217816606",
    footerText: "KAIZEN Esports · Free Fire MAX",
    footerLink: "https://youtube.com/@kaizenff.official",
    footerLinkLabel: "KaizenFF",
  },
  players: [
    "Royal राजपूत", "Ꭺʀʀᴏᴡ", "MR X. LIVE", "TQG.KAIZEN07",
    "OFL HITESH", "TG MAFIA", "RizzyTheOG", "TOX1C",
    "mahendraaa7", "Mvp speedy", "Bewafa", "༒VIKASH-KinG",
    "GP.J1NW00", "ABHIMANYU1", "7h aura", "Agent ITACHI", "Rock yt.",
  ],
  matches: [],
};

let state = load();
let activeTab = "overview";
let editableMatchId = null;
let filterText = "";

/* ---------- storage ---------- */
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return clone(DEFAULTS);
    const parsed = JSON.parse(raw);
    return Object.assign(clone(DEFAULTS), parsed, {
      settings: Object.assign(structuredClone(DEFAULTS.settings), parsed.settings || {}),
    });
  } catch (e) {
    return clone(DEFAULTS);
  }
}
function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

/* ---------- dom helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  attrs = attrs || {};
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, "");
    else if (v !== false && v != null) node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c) node.append(c);
  }
  return node;
}

/* ---------- toast + modal ---------- */
function toast(msg, ok = true) {
  const box = $("#toast");
  box.textContent = msg;
  box.className = "toast show " + (ok ? "ok" : "err");
  clearTimeout(box._t);
  box._t = setTimeout(() => (box.className = "toast"), 2600);
}

function confirmModal({ title, body, confirmLabel, danger }) {
  return new Promise((resolve) => {
    const overlay = $("#modal-overlay");
    $("#modal-title").textContent = title;
    $("#modal-body").textContent = body;
    const btn = $("#modal-confirm");
    btn.textContent = confirmLabel;
    btn.className = "btn " + (danger ? "btn-danger" : "btn-primary");
    overlay.classList.add("show");
    const done = (val) => {
      overlay.classList.remove("show");
      btn.onclick = null;
      $("#modal-cancel").onclick = null;
      overlay.onclick = null;
      resolve(val);
    };
    btn.onclick = () => done(true);
    $("#modal-cancel").onclick = () => done(false);
    overlay.onclick = (e) => {
      if (e.target === overlay) done(false);
    };
  });
}

/* ---------- derived ---------- */
function playersLeft() {
  return Math.max(0, state.settings.maxSlots - state.players.length);
}

function computeStandings() {
  const totals = new Map();
  state.players.forEach((p) => totals.set(p, { placement: 0, kills: 0, points: 0 }));
  state.matches.forEach((m) => {
    m.results.forEach((r) => {
      const t = totals.get(r.player);
      if (!t) return;
      const idx = Math.max(0, Math.min(state.settings.placementPoints.length - 1, r.placement - 1));
      t.placement += state.settings.placementPoints[idx];
      t.kills += r.kills;
    });
  });
  return Array.from(totals, ([player, t]) => ({
    player,
    placement: t.placement,
    kills: t.kills,
    points: t.placement + t.kills * state.settings.killPoints,
  })).sort((a, b) => b.points - a.points || b.kills - a.kills);
}

function nextMatchId() {
  let max = 0;
  state.matches.forEach((m) => {
    const n = parseInt(String(m.id).replace(/\D/g, ""), 10);
    if (!isNaN(n) && n > max) max = n;
  });
  return max + 1;
}

function matchName(id) {
  return `Match ${id}`;
}

/* ---------- render: shell ---------- */
function setTab(name) {
  activeTab = name;
  $$(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  $$(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === "tab-" + name));
  if (name === "standings") renderStandings();
  if (name === "players") { filterText = ""; $("#player-filter").value = ""; renderPlayers(); }
  if (name === "matches") { editableMatchId = null; renderMatches(); }
  if (name === "settings") renderSettings();
  if (name === "publish") renderPublish();
  if (name === "overview") renderOverview();
}

function refreshStatusPill() {
  const map = { live: "LIVE", upcoming: "UPCOMING", completed: "COMPLETED" };
  const pill = $("#status-pill");
  pill.textContent = map[state.status] || "LIVE";
  pill.className = "status-pill " + state.status;
}

function renderShell() {
  // status pill
  refreshStatusPill();

  // player count in nav
  $("#nav-player-count").textContent = state.players.length;

  // overview stats
  $("#stat-slots").textContent = `${state.players.length} / ${state.settings.maxSlots}`;
  $("#stat-slots-left").textContent = playersLeft();
  $("#stat-matches").textContent = state.matches.length;
  const standings = computeStandings();
  $("#stat-standing").textContent = state.matches.length ? standings.length : "—";
}

/* ---------- overview ---------- */
function renderOverview() {
  renderShell();
  const statusRadios = $$('input[name="status"]');
  statusRadios.forEach((r) => (r.checked = r.value === state.status));

  const drafts = state.matches.filter((m) => !m.results.length).length;
  const totalResults = state.matches.reduce((a, m) => a + m.results.length, 0);
  $("#ov-matches").textContent = `${state.matches.length} matches · ${totalResults} results`;
  $("#ov-drafts").textContent = drafts ? `${drafts} draft match(es) with no results` : "No empty drafts";
  $("#ov-standing-state").textContent = state.matches.length
    ? "Live from entered results"
    : "Empty until match results are entered";
}

/* ---------- players ---------- */
function renderPlayers() {
  renderShell();
  const list = $("#players-list");
  list.innerHTML = "";
  const q = filterText.trim().toLowerCase();
  const shown = state.players.filter((p) => !q || p.toLowerCase().includes(q));
  shown.forEach((p) => {
    const row = el("div", { class: "list-row" }, [
      el("span", { class: "row-main", text: p }),
      el("button", {
        class: "icon-btn btn-danger-ghost",
        title: "Remove player",
        onclick: () => removePlayer(p),
      }, [svgTrash()]),
    ]);
    list.append(row);
  });
  if (!shown.length) {
    list.append(el("div", { class: "empty-note", text: q ? "No players match that search." : "No players yet — add the first one." }));
  }
  $("#player-count-note").textContent = `${state.players.length} of ${state.settings.maxSlots} slots filled · ${playersLeft()} left`;
}

function removePlayer(name) {
  confirmModal({
    title: "Remove player?",
    body: `Remove “${name}” from the roster? Their match results will be dropped from standings.`,
    confirmLabel: "Remove",
    danger: true,
  }).then((ok) => {
    if (!ok) return;
    state.players = state.players.filter((p) => p !== name);
    state.matches.forEach((m) => {
      m.results = m.results.filter((r) => r.player !== name);
    });
    save();
    renderPlayers();
    toast("Player removed");
  });
}

function addPlayers(names) {
  const lower = new Set(state.players.map((p) => p.toLowerCase()));
  const clean = names
    .map((n) => n.trim())
    .filter(Boolean)
    .filter((n) => !lower.has(n.toLowerCase()));
  if (!clean.length) {
    toast("No new names to add (all already in the roster).", false);
    return;
  }
  if (state.players.length + clean.length > state.settings.maxSlots) {
    const room = playersLeft();
    toast(`Only ${room} slot(s) left — add fewer names.`, false);
    return;
  }
  state.players.push(...clean);
  save();
  renderPlayers();
  toast(`Added ${clean.length} player(s)`);
}

/* ---------- matches ---------- */
function renderMatches() {
  renderShell();
  const wrap = $("#matches-wrap");
  wrap.innerHTML = "";

  const header = el("div", { class: "list-head" }, [
    el("span", { text: `${state.matches.length} match(es)` }),
    el("button", { class: "btn btn-primary btn-sm", onclick: () => startMatchEdit(), text: "+ New match" }),
  ]);
  wrap.append(header);

  if (!state.matches.length) {
    wrap.append(el("div", { class: "empty-note", text: "No matches yet. Create the first match, then enter each player's placement and kills." }));
    return;
  }

  state.matches.forEach((m) => {
    const card = el("div", { class: "match-card" }, [
      el("div", { class: "match-head" }, [
        el("span", { class: "match-name", text: matchName(m.id) }),
        m.date ? el("span", { class: "match-date", text: m.date }) : null,
        el("span", { class: "match-count", text: `${m.results.length} result(s)` }),
        el("div", { class: "match-actions" }, [
          el("button", { class: "icon-btn", title: "Edit match", onclick: () => startMatchEdit(m.id) }, [svgEdit()]),
          el("button", { class: "icon-btn btn-danger-ghost", title: "Delete match", onclick: () => deleteMatch(m.id) }, [svgTrash()]),
        ]),
      ]),
    ]);
    wrap.append(card);
  });
}

function startMatchEdit(id) {
  editableMatchId = id ?? null;
  const m = id ? state.matches.find((x) => x.id === id) : null;
  const form = $("#match-form");
  form.classList.add("show");
  const title = $("#match-form-title");
  title.textContent = m ? `Edit ${matchName(m.id)}` : "New match";
  $("#match-date").value = m?.date || "";

  const rows = $("#match-rows");
  rows.innerHTML = "";
  const results = m ? m.results : [];
  if (!results.length) addMatchRow(rows);
  results.forEach((r) => addMatchRow(rows, r));

  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function addMatchRow(rows, result = null) {
  const row = el("div", { class: "match-row" }, [
    el("select", { class: "field", "aria-label": "Player" }, state.players.map((p) =>
      el("option", { value: p, text: p, selected: result?.player === p })
    )),
    el("input", {
      class: "field field-num", type: "number", min: "1", max: "12",
      value: result?.placement ?? "", placeholder: "Placement",
      "aria-label": "Placement (1–12)",
    }),
    el("input", {
      class: "field field-num", type: "number", min: "0",
      value: result?.kills ?? "", placeholder: "Kills",
      "aria-label": "Kills",
    }),
    el("button", { class: "icon-btn btn-danger-ghost", title: "Remove row", onclick: (e) => e.currentTarget.closest(".match-row").remove() }, [svgTrash()]),
  ]);
  rows.append(row);
}

function saveMatch() {
  const rows = $$("#match-rows .match-row");
  const results = [];
  const seenPlayers = new Set();
  const seenPlacements = new Set();
  let error = "";

  for (const row of rows) {
    const player = $("select", row).value;
    const placement = parseInt($('input[placeholder="Placement"]', row).value, 10);
    const kills = parseInt($('input[placeholder="Kills"]', row).value, 10);
    if (!player) continue;
    if (isNaN(placement)) { error = "Every row needs a placement (1–12)."; break; }
    if (isNaN(kills)) { error = "Every row needs a kill count (0+)."; break; }
    if (placement < 1 || placement > 12) { error = "Placement must be between 1 and 12."; break; }
    if (kills < 0) { error = "Kills can't be negative."; break; }
    if (seenPlayers.has(player)) { error = `“${player}” appears twice in this match.`; break; }
    if (seenPlacements.has(placement)) { error = `Placement #${placement} is used twice — each placement belongs to one player.`; break; }
    seenPlayers.add(player);
    seenPlacements.add(placement);
    results.push({ player, placement, kills });
  }

  if (error) { toast(error, false); return; }
  if (!results.length) { toast("Add at least one result row.", false); return; }

  if (editableMatchId != null) {
    const m = state.matches.find((x) => x.id === editableMatchId);
    if (m) {
      m.results = results;
      m.date = $("#match-date").value.trim();
    }
  } else {
    state.matches.push({ id: nextMatchId(), date: $("#match-date").value.trim(), results });
  }
  save();
  editableMatchId = null;
  $("#match-form").classList.remove("show");
  renderMatches();
  toast("Match saved — standings recomputed");
}

function deleteMatch(id) {
  confirmModal({
    title: "Delete match?",
    body: `Delete ${matchName(id)}? Its results will be removed from standings.`,
    confirmLabel: "Delete",
    danger: true,
  }).then((ok) => {
    if (!ok) return;
    state.matches = state.matches.filter((m) => m.id !== id);
    save();
    renderMatches();
    toast("Match deleted");
  });
}

/* ---------- standings ---------- */
function renderStandings() {
  renderShell();
  const wrap = $("#standings-wrap");
  wrap.innerHTML = "";
  const standings = computeStandings();
  const hasResults = state.matches.some((m) => m.results.length);

  if (!hasResults) {
    wrap.append(el("div", { class: "empty-note" }, [
      el("p", { class: "empty-title", text: "No standings yet" }),
      el("p", { text: "Standings are computed only from real match results. Enter results in the Matches tab and they'll appear here." }),
    ]));
    return;
  }

  const table = el("table", { class: "data-table" }, [
    el("thead", null, [
      el("tr", null, [
        el("th", { text: "Rank" }),
        el("th", { text: "Player" }),
        el("th", { class: "num", text: "Placement pts" }),
        el("th", { class: "num", text: "Kills" }),
        el("th", { class: "num", text: "Total" }),
      ]),
    ]),
    el("tbody", null, standings.map((s, i) =>
      el("tr", { class: i < 3 ? `rank-${i + 1}` : "" }, [
        el("td", { class: "rank-cell", text: String(i + 1) }),
        el("td", { text: s.player }),
        el("td", { class: "num", text: s.placement }),
        el("td", { class: "num", text: s.kills }),
        el("td", { class: "num strong", text: s.points }),
      ])
    )),
  ]);
  wrap.append(table);
  wrap.append(el("p", { class: "table-note", text: `Computed from ${state.matches.length} match(es). Hidden from the public site until you publish.` }));
}

/* ---------- settings ---------- */
function renderSettings() {
  renderShell();
  const s = state.settings;
  $("#set-slots").value = s.maxSlots;
  $("#set-prize").value = s.prizeLabel;
  $("#set-kill").value = s.killPoints;
  $("#set-wa").value = s.whatsapp;
  $("#set-footer-text").value = s.footerText;
  $("#set-footer-link").value = s.footerLink;
  $("#set-footer-label").value = s.footerLinkLabel;

  const ph = $("#set-payouts");
  ph.innerHTML = "";
  [["1", "1st"], ["2", "2nd"], ["3", "3rd"]].forEach(([k, label]) => {
    ph.append(el("div", { class: "payout-row" }, [
      el("label", { class: "field-label", text: label }),
      el("div", { class: "payout-input" }, [
        el("span", { class: "currency", text: "₹" }),
        el("input", { class: "field field-num", type: "number", min: "0", value: s.payouts[k] ?? 0, "data-key": k }),
      ]),
    ]));
  });

  const pp = $("#set-placement");
  pp.innerHTML = "";
  s.placementPoints.forEach((pts, i) => {
    pp.append(el("div", { class: "placement-cell" }, [
      el("span", { class: "placement-rank", text: `#${i + 1}` }),
      el("input", { class: "field field-num", type: "number", min: "0", value: pts, "data-idx": i }),
    ]));
  });
}

function saveSettings() {
  const s = state.settings;
  const slots = parseInt($("#set-slots").value, 10);
  if (isNaN(slots) || slots < 1) { toast("Max slots must be a positive number.", false); return; }
  s.maxSlots = slots;

  s.prizeLabel = $("#set-prize").value.trim() || "₹200";
  const kill = parseInt($("#set-kill").value, 10);
  if (isNaN(kill) || kill < 0) { toast("Kill points can't be negative.", false); return; }
  s.killPoints = kill;

  const wa = $("#set-wa").value.replace(/\D/g, "");
  if (!/^\d{10,15}$/.test(wa)) { toast("WhatsApp number must be 10–15 digits (country code + number).", false); return; }
  s.whatsapp = wa;

  s.footerText = $("#set-footer-text").value.trim() || "KAIZEN Esports · Free Fire MAX";
  s.footerLink = $("#set-footer-link").value.trim();
  s.footerLinkLabel = $("#set-footer-label").value.trim() || "KaizenFF";

  $$("#set-payouts input").forEach((i) => {
    const k = i.dataset.key;
    s.payouts[k] = parseInt(i.value, 10) || 0;
  });
  s.placementPoints = $$("#set-placement input").map((i) => {
    const v = parseInt(i.value, 10);
    return isNaN(v) || v < 0 ? 0 : v;
  });

  save();
  renderSettings();
  toast("Settings saved");
}

function setStatus(val) {
  state.status = val;
  save();
  refreshStatusPill();
  toast(`Tournament status → ${val.toUpperCase()}`);
}

/* ---------- publish ---------- */
function buildExport() {
  const standings = computeStandings();
  return {
    schema: 1,
    generatedAt: new Date().toISOString(),
    tournament: {
      title: "₹200 Solo",
      status: state.status,
      slots: { max: state.settings.maxSlots, filled: state.players.length, left: playersLeft() },
      prize: {
        label: state.settings.prizeLabel,
        payouts: { ...state.settings.payouts },
      },
      points: {
        kill: state.settings.killPoints,
        placement: [...state.settings.placementPoints],
      },
      whatsapp: state.settings.whatsapp,
      footer: {
        text: state.settings.footerText,
        link: state.settings.footerLink,
        label: state.settings.footerLinkLabel,
      },
    },
    players: [...state.players],
    matches: clone(state.matches),
    standings,
  };
}

function renderPublish() {
  renderShell();
  const data = buildExport();
  $("#pub-json").textContent = JSON.stringify(data, null, 2);
  $("#pub-summary").textContent =
    `${data.players.length} players · ${data.matches.length} matches · ` +
    (data.standings.length ? `${data.standings.length} ranked players` : "no standings yet");
}

function copyExport() {
  const data = buildExport();
  const json = JSON.stringify(data);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(json).then(
      () => toast("Full JSON copied — paste it into a file to deploy"),
      () => fallbackCopy(json)
    );
  } else {
    fallbackCopy(json);
  }
}

function fallbackCopy(text) {
  const ta = el("textarea", { class: "sr-only" });
  ta.value = text;
  document.body.append(ta);
  ta.select();
  try {
    document.execCommand("copy");
    toast("Full JSON copied — paste it into a file to deploy");
  } catch {
    toast("Copy failed — select the JSON below and copy manually.", false);
  }
  ta.remove();
}

function downloadExport() {
  const data = buildExport();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = el("a", { href: url, download: "tournament-data.json" });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("tournament-data.json downloaded");
}

function resetAll() {
  confirmModal({
    title: "Reset everything?",
    body: "Clear all players, matches, settings changes, and standings. This cannot be undone.",
    confirmLabel: "Reset all",
    danger: true,
  }).then((ok) => {
    if (!ok) return;
    state = clone(DEFAULTS);
    save();
    setTab("overview");
    toast("All data reset to defaults");
  });
}

/* ---------- svg icons ---------- */
function svgTrash() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(ns, "path");
  path.setAttribute("fill", "currentColor");
  path.setAttribute("d", "M9 3v1H4v2h1v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6h1V4h-5V3H9zm3 5h2v9h-2V8zm-4 0h2v9H8V8z");
  svg.append(path);
  return svg;
}

function svgEdit() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(ns, "path");
  path.setAttribute("fill", "currentColor");
  path.setAttribute("d", "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z");
  svg.append(path);
  return svg;
}

/* ---------- events ---------- */
function bindEvents() {
  $$(".nav-item").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));

  $("#player-add-btn").addEventListener("click", () => {
    const input = $("#player-add");
    const names = input.value.split(/[\n,]+/);
    addPlayers(names);
    input.value = "";
  });
  $("#player-add").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      $("#player-add-btn").click();
    }
  });
  $("#player-bulk-btn").addEventListener("click", () => {
    const ta = $("#player-bulk");
    const names = ta.value.split(/[\n,]+/);
    addPlayers(names);
    ta.value = "";
  });
  $("#player-filter").addEventListener("input", (e) => {
    filterText = e.target.value;
    renderPlayers();
  });

  $("#match-add-row").addEventListener("click", () => addMatchRow($("#match-rows")));
  $("#match-save").addEventListener("click", saveMatch);
  $("#match-cancel").addEventListener("click", () => {
    editableMatchId = null;
    $("#match-form").classList.remove("show");
  });

  $("#settings-save").addEventListener("click", saveSettings);
  $$('input[name="status"]').forEach((r) =>
    r.addEventListener("change", () => setStatus(r.value))
  );

  $("#pub-copy").addEventListener("click", copyExport);
  $("#pub-download").addEventListener("click", downloadExport);
  $("#pub-reset").addEventListener("click", resetAll);

  $("#view-site").addEventListener("click", (e) => {
    e.preventDefault();
    window.open("./index.html", "_blank");
  });
}

/* ---------- boot ---------- */
function boot() {
  bindEvents();
  setTab("overview");
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
