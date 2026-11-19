/* KAIZEN ₹200 tournament — site logic (v3 logo-true palette) */

/* ---------- registered players (from organizer's list) ---------- */
const PLAYERS = [
  "Royal राजपूत", "Ꭺʀʀᴏᴡ", "MR X. LIVE", "TQG.KAIZEN07",
  "OFL HITESH", "TG MAFIA", "RizzyTheOG", "TOX1C",
  "mahendraaa7", "Mvp speedy", "Bewafa", "༒VIKASH-KinG",
  "GP.J1NW00", "ABHIMANYU1", "7h aura", "Agent ITACHI", "Rock yt."
];

const MAX_SLOTS = 48;
const FILLED = PLAYERS.length;

const $ = (id) => document.getElementById(id);
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
  renderPlayers();
  initSlots();
  initRegister();
});