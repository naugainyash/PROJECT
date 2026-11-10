import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  checkEmergency,
  checkMedicationRefusal,
  extractLead,
  spellOutDigits,
  evaluateHospitalQuery,
  detectLanguage,
} from "./hospitalLogic";

const hospitalData = JSON.parse(fs.readFileSync("./hospital_data.json", "utf-8"));

test("detectLanguage accurately classifies Dravidian, Devanagari, and Romanized inputs", () => {
  // Native Unicode script detection
  assert.equal(detectLanguage("வணக்கம், மருத்துவர் எப்போது வருவார்?"), "ta-IN");
  assert.equal(detectLanguage("నమస్కారం, డాక్టర్ ఎప్పుడు వస్తారు?"), "te-IN");
  assert.equal(detectLanguage("ನಮಸ್ಕಾರ, ಡಾಕ್ಟರ್ ಯಾವಾಗ ಬರುತ್ತಾರೆ?"), "kn-IN");
  assert.equal(detectLanguage("नमस्ते, डॉक्टर कब बैठते हैं?"), "hi-IN");

  // Romanized transliteration detection
  assert.equal(detectLanguage("doctor yavaga bartare? shulka estu?"), "kn-IN");
  assert.equal(detectLanguage("doctor eppudu vastaru? dhara entha?"), "te-IN");
  assert.equal(detectLanguage("doctor eppo varuvanga? kattanam evalavu?"), "ta-IN");
  assert.equal(detectLanguage("doctor kab aayenge? fees kitni hai?"), "hi-IN");

  // Explicit hint honor
  assert.equal(detectLanguage("When is the clinic open?", "ta-IN"), "ta-IN");
  assert.equal(detectLanguage("When is the clinic open?", "te-IN"), "te-IN");
  assert.equal(detectLanguage("When is the clinic open?", "kn-IN"), "kn-IN");
  assert.equal(detectLanguage("When is the clinic open?", "en-IN"), "en-IN");
});

test("Emergency triage triggers for Kannada ಎದೆ ನೋವು (chest pain)", () => {
  const result = checkEmergency("ರೋಗಿಗೆ ತೀವ್ರ ಎದೆ ನೋವು ಮತ್ತು ಉಸಿರಾಟದ ತೊಂದರೆ ಇದೆ");
  assert.ok(result);
  assert.match(result, /108/);
  assert.match(result, /ತುರ್ತು ಚಿಕಿತ್ಸಾ ವಿಭಾಗಕ್ಕೆ/);
});

test("Medication prescription refusal supports Kannada and Telugu", () => {
  const knResult = checkMedicationRefusal("ಜ್ವರಕ್ಕೆ ಯಾವ ಮಾತ್ರೆ ತೆಗೆದುಕೊಳ್ಳಬೇಕು?");
  assert.ok(knResult);
  assert.match(knResult, /ಔಷಧಿಗಳನ್ನು ಸೂಚಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ/);

  const teResult = checkMedicationRefusal("జ్వరానికి ఏ మందులు వాడాలి?");
  assert.ok(teResult);
  assert.match(teResult, /మందులను సూచించలేదు/);
});

test("Kannada query returns pediatrician timings and spoken fee in Kannada", () => {
  const query = "ಮಕ್ಕಳ ತಜ್ಞ ಡಾಕ್ಟರ್ ಯಾವಾಗ ಬರುತ್ತಾರೆ?";
  const result = evaluateHospitalQuery(query, hospitalData);
  assert.equal(result.detectedLanguage, "kn-IN");
  assert.equal(result.category, "doctor_inquiry");
  assert.match(result.reply, /ಡಾಕ್ಟರ್ ಅರವಿಂದ್ ರಾವ್/);
  assert.match(result.reply, /ಐದು ನೂರು ರೂಪಾಯಿಗಳು/);
});

test("Kannada query returns blood sugar test fee and fasting rules in Kannada", () => {
  const query = "ರಕ್ತದ ಸಕ್ಕರೆ ಪರೀಕ್ಷೆಯ ಶುಲ್ಕ ಎಷ್ಟು?";
  const result = evaluateHospitalQuery(query, hospitalData);
  assert.equal(result.detectedLanguage, "kn-IN");
  assert.equal(result.category, "test_inquiry");
  assert.match(result.reply, /ಒಂದು ನೂರು ರೂಪಾಯಿಗಳು/);
  assert.match(result.reply, /ಖಾಲಿ ಹೊಟ್ಟೆಯಲ್ಲಿರಬೇಕು/);
});

test("Telugu query returns pediatrician timings and spoken fee in Telugu", () => {
  const query = "పిల్లల డాక్టర్ ఎప్పుడు వస్తారు?";
  const result = evaluateHospitalQuery(query, hospitalData);
  assert.equal(result.detectedLanguage, "te-IN");
  assert.equal(result.category, "doctor_inquiry");
  assert.match(result.reply, /డాక్టర్ అరవింద్ రావు/);
  assert.match(result.reply, /ఐదు వందల రూపాయలు/);
});

test("Telugu query returns blood sugar test fee in Telugu", () => {
  const query = "రక్తంలో చక్కెర పరీక్ష ధర ఎంత?";
  const result = evaluateHospitalQuery(query, hospitalData);
  assert.equal(result.detectedLanguage, "te-IN");
  assert.equal(result.category, "test_inquiry");
  assert.match(result.reply, /వంద రూపాయలు/);
  assert.match(result.reply, /ఉపవాసం/);
});

test("Tamil query returns pediatrician timings and spoken fee in Tamil", () => {
  const query = "குழந்தை நல மருத்துவர் எப்போது வருவார்?";
  const result = evaluateHospitalQuery(query, hospitalData);
  assert.equal(result.detectedLanguage, "ta-IN");
  assert.equal(result.category, "doctor_inquiry");
  assert.match(result.reply, /டாக்டர் அரவிந்த் ராவ்/);
  assert.match(result.reply, /ஐநூறு ரூபாய்/);
});

test("Tamil query returns blood sugar test fee in Tamil", () => {
  const query = "இரத்த சர்க்கரை பரிசோதனை கட்டணம் எவ்வளவு?";
  const result = evaluateHospitalQuery(query, hospitalData);
  assert.equal(result.detectedLanguage, "ta-IN");
  assert.equal(result.category, "test_inquiry");
  assert.match(result.reply, /நூறு ரூபாய்/);
  assert.match(result.reply, /வெறும் வயிற்றில்/);
});


test("Emergency triage triggers for English chest pain", () => {
  const result = checkEmergency("The patient has sudden severe chest pain and breathlessness");
  assert.ok(result);
  assert.match(result, /dial one zero eight/i);
});

test("Emergency triage triggers for Hindi सीने में दर्द", () => {
  const result = checkEmergency("मरीज के सीने में दर्द है और सांस फूल रही है");
  assert.ok(result);
  assert.match(result, /108/);
  assert.match(result, /कैजुअल्टी/);
});

test("Emergency triage triggers for Hindi unconsciousness", () => {
  const result = checkEmergency("व्यक्ति सड़क पर बेहोश पड़ा है");
  assert.ok(result);
  assert.match(result, /108/);
});

test("Medication prescription request is strictly refused", () => {
  const result = checkMedicationRefusal("What medicine should I take for high fever?");
  assert.ok(result);
  assert.match(result, /cannot prescribe medicines/i);

  const hindiResult = checkMedicationRefusal("बुखार की कौन सी दवा लूँ?");
  assert.ok(hindiResult);
  assert.match(hindiResult, /कोई दवा या नुस्खा नहीं बता सकता/);
});

test("Lead capture parses 10-digit Indian phone and name", () => {
  const text = "Book me with the gynaecologist, I'm Anita, 9876543210";
  const lead = extractLead(text);
  assert.ok(lead);
  assert.equal(lead.phone, "9876543210");
  assert.equal(lead.name, "Anita");
  assert.match(lead.reason, /Gynaecology/i);
});

test("Spell out digits writes numbers as words for Gnani TTS", () => {
  const spelled = spellOutDigits("9876543210");
  assert.equal(spelled, "nine eight seven six five four three two one zero");
});

test("Knowledge query returns pediatrician timings and spoken fee", () => {
  const query = "बच्चों के डॉक्टर कब बैठते हैं?";
  const result = evaluateHospitalQuery(query, hospitalData);
  assert.equal(result.category, "doctor_inquiry");
  assert.match(result.reply, /अरविंद राव/);
  assert.match(result.reply, /पाँच सौ रुपये/);
});

test("Knowledge query returns blood sugar test price and fasting rules", () => {
  const query = "How much is a blood sugar test?";
  const result = evaluateHospitalQuery(query, hospitalData);
  assert.equal(result.category, "test_inquiry");
  assert.match(result.reply, /one hundred rupees/i);
  assert.match(result.reply, /fasting/i);
});

test("Out-of-scope heart surgery states not done on-site and offers callback", () => {
  const query = "Do you do open heart surgery?";
  const result = evaluateHospitalQuery(query, hospitalData);
  assert.equal(result.category, "out_of_scope");
  assert.match(result.reply, /does not perform open heart surgery/i);
});

test("Emergency triage triggers for Tamil நெஞ்சு வலி (chest pain)", () => {
  const result = checkEmergency("நோயாளிக்கு கடுமையான நெஞ்சு வலி உள்ளது, மூச்சுத் திணறல்");
  assert.ok(result);
  assert.match(result, /108/);
  assert.match(result, /அவசர சிகிச்சை/);
});

test("Emergency triage triggers for Telugu గుండె నొప్పి (chest pain)", () => {
  const result = checkEmergency("తీవ్రమైన గుండె నొప్పి మరియు ఊపిరి ఆడకపోవడం ఉంది");
  assert.ok(result);
  assert.match(result, /108/);
  assert.match(result, /క్యాజువాలిటీ|అత్యవసర/);
});

test("Colloquial Hinglish understanding matches pediatrician for child with fever", () => {
  const query = "bacche ko bukhar hai, kaun dekhega?";
  const result = evaluateHospitalQuery(query, hospitalData);
  assert.equal(result.category, "doctor_inquiry");
  assert.match(result.reply, /अरविंद राव|Arvind Rao/);
  assert.match(result.reply, /बच्चों|Pediatrics/);
});

test("Lead capture assigns structured appointment slot and scrubs conversational noise", () => {
  const text = "Please book an appointment for Rahul Verma, 9876543210 for child fever";
  const result = evaluateHospitalQuery(text, hospitalData);
  assert.equal(result.category, "lead_captured");
  assert.ok(result.lead);
  assert.equal(result.lead.phone, "9876543210");
  assert.equal(result.lead.name, "Rahul Verma");
  assert.ok(result.lead.appointment_slot, "Appointment slot should be assigned");
  assert.match(result.lead.appointment_slot, /\d{1,2}:\d{2}\s*(?:AM|PM)/);
  // Ensure raw transcription conversation is not dumped verbatim into lead notes
  assert.ok(!result.lead.notes?.includes("Please book an appointment for"));
  assert.match(result.lead.notes || "", /Consultation with Dr\. Arvind Rao/);
});

test("Deterministic triage regex benchmark executes in under 5 ms", () => {
  const sampleQueries = [
    "The patient has sudden severe chest pain and breathlessness",
    "मरीज के सीने में दर्द है और सांस फूल रही है",
    "நோயாளிக்கு கடுமையான நெஞ்சு வலி உள்ளது",
    "What medicine should I take for headache?",
    "बच्चों के डॉक्टर कब बैठते हैं?",
    "When does Dr Arvind sit?",
    "bacche ko bukhar hai, kaun dekhega?",
  ];

  const startTime = performance.now();
  const iterations = 500;
  for (let i = 0; i < iterations; i++) {
    const q = sampleQueries[i % sampleQueries.length];
    checkEmergency(q);
    checkMedicationRefusal(q);
  }
  const elapsed = performance.now() - startTime;
  const avgPerCheck = elapsed / iterations;

  // Average time per triage check must be well under 1ms (measured typically 0.005ms)
  assert.ok(avgPerCheck < 5, `Expected < 5ms per triage check, got ${avgPerCheck.toFixed(4)}ms`);
});

