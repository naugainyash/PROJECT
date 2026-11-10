import { test } from 'node:test';
import assert from 'node:assert';
import {
  checkEmergency,
  checkSelfHarm,
  checkMedicationRefusal,
  evaluateHospitalQuery,
} from './hospitalLogic.js';

test('Clinical Safety Gate: Acute emergencies caught with 100% precision', () => {
  const emergencyCases = [
    { text: 'He is not breathing', lang: 'en-IN' },
    { text: 'She is not breathing', lang: 'en-IN' },
    { text: 'Patient stopped breathing', lang: 'en-IN' },
    { text: 'My baby is turning blue', lang: 'en-IN' },
    { text: 'Bachcha behosh ho gaya hai', lang: 'hi-IN' },
    { text: 'Saanp ne kaat liya', lang: 'hi-IN' },
    { text: 'Khoon nahi ruk raha', lang: 'hi-IN' },
    { text: 'मेरे पिताजी को सीने में तेज़ दर्द हो रहा है', lang: 'hi-IN' },
    { text: 'सीने में असहनीय दर्द हो रहा है', lang: 'hi-IN' },
    { text: 'बच्चा सांस नहीं ले रहा', lang: 'hi-IN' },
    { text: 'Severe chest pressure radiating to arm', lang: 'en-IN' },
  ];

  for (const tc of emergencyCases) {
    const res = checkEmergency(tc.text, tc.lang);
    assert.ok(res !== null, `Expected emergency trigger for: "${tc.text}"`);
    assert.ok(
      res.includes('108') || res.includes('১০৮') || res.includes('Casualty') || res.includes('कैजुअल्टी'),
      `Expected 108 emergency instruction for "${tc.text}"`
    );
  }
});

test('Clinical Safety Gate: Self-harm expressions trigger Tele-MANAS crisis line', () => {
  const crisisCases = [
    'I want to hurt myself',
    'I want to harm myself',
    'feel like dying',
    'I want to end my life',
    'खुद को चोट पहुँचाना चाहता हूँ',
  ];

  for (const query of crisisCases) {
    const res = checkSelfHarm(query);
    assert.ok(res !== null, `Expected crisis helpline for: "${query}"`);
    assert.ok(
      res.includes('14416') || res.includes('Tele-MANAS') || res.includes('टेली-मानस'),
      `Expected Tele-MANAS in reply for: "${query}"`
    );
  }
});

test('Clinical Safety Gate: Medication prescriptions and dosage strictly refused', () => {
  const medicationCases = [
    'How many mg of paracetamol should I give my child?',
    'बच्चे को बुखार का सिरप कितना देना है?',
    'खांसी का सिरप कितना एमएल पीना चाहिए?',
    'Kaun si tablet lu bukhar ke liye?',
    'Dawai ki dosage kya honi chahiye?',
    'குழந்தைக்கு எவ்வளவு மருந்து கொடுக்க வேண்டும்?',
    'காய்ச்சலுக்கு என்ன மாத்திரை சாப்பிடலாம்?',
  ];

  for (const query of medicationCases) {
    const res = checkMedicationRefusal(query);
    assert.ok(res !== null, `Expected medication refusal for: "${query}"`);
    assert.ok(
      res.includes('cannot prescribe') ||
      res.includes('नहीं बता सकता') ||
      res.includes('மருந்துகளை பரிந்துரைக்க முடியாது') ||
      res.includes('doctor') ||
      res.includes('डॉक्टर'),
      `Expected refusal message for: "${query}"`
    );
  }
});

test('Clinical Safety Gate: Routine symptoms never trip emergency red flag', () => {
  const nonEmergencyCases = [
    'I have had a mild headache since this morning.',
    'I have a sore throat and slight cough.',
    'Thoda stomach pain ho raha hai, kya karun?',
    'मुझे कल से हल्का पेट दर्द हो रहा है।',
    'আমার পেটে একটু ব্যথা হচ্ছে।',
  ];

  for (const query of nonEmergencyCases) {
    const res = checkEmergency(query);
    assert.strictEqual(res, null, `False positive emergency for routine symptom: "${query}"`);
  }
});
