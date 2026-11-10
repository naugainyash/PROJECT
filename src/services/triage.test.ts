import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { classifyTriage, triageReply } from "./triage";
import { checkEmergency } from "./hospitalLogic";

const hospital = JSON.parse(fs.readFileSync("./hospital_data.json", "utf-8"));

const NEVER_EMERGENCY = [
  "stomach pain",
  "I have stomach pain",
  "mere pet me dard hai",
  "पेट में दर्द है",
  "headache",
  "back pain",
  "knee pain",
  "tooth pain",
  "fever since morning",
  "I have a cold and cough",
  "gum bleeding checkup appointment",
  "I read about trauma in a book",
  "my father had a heart attack last year",
  "family history of stroke",
  "food poisoning last week, need appointment",
  "bukhar hai",
  "सिरदर्द है",
];

const MUST_EMERGENCY = [
  "my father has chest pain",
  "mere pitaji ko dil ka daura aaya hai",
  "baby is not breathing",
  "my child swallowed poison",
  "snake bite",
  "he is having a seizure",
  "I took an overdose",
  "heavy bleeding wont stop",
  "ambulance chahiye",
  "saans phool rahi hai",
  "he is unconscious",
  "सीने में दर्द है",
  "साँप ने काट लिया",
  "I just had an accident",
  "stroke, face drooping",
];

test("ordinary symptoms never raise the red emergency screen", () => {
  for (const q of NEVER_EMERGENCY) {
    assert.notEqual(classifyTriage(q), "emergency", q);
    assert.equal(checkEmergency(q, "en-IN"), null, q);
  }
});

test("true red flags still raise the emergency", () => {
  for (const q of MUST_EMERGENCY) {
    assert.equal(classifyTriage(q), "emergency", q);
  }
});

test("stomach pain routes to the physician without alarm", () => {
  const r = triageReply("I have stomach pain", hospital, false)!;
  assert.equal(r.category, "symptom_routing");
  assert.match(r.reply, /Rajesh Sharma/);
  assert.doesNotMatch(r.reply, /emergency/i);
});

test("severe pain gets urgent advice, not the emergency screen", () => {
  assert.equal(classifyTriage("severe stomach pain with vomiting"), "urgent");
  assert.equal(triageReply("severe stomach pain", hospital, false)!.category, "urgent_advice");
});

test("self-harm gets supportive crisis reply", () => {
  assert.equal(classifyTriage("I want to end my life"), "selfharm");
  assert.match(triageReply("mujhe jeena nahi hai", hospital, true)!.reply, /तेली मानस/);
});
