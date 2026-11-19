/* KAIZEN ₹200 tournament — site logic */

/* ------------------------------------------------------------
   Registered players (from the organizer's list, normalized)
   Formatting notes: names were supplied with odd spacing/order;
   we normalize to a clean "IGN" display and keep the roster
   order as given (1-17).
   ------------------------------------------------------------ */
const PLAYERS = [
  { name: "Royal राजपूत" },
  { name: "Ꭺʀʀᴏᴡ" },
  { name: "MR X. LIVE" },
  { name: "TQG.KAIZEN07" },
  { name: "OFL HITESH" },
  { name: "TG MAFIA" },
  { name: "RizzyTheOG" },
  { name: "TOX1C" },
  { name: "mahendraaa7" },
  { name: "Mvp speedy" },
  { name: "Bewafa" },
  { name: "༒VIKASH-KinG" },
  { name: "GP.J1NW00" },
  { name: "ABHIMANYU1" },
  { name: "7h aura" },
  { name: "Agent ITACHI" },
  { name: "Rock yt." }
];

const MAX_SLOTS = 48;
const FILLED = PLAYERS.length;

const $ = (id) => document.getElementById(id);

/* ---------- render player list ---------- */
function renderPlayers() {
  const ol = $("player-list");
  PLAYERS.forEach((p, i) => {
    const li = document.createElement("li");
    li.style.animationDelay = (i * 45) + "ms";
    const num = document.createElement("span");
    num.className = "num";
    num.textContent = String(i + 1).padStart(2, "0");
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = p.name;
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = "IN";
    li.append(num, name, tag);
    ol.appendChild(li);
  });
  $("players-count").textContent = `${FILLED} of ${MAX_SLOTS} slots filled`;
}

/* ---------- slot counter ---------- */
function initSlots() {
  const left = MAX_SLOTS - FILLED;
  const pct = (FILLED / MAX_SLOTS) * 100;
  $("slots-left").textContent = left;
  $("slots-fill").style.width = pct + "%";
}

/* ---------- register button: pre-fill WhatsApp ---------- */
function initRegister() {
  const wa = "https://wa.me/918217816606";
  const msg = encodeURIComponent(
    "Hi! I want to register for the ₹200 Free Fire MAX BR SOLO tournament. My in-game name is: "
  );
  document.querySelectorAll(".btn[href^='https://wa.me']").forEach((btn) => {
    btn.href = wa + "?text=" + msg;
  });
}

/* ---------- motion: reveal as you scroll ---------- */
function initReveal() {
  const items = document.querySelectorAll(".fact, .point-card, .player-list li, .slots-inner");
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  items.forEach((el) => io.observe(el));
}

/* mark JS as active up front so CSS only hides when JS works */
document.documentElement.classList.add("js");

document.addEventListener("DOMContentLoaded", () => {
  renderPlayers();
  initSlots();
  initRegister();
  initReveal();
});