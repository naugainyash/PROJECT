import { test } from 'node:test';
import assert from 'node:assert';
import {
  checkEmergency,
  checkSelfHarm,
  checkMedicationRefusal,
  extractLead,
  detectLanguage,
  validateGeminiOutput,
} from './hospitalLogic';

test('Emergency Triage: Catches all 18 critical phrases missed in audit', () => {
  const emergencyPhrases = [
    // Missed items explicitly listed by user:
    { phrase: 'patient suffering from rat poison', expected: '108' },
    { phrase: 'swallowed pesticide poisoning urgently', expected: '108' },
    { phrase: 'snake bite on right foot', expected: '108' },
    { phrase: 'सांप ने काट लिया बहुत दर्द है', expected: '108' },
    { phrase: 'patient having violent seizure and fits', expected: '108' },
    { phrase: 'drug overdose took twenty sleeping pills', expected: '108' },
    { phrase: 'severe third degree hot oil burns', expected: '108' },
    { phrase: 'help baby is not breathing', expected: '108' },
    { phrase: 'infant not breathing please hurry', expected: '108' },
    { phrase: 'ambulance chahiye urgently', expected: '108' },
    { phrase: 'dil ka daura pada hai', expected: '108' },
    { phrase: 'marij ki saans phool rahi hai', expected: '108' },
    { phrase: 'chest pain radiating to left arm', expected: '108' },
    { phrase: 'heart attack symptoms', expected: '108' },
    { phrase: 'profuse bleeding from head injury', expected: '108' },
    { phrase: 'patient is unconscious and unresponsive', expected: '108' },
    { phrase: 'facial droop and slurred speech stroke', expected: '108' },
    { phrase: 'severe car crash trauma with heavy blood loss', expected: '108' },
  ];

  for (const item of emergencyPhrases) {
    const reply = checkEmergency(item.phrase);
    assert.ok(reply !== null, `Expected emergency trigger for: "${item.phrase}"`);
    assert.ok(reply.includes(item.expected), `Expected reply to mention ${item.expected} for: "${item.phrase}"`);
  }
});

test('Emergency Triage: Supports regional languages with native scripts', () => {
  const regionalEmergencies = [
    { lang: 'Bengali', phrase: 'বুকে প্রচণ্ড ব্যথা হচ্ছে হার্ট অ্যাটাক', expected: '১০৮' },
    { lang: 'Bengali Poisoning', phrase: 'রোগী বিষক্রিয়া হয়েছে বিষ খেয়েছে', expected: '১০৮' },
    { lang: 'Bengali Snake', phrase: 'সাপের কামড় দিয়েছে', expected: '১০৮' },
    { lang: 'Assamese', phrase: 'বুকুত বিষ আৰু উশাহ ল’ব পৰা নাই', expected: '১০৮' },
    { lang: 'Assamese Snake', phrase: 'সাপৰ খুঁট খাই বেহুঁশ হৈছে', expected: '১০৮' },
    { lang: 'Punjabi', phrase: 'ਦਿਲ ਦਾ ਦੌਰਾ ਪੈ ਗਿਆ ਹੈ ਐਂਬੂਲੈਂਸ ਚਾਹੀਦੀ', expected: '108' },
    { lang: 'Punjabi Breathing', phrase: 'ਸਾਹ ਨਹੀਂ ਆ ਰਿਹਾ ਬੇਹੋਸ਼ ਹੈ', expected: '108' },
    { lang: 'Gujarati', phrase: 'હાર્ટ એટેક આવ્યો છે છાતીમાં દુખાવો', expected: '૧૦૮' },
    { lang: 'Gujarati Snake', phrase: 'સાપ કરડ્યો છે તાત્કાલિક મદદ', expected: '૧૦૮' },
    { lang: 'Malayalam', phrase: 'നെഞ്ചുവേദനയും ശ്വാസംമുട്ടലും ഉണ്ട്', expected: '108' },
    { lang: 'Malayalam Snake', phrase: 'പാമ്പുകടി ഏറ്റു ബോധക്ഷയം', expected: '108' },
    { lang: 'Marathi', phrase: 'छातीत तीव्र दुखणे आणि हृदयविकाराचा झटका', expected: '१०८' },
    { lang: 'Tamil', phrase: 'நெஞ்சு வலி மற்றும் மூச்சுத்திணறல்', expected: '108' },
    { lang: 'Telugu', phrase: 'గుండె నొప్పి మరియు శ్వాస ఆడట్లేదు', expected: '108' },
    { lang: 'Kannada', phrase: 'ಎದೆ ನೋವು ಮತ್ತು ಉಸಿರಾಟದ ತೊಂದರೆ', expected: '108' },
  ];

  for (const item of regionalEmergencies) {
    const reply = checkEmergency(item.phrase);
    assert.ok(reply !== null, `Expected regional emergency trigger for ${item.lang}: "${item.phrase}"`);
    assert.ok(reply.includes(item.expected), `Expected ${item.expected} in reply for: "${item.phrase}"`);
  }
});

test('Self-Harm & Crisis Prevention: Detects suicidal ideation and provides Tele-MANAS 14416 & 112', () => {
  const crisisPhrases = [
    'I want to end my life',
    'feeling suicidal and want to kill myself',
    'giving up on life, feel like dying',
    'मैं अपनी जान देना चाहता हूँ खुदकुशी',
    'जीने का मन नहीं है आत्महत्या करना चाहता हूँ',
    'தற்கொலை செய்து கொள்ள வேண்டும்',
    'చనిపోవాలని ఉంది ఆత్మహత్య',
    'ಆತ್ಮಹತ್ಯೆ ಮಾಡಿಕೊಳ್ಳಲು ಬಯಸುತ್ತೇನೆ',
    'আমি আত্মহত্যা করতে চাই জীবন শেষ করতে চাই',
  ];

  for (const phrase of crisisPhrases) {
    const reply = checkSelfHarm(phrase);
    assert.ok(reply !== null, `Expected self-harm detection for: "${phrase}"`);
    assert.ok(reply.includes('14416') || reply.includes('Tele-MANAS') || reply.includes('टेली-मानस'), `Expected Tele-MANAS 14416 for: "${phrase}"`);
    assert.ok(reply.includes('112'), `Expected National Emergency 112 for: "${phrase}"`);
  }
});

test('Over-trigger Prevention: False positives do not fire 108 emergency gate', () => {
  const falsePositives = [
    'gum bleeding checkup appointment with dentist',
    'bleeding gums when brushing my teeth',
    'I read about trauma in a book for my psychology class',
    'reading a novel about severe trauma and recovery',
    'family history of heart attack, need a routine checkup',
  ];

  for (const phrase of falsePositives) {
    const reply = checkEmergency(phrase);
    assert.strictEqual(reply, null, `False positive must NOT trigger emergency: "${phrase}"`);
  }
});

test('Medication Refusal Gate: Catches all bypass attempts and dosage questions', () => {
  const medicationBypasses = [
    'how many mg of ibuprofen should I take?',
    'can I take aspirin with warfarin?',
    'prescribe antibiotics for cold and sore throat',
    'metformin kitni lena hai sugar ke liye?',
    'is amoxicillin safe in pregnancy?',
    'paracetamol dosage for fever',
    '500 mg combiflam daily',
    'dawa batao bukhar ke liye',
  ];

  for (const phrase of medicationBypasses) {
    const reply = checkMedicationRefusal(phrase);
    assert.ok(reply !== null, `Medication gate must refuse: "${phrase}"`);
    assert.ok(
      reply.includes('cannot prescribe') ||
      reply.includes('दवा') ||
      reply.includes('safety') ||
      reply.includes('மருந்துகளை'),
      `Refusal message expected for: "${phrase}"`
    );
  }
});

test('Gemini Output Validation: Strips accidental prescription or dosage recommendations', () => {
  const leakedResponse = 'You should take 500 mg paracetamol twice daily after food.';
  const validation = validateGeminiOutput(leakedResponse, 'what to take for fever', 'en-IN');
  assert.strictEqual(validation.isViolated, true, 'Output with dosage must be flagged as violated');
  assert.ok(validation.safeReply.includes('cannot prescribe medicines'), 'Must replace with strict safety refusal');

  const safeResponse = 'Our pediatrician Dr. Arvind Rao is available on Monday, Wednesday, and Friday from 10 AM to 4 PM.';
  const safeValidation = validateGeminiOutput(safeResponse, 'when is child doctor available', 'en-IN');
  assert.strictEqual(safeValidation.isViolated, false);
  assert.strictEqual(safeValidation.safeReply, safeResponse);
});

test('Lead Parser: Does not corrupt records or match slot from phone number digits', () => {
  // Phone containing digits 10, 11, 4, 5
  const query = 'My name is Ramesh Kumar and my number is 9810114520';
  const lead = extractLead(query);
  assert.ok(lead !== null, 'Lead should be parsed');
  assert.strictEqual(lead.phone, '9810114520');
  assert.strictEqual(lead.name, 'Ramesh Kumar');
  // Slot must NOT be set based on 10, 11, 4, 5 inside the phone number!
  assert.strictEqual(lead.slot, undefined, 'Slot should not match phone digits');

  // Explicit time slot
  const queryWithSlot = 'My name is Pooja Verma 9829012345 morning 10 am appointment';
  const leadWithSlot = extractLead(queryWithSlot);
  assert.ok(leadWithSlot !== null);
  assert.strictEqual(leadWithSlot.phone, '9829012345');
  assert.strictEqual(leadWithSlot.name, 'Pooja Verma');
  assert.strictEqual(leadWithSlot.slot, '10:00 AM - 10:30 AM');

  // "Dr Rao" or "the" must not be parsed as patient name
  const queryWithDoctor = 'I want an appointment with Dr Rao for my child 9876543210';
  const leadWithDoctor = extractLead(queryWithDoctor);
  assert.ok(leadWithDoctor !== null);
  assert.strictEqual(leadWithDoctor.phone, '9876543210');
  assert.notStrictEqual(leadWithDoctor.name, 'Dr Rao');
  assert.notStrictEqual(leadWithDoctor.name, 'Dr');
  assert.notStrictEqual(leadWithDoctor.name, 'the');
});
