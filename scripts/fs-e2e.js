#!/usr/bin/env node
/* End-to-end: simulate the admin "Sync now" button via Firestore REST.
   Write a test marker, read it back, then restore the real data. */
"use strict";

const https = require("https");
const fs = require("fs");
const path = require("path");

const PROJECT = "kaizen-tournament";
const KEY = "AIzaSyBvJMt00Ofwn4cuXR83w4H7AAJPqyYVr3w";
const ADMIN_KEY = "KZSK-9f4c2a7e8b1d6f0c3a9e7b4d2f8c1a";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

function toFirestoreValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") {
    if (Number.isInteger(v)) return { integerValue: String(v) };
    return { doubleValue: v };
  }
  if (typeof v === "string") return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFirestoreValue) } };
  if (typeof v === "object") {
    const m = {};
    for (const [k, val] of Object.entries(v)) m[k] = toFirestoreValue(val);
    return { mapValue: { fields: m } };
  }
  throw new Error("Unsupported value: " + v);
}

function request(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const url = `${BASE}${urlPath}?key=${KEY}`;
    const data = body ? JSON.stringify(body) : null;
    const req = https.request(url, {
      method,
      headers: data ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } : {},
    }, (res) => {
      let out = "";
      res.on("data", (c) => (out += c));
      res.on("end", () => {
        let parsed = null;
        try { parsed = JSON.parse(out); } catch { parsed = out; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  // 1. Write a test marker (simulates admin Sync)
  const testFields = {
    adminKey: { stringValue: ADMIN_KEY },
    _e2e_test: { booleanValue: true },
    players: { arrayValue: { values: [{ stringValue: "E2E-TEST" }] } },
  };
  const put = await request("PATCH", "/tournament/current", { fields: testFields });
  console.log("STEP 1 PATCH (test marker) ->", put.status);
  if (put.status !== 200) { console.log(JSON.stringify(put.body).slice(0, 300)); process.exit(1); }

  // 2. Read back and verify
  const read = await request("GET", "/tournament/current");
  console.log("STEP 2 GET ->", read.status);
  if (read.status === 200) {
    const f = read.body.fields;
    console.log("  players:", f.players.arrayValue.values.map(v => v.stringValue).join(","));
    console.log("  _e2e_test:", f._e2e_test.booleanValue);
    console.log("  adminKey present:", !!f.adminKey);
    if (f._e2e_test.booleanValue !== true) { console.log("FAIL: marker not found"); process.exit(1); }
    if (!f.players.arrayValue.values.some(v => v.stringValue === "E2E-TEST")) { console.log("FAIL: test player missing"); process.exit(1); }
    console.log("  read-back VERIFIED");
  } else {
    console.log("FAIL: read status", read.status);
    process.exit(1);
  }

  // 3. Restore real data
  const dataPath = path.join(__dirname, "..", "tournament-data.json");
  const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const realFields = { adminKey: { stringValue: ADMIN_KEY } };
  for (const [k, v] of Object.entries(data)) realFields[k] = toFirestoreValue(v);
  const restore = await request("PATCH", "/tournament/current", { fields: realFields });
  console.log("STEP 3 PATCH (restore real) ->", restore.status);
  if (restore.status !== 200) { console.log(JSON.stringify(restore.body).slice(0, 300)); process.exit(1); }

  // 4. Final verify: no test marker, 17 players
  const finalRead = await request("GET", "/tournament/current");
  const ff = finalRead.body.fields;
  const arrLen = (a) => (a && a.arrayValue && a.arrayValue.values ? a.arrayValue.values.length : 0);
  console.log("STEP 4 final ->", finalRead.status);
  console.log("  players:", arrLen(ff.players));
  console.log("  _e2e_test gone:", !ff._e2e_test);
  console.log("  title:", ff.tournament.mapValue.fields.title.stringValue);
  console.log("  status:", ff.tournament.mapValue.fields.status.stringValue);
  if (ff._e2e_test || arrLen(ff.players) !== 17) { console.log("FAIL: restore not clean"); process.exit(1); }
  console.log("E2E PASS — admin-style publish + readback + restore all good.");
}

main().catch((e) => { console.error(e); process.exit(1); });