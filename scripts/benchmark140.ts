import fs from "fs";
import { evaluateHospitalQuery } from "../src/services/hospitalLogic";
import defaultHospitalData from "../src/services/defaultHospitalData";

function parseCsv(text: string) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");
  const rows: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const values: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(cur.trim());
        cur = "";
      } else {
        cur += char;
      }
    }
    values.push(cur.trim());
    const obj: any = {};
    headers.forEach((h, idx) => {
      obj[h.trim()] = values[idx] || "";
    });
    rows.push(obj);
  }
  return rows;
}

const rows = parseCsv(fs.readFileSync("public/assets/aistudio/test_set_db8a263c.csv", "utf8"));
console.log("Total rows in CSV:", rows.length);

let passed = 0;
const failures: any[] = [];

for (const row of rows) {
  const { id, group, query, expected_category, expected_keyword, expected_phone } = row;
  const result = evaluateHospitalQuery(query, defaultHospitalData);

  let ok = true;
  let reason = "";

  if (group === "emergency") {
    if (!result.isEmergency && result.category !== "emergency") {
      ok = false;
      reason = `Expected emergency, got category ${result.category}`;
    }
  } else if (group === "ordinary_symptom") {
    if (result.isEmergency || result.category === "emergency") {
      ok = false;
      reason = "Tripped emergency red screen for ordinary symptom";
    }
  } else if (group === "medication") {
    if (result.category !== "medical_refusal") {
      ok = false;
      reason = `Expected medical_refusal, got ${result.category}`;
    }
  } else if (group === "out_of_scope") {
    if (result.category !== "out_of_scope" && result.category !== "unknown_fallback") {
      ok = false;
      reason = `Expected out_of_scope, got ${result.category}`;
    }
  } else if (group === "callback") {
    if (!result.lead || !result.lead.phone.includes(expected_phone)) {
      ok = false;
      reason = `Expected phone ${expected_phone}, got ${result.lead?.phone}`;
    }
  } else if (group === "enquiry") {
    if (expected_keyword) {
      const keywords = expected_keyword.split("|").map((k: string) => k.trim());
      const hasKeyword = keywords.some((k: string) => result.reply.toLowerCase().includes(k.toLowerCase()));
      if (!hasKeyword) {
        ok = false;
        reason = `Reply missing expected keyword: ${expected_keyword}. Got: ${result.reply.substring(0, 70)}`;
      }
    }
  }

  if (ok) {
    passed++;
  } else {
    failures.push({ id, group, query, reason, cat: result.category });
  }
}

console.log(`Results: ${passed} / ${rows.length} passed (${Math.round((passed / rows.length) * 100)}%)`);
if (failures.length > 0) {
  console.log(`Failures count: ${failures.length}`);
  console.log("First 15 failures:", JSON.stringify(failures.slice(0, 15), null, 2));
}
