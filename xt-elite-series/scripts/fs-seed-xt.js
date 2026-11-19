#!/usr/bin/env node
/* Seed Firestore `tournament/xt-elite-series` with the real XT data.
   Same project as Kaizen (kaizen-tournament), same admin key, separate doc.
   Usage: node scripts/fs-seed-xt.js */
"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");

const PROJECT = "kaizen-tournament";
const KEY = "AIzaSyBvJMt00Ofwn4cuXR83w4H7AAJPqyYVr3w";
const ADMIN_KEY = "KZSK-9f4c2a7e8b1d6f0c3a9e7b4d2f8c1a";
const DOC = "xt-elite-series";
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

  const put = await request("PATCH", `/tournament/${DOC}`, { fields });
  console.log(`PATCH tournament/${DOC} ->`, put.status);
  if (put.status !== 200) {
    console.log(JSON.stringify(put.body, null, 2).slice(0, 800));
    process.exit(1);
  }

  // Verify read
  const read = await request("GET", `/tournament/${DOC}`);
  console.log(`GET tournament/${DOC} ->`, read.status);
  if (read.status === 200 && read.body.fields) {
    const f = read.body.fields;
    console.log("title:", f.tournament && f.tournament.mapValue.fields.title.stringValue);
    console.log("groups:", f.groups && Object.keys(f.groups.mapValue.fields).join(","));
    const teamsLen = (k) => f.groups && f.groups.mapValue.fields[k].mapValue.fields.teams.arrayValue.values
      ? f.groups.mapValue.fields[k].mapValue.fields.teams.arrayValue.values.length : 0;
    console.log("group A teams:", teamsLen("A"));
    console.log("group B teams:", teamsLen("B"));
    console.log("group C teams:", teamsLen("C"));
    console.log("adminKey present:", !!f.adminKey);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
