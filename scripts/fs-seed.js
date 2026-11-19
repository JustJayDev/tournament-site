#!/usr/bin/env node
/* Seed Firestore `tournament/current` with the real tournament-data.json.
   Also deletes probe/test docs left over from rule testing.
   Usage: node scripts/fs-seed.js */
"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");

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
  const dataPath = path.join(__dirname, "..", "tournament-data.json");
  const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

  // Build the document fields: export + adminKey
  const fields = { adminKey: { stringValue: ADMIN_KEY } };
  for (const [k, v] of Object.entries(data)) fields[k] = toFirestoreValue(v);

  const put = await request("PATCH", "/tournament/current", { fields });
  console.log("PATCH tournament/current ->", put.status);
  if (put.status !== 200) {
    console.log(JSON.stringify(put.body, null, 2).slice(0, 800));
    process.exit(1);
  }

  // Clean up probe docs
  for (const doc of ["probe", "evil", "evil2"]) {
    const del = await request("DELETE", `/tournament/${doc}`);
    console.log(`DELETE ${doc} ->`, del.status);
  }

  // Verify read
  const read = await request("GET", "/tournament/current");
  console.log("GET tournament/current ->", read.status);
  if (read.status === 200 && read.body.fields) {
    const fieldsOut = read.body.fields;
    console.log("players:", fieldsOut.players && fieldsOut.players.arrayValue.values.length);
    console.log("matches:", fieldsOut.matches && fieldsOut.matches.arrayValue.values.length);
    console.log("standings:", fieldsOut.standings && fieldsOut.standings.arrayValue.values.length);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });