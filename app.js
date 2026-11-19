/* KAIZEN ₹200 tournament — site logic (v3 logo-true palette) */

/* ---------- tournament data (from admin panel export) ---------- */
/* Defaults are the current known roster; a tournament-data.json
   file can override them, and the admin panel generates it. */
let PLAYERS = [
  "Royal राजपूत", "Ꭺʀʀᴏᴡ", "MR X. LIVE", "TQG.KAIZEN07",
  "OFL HITESH", "TG MAFIA", "RizzyTheOG", "TOX1C",
  "mahendraaa7", "Mvp speedy", "Bewafa", "༒VIKASH-KinG",
  "GP.J1NW00", "ABHIMANYU1", "7h aura", "Agent ITACHI", "Rock yt."
];

let MAX_SLOTS = 48;
let FILLED = PLAYERS.length;
let PAYOUTS = { "1": 100, "2": 60, "3": 40 };
let KILL_POINTS = 1;
let PLACEMENT_POINTS = [12, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0];
let WA_NUMBER = "918217816606";
let FOOTER_TEXT = "KAIZEN Esports · Free Fire MAX";
let FOOTER_LINK = "https://youtube.com/@kaizenff.official";
let FOOTER_LINK_LABEL = "KaizenFF";
let SITE_STATUS = "live";

function applyTournamentData(data) {
  if (!data || !data.tournament) return;
  PLAYERS = Array.isArray(data.players) ? data.players : PLAYERS;
  const t = data.tournament;
  if (t.slots && t.slots.max) MAX_SLOTS = t.slots.max;
  if (t.prize) {
    if (t.prize.label) {
      const heroTitle = document.querySelector(".hero h1");
      if (heroTitle) heroTitle.textContent = t.prize.label + " Solo";
      document.title = t.prize.label + " Solo — Live Scoreboard";
    }
    if (t.prize.payouts) PAYOUTS = t.prize.payouts;
  }
  if (t.points) {
    if (t.points.kill != null) KILL_POINTS = t.points.kill;
    if (Array.isArray(t.points.placement)) PLACEMENT_POINTS = t.points.placement;
  }
  if (t.whatsapp) WA_NUMBER = t.whatsapp;
  if (t.footer) {
    if (t.footer.text) FOOTER_TEXT = t.footer.text;
    if (t.footer.link) FOOTER_LINK = t.footer.link;
    if (t.footer.label) FOOTER_LINK_LABEL = t.footer.label;
  }
  if (t.status) SITE_STATUS = t.status;
  FILLED = PLAYERS.length;

  // apply footer + status
  const footerP = document.querySelector(".site-footer p");
  if (footerP) footerP.textContent = FOOTER_TEXT;
  const footerLink = document.querySelector(".footer-note a");
  if (footerLink) {
    footerLink.textContent = FOOTER_LINK_LABEL;
    footerLink.href = FOOTER_LINK;
  }
  const liveLabel = document.getElementById("live-label");
  if (liveLabel) {
    const map = { live: "LIVE", upcoming: "UPCOMING", completed: "COMPLETED" };
    liveLabel.textContent = map[SITE_STATUS] || "LIVE";
  }
  const subsidy = document.querySelector(".hero-stats .stat:nth-child(2) .stat-value");
  if (subsidy) subsidy.textContent = t.prize.label || "₹200";
}

const $ = (id) => document.getElementById(id);
/* ---------- player list ---------- */
function renderPlayers() {
  const list = $("player-list");
  if (!list) return;
  list.innerHTML = "";
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
  const wa = "https://wa.me/" + WA_NUMBER;
  const msg = encodeURIComponent(
    "Hi! I want to register for the ₹200 Free Fire MAX BR SOLO tournament. My in-game name is: "
  );
  document.querySelectorAll(".btn[href^='https://wa.me']").forEach((btn) => {
    btn.href = wa + "?text=" + msg;
  });
}

/* ---------- boot ---------- */
function initSite() {
  renderPlayers();
  initSlots();
  initRegister();
}

document.addEventListener("DOMContentLoaded", () => {
  initSite();
  fetch("tournament-data.json")
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (data) {
        applyTournamentData(data);
        initSite();
      }
    })
    .catch(() => {});
});
