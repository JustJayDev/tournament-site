/* KAIZEN ₹200 tournament — site logic (v3 logo-true palette) */

/* ---------- registered players (from organizer's list) ---------- */
const PLAYERS = [
  "Royal राजपूत", "Ꭺʀʀᴏᴡ", "MR X. LIVE", "TQG.KAIZEN07",
  "OFL HITESH", "TG MAFIA", "RizzyTheOG", "TOX1C",
  "mahendraaa7", "Mvp speedy", "Bewafa", "༒VIKASH-KinG",
  "GP.J1NW00", "ABHIMANYU1", "7h aura", "Agent ITACHI", "Rock yt."
];

/* ---------- standings (from the tournament reference table) ----------
   Demo values until match results come in. First 3 rows are
   placeholders — replace with real totals when matches finish. */
const STANDINGS = [
  { rank: 1, team: "EGL ESP",     kills: 84, total: 93 },
  { rank: 2, team: "Team goat",   kills: 38, total: 67 },
  { rank: 3, team: "THE CODERS",  kills: 28, total: 63 },
  { rank: 4, team: "DECTO ESPORTS", kills: 36, total: 56 },
  { rank: 5, team: "ARIHANT",     kills: 32, total: 56 },
  { rank: 6, team: "TEAM FROXTERS", kills: 24, total: 49 },
  { rank: 7, team: "Falcon eliminator", kills: 24, total: 45 },
  { rank: 8, team: "FOXES",       kills: 26, total: 40 },
  { rank: 9, team: "APEX ESPORTS", kills: 24, total: 37 },
  { rank: 10, team: "REFLEX ESPORTS", kills: 22, total: 36 },
  { rank: 11, team: "TITAN BOLD", kills: 10, total: 25 },
  { rank: 12, team: "RUSHER FC",  kills: 8,  total: 12 }
];

const MAX_SLOTS = 48;
const FILLED = PLAYERS.length;

const $ = (id) => document.getElementById(id);

/* ---------- standings table ---------- */
function renderStandings() {
  const tbody = $("standings-body");
  if (!tbody) return;
  STANDINGS.forEach((t) => {
    const tr = document.createElement("tr");
    tr.className = `rank-${Math.min(t.rank, 3)}`;
    const rank = document.createElement("td");
    const rankBadge = document.createElement("span");
    rankBadge.className = "rank-num";
    rankBadge.textContent = t.rank;
    rank.appendChild(rankBadge);
    const team = document.createElement("td");
    team.textContent = t.team;
    const kills = document.createElement("td");
    kills.className = "kills-num";
    kills.textContent = t.kills;
    const total = document.createElement("td");
    total.className = "total-num";
    total.textContent = t.total;
    tr.append(rank, team, kills, total);
    tbody.appendChild(tr);
  });
}

/* ---------- player list ---------- */
function renderPlayers() {
  const list = $("player-list");
  if (!list) return;
  PLAYERS.forEach((name, i) => {
    const row = document.createElement("div");
    row.className = "player-row";
    const num = document.createElement("span");
    num.className = "num";
    num.textContent = String(i + 1).padStart(2, "0");
    const n = document.createElement("span");
    n.className = "name";
    n.textContent = name;
    const tag = document.createElement("span");
    tag.className = "in-tag";
    tag.textContent = "IN";
    row.append(num, n, tag);
    list.appendChild(row);
  });
  const pc = $("players-count");
  if (pc) pc.textContent = `${FILLED} / ${MAX_SLOTS}`;
}

/* ---------- slot counter ---------- */
function initSlots() {
  const left = MAX_SLOTS - FILLED;
  const pct = (FILLED / MAX_SLOTS) * 100;
  const el = $("slots-left");
  if (el) el.textContent = left;
  const hero = $("hero-slots");
  if (hero) hero.textContent = left;
  const fill = $("slots-fill");
  if (fill) fill.style.width = pct + "%";
  const bar = $("slots-bar");
  if (bar) {
    bar.setAttribute("aria-valuenow", left);
    bar.setAttribute("aria-valuetext", left + " slots left of 48");
  }
}

/* ---------- register button ---------- */
function initRegister() {
  const wa = "https://wa.me/918217816606";
  const msg = encodeURIComponent(
    "Hi! I want to register for the ₹200 Free Fire MAX BR SOLO tournament. My in-game name is: "
  );
  document.querySelectorAll(".btn[href^='https://wa.me']").forEach((btn) => {
    btn.href = wa + "?text=" + msg;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderStandings();
  renderPlayers();
  initSlots();
  initRegister();
});