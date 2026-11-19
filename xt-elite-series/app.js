/* XT Esports — ELITE SERIES S1 site logic
   The site displays the official XT images directly (poster,
   point tables, points system, rules). This script only wires
   the live pill, today strip, group C line and finals date. */

let TOURNAMENT = {
  title: "ELITE SERIES S1",
  organizer: "XT Esports",
  status: "live",
  schedule: [],
  finals: { label: "Finals", date: "", time: "", status: "tbd" },
  stream: { channel: "XT Esports", url: "https://youtube.com/@team_xt_dory", time: "5:30 PM" },
};

function applyTournamentData(data) {
  if (!data || !data.tournament) return;
  TOURNAMENT = Object.assign({}, TOURNAMENT, data.tournament);
}

const $ = (id) => document.getElementById(id);

function renderPill() {
  const pill = $("live-pill");
  if (!pill) return;
  pill.textContent = { live: "LIVE", upcoming: "UPCOMING", completed: "COMPLETED" }[TOURNAMENT.status] || "LIVE";
  pill.className = "live-pill " + (TOURNAMENT.status || "live");
}

function renderTodayStrip() {
  const strip = $("today-strip");
  const schedule = TOURNAMENT.schedule || [];
  const today = schedule.find((s) => s.status === "today") || schedule.find((s) => s.status === "live");
  if (!strip || !today) {
    if (strip) strip.hidden = true;
    return;
  }
  strip.hidden = false;
  const info = $("today-info");
  if (info) info.textContent = `${today.label} · ${today.date} · ${today.time}`;
  const link = $("stream-link");
  if (link && TOURNAMENT.stream.url) link.href = TOURNAMENT.stream.url;
}

function renderGroupC() {
  const line = $("groupc-line");
  if (!line) return;
  const schedule = TOURNAMENT.schedule || [];
  const g = schedule.find((s) => s.id === "grp-c");
  if (g) line.textContent = `${g.label} · ${g.date} · ${g.time}`;
  const badge = $("groupc-badge");
  if (badge && g) {
    badge.textContent = { done: "DONE", today: "TODAY", upcoming: "UPCOMING", tbd: "TBD" }[g.status] || g.status;
    badge.className = "doc-badge " + (g.status || "");
  }
  const wrap = $("groupc-teams");
  if (wrap) {
    const teams = (TOURNAMENT.groups && TOURNAMENT.groups.C && TOURNAMENT.groups.C.teams) || [];
    wrap.innerHTML = "";
    if (teams.length) {
      teams.forEach((t, i) => {
        const chip = document.createElement("span");
        chip.className = "team-chip" + (t === "TBA" ? " tba" : "");
        chip.textContent = `${i + 1}. ${t}`;
        wrap.appendChild(chip);
      });
      const empty = $("groupc-empty");
      if (empty) empty.hidden = true;
    } else {
      const empty = $("groupc-empty");
      if (empty) empty.hidden = false;
      wrap.hidden = true;
    }
  }
}

function renderFinals() {
  const date = $("finals-date");
  if (!date) return;
  const f = TOURNAMENT.finals || {};
  date.textContent = f.date ? `${f.label || "Finals"}: ${f.date}${f.time ? " · " + f.time : ""}` : "Date to be announced by admin";
}

function renderFooter() {
  const fp = $("footer-text");
  if (fp) fp.textContent = `${TOURNAMENT.organizer} · ${TOURNAMENT.title}`;
}

function initSite() {
  renderPill();
  renderTodayStrip();
  renderGroupC();
  renderFinals();
  renderFooter();
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