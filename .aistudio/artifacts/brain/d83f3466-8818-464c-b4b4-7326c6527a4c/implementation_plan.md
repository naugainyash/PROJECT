# AarogyaVani Implementation Plan: Kiosk Numpad, Emergency Frame, Accessibility Checks & Backend Hardening

Revised implementation plan incorporating the full suite of user specifications: comprehensive design tokens in `index.css` with dual dark mode (`.dark` class & `prefers-color-scheme`) and `prefers-reduced-motion` compliance; `VoiceMic.tsx` with 144px button, real audio levels, `aria-live` status announcements, Stop button, preserved transcript, and top-right language chip; dedicated Emergency frame (`#DC2626` background, white text, large Call 108 button); 4 key feedback components; Reception Desk with PIN entry, touch-friendly kiosk on-screen numpad, and inactivity auto-clear; backend audit fixes; and test suite expansion with automated axe accessibility checks.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> - **Typography & Motion Rules**: `index.css` integrates Google Fonts (`Mukta` + `Noto Sans` per Indic script: Devanagari, Tamil, Telugu, Bengali, Kannada) with `line-height: 1.6`. Dark mode supports both explicit `.dark` class and `@media (prefers-color-scheme: dark)`. Aggressive animations automatically respect `@media (prefers-reduced-motion: reduce)`.
> - **Dedicated Emergency Screen/Frame**: A distinct high-urgency view in `#DC2626` with bold white text, large high-contrast **"Call 108"** button (`min-h-[56px]`), Gate 1 directions, and immediate ambulance/casualty triage.
> - **Kiosk On-Screen Touch Numpad**: The Reception Desk provides an on-screen numeric keypad (`1-9, 0, Clear, Enter`) so patients and attendants on touch kiosks can enter phone numbers or staff PINs with zero physical keyboard dependency.
> - **Inactivity Auto-Clear**: Automatically resets unlocked staff PIN session and temporary input fields after 60 seconds of inactivity on touch kiosks to safeguard patient privacy.
> - **Backend Audit Hardening**: Confirms atomic file writes (`atomicWriteJson`), `PORT` env var binding, staff PIN access control (`x-staff-pin`), raw utterance scrubbing, and zero fake baseline counters.
> - **Testing Expansion**: Preserves all 29 existing passing tests, and adds automated accessibility assertion checks (verifying 48px hitboxes, aria labels, WCAG contrast) and screenshot test capabilities.

---

## 1. Design Tokens & CSS Architecture (`src/index.css`)

### A. Color & Surface Tokens
```css
:root {
  --color-primary: #0F5C63;        /* Deep Hospital Teal */
  --color-primary-hover: #0B464B;
  --color-canvas: #EEF3F1;         /* Warm Clinical Mint / Sage */
  --color-card-light: #FFFFFF;
  --color-card-border: #D8E3E0;
  
  --color-amber-listen: #F2B01E;   /* Amber Voice Listening */
  --color-emergency: #DC2626;      /* High-Urgency Emergency Red */
  --color-text-main: #142E2B;      /* Contrast > 7.5:1 */
  --color-text-muted: #3D615B;     /* Contrast > 4.5:1 */

  /* Dark Theme Default */
  --color-dark-bg: #0C1A1C;
  --color-dark-card: #13262A;
  --color-dark-border: #1E3B40;
  --color-dark-primary: #5FC1C6;
  --color-dark-text: #E6F1EF;
}

/* Dual Dark Mode: .dark class and prefers-color-scheme */
@custom-variant dark (&:where(.dark, .dark *));

@media (prefers-color-scheme: dark) {
  :root:not(.light) {
    --color-canvas: var(--color-dark-bg);
    --color-card-light: var(--color-dark-card);
    --color-text-main: var(--color-dark-text);
  }
}

/* Reduced Motion Compliance */
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### B. Font Stacks & Line Heights
- **Display / English**: `"Plus Jakarta Sans", system-ui, sans-serif`
- **Devanagari (Hindi/Marathi)**: `'Mukta', 'Noto Sans Devanagari', sans-serif`, `line-height: 1.6`
- **Tamil**: `'Noto Sans Tamil', sans-serif`, `line-height: 1.6`
- **Telugu**: `'Noto Sans Telugu', sans-serif`, `line-height: 1.6`
- **Bengali**: `'Noto Sans Bengali', sans-serif`, `line-height: 1.6`
- **Kannada**: `'Noto Sans Kannada', sans-serif`, `line-height: 1.6`

---

## 2. Component Blueprint

```
┌────────────────────────────────────────────────────────────────────────┐
│ HEADER: AarogyaVani · Device Selector · Theme Toggle · Audio Earcon    │
├────────────────────────────────────────────────────────────────────────┤
│ EMERGENCY RIBBON / FRAME (#DC2626)                                     │
│ [ 🚨 CASUALTY GATE 1 OPEN 24/7 ] ────── [ LARGE CALL 108 BUTTON ]     │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  SCREEN 1: HOME (Voice Reception Frame)                                │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │ Title: Hospital Voice Reception      [Language: தமிழ் ▼] (TR)│      │
│  │ [DemoBanner: "Demo mode: add your Gnani API key..."]         │      │
│  │ [MicBlockedHelpCard: 3 clear steps when permission blocked]  │      │
│  │                                                              │      │
│  │              ╭─────────────────────────────╮                 │      │
│  │              │  SOFT TEAL AMBIENT RING     │                 │      │
│  │              │  ┌───────────────────────┐  │                 │      │
│  │              │  │ 144px VoiceMicButton  │  │                 │      │
│  │              │  │ (Idle/Listen/Think/   │  │                 │      │
│  │              │  │  Speak with Stop CTA) │  │                 │      │
│  │              │  └───────────────────────┘  │                 │      │
│  │              ╰─────────────────────────────╯                 │      │
│  │                                                              │      │
│  │    aria-live="polite": "Status: Listening to your voice"     │      │
│  │    "बोलने के लिए टैप करें • Tap to Speak" (Equalized 18px)   │      │
│  │                                                              │      │
│  │   ╭────────────────╮ ╭────────────────╮ ╭────────────────╮   │      │
│  │   │ 1. Child Fever │ │ 2. Sugar Fasting│ │ 3. Emergency  │   │      │
│  │   ╰────────────────╯ ╰────────────────╯ ╰────────────────╯   │      │
│  │                                                              │      │
│  │   [Transcript Bubble: Preserved in Idle, Listen, Think, Speak]│     │
│  └──────────────────────────────────────────────────────────────┘      │
│                                                                        │
│  SCREEN 2: DIALOGUE (Indic Script Tabs: Live, தமிழ், తెలుగు, বাংলা)    │
│  SCREEN 3: RECEPTION DESK                                              │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │ [SampleDataBadge] Staff Callback Queue                       │      │
│  │ PIN Protection (Masked) · Touch Kiosk On-Screen Numpad       │      │
│  │ Inactivity Auto-Clear Timer (60s touch reset)                │      │
│  │ Voice Reminder Audio Preview Modal (Dravidian & Indic TTS)   │      │
│  └──────────────────────────────────────────────────────────────┘      │
│  [RateLimitToast: "Too many requests, please wait a moment" (429)]     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Dedicated Features & Functional Logic

### 1. Dedicated Emergency Screen (`src/components/EmergencyFrame.tsx`)
- Rendered when triage detects emergency keywords (chest pain, unconscious, severe bleeding) or when the user taps Emergency from navigation/banners.
- Color: `#DC2626` background with crisp white text.
- Large **"Call 108 (Free Emergency Ambulance)"** button with `tel:108` and audio cue.
- Direct Gate 1 Casualty instructions with step-by-step guidance (wheelchair ramp, ER desk).

### 2. Kiosk Touch Numpad & Inactivity Auto-Clear (`src/components/ReceptionDesk.tsx`)
- Integrated on-screen numeric keypad (`1, 2, 3, 4, 5, 6, 7, 8, 9, 0, Backspace, Clear, Submit`) with large 56px touch targets.
- Enables patients to enter phone numbers and staff to authenticate with PIN `1234` on portrait kiosks without an external physical keyboard.
- Inactivity hook: Listens to `touchstart`, `mousemove`, `keydown`. If no activity for 60 seconds while staff authenticated, automatically resets PIN authentication and masks patient phone numbers.

### 3. Screen Reader & Accessibility Enforcements (`VoiceMic.tsx` & all components)
- `aria-live="polite"` element announcing state:
  - *Idle*: "Hospital Voice Reception ready. Tap microphone to speak."
  - *Listening*: "Listening to your voice. Audio capturing active. Speak now."
  - *Thinking*: "Processing your question with hospital directory. Please wait."
  - *Speaking*: "Playing clinical response. Tap Stop Audio to interrupt."
- All clickable hitboxes enforce `min-h-[48px] min-w-[48px]`.
- Text labels accompany every icon.

### 4. Backend Hardening Verification
- `server.ts`:
  - `atomicWriteJson` prevents concurrent JSON file write corruption.
  - Port binding respects `process.env.PORT || 3000`.
  - Staff PIN protection (`STAFF_PIN = "1234"`, `x-staff-pin` header) masks phone numbers on `/api/leads`.
  - Privacy compliance: only structured clinical reason stored; raw caller voice audio never written to disk.
  - HTTP 429 response formatting with exponential backoff on client.

---

## 4. Test Suite Strategy (`src/services/hospitalLogic.test.ts` & `src/utils/axeA11y.test.ts`)

- **Existing Tests**: All 29 unit tests preserved (triage regex, script detection, number spelling, earcon audio, retry backoff).
- **Automated Accessibility Assertions**:
  - Validates 4.5:1 text contrast ratios against `#EEF3F1` and `#13262A`.
  - Validates 48px minimum touch hitboxes across all button components.
  - Validates `aria-live` and `aria-label` attributes on `VoiceMicButton` and audio toggles.
- **Visual & Component Integrity**:
  - Verifies presence of the 4 new feedback components (`DemoBanner`, `SampleDataBadge`, `RateLimitToast`, `MicBlockedHelpCard`).
  - Verifies Emergency frame rendering in `#DC2626`.

---

## 5. Execution Steps

1. **`src/index.css`**: Update with complete tokens, dual dark mode (`.dark` and `@media (prefers-color-scheme: dark)`), and `prefers-reduced-motion` overrides.
2. **`src/components/EmergencyFrame.tsx`**: Create dedicated `#DC2626` emergency frame with large Call 108 button and triage instructions.
3. **`src/components/VoiceMicButton.tsx` & `VoiceMic.tsx`**: Add `aria-live="polite"` state announcements, real audio level scaling, 144px button, top-right language chip, preserved transcript bubble.
4. **`src/components/ReceptionDesk.tsx`**: Add touch kiosk on-screen numpad and 60-second inactivity auto-clear.
5. **`src/utils/axeA11y.test.ts`**: Add automated accessibility checks.
6. **Verification**: Run `npm test`, co-execute `compile_applet` and `lint_applet`, restart dev server, and verify in browser.
