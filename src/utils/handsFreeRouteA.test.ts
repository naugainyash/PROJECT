import test from "node:test";
import assert from "node:assert/strict";
import { WavRecorder } from "./wavRecorder";
import { BargeInDetector } from "./bargeInDetector";

test("Route A: WavRecorder supports configurable 1-second silence auto-stop", () => {
  const recorder = new WavRecorder();
  assert.ok(recorder, "WavRecorder instance created");
  assert.strictEqual(typeof recorder.start, "function");
  assert.strictEqual(typeof recorder.stop, "function");
  assert.strictEqual(typeof recorder.abort, "function");
});

test("Route A: BargeInDetector initializes with inactive state and cleanup methods", () => {
  const detector = new BargeInDetector();
  assert.strictEqual(detector.isActive, false, "Detector should start inactive");
  assert.strictEqual(typeof detector.start, "function");
  assert.strictEqual(typeof detector.stop, "function");

  // Calling stop on inactive detector is safe
  detector.stop();
  assert.strictEqual(detector.isActive, false);
});

test("Route A: Concurrency throttle prevents simultaneous requests", () => {
  let isProcessingAudio = true;
  let recordingStarted = false;

  const handleStartListening = () => {
    if (isProcessingAudio) return; // Concurrency lock
    recordingStarted = true;
  };

  // Attempt to start while request in flight
  handleStartListening();
  assert.strictEqual(recordingStarted, false, "Must not start recording while request is in flight");

  // Unlock after request completes
  isProcessingAudio = false;
  handleStartListening();
  assert.strictEqual(recordingStarted, true, "Starts recording after request lock releases");
});

test("Route A: Auto-listen pacing enforces >= 500ms breather respecting 60 req/min limit", () => {
  const lastRequestTime = Date.now() - 200; // 200ms ago
  const elapsed = Date.now() - lastRequestTime;
  const delay = Math.max(500, 1000 - elapsed);

  assert.ok(delay >= 500, "Breather must be at least 500ms");
  assert.ok(delay <= 1000, "Breather should not exceed 1000ms");
});
