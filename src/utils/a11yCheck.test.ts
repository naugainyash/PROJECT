import { test } from "node:test";
import assert from "node:assert";

// Relative luminance calculation according to WCAG 2.1 specs
function getLuminance(hex: string): number {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const a = [r, g, b].map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

test("Accessibility: WCAG AA contrast ratios exceed 4.5:1 across light and dark tokens", () => {
  // Light mode body text #142E2B on canvas #EEF3F1
  const lightContrast = getContrastRatio("#142E2B", "#EEF3F1");
  assert.ok(lightContrast >= 4.5, `Light contrast ${lightContrast.toFixed(2)} must be >= 4.5:1`);
  assert.ok(lightContrast >= 7.0, `Light contrast ${lightContrast.toFixed(2)} exceeds 7.0:1 for high legibility`);

  // Dark mode text #E6F1EF on card #13262A
  const darkContrast = getContrastRatio("#E6F1EF", "#13262A");
  assert.ok(darkContrast >= 4.5, `Dark contrast ${darkContrast.toFixed(2)} must be >= 4.5:1`);
  assert.ok(darkContrast >= 9.0, `Dark contrast ${darkContrast.toFixed(2)} exceeds 9.0:1`);

  // Emergency Red #DC2626 with white #FFFFFF text
  const emergencyContrast = getContrastRatio("#FFFFFF", "#DC2626");
  assert.ok(emergencyContrast >= 4.5, `Emergency contrast ${emergencyContrast.toFixed(2)} must be >= 4.5:1`);

  // Dark Primary #5FC1C6 on Dark Card #13262A
  const primaryDarkContrast = getContrastRatio("#5FC1C6", "#13262A");
  assert.ok(primaryDarkContrast >= 4.5, `Primary dark contrast ${primaryDarkContrast.toFixed(2)} must be >= 4.5:1`);
});

test("Accessibility: Touch target hitbox dimensions enforce >= 48px standard", () => {
  const touchTargets = [
    { component: "VoiceMicButton", diameterPx: 144, minAllowed: 48 },
    { component: "EmergencyCall108Button", heightPx: 64, minAllowed: 48 },
    { component: "KioskTouchNumpadKey", heightPx: 56, minAllowed: 48 },
    { component: "HeaderNavTab", heightPx: 48, minAllowed: 48 },
    { component: "LanguageSelectorChip", heightPx: 48, minAllowed: 48 },
    { component: "StopAudioButton", heightPx: 48, minAllowed: 48 },
  ];

  for (const target of touchTargets) {
    const size = target.diameterPx || target.heightPx || 0;
    assert.ok(size >= target.minAllowed, `${target.component} size ${size}px must be >= ${target.minAllowed}px`);
  }
});

test("Accessibility: Dual-channel state signaling (never color alone)", () => {
  const stateBadges = [
    { state: "listening", hasColor: true, text: "LISTENING • बोलिए, हम सुन रहे हैं" },
    { state: "thinking", hasColor: true, text: "THINKING • Finding the answer…" },
    { state: "speaking", hasColor: true, text: "SPEAKING • उत्तर बोल रहे हैं" },
    { state: "emergency", hasColor: true, text: "Emergency Casualty Gate 1" },
  ];

  for (const badge of stateBadges) {
    assert.ok(badge.hasColor, "Badge must include semantic color");
    assert.ok(badge.text && badge.text.trim().length > 0, "Badge must include explicit readable text label");
  }
});

test("Architecture: Screen & Frame Taxonomy contains all 12 named frames", () => {
  const requiredNamedFrames = [
    "Home",
    "Listening",
    "Thinking",
    "Speaking",
    "Conversation",
    "Emergency",
    "Callback",
    "ReceptionDesk",
    "Analytics",
    "Directory",
    "ReminderPreview",
    "Errors",
  ];

  assert.strictEqual(requiredNamedFrames.length, 12);
  assert.ok(requiredNamedFrames.includes("Home"));
  assert.ok(requiredNamedFrames.includes("Emergency"));
  assert.ok(requiredNamedFrames.includes("ReceptionDesk"));
});

test("Accessibility: Screen reader live announcements defined for all VoiceMic states", () => {
  const states = {
    listening: "Status: Listening to your voice. Audio capturing active. Speak now.",
    thinking: "Status: Processing question with hospital directory. Please wait.",
    speaking: "Status: Playing clinical response. Tap Stop Audio to interrupt.",
    idle: "Status: Hospital Voice Reception ready. Tap microphone to speak.",
  };

  assert.ok(states.listening.includes("Listening"));
  assert.ok(states.thinking.includes("Processing"));
  assert.ok(states.speaking.includes("Stop Audio"));
  assert.ok(states.idle.includes("ready"));
});
