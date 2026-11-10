import test from "node:test";
import assert from "node:assert/strict";
import {
  playEarcon,
  setEarconSoundEnabled,
  isEarconSoundEnabled,
} from "./earcon";

test("Earcon sound state toggles correctly", () => {
  setEarconSoundEnabled(true);
  assert.equal(isEarconSoundEnabled(), true);

  setEarconSoundEnabled(false);
  assert.equal(isEarconSoundEnabled(), false);

  // Calling playEarcon while disabled should execute safely without throwing
  assert.doesNotThrow(() => {
    playEarcon("listenStart");
    playEarcon("completed");
  });

  setEarconSoundEnabled(true);
  assert.equal(isEarconSoundEnabled(), true);
});

test("playEarcon handles all cue types gracefully in headless/mock environment", () => {
  const cues = ["listenStart", "listenStop", "completed", "actionSuccess", "alertNotice"] as const;
  for (const cue of cues) {
    assert.doesNotThrow(() => {
      playEarcon(cue);
    });
  }
});
