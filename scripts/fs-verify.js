#!/usr/bin/env node
/* Verify the Firestore tournament/current doc reads back correctly. */
"use strict";

const https = require("https");

const PROJECT = "kaizen-tournament";
const KEY = "AIzaSyBvJMt00Ofwn4cuXR83w4H7AAJPqyYVr3w";
const URL = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/tournament/current?key=${KEY}`;

https.get(URL, (res) => {
  let out = "";
  res.on("data", (c) => (out += c));
  res.on("end", () => {
    console.log("HTTP", res.statusCode);
    if (res.statusCode !== 200) {
      console.log(out.slice(0, 500));
      process.exit(1);
    }
    const f = JSON.parse(out).fields;
    console.log("players:", f.players.arrayValue.values.length);
    const arrLen = (a) => (a && a.arrayValue && a.arrayValue.values ? a.arrayValue.values.length : 0);
    console.log("matches:", arrLen(f.matches));
    console.log("standings:", arrLen(f.standings));
    const t = f.tournament.mapValue.fields;
    console.log("title:", t.title.stringValue);
    console.log("status:", t.status.stringValue);
    console.log("slots max:", t.slots.mapValue.fields.max.integerValue);
    console.log("slots filled:", t.slots.mapValue.fields.filled.integerValue);
    console.log("prize label:", t.prize.mapValue.fields.label.stringValue);
    console.log("whatsapp:", t.whatsapp.stringValue);
    console.log("footer label:", t.footer.mapValue.fields.label.stringValue);
    console.log("adminKey present:", !!f.adminKey);
    console.log("first player:", f.players.arrayValue.values[0].stringValue);
  });
}).on("error", (e) => { console.error(e); process.exit(1); });