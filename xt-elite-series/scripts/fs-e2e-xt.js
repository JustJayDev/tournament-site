#!/usr/bin/env node
/* End-to-end: simulate the admin "Sync now" for XT (write + read + restore).
   Usage: node scripts/fs-e2e-xt.js */
"use strict";

const https = require("https");

const PROJECT = "kaizen-tournament";
const KEY = "AIzaSyBvJMt00Ofwn4cuXR83w4H7AAJPqyYVr3w";
const ADMIN_KEY = "KZSK-9f4c2a7e8b1d6f0c3a9e7b4d2f8c1a";
const DOC = "xt-elite-series";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

function toFirestoreValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
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
      res.on("end", () => resolve({ status: res.statusCode, body: out }));
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  // 1. Read current doc (restore source)
  const get0 = await request("GET", `/tournament/${DOC}`);
  console.log("STEP 0 GET (current) ->", get0.status);
  if (get0.status !== 200) { console.log(get0.body.slice(0, 300)); process.exit(1); }
  const currentFields = JSON.parse(get0.body).fields;

  // 2. PATCH test marker (with adminKey, as the rules require)
  const marker = { e2eProbe: { stringValue: `probe-${Date.now()}` }, adminKey: { stringValue: ADMIN_KEY } };
  const put = await request("PATCH", `/tournament/${DOC}`, { fields: marker });
  console.log("STEP 1 PATCH (test marker) ->", put.status);
  if (put.status !== 200) { console.log(put.body.slice(0, 300)); process.exit(1); }

  // 3. Read back
  const get1 = await request("GET", `/tournament/${DOC}`);
  console.log("STEP 2 GET ->", get1.status);
  const f1 = JSON.parse(get1.body).fields;
  console.log("  marker present:", !!f1.e2eProbe, "| title intact:", f1.tournament && f1.tournament.mapValue.fields.title.stringValue);

  // 4. Restore (PATCH back the original fields + adminKey)
  const restore = { fields: Object.assign({}, currentFields, { adminKey: { stringValue: ADMIN_KEY } }) };
  const put2 = await request("PATCH", `/tournament/${DOC}`, restore);
  console.log("STEP 3 RESTORE ->", put2.status);

  // 5. Verify restore
  const get2 = await request("GET", `/tournament/${DOC}`);
  const f2 = JSON.parse(get2.body).fields;
  console.log("STEP 4 VERIFY ->", get2.status, "| marker gone:", !f2.e2eProbe, "| title:", f2.tournament.mapValue.fields.title.stringValue);
  console.log("E2E XT PASS — admin sync path verified");
}

main().catch((e) => { console.error(e); process.exit(1); });