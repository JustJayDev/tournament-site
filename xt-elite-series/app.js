/* XT Esports — ELITE SERIES S1 site logic */
/* ---------- defaults (overridden by tournament-data.json / Firestore) ---------- */
let GROUPS = {
  A: { id: "grp-a", label: "Group A", status: "done", teams: [], matches: [], qualifiers: 4 },
  B: { id: "grp-b", label: "Group B", status: "done", teams: [], matches: [], qualifiers: 4 },
  C: { id: "grp-c", label: "Group C", status: "today", teams: [], matches: [], qualifiers: 4 },
};
let TOURNAMENT = {
  title: "ELITE SERIES S1",
  organizer: "XT Esports",
  status: "live",
  prize: { label: "₹500", payouts: { "1": 500 } },
  schedule: [],
  finals: { label: "Finals", date: "", time: "", status: "tbd" },
  points: { kill: 1, placement: [12, 9, 7, 6, 5, 4, 3, 2, 1, 0, 0, 0] },
  tiebreak: "Booyah > Kills > Placement",
  stream: { channel: "XT Esports", url: "https://youtube.com/@XT-SAAZ", time: "5:30 PM" },
  rules: [],
  whatsapp: "",
};

function applyTournamentData(data) {
  if (!data || !data.tournament) return;
  const t = data.tournament;
  TOURNAMENT = Object.assign({}, TOURNAMENT, t);
  if (data.groups) {
    GROUPS = data.groups;
  }
}

/* ---------- standings computation ----------
   If the group ships an authoritative `standings` array (from the
   official point table), use it as-is. Otherwise compute from matches. */
function computeStandings(group) {
  if (group.standings && group.standings.length) {
    return group.standings.slice().sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if ((b.booyah || 0) !== (a.booyah || 0)) return (b.booyah || 0) - (a.booyah || 0);
      return b.kills - a.kills;
    });
  }
  const teams = group.teams || [];
  const matches = group.matches || [];
  const standings = teams.map((team) => ({
    team,
    matches: 0,
    wins: 0,
    kills: 0,
    points: 0,
    placements: [],
  }));
  const byTeam = {};
  standings.forEach((s, i) => (byTeam[s.team] = s));

  matches.forEach((m) => {
    const results = m.results || [];
    results.forEach((r) => {
      const s = byTeam[r.team];
      if (!s) return;
      s.matches += 1;
      const place = Number(r.placement);
      const kills = Number(r.kills) || 0;
      const placePoints = TOURNAMENT.points.placement[place - 1] || 0;
      s.points += placePoints + kills * (TOURNAMENT.points.kill || 1);
      s.kills += kills;
      s.placements.push(place);
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

/* ---------- render ---------- */
const $ = (id) => document.getElementById(id);

function renderHero() {
  const t = TOURNAMENT;
  const sub = $("hero-sub");
  if (sub) sub.textContent = `${t.organizer} — Group stage, top 4 per group qualify`;
  const prize = $("prize-value");
  if (prize) prize.textContent = t.prize.label;
  const fmt = $("format-value");
  if (fmt) fmt.textContent = t.format || "Groups → Finals";
  const stream = $("stream-value");
  if (stream) stream.textContent = t.stream.time;
  const pill = $("live-pill");
  if (pill) {
    pill.textContent = { live: "LIVE", upcoming: "UPCOMING", completed: "COMPLETED" }[t.status] || "LIVE";
    pill.className = "live-pill " + (t.status || "live");
  }
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
  if (link && TOURNAMENT.stream.url) {
    link.href = TOURNAMENT.stream.url;
  }
}

function renderGroups() {
  const wrap = $("groups-wrap");
  if (!wrap) return;
  wrap.innerHTML = "";
  Object.keys(GROUPS).forEach((key) => {
    const g = GROUPS[key];
    if (!g) return;
    const standings = computeStandings(g);
    const section = document.createElement("section");
    section.className = "group card";

    const head = document.createElement("div");
    head.className = "group-head";
    const title = document.createElement("h2");
    title.className = "group-title";
    title.textContent = g.label;
    const status = document.createElement("span");
    status.className = "group-status " + (g.status || "");
    status.textContent = { done: "Done", today: "Today", upcoming: "Upcoming", tbd: "TBD" }[g.status] || g.status || "Upcoming";
    head.append(title, status);

    const table = document.createElement("div");
    table.className = "standings";

    const header = document.createElement("div");
    header.className = "s-row s-head";
    ["#", "Team", "MP", "K", "B", "Pts"].forEach((h, i) => {
      const c = document.createElement("span");
      c.className = i === 1 ? "s-team" : "s-num";
      c.textContent = h;
      header.appendChild(c);
    });
    table.appendChild(header);

    if (standings.length) {
      standings.forEach((s, i) => {
        const row = document.createElement("div");
        row.className = "s-row" + (i < g.qualifiers ? " qual" : "");
        const rank = document.createElement("span");
        rank.className = "s-num s-rank";
        rank.textContent = String(i + 1);
        const team = document.createElement("span");
        team.className = "s-team";
        team.textContent = s.team;
        const played = document.createElement("span");
        played.className = "s-num";
        played.textContent = s.dnp ? "—" : (s.mp || s.matches || 0);
        const kills = document.createElement("span");
        kills.className = "s-num";
        kills.textContent = s.dnp ? "—" : (s.kills || 0);
        const booyah = document.createElement("span");
        booyah.className = "s-num";
        booyah.textContent = s.dnp ? "—" : (s.booyah || 0);
        const pts = document.createElement("span");
        pts.className = "s-num s-pts";
        pts.textContent = s.dnp ? "DNP" : s.points;
        row.append(rank, team, played, kills, booyah, pts);
        table.appendChild(row);
      });
    } else {
      const empty = document.createElement("div");
      empty.className = "s-empty";
      empty.textContent = "Teams will be announced before match time";
      table.appendChild(empty);
    }

    const note = document.createElement("p");
    note.className = "group-note";
    note.textContent = `Top ${g.qualifiers} qualify for finals`;
    section.append(head, table, note);
    wrap.appendChild(section);
  });
}

function renderQualified() {
  const box = $("qualified-teams");
  if (!box) return;
  box.innerHTML = "";
  let anyQualified = false;
  Object.keys(GROUPS).forEach((key) => {
    const g = GROUPS[key];
    if (!g || !g.qualifiers) return;
    const standings = computeStandings(g);
    standings.slice(0, g.qualifiers).forEach((s, i) => {
      anyQualified = true;
      const chip = document.createElement("span");
      chip.className = "qual-team";
      const rank = document.createElement("span");
      rank.className = "q-rank";
      rank.textContent = `${g.label}${i + 1}`;
      const name = document.createTextNode(" " + s.team);
      chip.append(rank, name);
      box.appendChild(chip);
    });
  });
  if (!anyQualified) {
    const empty = document.createElement("span");
    empty.className = "qual-team";
    empty.textContent = "Awaiting group results";
    box.appendChild(empty);
  }
}

function renderFinals() {
  const date = $("finals-date");
  if (!date) return;
  const f = TOURNAMENT.finals || {};
  if (f.date) {
    date.textContent = `${f.label || "Finals"}: ${f.date}${f.time ? " · " + f.time : ""}`;
  } else {
    date.textContent = "Date to be announced by admin";
  }
}

function renderPoints() {
  const box = $("points-table");
  if (!box) return;
  box.innerHTML = "";
  const p = TOURNAMENT.points;
  const header = document.createElement("div");
  header.className = "pt-row pt-head";
  header.innerHTML = "<span>Place</span><span>Points</span>";
  box.appendChild(header);
  p.placement.forEach((pts, i) => {
    const row = document.createElement("div");
    row.className = "pt-row";
    const place = document.createElement("span");
    place.textContent = i + 1;
    const val = document.createElement("span");
    val.textContent = pts;
    row.append(place, val);
    box.appendChild(row);
  });
  const killRow = document.createElement("div");
  killRow.className = "pt-row pt-kill";
  killRow.innerHTML = `<span>Per kill</span><span>+${p.kill}</span>`;
  box.appendChild(killRow);
  const tb = $("tiebreak");
  if (tb) tb.textContent = "Tiebreak: " + (TOURNAMENT.tiebreak || "Booyah > Kills > Placement");
}

function renderRules() {
  const list = $("rules-list");
  if (!list) return;
  list.innerHTML = "";
  (TOURNAMENT.rules || []).forEach((r) => {
    const li = document.createElement("li");
    li.textContent = r;
    list.appendChild(li);
  });
}

function renderFooter() {
  const t = TOURNAMENT;
  const fp = $("footer-text");
  if (fp) fp.textContent = `${t.organizer} · ${t.title}`;
  const fl = $("footer-link");
  if (fl) {
    fl.textContent = t.stream.channel;
    fl.href = t.stream.url;
  }
}

/* ---------- boot ---------- */
function initSite() {
  renderHero();
  renderTodayStrip();
  renderQualified();
  renderGroups();
  renderFinals();
  renderPoints();
  renderRules();
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