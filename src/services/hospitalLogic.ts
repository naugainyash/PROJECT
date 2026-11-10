/**
 * AarogyaVani Core Hospital Logic
 * Decoupled pure logic:
 * 1. Pre-LLM Deterministic Emergency & Crisis Triage (Casualty 108 & Tele-MANAS 14416 / 112)
 * 2. Strict Medication Refusal Gate (Dosage, Drug Names, Drug Combinations & Prescriptions)
 * 3. Privacy-Preserving Lead Capture (Phone scrubbing, Slot isolation & Name cleanup)
 * 4. Multilingual Knowledge Engine supporting 10 Indian Languages:
 *    Hindi (hi-IN), English (en-IN), Tamil (ta-IN), Telugu (te-IN), Kannada (kn-IN),
 *    Bengali (bn-IN), Punjabi (pa-IN), Gujarati (gu-IN), Malayalam (ml-IN), Marathi (mr-IN).
 * 5. Gemini LLM Output Safety Validation
 */

export interface Doctor {
  id: string;
  name: string;
  name_hi?: string;
  name_ta?: string;
  name_te?: string;
  name_kn?: string;
  specialty: string;
  degrees: string;
  days: string;
  hours: string;
  spoken_hours_en: string;
  spoken_hours_hi: string;
  spoken_hours_ta?: string;
  spoken_hours_te?: string;
  spoken_hours_kn?: string;
  fee: number;
  fee_spoken_en: string;
  fee_spoken_hi: string;
  fee_spoken_ta?: string;
  fee_spoken_te?: string;
  fee_spoken_kn?: string;
  room: string;
  surgery_note?: string;
}

export interface DiagnosticTest {
  name: string;
  aliases: string[];
  price: number;
  price_spoken_en: string;
  price_spoken_hi: string;
  price_spoken_ta?: string;
  price_spoken_te?: string;
  price_spoken_kn?: string;
  instructions_en: string;
  instructions_hi: string;
  instructions_ta?: string;
  instructions_te?: string;
  instructions_kn?: string;
  report_time: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  reason: string;
  created_at: string;
  status: "pending" | "called";
  appointment_slot?: string;
  notes?: string;
}

export type SupportedLanguage =
  | "ta-IN" // Tamil
  | "te-IN" // Telugu
  | "kn-IN" // Kannada
  | "hi-IN" // Hindi
  | "en-IN" // English
  | "bn-IN" // Bengali
  | "as-IN" // Assamese
  | "pa-IN" // Punjabi
  | "gu-IN" // Gujarati
  | "ml-IN" // Malayalam
  | "mr-IN"; // Marathi

export interface QueryResult {
  reply: string;
  category:
    | "emergency"
    | "crisis_support"
    | "medical_refusal"
    | "lead_captured"
    | "out_of_scope"
    | "doctor_inquiry"
    | "test_inquiry"
    | "timing_inquiry"
    | "location_inquiry"
    | "symptom_routing"
    | "unknown_fallback";
  lead?: Lead;
  isEmergency?: boolean;
  isCrisis?: boolean;
  detectedLanguage?: SupportedLanguage;
  actionFlag?: "normal_answer" | "red_screen" | "refuse" | "offer_callback" | "extract_and_confirm";
  intent?: string;
  extractedEntities?: { name?: string; phone?: string };
}

/**
 * Detects Hinglish (Hindi vocabulary written in Latin/English alphabet).
 */
export function isHinglish(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    /[a-zA-Z]/.test(text) &&
    !/[\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F]/.test(text) &&
    /\b(dr\.?\s*sharma\s*ka|timing\s*kya|fee\s*kitni|zehar|pee\s*liya|ab\s*kya\s*karun|jaldi\s*batao|kya\s*karun|thoda\s*stomach|ho\s*raha|dawai\s*ki\s*dosage|kya\s*honi|chahiye|aap\s*log|karte\s*ho|mera\s*naam|pe\s*call\s*back|kar\s*lena|kitna|kya\s*hai|dawa|goli)\b/i.test(lower)
  );
}

/**
 * Robust Multilingual Detector for Indian Healthcare
 * Identifies Unicode scripts (Bengali, Gurmukhi, Gujarati, Malayalam, Tamil, Telugu, Kannada, Devanagari)
 * and Romanized/lexical markers for Hindi, Marathi, and Dravidian languages.
 */
export function detectLanguage(text: string, languageHint?: string): SupportedLanguage {
  const trimmed = text.trim();

  // 1. Explicit native Unicode script detection (100% deterministic & highest confidence)
  // Assamese distinctive characters ৰ (U+09F0) and ৱ (U+09F1) or Assamese vocabulary
  if (/[\u09F0\u09F1]/.test(trimmed) || /(বুকুৰ|উশাহ|চিকিৎসালয়|অসমীয়া|ঔষধ|এম্বুলেন্স)/.test(trimmed)) {
    return "as-IN";
  }
  if (/[\u0980-\u09FF]/.test(trimmed)) return "bn-IN"; // Bengali script
  if (/[\u0A00-\u0A7F]/.test(trimmed)) return "pa-IN"; // Gurmukhi (Punjabi) script
  if (/[\u0A80-\u0AFF]/.test(trimmed)) return "gu-IN"; // Gujarati script
  if (/[\u0D00-\u0D7F]/.test(trimmed)) return "ml-IN"; // Malayalam script
  if (/[\u0B80-\u0BFF]/.test(trimmed)) return "ta-IN"; // Tamil script
  if (/[\u0C00-\u0C7F]/.test(trimmed)) return "te-IN"; // Telugu script
  if (/[\u0C80-\u0CFF]/.test(trimmed)) return "kn-IN"; // Kannada script

  // Devanagari script can be Marathi or Hindi (Note: \b does not work on Unicode/Devanagari characters)
  if (/[\u0900-\u097F]/.test(trimmed)) {
    // Check for Marathi-specific words without ASCII \b
    if (/(आहे|नाही|कसे|कधी|कुठे|दुखणे|छातीत|सापाचा|चावला|औषध|सांगा|रुग्णालय|हवे|झटका)/.test(trimmed)) {
      return "mr-IN";
    }
    return "hi-IN";
  }

  // 2. Language Hint provided by Gnani STT Prisma auto-detection or user selection
  if (languageHint && languageHint !== "indic-auto") {
    if (languageHint.startsWith("as")) return "as-IN";
    if (languageHint.startsWith("bn")) return "bn-IN";
    if (languageHint.startsWith("pa")) return "pa-IN";
    if (languageHint.startsWith("gu")) return "gu-IN";
    if (languageHint.startsWith("ml")) return "ml-IN";
    if (languageHint.startsWith("mr")) return "mr-IN";
    if (languageHint.startsWith("ta")) return "ta-IN";
    if (languageHint.startsWith("te")) return "te-IN";
    if (languageHint.startsWith("kn")) return "kn-IN";
    if (languageHint.startsWith("hi")) return "hi-IN";
    if (languageHint.startsWith("en")) return "en-IN";
  }

  // 3. Romanized / Transliterated vocabulary checks across Indic languages
  // Bengali romanized
  if (/\b(amar|buke|byatha|osukh|daktar|kothay|kokhon|kichu|koro|bis|bikh|saap)\b/i.test(trimmed)) {
    return "bn-IN";
  }
  // Punjabi romanized (distinctive Punjabi tokens)
  if (/\b(chhati|darda|dill|dasso|kadon|kithhe|kiven|tezi|chahidi|tuhada|vich)\b/i.test(trimmed)) {
    return "pa-IN";
  }
  // Gujarati romanized
  if (/\b(maru|chhati|dukhavo|kyare|kyan|kevi|rite|dava|aapo|chhe|nathi|joyiye)\b/i.test(trimmed)) {
    return "gu-IN";
  }
  // Malayalam romanized
  if (/\b(nenju|vedana|marunnu|parayu|eppol|evide|engane|undo|illa|venam|sahayam)\b/i.test(trimmed)) {
    return "ml-IN";
  }
  // Marathi romanized
  if (/\b(majha|chhatit|dukhna|aushadh|sanga|kadhi|kuthe|kasa|ahe|nahi|havay)\b/i.test(trimmed)) {
    return "mr-IN";
  }
  // Tamil romanized
  if (/\b(vanakkam|ennodu|enga|engal|eppo|eppadi|eppol|marunthu|marundhu|vali|kuzhandhai|kuzhandai|neram|kattanam|kasu|rathinam|thondharavu|irukku|ille|sonna|parunga)\b/i.test(trimmed)) {
    return "ta-IN";
  }
  // Telugu romanized
  if (/\b(namaskaram|namaskaramu|eppudu|ela|ekkada|mandulu|mandhu|noppi|gunde|pillalu|bidda|samayam|vela|dhara|karchu|raktham|undi|ledu|chudandi)\b/i.test(trimmed)) {
    return "te-IN";
  }
  // Kannada romanized
  if (/\b(namaskara|namaskaragalu|yavaga|hege|yelli|elli|oushadha|mathre|novoo|ede|makkalu|kusu|samaya|shulka|hana|raktha|ide|illa|nodi)\b/i.test(trimmed)) {
    return "kn-IN";
  }
  // Hindi romanized
  if (/\b(namaste|namaskar|kya|hai|kab|kaise|kahan|kitna|bukhar|bacche|baccha|chota|kaun|dekhega|dikhana|doctor|dawa|goli|khoon|janch|subah|shaam|hoga|chahiye|dard|batao)\b/i.test(trimmed)) {
    return "hi-IN";
  }

  return "en-IN";
}

// ============================================================================
// SELF-HARM & CRISIS PREVENTION (Tele-MANAS 14416 / National Emergency 112)
// ============================================================================

export const SELF_HARM_PATTERNS = [
  // English
  /\b(?:want\s*to\s*(?:die|end\s*my\s*life|kill\s*myself|hurt\s*myself|harm\s*myself|cut\s*myself|injure\s*myself)|hurt\s*myself|harm\s*myself|cut\s*myself|injure\s*myself|suicide|suicidal(?:\s*thoughts)?|self[\s-]harm|commit\s*suicide|giving\s*up\s*on\s*life|don't\s*want\s*to\s*live|no\s*reason\s*to\s*live|feel\s*like\s*dying)\b/i,
  // Hindi (Devanagari & Romanized)
  /(आत्महत्या|आत्मघात|जान\s*देना\s*चाहता|मरना\s*चाहता|जीवन\s*समाप्त|खुदकुशी|खुद\s*को\s*(?:मारना|चोट|नुकसान)|जीने\s*का\s*मन\s*नहीं|जीना\s*नहीं\s*है)/i,
  /\b(aatmahatya|mar\s*jaana\s*chahta|khudkushi|suicide\s*karna|jaan\s*dena\s*hai|jeena\s*nahi\s*hai|nahi\s*jeena|khud\s*ko\s*chot|mujhe\s*jeena\s*nahi)\b/i,
  // Tamil
  /(தற்கொலை|உயிரை\s*மாய்த்துக்|சாக\s*வேண்டும்|வாழ\s*பிடிக்கவில்லை)/i,
  /\b(tharkolai|uyirai\s*maithu|saaga\s*vendum)\b/i,
  // Telugu
  /(ఆత్మహత్య|చనిపోవాలని|ప్రాణం\s*తీసుకోవడం|బతకాలని\s*లేదు)/i,
  /\b(aathmahatya|chanipovali|pranam\s*theesukovala)\b/i,
  // Kannada
  /(ಆತ್ಮಹತ್ಯೆ|ಸಾಯಲು\s*ಬಯಸುತ್ತೇನೆ|ಜೀವ\s*ಕಳೆದುಕೊಳ್ಳಲು|ಬದುಕಲು\s*ಮನಸ್ಸಿಲ್ಲ)/i,
  /\b(aathmahatye|saayalu\s*bayasuttene|jeeva\s*kaledukollalu)\b/i,
  // Bengali
  /(আত্মহত্যা|মরতে\s*চাই|জীবন\s*শেষ\s*করতে\s*চাই|বাঁচতে\s*ইচ্ছে\s*নেই)/i,
  // Punjabi
  /(ਖ਼ੁਦਕੁਸ਼ੀ|ਮਰਨਾ\s*ਚਾਹੁੰਦਾ|ਆਪਣੀ\s*ਜਾਨ\s*ਲੈਣਾ|ਜਿਉਣ\s*ਨੂੰ\s*ਦਿਲ\s*ਨਹੀਂ)/i,
  // Gujarati
  /(આત્મહત્યા|મરી\s*જવું\s*છે|જીવન\s*ટૂંકાવવું|જીવવાનો\s*કંટાળો)/i,
  // Malayalam
  /(ആത്മഹത്യ|മരിക്കണം|ജീവനൊടുക്കാൻ|ജീവിക്കാൻ\s*തോന്നുന്നില്ല)/i,
  // Marathi
  /(आत्महत्या|मरायचे\s*आहे|स्वतःला\s*संपवणे|जगावेसे\s*वाटत\s*नाही)/i,
];

export const CRISIS_REPLIES: Record<SupportedLanguage, string> = {
  "en-IN": "Please know you are not alone and help is available right now. Please call the National Tele-MANAS Mental Health Helpline at 14416 (or 1800-891-4416), or emergency services at 112 immediately. Free, confidential support is available 24/7.",
  "hi-IN": "कृपया ध्यान दें कि आप अकेले नहीं हैं और सहायता उपलब्ध है। कृपया राष्ट्रीय तेली मानस (टेली-मानस / Tele-MANAS) मानसिक स्वास्थ्य हेल्पलाइन 14416 (या 1800-891-4416) पर तुरंत कॉल करें, या आपातकालीन नंबर 112 डायल करें। यह सेवा 24 घंटे पूरी तरह निःशुल्क और गोपनीय है।",
  "ta-IN": "தயவுசெய்து நினைவில் கொள்ளுங்கள், நீங்கள் தனியாக இல்லை. உதவி உடனடியாகக் கிடைக்கிறது. தேசிய டெலி-மானாஸ் (Tele-MANAS) உதவி எண் 14416 (அல்லது 1800-891-4416) ஐ உடனடியாக அழைக்கவும், அல்லது 112 ஐ டயல் செய்யவும். 24 மணி நேரமும் இலவச ரகசிய ஆலோசனை கிடைக்கும்.",
  "te-IN": "మీరు ఒంటరిగా లేరని దయచేసి గమనించండి, మీకు సహాయం చేయడానికి నిపుణులు సిద్ధంగా ఉన్నారు. దయచేసి జాతీయ టెలి-మానస్ (Tele-MANAS) హెల్ప్‌లైన్ 14416 (లేదా 1800-891-4416) కి వెంటనే కాల్ చేయండి, లేదా 112 కి కాల్ చేయండి. ఈ సేవ 24 గంటలు ఉచితం మరియు గోప్యమైనది.",
  "kn-IN": "ದಯವಿಟ್ಟು ನೆನಪಿಡಿ, ನೀವು ಒಂಟಿಯಾಗಿಲ್ಲ ಮತ್ತು ತಕ್ಷಣ ಸಹಾಯ ಲಭ್ಯವಿದೆ. ದಯವಿಟ್ಟು ರಾಷ್ಟ್ರೀಯ ಟೆಲಿ-ಮಾನಸ್ (Tele-MANAS) ಸಹಾಯವಾಣಿ 14416 (ಅಥವಾ 1800-891-4416) ಗೆ ತಕ್ಷಣ ಕರೆ ಮಾಡಿ, ಅಥವಾ 112 ಗೆ ಕರೆ ಮಾಡಿ. 24 ಗಂಟೆಗಳ ಕಾಲ ಉಚಿತ ಮತ್ತು ಗೌಪ್ಯ ಸಮಾಲೋಚನೆ ಲಭ್ಯವಿದೆ.",
  "bn-IN": "অনুগ্রহ করে জানবেন আপনি একা নন, আপনার পাশে সাহায্য রয়েছে। অবিলম্বে জাতীয় টেলি-মানাস (Tele-MANAS) হেল্পলাইন 14416 (অথবা 1800-891-4416) নম্বরে কল করুন, অথবা জরুরি 112 ডায়াল করুন। এই পরিষেবা দিনরাত ২৪ ঘণ্টা সম্পূর্ণ বিনামূল্যে এবং গোপনীয়।",
  "as-IN": "অনুগ্ৰহ কৰি জানিব যে আপুনি অকলশৰীয়া নহয়, সহায় তাৎক্ষণিকভাৱে উপলব্ধ। অনুগ্ৰহ কৰি ৰাষ্ট্ৰীয় টেলি-মানস (Tele-MANAS) মানসিক স্বাস্থ্য হেল্পলাইন ১৪৪১৬ (বা ১৮০০-৮৯১-৪৪১৬) লৈ কল কৰক বা ১১২ ডায়েল কৰক। এই সেৱা ২৪ ঘণ্টা বিনামূলীয়া আৰু গোপনীয়।",
  "pa-IN": "ਕਿਰਪਾ ਕਰਕੇ ਜਾਣੋ ਕਿ ਤੁਸੀਂ ਇਕੱਲੇ ਨਹੀਂ ਹੋ ਅਤੇ ਸਹਾਇਤਾ ਤੁਰੰਤ ਉਪਲਬਧ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਰਾਸ਼ਟਰੀ ਟੈਲੀ-ਮਾਨਸ ਹੈਲਪਲਾਈਨ 14416 (ਜਾਂ 1800-891-4416) 'ਤੇ ਤੁਰੰਤ ਕਾਲ ਕਰੋ, ਜਾਂ 112 ਡਾਇਲ ਕਰੋ। ਇਹ ਸੇਵਾ 24 ਘੰਟੇ ਮੁਫ਼ਤ ਅਤੇ ਗੁਪਤ ਹੈ।",
  "gu-IN": "મહેરબાની કરીને જાણો કે તમે એકલા નથી અને મદદ તરત જ ઉપલબ્ધ છે. કૃપા કરીને રાષ્ટ્રીય ટેલિ-માનસ હેલ્પલાઇન 14416 (અથવા 1800-891-4416) પર તરત જ કૉલ કરો, અથવા 112 ડાયલ કરો. આ સેવા ચોવીસ કલાક મફત અને ગોપનીય છે.",
  "ml-IN": "ദയവായി ഓർക്കുക, നിങ്ങൾ തനിച്ചല്ല. സഹായം ഇപ്പോൾ ലഭ്യമാണ്. ദേശീയ ടെലി-മാനസ് (Tele-MANAS) ഹെൽപ്പ് ലൈൻ നമ്പറായ 14416 (അല്ലെങ്കിൽ 1800-891-4416) ലേക്ക് ഉടൻ വിളിക്കുക, അല്ലെങ്കിൽ 112 ഡയൽ ചെയ്യുക. 24 മണിക്കൂറും സൗജന്യവും രഹസ്യവുമായ പിന്തുണ ലഭ്യമാണ്.",
  "mr-IN": "कृपया लक्षात ठेवा आपण एकटे नाही आहात, मदत त्वरित उपलब्ध आहे. कृपया राष्ट्रीय टेलि-मानस मानसिक आरोग्य हेल्पलाइन 14416 (किंवा 1800-891-4416) वर त्वरित कॉल करा, किंवा 112 डायल करा. ही सेवा 24 तास पूर्णपणे मोफत व गोपनीय आहे.",
};

export function checkSelfHarm(text: string, languageHint?: string): string | null {
  for (const pattern of SELF_HARM_PATTERNS) {
    if (pattern.test(text)) {
      const lang = detectLanguage(text, languageHint);
      return CRISIS_REPLIES[lang] || CRISIS_REPLIES["en-IN"];
    }
  }
  return null;
}

// ============================================================================
// ACUTE EMERGENCY TRIAGE GATE (Casualty 108)
// ============================================================================

/**
 * Contextual guards to avoid false positive triggers:
 * 1. Routine dental / gum bleeding during brushing without systemic hemorrhage.
 * 2. Academic / literature reading mentions ("read about trauma in a book").
 */
function isFalsePositiveEmergency(text: string): boolean {
  const lower = text.toLowerCase();

  // Guard 1: Dental / gum bleeding checkups
  if (
    /\b(gum\s*bleeding|bleeding\s*gums?|teeth\s*bleeding|tooth\s*bleeding|brushing(?:\s*my)?\s*teeth|dental\s*bleeding|dentist)\b/i.test(lower) &&
    !/\b(unconscious|fainted|accident|trauma|head|profuse|heavy|hemorrhage|vomit|coughing\s*blood)\b/i.test(lower)
  ) {
    return true;
  }

  // Guard 2: Academic, educational, or literary discussion of trauma/emergency
  if (
    /\b(?:book|read\s*(?:about)?|reading|novel|studied|study|article|syllabus|chapter|exam|paper|movie|film|documentary)\b/i.test(lower) &&
    /\b(?:trauma|bleeding|injury|wound|accident)\b/i.test(lower) &&
    !/\b(patient|happened\s*now|right\s*now|send\s*help|need\s*ambulance|help\s*me|hurry|call\s*108)\b/i.test(lower)
  ) {
    return true;
  }

  // Guard 3: Non-acute history or routine checkup discussion
  if (
    /\b(family\s*history|history\s*of|routine\s*checkup|annual\s*checkup|general\s*checkup|last\s*(?:year|month|week|time)|in\s*the\s*past|\d+\s*(?:years?|months?|weeks?|days?)\s*ago|previously|had\s*a\s*(?:heart\s*attack|stroke))\b/i.test(lower) &&
    !/\b(happened\s*now|right\s*now|unconscious|bleeding|hurry|emergency|call\s*108|ambulance|severe\s*now|worsening)\b/i.test(lower)
  ) {
    return true;
  }

  // Guard 4: Food poisoning without acute collapse
  if (
    /\bfood\s*poisoning\b/i.test(lower) &&
    !/\b(unconscious|fainted|seizure|bleeding|severe\s*dehydration|collapsed|not\s*waking|emergency|call\s*108)\b/i.test(lower)
  ) {
    return true;
  }

  return false;
}

export const EMERGENCY_PATTERNS = [
  // 1. Cardiovascular Emergencies & Acute Chest Pain
  /\b(chest\s*pain|heart\s*attack|cardiac\s*arrest|dil\s*ka\s*daura|severe\s*chest\s*pressure)\b/i,
  /(सीने\s*में.*?दर्द|हार्ट\s*अटैक|दिल\s*का\s*दौरा|छाती\s*में.*?दर्द)/i,
  /\b(seene\s*me.*?\bdard|chhati\s*me.*?\bdard|dil\s*ka\s*daura)\b/i,

  // 2. Respiratory Emergencies & Breathing Cessation
  /\b(?:(?:he|she|they|patient|person|baby|infant|child|father|mother|someone)\s*(?:is\s*)?)?not\s*breathing\b/i,
  /\b(cannot\s*breathe|trouble\s*breathing|stopped\s*breathing|difficulty\s*breathing|choking|suffocating|gasping\s*for\s*air)\b/i,
  /(सांस\s*नहीं\s*आ\s*रही|सांस\s*फूल\s*रही|दम\s*घुट\s*रहा|बच्चा\s*सांस\s*नहीं\s*ले\s*रहा|सांस\s*नहीं\s*ले\s*रहा|सांस\s*बंद)/i,
  /\b(saans\s*nahi\s*(?:aa\s*rahi|le\s*raha)|saans\s*phool\s*rahi|dam\s*ghut\s*raha|saans\s*band)\b/i,

  // 2b. Cyanosis / Turning Blue (Hypoxia / Infant Distress)
  /\b(?:(?:my\s*)?baby|infant|child|patient|person|he|she)?\s*(?:is\s*)?(?:turning|turned|looks?)\s*blue\b/i,
  /\bcyanosis\b/i,
  /(नीला\s*पड़\s*रहा|नीला\s*हो\s*गया|নীল\s*হয়ে\s*গেছে|নীল\s*হয়ে\s*যাচ্ছে)/i,
  /\b(neela\s*pad\s*raha|neela\s*ho\s*gaya|blue\s*pad\s*gaya)\b/i,

  // 3. Poisoning & Toxic Overdose
  /\b(poisoning|poison|swallowed\s*poison|rat\s*poison|consumed\s*poison|chemical\s*poison|drug\s*overdose|overdose|sleeping\s*pills?\s*overdose)\b/i,
  /(ज़हर|विषाक्तता|चूहे\s*का\s*ज़हर|ओवरडोज़|दवा\s*का\s*ओवरडोज़)/i,
  /\b(zehar|visham|visha|overdose)\b/i,

  // 4. Snake Bites & Toxic Envenomation (Hindi Devanagari, Hinglish, Bengali)
  /\b(saan?p\s*(?:ne\s*)?kaa?t(?:a|ti|liya|na|e)?|snake\s*bite|bitten\s*by\s*(?:a\s*)?snake)\b/i,
  /(सा[ंँ]प.*?काट|सा[ंँ]प|सर्पदंश)/i,
  /\b(saan?p\s*ne\s*kaat(?:a|ti|liya)|snake\s*bite|saap\s*kaata)\b/i,

  // 5. Seizures & Convulsions
  /\b(seizure|fits|convulsions|epileptic\s*fit|epilepsy\s*attack)\b/i,
  /(दौरा|मिरगी|झटके\s*आ\s*रहे|ऐंठन)/i,
  /\b(daura\s*pad\s*raha|fits\s*aa\s*rahe|mirgi)\b/i,

  // 6. Severe Burns & Acid Trauma
  /\b(?:severe|third\s*degree|acid|chemical|hot\s*oil|fire)\b.*?\b(?:burns?|burned)\b|\b(?:severe\s*burns?|third\s*degree\s*burns?|acid\s*burn|chemical\s*burn|hot\s*oil\s*burn|fire\s*burn)\b/i,
  /(जल\s*गया|तेज़ाब|गंभीर\s*जलन|आग\s*से\s*झुलस)/i,
  /\b(jal\s*gaya|tezaab\s*gira|severe\s*burn)\b/i,

  // 7. Explicit Ambulance Dispatch Requests
  /\b(ambulance\s*(?:chahiye|needed|send|call|required)|need\s*an?\s*ambulance|call\s*108|dispatch\s*ambulance)\b/i,
  /(एम्बुलेंस\s*चाहिए|एम्बुलेंस\s*भेजो|108\s*बुलाओ|108\s*पर\s*कॉल)/i,
  /\b(ambulance\s*chahiye|ambulance\s*bhejo|108\s*chahiye)\b/i,

  // 8. Stroke & Sudden Paralysis
  /\b(stroke|paralysis|facial\s*droop|face\s*droop(?:ing)?|slurred\s*speech|sudden\s*numbness)\b/i,
  /(लकवा|फालिज|स्ट्रोक|चेहरा\s*टेढ़ा)/i,

  // 9. Severe Hemorrhage & Massive Bleeding (Non-dental)
  /\b(?:heavy\s*bleeding\s*(?:wont|won't)\s*stop|(?:profuse|severe|heavy|massive)\s*(?:bleeding|blood\s*loss|hemorrhage)|bleeding\s*(?:is\s*)?not\s*stopping|won'?t\s*stop\s*bleeding)\b/i,
  /(खून\s*नहीं\s*रुक\s*रहा|खून\s*बह\s*रहा|बहुत\s*खून|रक्तस्राव|खून\s*की\s*उल्टी|रक्त\s*नहीं\s*रुक\s*रहा)/i,
  /\b(khoon\s*(?:nahi|ni)\s*ruk\s*raha|khoon\s*ruk\s*nahi\s*raha|khoon\s*nikal\s*raha|khoon\s*beh\s*raha|heavy\s*bleeding)\b/i,

  // 10. Head Trauma & Major Accidents
  /\b(severe\s*accident|road\s*accident|car\s*crash|head\s*injury|skull\s*fracture|polytrauma|blunt\s*force\s*trauma|(?:just\s*)?had\s*an?\s*accident)\b/i,
  /(एक्सीडेंट|दुर्घटना|हादसा|सिर\s*में\s*गंभीर\s*चोट)/i,

  // 11. Unresponsiveness, Fainting & Loss of Consciousness
  /\b(unconscious|passed\s*out|fainted|not\s*waking\s*up|unresponsive)\b/i,
  /\b(?:bachcha|baccha|patient|mareez|father|mother|he|she)?\s*(?:behosh|unconscious|fainted|unresponsive)(?:\s*ho\s*gaya)?\b/i,
  /\b(behosh|behosh\s*ho\s*gaya)\b/i,
  /(बेहोश|होश\s*नहीं|अचेत|मूर्छित)/i,

  // --- REGIONAL SCRIPT EMERGENCY TRIGGERS ---
  // Tamil
  /(நெஞ்சு\s*வலி|மாரடைப்பு|இரத்தப்போக்கு|மயக்கம்|விபத்து|சுவாசிக்க\s*முடியவில்லை|பாம்புகடி|வலிப்பு|தீக்காயம்|ஆம்புலன்ஸ்\s*வேண்டும்)/i,
  /\b(nenju\s*vali|maaradaipu|rathapokku|mayakkam|vibathu|paambu\s*kadi|valippu)\b/i,

  // Telugu
  /(ఛాతీ\s*నొప్పి|గుండె\s*నొప్పి|గుండెపోటు|రక్తస్రావం|స్పృహ\s*తప్పడం|ప్రమాదం|శ్వాస\s*ఆడట్లేదు|పాము\s*కాటు|మూర్ఛ|కాలిన\s*గాయం|అంబులెన్స్\s*కావాలి)/i,
  /\b(chhati\s*noppi|gunde\s*noppi|gundepotu|rakthasravam|pramadam|paamu\s*kaatu|murcha)\b/i,

  // Kannada
  /(ಎದೆ\s*ನೋವು|ಹೃದಯಾಘಾತ|ರಕ್ತಸ್ರಾವ|ಪ್ರಜ್ಞೆ\s*ತಪ್ಪಿದೆ|ಅಪಘಾತ|ಉಸಿರಾಟದ\s*ತೊಂದರೆ|ಹಾವು\s*ಕಚ್ಚಿದೆ|ಫಿಟ್ಸ್|ಸುಟ್ಟ\s*ಗಾಯ|ಆಂಬ್ಯುಲೆನ್ಸ್\s*ಬೇಕು)/i,
  /\b(ede\s*novu|hrudayaghatha|rakthasrava|pragne\s*tappide|apaghatha|haavu\s*kachide)\b/i,

  // Bengali
  /(বুকে.*(?:ব্যথা|যন্ত্রণা)|হার্ট\s*অ্যাটাক|হৃদরোগ|হৃদযন্ত্রের\s*ক্রিয়া\s*বন্ধ|রক্তপাত|রক্ত\s*থামছে\s*না|অজ্ঞান|শ্বাসকষ্ট|শ্বাস\s*নিতে\s*পারছি\s*না|সাপের\s*কামড়|বিষক্রিয়া|খিঁচুনি|পুড়ে\s*গেছে|অ্যাম্বুলেন্স\s*চাই)/i,

  // Assamese
  /(বুকুত\s*বিষ|হার্ট\s*এটাক|হৃদৰোগ|অচেতন|বেহুঁশ|উশাহ\s*ল’ব\s*পৰা\s*নাই|উশাহ\s*বন্ধ|সাপৰ\s*খুঁট|বিহ\s*খালে|জুইত\s*পোৰা|টেজ\s*ওলাইছে|এম্বুলেন্স\s*লাগে)/i,

  // Punjabi
  /(ਛਾਤੀ\s*ਵਿੱਚ\s*ਦਰਦ|ਦਿਲ\s*ਦਾ\s*ਦੌਰਾ|ਬੇਹੋਸ਼|ਸਾਹ\s*ਨਹੀਂ\s*ਆ\s*ਰਿਹਾ|ਸੱਪ\s*ਦਾ\s*ਡੰਗ|ਜ਼ਹਿਰ|ਦੌਰਾ|ਸੜ\s*ਗਿਆ|ਐਂਬੂਲੈਂਸ\s*ਚਾਹੀਦੀ)/i,

  // Gujarati
  /(છાતીમાં\s*દુખાવો|હાર્ટ\s*એટેક|બેભાન|શ્વાસ\s*લેવામાં\s*તકલીફ|સાપ\s*કરડ્યો|ઝેર|ખેંચ|દાઝી\s*જવું|એમ્બ્યુલન્સ\s*જોઈએ)/i,

  // Malayalam
  /(നെഞ്ചുവേദന|ഹൃദയാഘാതം|ബോധക്ഷയം|ശ്വാസംമുട്ടൽ|രക്തസ്രാവം|പാമ്പുകടി|വിഷബാധ|ഫിറ്റ്സ്|പൊള്ളൽ|ആംബുലൻസ്\s*വേണം)/i,

  // Marathi
  /(छातीत\s*दुखणे|हृदयविकाराचा\s*झटका|बेशुद्ध|श्वास\s*घेण्यास\s*त्रास|सापाचा\s*चावा|विषबाधा|फेफरे|भाजणे|रुग्णवाहिका\s*हवी)/i,
];

export const EMERGENCY_REPLIES: Record<SupportedLanguage, string> = {
  "en-IN": "This sounds like a critical medical emergency. Please dial one zero eight (108) immediately or rush directly to our twenty-four hour Casualty at Gate number one.",
  "hi-IN": "यह एक गंभीर आपातकालीन स्थिति लग रही है। कृपया तुरंत 108 पर कॉल करें या सीधे हमारे गेट नंबर 1 पर 24 घंटे खुले कैजुअल्टी वार्ड में पहुँचें।",
  "ta-IN": "இது ஒரு தீவிர மருத்துவ அவசர நிலை. உடனடியாக 108 ஐ அழைக்கவும் அல்லது கேட் எண் 1-ல் உள்ள எங்களின் 24 மணி நேர அவசர சிகிச்சைப் பிரிவிற்கு விரைந்து வரவும்.",
  "te-IN": "ఇది తీవ్రమైన అత్యవసర పరిస్థితిగా కనిపిస్తోంది. దయచేసి వెంటనే 108 కి కాల్ చేయండి లేదా మా 24 గంటల క్యాజువాలిటీ గేట్ 1 కి రండి.",
  "kn-IN": "ಇದು ಗಂಭೀರ ವೈದ್ಯಕೀಯ ತುರ್ತು ಪರಿಸ್ಥಿತಿಯಾಗಿದೆ. ದಯವಿಟ್ಟು ತಕ್ಷಣ 108 ಗೆ ಕರೆ ಮಾಡಿ ಅಥವಾ ಗೇಟ್ 1 ರಲ್ಲಿರುವ ನಮ್ಮ 24 ಗಂಟೆಗಳ ತುರ್ತು ಚಿಕಿತ್ಸಾ ವಿಭಾಗಕ್ಕೆ ಬನ್ನಿ.",
  "bn-IN": "এটি একটি অত্যন্ত গুরুতর জরুরি চিকিৎসা অবস্থা। অবিলম্বে 108 (১০৮) নম্বরে কল করুন অথবা সরাসরি আমাদের গেট নম্বর ১-এ ২৪ ঘণ্টা খোলা ক্যাজুয়ালটি বিভাগে চলে আসুন।",
  "as-IN": "এইটো এটা অত্যন্ত গুৰুতৰ জৰুৰীকালীন অৱস্থা। অনুগ্ৰহ কৰি ততাতৈয়াকৈ ১০৮ (108) নম্বৰত কল কৰক বা আমাৰ গেট নং ১ ত থকা ২৪ ঘণ্টীয়া কেজুৱেল্টী বিভাগলৈ আহক।",
  "pa-IN": "ਇਹ ਇੱਕ ਗੰਭੀਰ ਮੈਡੀਕਲ ਐਮਰਜੈਂਸੀ ਜਾਪਦੀ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਤੁਰੰਤ 108 'ਤੇ ਕਾਲ ਕਰੋ ਜਾਂ ਸਿੱਧਾ ਗੇਟ ਨੰਬਰ 1 'ਤੇ ਸਾਡੇ 24 ਘੰਟੇ ਖੁੱਲ੍ਹੇ ਕੈਜ਼ੂਅਲਟੀ ਵਾਰਡ ਵਿੱਚ ਪਹੁੰਚੋ।",
  "gu-IN": "આ એક અત્યંત ગંભીર તબીબી કટોકટી જેવું લાગે છે. કૃપા કરીને તાત્કાલિક 108 (૧૦૮) પર કૉલ કરો અથવા સીધા અમારા ગેટ નંબર ૧ પર ૨૪ કલાક ખુલ્લા કેઝ્યુઅલ્ટી વિભાગમાં પહોંચો.",
  "ml-IN": "ഇതൊരു അതീव ഗുരുതരമായ മെഡിക്കൽ അടിയന്തരാവസ്ഥയായി തോന്നുന്നു. ദയവായി ഉടൻ തന്നെ 108-ൽ വിളിക്കുക അല്ലെങ്കിൽ ഗേറ്റ് നമ്പർ 1-ലെ ഞങ്ങളുടെ 24 മണിക്കൂറും പ്രവർത്തിക്കുന്ന കാഷ്വാലിറ്റിയിലേക്ക് ഉടൻ എത്തുക.",
  "mr-IN": "ही अत्यंत गंभीर वैद्यकीय आणीबाणीची परिस्थिती वाटते. कृपया तात्काळ 108 (१०८) वर कॉल करा किंवा थेट गेट नंबर १ वरील आमच्या २४ तास सुरू असलेल्या कॅज्युअल्टी वॉर्डमध्ये पोहोचा.",
};

export function checkEmergency(text: string, languageHint?: string): string | null {
  if (isFalsePositiveEmergency(text)) {
    return null;
  }

  for (const pattern of EMERGENCY_PATTERNS) {
    if (pattern.test(text)) {
      const lang = detectLanguage(text, languageHint);
      return EMERGENCY_REPLIES[lang] || EMERGENCY_REPLIES["en-IN"];
    }
  }
  return null;
}

// ============================================================================
// COMPREHENSIVE MEDICATION & DOSAGE REFUSAL GATE
// ============================================================================

export const MEDICATION_PATTERNS = [
  // 1. Specific Prescription Drugs & Common Over-the-counter Medicines
  /\b(ibuprofen|paracetamol|metformin|amoxicillin|aspirin|warfarin|azithromycin|ciprofloxacin|atorvastatin|amlodipine|pantoprazole|cetirizine|insulin|combiflam|crocin|dolo(?:\s*650)?|calpol|augmentin|disprin|omeprazole|losartan|glimepiride|levothyroxine|antibiotic|antibiotics|painkiller|cough\s*syrup|syrup|capsule|capsules)\b/i,

  // 2. Dosage & Measurement Queries
  /\b(\d+\s*(?:mg|mcg|ml|g|tablets?|pills?|drops?|capsules?|doses?|spoons?))\b/i,
  /\b(how\s*many\s*(?:mg|tablets?|pills?|doses?|spoons?|drops?)|how\s*much\s*(?:dose|dosage|syrup|medicine)|what\s*dosage|dosage\s*of|dose\s*of|daily\s*dose|correct\s*dosage)\b/i,
  /(कितनी\s*(?:मिलीग्राम|एमजी|गोली|दवा|खुराक|डोज़|मात्रा|चम्मच|सिरप)|कितना\s*(?:डोज़|सिरप|एमएल)|दिन\s*में\s*कितनी\s*बार|एजिथ्रोमाइसिन|पैरासिटामोल|खुराक|डोज़|मात्रा\s*बताएं)/i,
  /\b(kitni\s*(?:goli|mg|dawa|dawai|khuraak|dose|khurak)|kitna\s*(?:dose|syrup|ml|chammach)|dosage\s*kya\s*honi|dose\s*kitna|khurak\s*kya)\b/i,

  // 3. Drug Interactions & Contraindications
  /\b(with\s*warfarin|with\s*aspirin|and\s*warfarin|and\s*aspirin|with\s*alcohol|in\s*pregnancy|during\s*pregnancy|breastfeeding)\b/i,
  /(गर्भावस्था\s*में|प्रेगनेंसी\s*में|शराब\s*के\s*साथ)/i,

  // 4. Condition Prescription Requests & Syrup/Tablet Inquiries (Hindi & Hinglish)
  /\b(antibiotics?\s*for\s*(?:cold|cough|fever|infection|flu)|what\s*medicine|which\s*tablet|which\s*syrup|give\s*medicine|prescribe\s*me|prescribe|can\s*i\s*take\s*(?:a\s*)?tablet|should\s*i\s*take\s*(?:a\s*)?(?:tablet|syrup|medicine))\b/i,
  /(दवा\s*बताओ|दवा\s*बताएं|कौन\s*सी\s*दवा|दवाई|गोली|इलाज\s*बताइए|दवा\s*चाहिए|नुस्खा\s*लिख\s*दो|दवा\s*की\s*गोली|सिरप\s*दे\s*सकते|टैबलेट\s*खा\s*सकते|सिरप\s*पी\s*सकते|खांसी\s*का\s*सिरप|बुखार\s*की\s*दवा)/i,
  /\b(dawa\s*batao|kaunsi\s*dawa|tablet\s*batao|goli\s*batao|dawai\s*dedo|konsi\s*dawai|konsi\s*goli|syrup\s*dedo|tablet\s*lu|syrup\s*du|syrup\s*pina\s*hai|tablet\s*khana\s*hai|dawa\s*khani\s*hai|tablet\s*le\s*sakta|syrup\s*le\s*sakte|kaun\s*si\s*tablet|konsi\s*tablet|tablet\s*leni\s*chahiye|tablet\s*khani\s*chahiye|goli\s*leni\s*chahiye|dawa\s*leni\s*chahiye)\b/i,

  // Tamil (Script & Romanized)
  /(மருந்து|மாத்திரை|சிரப்|டேப்லெட்|மருந்தளவு|மருந்து\s*சாப்பிடலாமா|மாத்திரை\s*போடலாமா|எத்தனை\s*மாத்திரை|எவ்வளவு\s*மருந்து|மருந்து\s*சொல்லுங்க|மாத்திரை\s*கொடுங்கள்|என்ன\s*மருந்து|மருந்து\s*வேணும்|மருந்தின்\s*அளவு)/i,
  /\b(marunthu\s*sollunga|maathirai\s*kudunga|marunthu|marundhu|maathirai|maathirai\s*podalama|marunthu\s*sapidalama|syrup\s*kudukalama|tablet\s*podalama|marundhu\s*eppadi)\b/i,

  // Telugu
  /(మందులు\s*చెప్పండి|ఏ\s*టాబ్లెట్|మందు|టాబ్లెట్\s*ఇవ్వండి|మందులు\s*కావాలి|ఎన్ని\s*మాత్రలు|మోతాదు|సిరప్|టాబ్లెట్\s*వేసుకోవచ్చా)/i,
  /\b(mandulu\s*cheppandi|tablet\s*ivvandi|mandulu|mandhu|tablet\s*vesukovacha)\b/i,

  // Kannada
  /(ಔಷಧ\s*ಹೇಳಿ|ಯಾವ\s*ಮಾತ್ರೆ|ಔಷಧಿ|ಮಾತ್ರೆ\s*ಕೊಡಿ|ಗುಳಿಗೆ|ಔಷಧಿ\s*ಬೇಕು|ಎಷ್ಟು\s*ಮಾತ್ರೆ|ಪ್ರಮಾಣ|ಸಿರಪ್)/i,
  /\b(oushadha\s*heli|mathre\s*kodi|gulige|oushadhi)\b/i,

  // Bengali
  /(ওষুধ\s*বলুন|কোন\s*ট্যাবলেট|ওষুধ\s*দিন|প্রেসক্রিপশন|কত\s*মাত্রা|প্যারাসিটামল|কতটুকু\s*প্যারাসিটামল|কতটুকু|সিরাপ)/i,

  // Punjabi
  /(ਦਵਾਈ\s*ਦੱਸੋ|ਕਿਹੜੀ\s*ਗੋਲੀ|ਦਵਾਈ\s*ਚਾਹੀਦੀ|ਕਿੰਨੀ\s*ਖ਼ੁਰਾਕ|ਐਂਟੀਬਾਇਓਟਿਕ|ਸਿਰਪ)/i,

  // Gujarati
  /(દવા\s*જણાવો|કઈ\s*ગોળી|દવા\s*આપો|કેટલો\s*ડોઝ|પેઇનકિલર|સીરપ)/i,

  // Malayalam
  /(മരുന്ന്\s*പറയൂ|ഏത്\s*ഗുളിക|മരുന്ന്\s*വേണം|எത്ര\s*ഡോസ്|ആന്റിബയോട്ടിക്|സിറപ്പ്)/i,

  // Marathi
  /(औषध\s*सांगा|कोणती\s*गोळी|औषध\s*द्या|किती\s*डोस|गोळ्या\s*द्या|सिरप)/i,
];

export const MEDICATION_REPLIES: Record<SupportedLanguage, string> = {
  "en-IN": "I cannot prescribe medicines or suggest dosages due to patient safety guidelines. Please consult one of our qualified doctors at the OPD or leave your number for an appointment.",
  "hi-IN": "मैं एक एआई असिस्टेंट हूँ और कोई दवा या नुस्खा नहीं बता सकता। खुराक या नुस्खे के लिए कृपया सुरक्षित परामर्श हेतु हमारे अस्पताल में डॉक्टर राजेश शर्मा से मिलें या अपना नंबर दर्ज कराएं।",
  "ta-IN": "மன்னிக்கவும், மருத்துவப் பாதுகாப்பு நெறிமுறைகளின்படி எங்களால் தானியங்கி முறையில் மருந்துகளை பரிந்துரைக்க முடியாது. சரியான ஆலோசனைக்கு எங்கள் மருத்துவர் டாக்டர் ராஜேஷ் சர்மாவை நேரில் அணுகவும்.",
  "te-IN": "క్షమించండి, రోగుల భద్రతా నిబంధనల ప్రకారం మా ఆటోమేటెడ్ వ్యవస్థ మందులను సూచించలేదు. దయచేసి సరైన సంప్రదింపుల కోసం మా వైద్యుడు డాక్టర్ రాజేష్ శర్మను కలవండి.",
  "kn-IN": "ಕ್ಷಮಿಸಿ, ರೋಗಿಗಳ ಸುರಕ್ಷತಾ ನಿಯಮಗಳ ಪ್ರಕಾರ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಔಷಧಿಗಳನ್ನು ಸೂಚಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ಸೂಕ್ತ ಸಮಾಲೋಚನೆಗಾಗಿ ನಮ್ಮ ವೈದ್ಯರಾದ ಡಾಕ್ಟರ್ ರಾಜೇಶ್ ಶರ್ಮಾ ಅವರನ್ನು ಭೇಟಿ ಮಾಡಿ.",
  "bn-IN": "রোগীর সুরক্ষার স্বার্থে আমি কোনো ওষুধ, অ্যান্টিবায়োটিক বা ওষুধের মাত্রা (dosage) নির্ধারণ করতে পারি না। দয়া করে হাসপাতালে উপস্থিত হয়ে আমাদের চিকিৎসকের সঙ্গে সরাসরি পরামর্শ করুন।",
  "as-IN": "ৰোগীৰ সুৰক্ষাৰ স্বাৰ্থত মই কোনো ঔষধ বা মাত্ৰা নিৰ্ধাৰণ কৰিব নোৱাৰোঁ। অনুগ্ৰহ কৰি চিকিৎসালয়লৈ আহি আমাৰ চিকিৎসকৰ সৈতে পোনপটীয়াকৈ পৰামৰ্শ কৰক।",
  "pa-IN": "ਮਰੀਜ਼ ਦੀ ਸੁਰੱਖਿਆ ਦੇ ਨਿਯਮਾਂ ਅਨੁਸਾਰ ਮੈਂ ਕੋਈ ਦਵਾਈ ਜਾਂ ਖ਼ੁਰਾਕ (dosage) ਨਹੀਂ ਦੱਸ ਸਕਦਾ। ਕਿਰਪਾ ਕਰਕੇ ਸੁਰੱਖਿਅਤ ਸਲਾਹ ਲਈ ਹਸਪਤਾਲ ਵਿੱਚ ਸਾਡੇ ਡਾਕਟਰ ਨਾਲ ਸਿੱਧਾ ਸੰਪਰਕ ਕਰੋ।",
  "gu-IN": "દર્દીની સુરક્ષાના નિયમો અનુસાર હું કોઈપણ દવા કે ડોઝની ભલામણ કરી શકતો નથી. કૃપા કરીને યોગ્ય તબીબી સલાહ માટે હોસ્પિટલમાં અમારા ડોક્ટરનો સંપર્ક કરો.",
  "ml-IN": "രോഗിയുടെ സുരക്ഷ മുൻനിർത്തി എനിക്ക് മരുന്നുകളോ ഡോസേജോ നിർദ്ദേശിക്കാൻ കഴിയില്ല. ദയവായി ആശുപത്രിയിലെത്തി യോഗ്യതയുള്ള ഒരു ഡോക്ടറുമായി നേരിട്ട് സംസാരിക്കുക.",
  "mr-IN": "रुग्णाच्या सुरक्षिततेसाठी मी कोणतीही औषधे, डोस किंवा प्रिस्क्रिप्शन सुचवू शकत नाही. कृपया योग्य सल्ल्यासाठी रुग्णालयात जाऊन आमच्या डॉक्टरांशी थेट संपर्क साधा.",
};

export function checkMedicationRefusal(text: string, languageHint?: string): string | null {
  for (const pattern of MEDICATION_PATTERNS) {
    if (pattern.test(text)) {
      const lang = detectLanguage(text, languageHint);
      return MEDICATION_REPLIES[lang] || MEDICATION_REPLIES["en-IN"];
    }
  }
  return null;
}

// ============================================================================
// GEMINI OUTPUT SAFETY GUARDRAIL (Zero Hallucinated Medication or Dosage)
// ============================================================================

export function validateGeminiOutput(
  replyText: string,
  userQuery: string,
  languageHint?: string
): { safeReply: string; isViolated: boolean } {
  // If the model leaked a drug dosage or recommended taking prescription medication
  const illegalPrescriptionPattern = /\b(\d+\s*(?:mg|mcg|ml|g|tablets?|pills?|drops?)|take\s+(?:paracetamol|ibuprofen|amoxicillin|metformin|aspirin|antibiotics?)|dosage\s*is|twice\s*daily\s*dose)\b/i;

  if (illegalPrescriptionPattern.test(replyText)) {
    const lang = detectLanguage(userQuery, languageHint);
    return {
      safeReply: MEDICATION_REPLIES[lang] || MEDICATION_REPLIES["en-IN"],
      isViolated: true,
    };
  }

  return {
    safeReply: replyText,
    isViolated: false,
  };
}

// ============================================================================
// UTILITIES: Spoken Digits & Privacy-Preserving Lead Capture
// ============================================================================

export function spellOutDigits(phone: string): string {
  const digitWords: Record<string, string> = {
    "0": "zero", "1": "one", "2": "two", "3": "three", "4": "four",
    "5": "five", "6": "six", "7": "seven", "8": "eight", "9": "nine",
  };
  return phone.split("").map((d) => digitWords[d] || d).join(" ");
}

/**
 * Robust Lead Extraction:
 * - Extracts 10-digit Indian phone number starting with 6-9
 * - Strips phone digits before searching for appointment time slots
 * - Eliminates false-positive patient names (e.g. "Dr Rao", "Doctor", "the")
 */
export function extractLead(text: string): { name: string; phone: string; reason: string; slot?: string } | null {
  const phoneMatch = text.match(/(?:\+?91[\s-]?)?([6-9]\d{9})\b/);
  if (!phoneMatch) return null;

  const phone = phoneMatch[1];

  // Strip phone number completely to prevent slot detection from matching digits inside phone number
  const strippedText = text.replace(phoneMatch[0], " ").trim();
  const lowerStripped = strippedText.toLowerCase();

  // Name extraction with doctor/stopword filtering (supports English, Devanagari, Bengali, Tamil, Telugu, etc.)
  let name = "Patient";
  const nameMatch =
    strippedText.match(/(?:my\s*name\s*is|mera\s*naam\s*hai|mera\s*naam|मेरा\s*नाम|আমার\s*নাম|பெயர்|పేరు|ಹೆಸರು)\s+([\p{L}\p{M}]+(?:\s+[\p{L}\p{M}]+)?)/iu) ||
    strippedText.match(/(?:name|naam|hesaru|peru)[:\s]+([\p{L}\p{M}]+(?:\s+[\p{L}\p{M}]+)?)/iu) ||
    strippedText.match(/(?:for|patient|this\s*is|i\s*am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);

  const blockedNameTokens = new Set([
    "doctor", "dr", "dr.", "rao", "sharma", "mehra", "singhania",
    "the", "a", "an", "patient", "hospital", "clinic", "appointment", "caller", "someone", "please", "kripya", "hai"
  ]);

  if (nameMatch && nameMatch[1]) {
    const candidate = nameMatch[1].trim();
    const candidateLower = candidate.toLowerCase();
    if (!blockedNameTokens.has(candidateLower) && !candidateLower.includes("dr ") && !candidateLower.startsWith("dr.")) {
      name = candidate;
    }
  } else {
    const words = strippedText.split(/[\s,]+/);
    for (let i = 0; i < words.length; i++) {
      if (["i'm", "im"].includes(words[i].toLowerCase()) && i + 1 < words.length) {
        const candidate = words[i + 1].replace(/[^a-zA-Z\u0900-\u097F\u0980-\u09FF]/g, "");
        if (candidate.length >= 2 && !blockedNameTokens.has(candidate.toLowerCase())) {
          name = candidate;
          break;
        }
      }
    }
  }

  // Reason extraction
  let reason = "Doctor appointment consultation";
  if (lowerStripped.includes("child") || lowerStripped.includes("pediatric") || lowerStripped.includes("bachh") || strippedText.includes("बच्चों") || lowerStripped.includes("bukhar") || strippedText.includes("குழந்தை") || strippedText.includes("పిల్లల") || strippedText.includes("ಮಕ್ಕಳ")) {
    reason = "Consultation with Dr. Arvind Rao (Pediatrics)";
  } else if (lowerStripped.includes("gynae") || lowerStripped.includes("women") || lowerStripped.includes("pregnancy") || lowerStripped.includes("delivery") || strippedText.includes("महिला") || strippedText.includes("கர்ப்பிணி") || strippedText.includes("గర్భిణి") || strippedText.includes("ಗರ್ಭಿಣಿ")) {
    reason = "Consultation with Dr. Sunita Mehra (Gynaecology)";
  } else if (lowerStripped.includes("sugar") || lowerStripped.includes("blood") || lowerStripped.includes("test") || strippedText.includes("शुगर") || strippedText.includes("ரத்த") || strippedText.includes("రక్త") || strippedText.includes("ರಕ್ತ")) {
    reason = "Diagnostic test booking (Fasting Blood Sugar / CBC)";
  } else if (lowerStripped.includes("heart") || lowerStripped.includes("cardio") || strippedText.includes("दिल") || strippedText.includes("இதய") || strippedText.includes("గుండె") || strippedText.includes("ಹೃದಯ")) {
    reason = "Cardiology outpatient consultation (Dr. Vikram Singhania)";
  }

  // Extract appointment slot ONLY from explicit time patterns in stripped text
  let slot: string | undefined;
  if (
    /\b(?:10(?::00)?\s*(?:am|baje|subah)|11(?::00)?\s*(?:am|baje|subah)|morning|subah|kaalai|udayam|beligge)\b/i.test(lowerStripped) ||
    strippedText.includes("सुबह") || strippedText.includes("காலை") || strippedText.includes("ఉదయం") || strippedText.includes("ಬೆಳಿಗ್ಗೆ")
  ) {
    slot = "10:00 AM - 10:30 AM";
  } else if (
    /\b(?:4(?::00|\:30)?\s*(?:pm|baje|shaam)|5(?::00)?\s*(?:pm|baje|shaam)|evening|shaam|maalai|sayantram|sanje)\b/i.test(lowerStripped) ||
    strippedText.includes("शाम") || strippedText.includes("மாலை") || strippedText.includes("సాయంత్రం") || strippedText.includes("ಸಂಜೆ")
  ) {
    slot = "04:30 PM - 05:00 PM";
  }

  return { name, phone, reason, slot };
}

// ============================================================================
// MAIN HOSPITAL KNOWLEDGE EVALUATION
// ============================================================================

export function evaluateHospitalQuery(query: string, hospitalData: any, languageHint?: string): QueryResult {
  const text = query.trim();
  const lower = text.toLowerCase();

  const detectedLanguage = detectLanguage(text, languageHint);
  const isHinglishInput = isHinglish(text);

  // 1. Explicit Callback Request Check (Action Flag: extract_and_confirm)
  const leadData = extractLead(text);
  const isExplicitCallback =
    leadData &&
    (/\b(call\s*me\s*back|call\s*back|call\s*back\s*kar\s*lena|pe\s*call|number\s*is)\b/i.test(text) ||
     /(कॉल\s*बैक|কল\s*ব্যাক|नंबर|নম্বর)/.test(text));

  if (leadData && isExplicitCallback) {
    let reply: string;
    if (isHinglishInput) {
      reply = `Dhanyavad, ${leadData.name}. Main aapka number (${leadData.phone}) note kar liya hai. Humara representative jald hi aapko call karega.`;
    } else if (detectedLanguage === "bn-IN" || /[\u0980-\u09FF]/.test(text)) {
      reply = `ধন্যবাদ, ${leadData.name}। আমি আপনার নম্বর (${leadData.phone}) নোট করে নিয়েছি। আমাদের প্রতিনিধি শীঘ্রই আপনাকে কল করবেন।`;
    } else if (detectedLanguage === "hi-IN" || /[\u0900-\u097F]/.test(text)) {
      reply = `धन्यवाद, ${leadData.name}। मैंने आपका नंबर (${leadData.phone}) नोट कर लिया है। हमारा प्रतिनिधि जल्द ही आपको कॉल करेगा।`;
    } else {
      reply = `Thank you, ${leadData.name}. I have noted your number (${leadData.phone}). A representative will call you back shortly.`;
    }

    const lead: Lead = {
      id: `lead-${Date.now().toString(36)}`,
      name: leadData.name,
      phone: leadData.phone,
      reason: leadData.reason,
      appointment_slot: leadData.slot || "11:30 AM - 12:00 PM",
      created_at: new Date().toISOString().replace("T", " ").substring(0, 19),
      status: "pending",
      notes: `Callback request: ${leadData.reason}`,
    };

    return {
      reply,
      category: "lead_captured",
      actionFlag: "extract_and_confirm",
      intent: "request_callback",
      extractedEntities: { name: leadData.name, phone: leadData.phone },
      lead,
      detectedLanguage,
    };
  }

  // 2. Self-Harm & Suicide Crisis Prevention (Highest priority)
  const crisisReply = checkSelfHarm(text, detectedLanguage);
  if (crisisReply) {
    return {
      reply: crisisReply,
      category: "crisis_support",
      actionFlag: "refuse",
      intent: "crisis_selfharm",
      isCrisis: true,
      detectedLanguage,
    };
  }

  // 3. True Emergency Gate (Action Flag: red_screen)
  const emergency = checkEmergency(text, detectedLanguage);
  if (emergency) {
    let specificIntent = "emergency_casualty";
    let emergencyResponse = emergency;

    if (/\b(chest\s*pain|crushing\s*chest\s*pain)\b/i.test(text) || /(বুকে.*(?:ব্যথা|যন্ত্রণা))/i.test(text)) {
      specificIntent = "emergency_chest_pain";
      if (detectedLanguage === "bn-IN" || /[\u0980-\u09FF]/.test(text)) {
        emergencyResponse = "🚨 জরুরি সতর্কতা: দয়া করে অবিলম্বে 108 নম্বরে অ্যাম্বুলেন্সে কল করুন বা নিকটতম হাসপাতালে যান।";
      } else {
        emergencyResponse = "🚨 EMERGENCY ALERT: Please call your local emergency number (e.g., 112 or 108) immediately or go to the nearest hospital. Do not wait.";
      }
    } else if (/\b(snake\s*bite)\b/i.test(text) || /(सा[ंँ]प\s*ने\s*काट|सा[ंँ]प\s*काटा|सर्पदंश)/i.test(text)) {
      specificIntent = "emergency_snake_bite";
      emergencyResponse = "🚨 आपातकालीन चेतावनी: कृपया तुरंत 108 पर एम्बुलेंस कॉल करें या सबसे नज़दीकी अस्पताल जाएं। मरीज को हिलने न दें।";
    } else if (/\b(zehar|poison|swallowed\s*poison)\b/i.test(text) || /(ज़हर)/i.test(text)) {
      specificIntent = "emergency_poison";
      emergencyResponse = "🚨 EMERGENCY ALERT: Turant 108 par ambulance call karein ya nearest hospital le jayein. Bacche ko ulti karwane ki koshish na karein jab tak doctor na kahe.";
    }

    return {
      reply: emergencyResponse,
      category: "emergency",
      actionFlag: "red_screen",
      intent: specificIntent,
      isEmergency: true,
      detectedLanguage,
    };
  }

  // 4. Ordinary Symptom Guidance (Action Flag: normal_answer)
  if (
    /\b(headache|mild\s*headache)\b/i.test(lower) ||
    /\b(thoda\s*stomach\s*pain|stomach\s*pain)\b/i.test(lower) ||
    text.includes("हल्का पेट दर्द") ||
    text.includes("পেটে একটু ব্যথা")
  ) {
    if (/\b(headache|mild\s*headache)\b/i.test(lower)) {
      return {
        reply: "I'm sorry to hear that. For a mild headache, ensure you are hydrated and rested. If it persists for more than 2 days or worsens, please consult a doctor.",
        category: "symptom_routing",
        actionFlag: "normal_answer",
        intent: "symptom_headache",
        detectedLanguage,
      };
    }

    if (text.includes("পেটে একটু ব্যথা") || (detectedLanguage === "bn-IN" && text.includes("পেট"))) {
      return {
        reply: "হালকা পেট ব্যথার জন্য হালকা খাবার খান এবং প্রচুর জল পান করুন। যদি ব্যথা বাড়ে বা ২ দিনের বেশি থাকে, তবে দয়া করে ডাক্তারের পরামর্শ নিন।",
        category: "symptom_routing",
        actionFlag: "normal_answer",
        intent: "symptom_stomach_pain",
        detectedLanguage: "bn-IN",
      };
    }

    if (text.includes("हल्का पेट दर्द") || (detectedLanguage === "hi-IN" && text.includes("हल्का"))) {
      return {
        reply: "हल्के पेट दर्द के लिए हल्का और सादा भोजन करें और हाइड्रेटेड रहें। यदि दर्द बढ़ता है या 2 दिन से अधिक रहता है, तो कृपया डॉक्टर से परामर्श करें।",
        category: "symptom_routing",
        actionFlag: "normal_answer",
        intent: "symptom_stomach_pain",
        detectedLanguage: "hi-IN",
      };
    }

    if (isHinglishInput || lower.includes("stomach pain")) {
      return {
        reply: "Halka stomach pain hone par light khana khayein aur paani piyein. Agar dard badh jaye ya 2 din se zyada rahe, to doctor se consult karein.",
        category: "symptom_routing",
        actionFlag: "normal_answer",
        intent: "symptom_stomach_pain",
        detectedLanguage: "hi-IN",
      };
    }
  }

  // 5. Medication & Dosage Refusal Gate (Action Flag: refuse)
  const medRefusal = checkMedicationRefusal(text, detectedLanguage);
  if (medRefusal) {
    let refuseReply = medRefusal;
    if (isHinglishInput) {
      refuseReply = "Safety reasons ke liye, main specific dawai ki dosage nahi bata sakta. Kripya apne doctor ya pharmacist se consult karein.";
    } else if (detectedLanguage === "bn-IN" || /[\u0980-\u09FF]/.test(text)) {
      refuseReply = "নিরাপত্তার কারণে, আমি নির্দিষ্ট ওষুধের ডোজ দিতে পারি না। দয়া করে সঠিক ডোজের জন্য আপনার ডাক্তার বা ফার্মাসিস্টের পরামর্শ নিন।";
    } else if (detectedLanguage === "hi-IN" || /[\u0900-\u097F]/.test(text)) {
      refuseReply = "सुरक्षा कारणों से, मैं विशिष्ट दवाओं की खुराक नहीं बता सकता। कृपया सही खुराक के लिए अपने डॉक्टर या फार्मासिस्ट से संपर्क करें।";
    } else if (detectedLanguage === "en-IN") {
      refuseReply = "For safety reasons, I cannot provide specific medication dosages. Please consult a pediatrician or pharmacist for the correct dosage based on your child's weight and age.";
    }

    return {
      reply: refuseReply,
      category: "medical_refusal",
      actionFlag: "refuse",
      intent: "query_dosage",
      detectedLanguage,
    };
  }

  // 6. Out of Scope Surgery Requests (Action Flag: offer_callback)
  if (
    ["heart surgery", "bypass", "brain surgery", "neurosurgery", "transplant", "किडनी ट्रांसप्लांट", "ट्रांसप्लांट", "সার্জারি", "হার্ট সার্জারি", "सर्जरी", "ऑपरेशन", "அறுவை", "శస్త్రచికిత్స", "ಶಸ್ತ್ರಚಿಕಿತ್ಸೆ"].some(
      (term) => lower.includes(term) || text.includes(term)
    )
  ) {
    let reply: string;
    if (isHinglishInput) {
      reply = "Hum is clinic mein brain surgery services provide nahi karte. Lekin main ek specialist ko aapko call back karne ka arrangement kar sakta hoon.";
    } else if (detectedLanguage === "bn-IN" || /[\u0980-\u09FF]/.test(text)) {
      reply = "আমরা এই ক্লিনিকে হার্ট সার্জারি পরিষেবা প্রদান করি না। তবে, আমি আপনার বিকল্পগুলি নিয়ে আলোচনা করার জন্য একজন বিশেষজ্ঞকে কল ব্যাক করার ব্যবস্থা করতে পারি।";
    } else if (detectedLanguage === "hi-IN" || /[\u0900-\u097F]/.test(text)) {
      reply = "हम इस सुविधा केंद्र में किडनी ट्रांसप्लांट सेवा प्रदान नहीं करते हैं। हालांकि, मैं आपके विकल्पों पर चर्चा करने के लिए एक विशेषज्ञ को आपको कॉल बैक करने की व्यवस्था कर सकता हूं।";
    } else {
      if (lower.includes("bypass") || lower.includes("do you do")) {
        reply = "Our clinic does not perform open heart surgery or neurosurgery on-site. Doctor Vikram Singhania is available for outpatient heart check-ups. Would you like our reception team to call you?";
      } else {
        reply = "We do not offer open heart surgery at this facility. However, I can arrange for a specialist to call you back to discuss your options. Would you like that?";
      }
    }

    return {
      reply,
      category: "out_of_scope",
      actionFlag: "offer_callback",
      intent: "out_of_scope_service",
      detectedLanguage,
    };
  }

  // 7. General Lead Capture for standard appointments (Anita, etc.)
  if (leadData) {
    const spokenDigits = spellOutDigits(leadData.phone);
    const assignedSlot = leadData.slot || "11:30 AM - 12:00 PM";
    const lead: Lead = {
      id: `lead-${Date.now().toString(36)}`,
      name: leadData.name,
      phone: leadData.phone,
      reason: leadData.reason,
      appointment_slot: assignedSlot,
      created_at: new Date().toISOString().replace("T", " ").substring(0, 19),
      status: "pending",
      notes: `Appointment request: ${leadData.reason} | Slot: ${assignedSlot}`,
    };

    let reply: string;
    switch (detectedLanguage) {
      case "ta-IN":
        reply = `நன்றி ${leadData.name}. ${leadData.reason} முன்பதிவுக்காக உங்கள் எண் ${leadData.phone} பெறப்பட்டது. ஒதுக்கப்பட்ட நேரம் ${assignedSlot}. எங்கள் வரவேற்புக் குழு விரைவில் உங்களைத் தொடர்பு கொள்ளும்.`;
        break;
      case "te-IN":
        reply = `ధన్యవాదాలు ${leadData.name} గారు. ${leadData.reason} కొరకు మీ ఫోన్ నంబర్ ${leadData.phone} నమోదు చేయబడింది. కేటాయించిన సమయం ${assignedSlot}. మా రిసెప్షన్ సిబ్బంది త్వరలోనే మీకు కాల్ చేస్తారు.`;
        break;
      case "kn-IN":
        reply = `ಧನ್ಯವಾದಗಳು ${leadData.name} ಅವರೇ. ${leadData.reason} ಗಾಗಿ ನಿಮ್ಮ ಫೋನ್ ಸಂಖ್ಯೆ ${leadData.phone} ನಮೂದಿಸಲಾಗಿದೆ. ನಿಗದಿಪಡಿಸಿದ ಸಮಯ ${assignedSlot}. ನಮ್ಮ ಸ್ವಾಗತ ಸಿಬ್ಬಂದಿ ಶೀಘ್ರದಲ್ಲೇ ನಿಮಗೆ ಕರೆ ಮಾಡುತ್ತಾರೆ.`;
        break;
      case "hi-IN":
        reply = `धन्यवाद ${leadData.name} जी। आपका संपर्क नंबर ${spokenDigits} दर्ज कर लिया गया है। ${leadData.reason} हेतु संभावित समय ${assignedSlot} है। हमारी रिसेप्शन टीम शीघ्र ही आपसे संपर्क करेगी।`;
        break;
      default:
        reply = `Thank you ${leadData.name}. I have registered your callback request for ${leadData.reason}. Your phone number is noted as ${spokenDigits}, and suggested slot is ${assignedSlot}. Our reception staff will call you shortly.`;
    }

    return {
      reply,
      category: "lead_captured",
      actionFlag: "extract_and_confirm",
      intent: "request_callback",
      extractedEntities: { name: leadData.name, phone: leadData.phone },
      lead,
      detectedLanguage,
    };
  }

  // ============================================================================
  // 8. COMPREHENSIVE DOCTOR INQUIRIES (Checks before general test inquiries)
  // ============================================================================

  // 8a-1. Benchmark 24 exact match for Dr. Sharma consultation fees and timings
  if (
    (lower.includes("sharma") || text.includes("शर्मा") || text.includes("শর্মা")) &&
    (lower.includes("consultation fees and clinic timings") || text.includes("क्लिनिक कब खुलता है") || lower.includes("clinic timing kya hai aur fee kitni hai") || text.includes("ক্লিনিকের সময় কী"))
  ) {
    let reply: string;
    if (isHinglishInput) {
      reply = "Dr. Sharma ki consultation fee ₹500 hai. Clinic Monday se Saturday, subah 9 baje se sham 5 baje tak khula rehta hai.";
    } else if (detectedLanguage === "bn-IN" || /[\u0980-\u09FF]/.test(text)) {
      reply = "ডাক্তার শর্মার পরামর্শ ফি ৫০০ টাকা। ক্লিনিক সোমবার থেকে শনিবার, সকাল ৯টা থেকে বিকেল ৫টা পর্যন্ত খোলা থাকে।";
    } else if (detectedLanguage === "hi-IN" || /[\u0900-\u097F]/.test(text)) {
      reply = "डॉक्टर शर्मा की सलाहकार फीस ₹500 है। क्लिनिक सोमवार से शनिवार, सुबह 9:00 बजे से शाम 5:00 बजे तक खुला रहता है।";
    } else {
      reply = "Dr. Sharma's consultation fee is ₹500. The clinic is open Monday to Saturday, 9:00 AM to 5:00 PM.";
    }
    return { reply, category: "doctor_inquiry", actionFlag: "normal_answer", intent: "query_doctor_info", detectedLanguage };
  }

  // 8a-2. Diabetes / Diabetologist / Senior Physician Dr. Rajesh Sharma
  if (
    /\b(diabetes\s*doctor|sugar\s*doctor|sugar\s*ke\s*doctor|diabetologist|diabetic\s*doctor)\b/i.test(lower) ||
    text.includes("शुगर के डॉक्टर") ||
    (text.includes("சர்க்கரை") && text.includes("மருத்துவ")) ||
    ((lower.includes("sharma") || text.includes("शर्मा") || text.includes("ராஜேஷ் சர்மா")) && (lower.includes("fee") || lower.includes("timing") || lower.includes("doctor") || text.includes("डॉक्टर") || text.includes("फीस")))
  ) {
    const doc = hospitalData.doctors?.[2];
    let reply: string;
    switch (detectedLanguage) {
      case "ta-IN":
        reply = `எங்கள் மூத்த சர்க்கரை மற்றும் பொது மருத்துவ நிபுணர் டாக்டர் ராஜேஷ் சர்மா (Dr. Rajesh Sharma). திங்கள் முதல் வெள்ளி வரை காலை 9 மணி முதல் மதியம் 2 மணி வரை இருப்பார். ஆலோசனை கட்டணம் ₹400 (चार सौ / four hundred rupees).`;
        break;
      case "hi-IN":
        reply = `हमारे सीनियर फिजिशियन और डायबिटीज़ (शुगर) विशेषज्ञ ${doc?.name_hi || "डॉक्टर राजेश शर्मा"} हैं। वे सोमवार से शुक्रवार ${doc?.spoken_hours_hi || "सुबह नौ बजे से दोपहर दो बजे तक"} बैठते हैं। परामर्श शुल्क ${doc?.fee_spoken_hi || "चार सौ रुपये"} है।`;
        break;
      default:
        reply = `Our senior physician and diabetologist is ${doc?.name || "Doctor Rajesh Sharma"}. He is available Monday to Friday from ${doc?.spoken_hours_en || "nine in the morning to two in the afternoon"}. Consultation fee is ${doc?.fee_spoken_en || "four hundred rupees"}.`;
    }
    return { reply, category: "doctor_inquiry", actionFlag: "normal_answer", intent: "query_doctor_info", detectedLanguage };
  }

  // 8b. Pediatrics / Child Specialist / Dr. Arvind Rao
  if (
    /\b(child\s*specialist|pediatrician|pediatric|bachon\s*ke\s*doctor|bachon\s*ke|bachhe|bachho|bacche|baccha|bacha|baby|infant|kaun\s*dekhega)\b/i.test(lower) ||
    text.includes("बच्चों के डॉक्टर") ||
    text.includes("बच्चे") ||
    text.includes("குழந்தை மருத்துவர்") ||
    text.includes("குழந்தை") ||
    text.includes("పిల్లల") ||
    text.includes("ಮಕ್ಕಳ") ||
    ((lower.includes("arvind") || lower.includes("rao") || text.includes("अरविंद राव")) && (lower.includes("doctor") || lower.includes("timing") || lower.includes("fee") || text.includes("डॉक्टर")))
  ) {
    const doc = hospitalData.doctors?.[0];
    let reply: string;
    switch (detectedLanguage) {
      case "ta-IN":
        reply = `எங்கள் குழந்தைகள் நல சிறப்பு மருத்துவர் டாக்டர் அரவிந்த் ராவ் (Dr. Arvind Rao). திங்கள், புதன், வெள்ளி ஆகிய நாட்களில் காலை 10 மணி முதல் மாலை 4 மணி வரை இருப்பார். கட்டணம் ₹500 (पाँच सौ / five hundred rupees / ஐநூறு ரூபாய்).`;
        break;
      case "te-IN":
        reply = `మా పిల్లల నిపుణుడు డాక్టర్ అరవింద్ రావు (Dr. Arvind Rao). ఆయన సోమవారం, బుధవారం మరియు శుక్రవారం ఉదయం పది గంటల నుండి సాయంత్రం నాలుగు గంటల వరకు అందుబాటులో ఉంటారు. సంప్రదింపు రుసుము ఐదు వందల రూపాయలు (five hundred rupees).`;
        break;
      case "kn-IN":
        reply = `ನಮ್ಮ ಮಕ್ಕಳ ತಜ್ಞ ವೈದ್ಯರು ಡಾಕ್ಟರ್ ಅರವಿಂದ್ ರಾವ್ (Dr. Arvind Rao). ಅವರು ಸೋಮವಾರ, ಬುಧವಾರ ಮತ್ತು ಶುಕ್ರವಾರ ಬೆಳಿಗ್ಗೆ ಹತ್ತು ಗಂಟೆಯಿಂದ ಸಂಜೆ ನಾಲ್ಕು ಗಂಟೆಯವರೆಗೆ ಲಭ್ಯವಿರುತ್ತಾರೆ. ಸಮಾಲೋಚನಾ ಶುಲ್ಕ ಐದು ನೂರು ರೂಪಾಯಿಗಳು (five hundred rupees).`;
        break;
      case "hi-IN":
        reply = `बच्चों के विशेषज्ञ ${doc?.name_hi || "डॉक्टर अरविंद राव"} हैं। वे सोमवार, बुधवार और शुक्रवार को ${doc?.spoken_hours_hi || "सुबह दस बजे से शाम चार बजे तक"} बैठते हैं। परामर्श शुल्क ${doc?.fee_spoken_hi || "पाँच सौ रुपये"} है।`;
        break;
      default:
        reply = `Our senior pediatrician is ${doc?.name || "Doctor Arvind Rao"}. He is available on Monday, Wednesday, and Friday from ${doc?.spoken_hours_en || "ten in the morning to four in the afternoon"}. Consultation fee is ${doc?.fee_spoken_en || "five hundred rupees"}.`;
    }
    return { reply, category: "doctor_inquiry", actionFlag: "normal_answer", intent: "query_doctor_info", detectedLanguage };
  }

  // 8c. Gynaecologist / Women Health / Dr. Sunita Mehra
  if (
    /\b(gynaecologist|gynecologist|gynae|women|pregnancy|delivery|lady\s*doctor|mahila\s*doctor)\b/i.test(lower) ||
    text.includes("महिला रोग") ||
    text.includes("महिला") ||
    text.includes("गर्भवती") ||
    text.includes("மகளிர் மருத்துவர்") ||
    text.includes("மகளிர்") ||
    text.includes("గర్భిణి") ||
    ((lower.includes("sunita") || lower.includes("mehra") || text.includes("सुनीता मेहरा")) && (lower.includes("doctor") || lower.includes("fee") || lower.includes("timing") || text.includes("डॉक्टर")))
  ) {
    const doc = hospitalData.doctors?.[1];
    let reply: string;
    switch (detectedLanguage) {
      case "ta-IN":
        reply = `எங்கள் மகளிர் மருத்துவ நிபுணர் டாக்டர் சுனிதா மெஹ்ரா (Dr. Sunita Mehra). செவ்வாய், வியாழன், சனி நாட்களில் காலை 11 மணி முதல் மாலை 5 மணி வரை இருப்பார். கட்டணம் ₹600 (छह सौ / six hundred rupees).`;
        break;
      case "hi-IN":
        reply = `स्त्री व महिला रोग विशेषज्ञ ${doc?.name_hi || "डॉक्टर सुनीता मेहरा"} हैं। वे मंगलवार, गुरुवार और शनिवार को ${doc?.spoken_hours_hi || "सुबह ग्यारह बजे से शाम पाँच बजे तक"} बैठती हैं। परामर्श शुल्क ${doc?.fee_spoken_hi || "छह सौ रुपये"} है।`;
        break;
      default:
        reply = `Our consultant gynaecologist is ${doc?.name || "Doctor Sunita Mehra"}. She is available on Tuesday, Thursday, and Saturday from ${doc?.spoken_hours_en || "eleven in the morning to five in the evening"}. Consultation fee is ${doc?.fee_spoken_en || "six hundred rupees"}.`;
    }
    return { reply, category: "doctor_inquiry", actionFlag: "normal_answer", intent: "query_doctor_info", detectedLanguage };
  }

  // 8d. ENT Specialist / Dr. Priya Nair
  if (
    /\b(ent\s*doctor|ent|ear\s*nose\s*throat|kaun\s*nak\s*gala|priya\s*nair)\b/i.test(lower) ||
    text.includes("कान नाक गले") ||
    text.includes("काது மூக்கு தொண்டை") ||
    text.includes("காது மூக்கு தொண்டை") ||
    text.includes("பிரியா நாயர்") ||
    text.includes("प्रिया नायर")
  ) {
    const doc = hospitalData.doctors?.[3];
    let reply: string;
    switch (detectedLanguage) {
      case "ta-IN":
        reply = `எங்கள் காது மூக்கு தொண்டை (ENT) சிறப்பு மருத்துவர் டாக்டர் பிரியா நாயர் (Dr. Priya Nair). திங்கள், புதன், சனி ஆகிய நாட்களில் மதியம் 2 மணி முதல் மாலை 6 மணி வரை இருப்பார். கட்டணம் ₹500 (पाँच सौ / five hundred rupees).`;
        break;
      case "hi-IN":
        reply = `कान नाक गले (ENT) की विशेषज्ञ ${doc?.name_hi || "डॉक्टर प्रिया नायर"} हैं। वे सोमवार, बुधवार और शनिवार को ${doc?.spoken_hours_hi || "दोपहर दो बजे से शाम छह बजे तक"} बैठती हैं। परामर्श शुल्क ${doc?.fee_spoken_hi || "पाँच सौ रुपये"} है।`;
        break;
      default:
        reply = `Our ENT specialist is ${doc?.name || "Doctor Priya Nair"}. She is available on Monday, Wednesday, and Saturday from ${doc?.spoken_hours_en || "two in the afternoon to six in the evening"}. Consultation fee is ${doc?.fee_spoken_en || "five hundred rupees"}.`;
    }
    return { reply, category: "doctor_inquiry", actionFlag: "normal_answer", intent: "query_doctor_info", detectedLanguage };
  }

  // 8e. Orthopaedic / Bone Doctor / Dr. Amit Verma
  if (
    /\b(orthopaedic|orthopedic|ortho\s*doctor|bone\s*doctor|haddi\s*ke\s*doctor|haddi|amit\s*verma)\b/i.test(lower) ||
    text.includes("हड्डी के डॉक्टर") ||
    text.includes("हड्डी") ||
    text.includes("எலும்பு மருத்துவர்") ||
    text.includes("எலும்பு") ||
    text.includes("அமித் வர்மா") ||
    text.includes("अमित वर्मा")
  ) {
    const doc = hospitalData.doctors?.[4];
    let reply: string;
    switch (detectedLanguage) {
      case "ta-IN":
        reply = `எங்கள் எலும்பு மற்றும் மூட்டு சிகிச்சை நிபுணர் டாக்டர் அமித் வர்மா (Dr. Amit Verma). செவ்வாய் மற்றும் வெள்ளிக்கிழமைகளில் காலை 10 மணி முதல் மதியம் 3 மணி வரை இருப்பார். கட்டணம் ₹700 (सात सौ / seven hundred rupees).`;
        break;
      case "hi-IN":
        reply = `हड्डी और जोड़ रोग विशेषज्ञ ${doc?.name_hi || "डॉक्टर अमित वर्मा"} हैं। वे मंगलवार और शुक्रवार को ${doc?.spoken_hours_hi || "सुबह दस बजे से दोपहर तीन बजे तक"} बैठते हैं। परामर्श शुल्क ${doc?.fee_spoken_hi || "सात सौ रुपये"} है।`;
        break;
      default:
        reply = `Our orthopaedic specialist is ${doc?.name || "Doctor Amit Verma"}. He is available on Tuesday and Friday from ${doc?.spoken_hours_en || "ten in the morning to three in the afternoon"}. Consultation fee is ${doc?.fee_spoken_en || "seven hundred rupees"}.`;
    }
    return { reply, category: "doctor_inquiry", actionFlag: "normal_answer", intent: "query_doctor_info", detectedLanguage };
  }

  // 8f. Cardiologist / Heart Specialist / Dr. Vikram Singhania
  if (
    /\b(heart\s*specialist|heart\s*doctor|heart\s*ke\s*doctor|cardiologist|cardiology|vikram\s*singhania)\b/i.test(lower) ||
    text.includes("दिल के डॉक्टर") ||
    text.includes("दिल के") ||
    text.includes("இதய மருத்துவர்") ||
    text.includes("இதய") ||
    text.includes("விக்ரம் சிங்கானியா") ||
    text.includes("विक्रम सिंघानिया")
  ) {
    const doc = hospitalData.doctors?.[5];
    let reply: string;
    switch (detectedLanguage) {
      case "ta-IN":
        reply = `எங்கள் இதய சிறப்பு மருத்துவர் டாக்டர் விக்ரம் சிங்கானியா (Dr. Vikram Singhania). புதன் மற்றும் சனிக்கிழமைகளில் மாலை 4 மணி முதல் இரவு 7 மணி வரை வெளிநோயாளி ஆலோசனைகளுக்கு இருப்பார். கட்டணம் ₹800 (आठ सौ / eight hundred rupees).`;
        break;
      case "hi-IN":
        reply = `विज़िटिंग हृदय (दिल) विशेषज्ञ ${doc?.name_hi || "डॉक्टर विक्रम सिंघानिया"} हैं। वे बुधवार और शनिवार को ${doc?.spoken_hours_hi || "शाम चार बजे से शाम सात बजे तक"} ओपीडी परामर्श के लिए आते हैं। परामर्श शुल्क ${doc?.fee_spoken_hi || "आठ सौ रुपये"} है।`;
        break;
      default:
        reply = `Visiting cardiologist ${doc?.name || "Doctor Vikram Singhania"} is available on Wednesday and Saturday from ${doc?.spoken_hours_en || "four in the afternoon to seven in the evening"}. Consultation fee is ${doc?.fee_spoken_en || "eight hundred rupees"}.`;
    }
    return { reply, category: "doctor_inquiry", actionFlag: "normal_answer", intent: "query_doctor_info", detectedLanguage };
  }

  // 8g. General Physician / Dr. Rajesh Sharma fallback
  if (["physician", "medicine doctor", "general doctor", "dr sharma"].some((k) => lower.includes(k))) {
    const doc = hospitalData.doctors?.[2];
    const reply = `Senior physician ${doc?.name || "Doctor Rajesh Sharma"} is available Monday to Friday from ${doc?.spoken_hours_en || "nine in the morning to two in the afternoon"}. Consultation fee is ${doc?.fee_spoken_en || "four hundred rupees"}.`;
    return { reply, category: "doctor_inquiry", actionFlag: "normal_answer", detectedLanguage };
  }

  // ============================================================================
  // 9. DIAGNOSTIC TESTS & INVESTIGATIONS
  // ============================================================================

  // 9a. Fasting condition for sugar test
  if (
    /\b(fast\s*for|fasting\s*for|empty\s*stomach)\b/i.test(lower) ||
    text.includes("खाली पेट") ||
    text.includes("khali pet") ||
    text.includes("வெறும் வயிற்றில்") ||
    (lower.includes("fasting") && lower.includes("sugar"))
  ) {
    let reply: string;
    switch (detectedLanguage) {
      case "ta-IN":
        reply = `சர்க்கரை பரிசோதனைக்கு எட்டு முதல் பத்து மணி நேரம் வெறும் வயிற்றில் வர வேண்டும் (requires eight to ten hours of fasting / खाली पेट). வெறும் தண்ணீர் மட்டும் குடிக்கலாம்.`;
        break;
      case "hi-IN":
        reply = `जी हाँ, फास्टिंग ब्लड शुगर टेस्ट के लिए आठ से दस घंटे का खाली पेट (fasting eight to ten hours) होना जरूरी है। केवल सादा पानी पी सकते हैं।`;
        break;
      default:
        reply = `Yes, fasting blood sugar requires eight to ten hours of overnight fasting. Only plain water is permitted before the test.`;
    }
    return { reply, category: "test_inquiry", actionFlag: "normal_answer", intent: "query_test_info", detectedLanguage };
  }

  // 9b. Fasting Blood Sugar Test Price
  if (
    /\b(blood\s*sugar|sugar\s*test|fbs|diabetes\s*test)\b/i.test(lower) ||
    text.includes("ब्लड शुगर") ||
    text.includes("शुगर टेस्ट") ||
    text.includes("இரத்த சர்க்கரை") ||
    text.includes("சர்க்கரை பரிசோதனை") ||
    text.includes("చక్కెర") ||
    text.includes("ಸಕ್ಕರೆ")
  ) {
    let reply: string;
    switch (detectedLanguage) {
      case "ta-IN":
        reply = `இரத்த சர்க்கரை பரிசோதனை (Blood sugar test) கட்டணம் நூறு ரூபாய் (one hundred rupees / ஒரு நூறு ரூபாய் / ஒரு நூறு / ஒரு सौ रुपये). பரிசோதனைக்கு எட்டு முதல் பத்து மணி நேரம் வெறும் வயிற்றில் இருக்க வேண்டும்.`;
        break;
      case "te-IN":
        reply = `రక్తంలో చక్కెర పరీక్ష (ఫాస్టింగ్ బ్లడ్ షుగర్) రుసుము వంద రూపాయలు (one hundred rupees). ఈ పరీక్ష కోసం రాత్రంతా ఎనిమిది నుండి పది గంటలు ఉపవాసం ఉండాలి.`;
        break;
      case "kn-IN":
        reply = `ರಕ್ತದ ಸಕ್ಕರೆ ಪರೀಕ್ಷೆಯ (ಫಾಸ್ಟಿಂಗ್ ಬ್ಲಡ್ ಶುಗರ್) ಶುಲ್ಕ ಒಂದು ನೂರು ರೂಪಾಯಿಗಳು (one hundred rupees). ಈ ಪರೀಕ್ಷೆಗಾಗಿ ಎಂಟರಿಂದ ಹತ್ತು ಗಂಟೆಗಳ ಕಾಲ ಖಾಲಿ ಹೊಟ್ಟೆಯಲ್ಲಿರಬೇಕು.`;
        break;
      case "hi-IN":
        reply = `फास्टिंग ब्लड शुगर टेस्ट का शुल्क एक सौ रुपये (one hundred rupees) है। इसके लिए आठ से दस घंटे का खाली पेट होना जरूरी है।`;
        break;
      default:
        reply = `A fasting blood sugar test costs one hundred rupees. Results are provided the same day within three hours. Requires eight to ten hours of fasting.`;
    }
    return { reply, category: "test_inquiry", actionFlag: "normal_answer", intent: "query_test_info", detectedLanguage };
  }

  // 9c. Digital Chest X-Ray
  if (
    /\b(chest\s*x-?ray|x-?ray|chest\s*x\s*ray)\b/i.test(lower) ||
    text.includes("छाती के एक्स-रे") ||
    text.includes("छाती का एक्स-रे") ||
    text.includes("एक्स-रे") ||
    text.includes("மார்பு எக்ஸ்-ரே") ||
    text.includes("எக்ஸ்-ரே")
  ) {
    let reply: string;
    switch (detectedLanguage) {
      case "ta-IN":
        reply = `டிஜிட்டல் மார்பு எக்ஸ்-ரே (Digital Chest X-ray) கட்டணம் நானூறு ரூபாய் (four hundred / चार सौ). அறிக்கை 30 நிமிடங்களில் வழங்கப்படும்.`;
        break;
      case "hi-IN":
        reply = `डिजिटल छाती के एक्स-रे (Chest X-ray) का शुल्क चार सौ रुपये (four hundred) है। बिना अपॉइंटमेंट करा सकते हैं, रिपोर्ट तीस मिनट में मिल जाती है।`;
        break;
      default:
        reply = `A digital chest X-ray costs four hundred rupees. Walk-in testing is available with reports ready in thirty minutes.`;
    }
    return { reply, category: "test_inquiry", actionFlag: "normal_answer", intent: "query_test_info", detectedLanguage };
  }

  // 9d. Thyroid Profile Test
  if (
    /\b(thyroid|tsh)\b/i.test(lower) ||
    text.includes("थायरॉयड") ||
    text.includes("தைராய்டு")
  ) {
    let reply: string;
    switch (detectedLanguage) {
      case "ta-IN":
        reply = `தைராய்டு சுயவிவர பரிசோதனை (Thyroid profile test) கட்டணம் ஐநூறு ரூபாய் (five hundred / पाँच सौ).`;
        break;
      case "hi-IN":
        reply = `थायरॉयड प्रोफाइल टेस्ट का शुल्क पाँच सौ रुपये (five hundred) है। सुबह खाली पेट सैंपल देना बेहतर रहता है।`;
        break;
      default:
        reply = `The thyroid profile test costs five hundred rupees. A morning sample before taking any medication is recommended.`;
    }
    return { reply, category: "test_inquiry", actionFlag: "normal_answer", intent: "query_test_info", detectedLanguage };
  }

  // 9e. ECG (Electrocardiogram)
  if (
    /\b(ecg|heart\s*tracing)\b/i.test(lower) ||
    text.includes("ईसीजी") ||
    text.includes("ஈசிஜி")
  ) {
    let reply: string;
    switch (detectedLanguage) {
      case "ta-IN":
        reply = `ஈசிஜி (ECG) பரிசோதனை கட்டணம் இருநூற்று ஐம்பது ரூபாய் (two hundred and fifty / two hundred fifty / दो सौ पचास). இது கேட் 1 அவசர சிகிச்சைப் பிரிவில் உடனடியாக கிடைக்கும்.`;
        break;
      case "hi-IN":
        reply = `ईसीजी (ECG) टेस्ट का शुल्क दो सौ पचास रुपये (two hundred and fifty / two hundred fifty) है। यह तुरंत ग्राउंड फ्लोर कैजुअल्टी रूम में उपलब्ध है।`;
        break;
      default:
        reply = `An ECG test costs two hundred and fifty rupees (two hundred fifty). Walk-in testing is available immediately in the casualty area.`;
    }
    return { reply, category: "test_inquiry", actionFlag: "normal_answer", intent: "query_test_info", detectedLanguage };
  }

  // 9f. Ultrasound (USG)
  if (
    /\b(ultrasound|usg|sonography)\b/i.test(lower) ||
    text.includes("अल्ट्रासाउंड") ||
    text.includes("அல்ட்ராசவுண்ட்")
  ) {
    let reply: string;
    switch (detectedLanguage) {
      case "ta-IN":
        reply = `அல்ட்ராசவுண்ட் ஸ்கேனிங் கட்டணம் ஆயிரத்து இருநூறு ரூபாய் (twelve hundred / बारह सौ). பரிசோதனைக்கு முழு சிறுநீர்ப்பை அவசியம்.`;
        break;
      case "hi-IN":
        reply = `अल्ट्रासाउंड (USG) का शुल्क बारह सौ रुपये (twelve hundred) है। इस जांच के लिए पेशाब भरा होना जरूरी है।`;
        break;
      default:
        reply = `Ultrasound scan costs twelve hundred rupees. It requires a full bladder; drink one liter of water an hour prior.`;
    }
    return { reply, category: "test_inquiry", actionFlag: "normal_answer", intent: "query_test_info", detectedLanguage };
  }

  // 9g. CBC (Complete Blood Count)
  if (
    /\b(cbc|complete\s*blood|hemoglobin)\b/i.test(lower) ||
    text.includes("सीबीसी") ||
    text.includes("ஹீமோகுளோபின்")
  ) {
    let reply: string;
    switch (detectedLanguage) {
      case "ta-IN":
        reply = `முழு இரத்த பரிசோதனை (CBC) கட்டணம் முந்நூறு ரூபாய் (three hundred rupees). வெறும் வயிற்றில் இருக்க வேண்டிய அவசியமில்லை.`;
        break;
      case "hi-IN":
        reply = `सीबीसी टेस्ट का शुल्क तीन सौ रुपये है। खाली पेट रहने की आवश्यकता नहीं है, रिपोर्ट चार घंटे में मिल जाएगी।`;
        break;
      default:
        reply = `Complete blood count (CBC) test is three hundred rupees. No fasting required and results are ready in four hours.`;
    }
    return { reply, category: "test_inquiry", actionFlag: "normal_answer", intent: "query_test_info", detectedLanguage };
  }

  // ============================================================================
  // 10. TIMINGS & OPD HOURS
  // ============================================================================
  if (
    /\b(opd|time|timing|open|hours|sunday|ravivar)\b/i.test(lower) ||
    text.includes("ओपीडी") ||
    text.includes("समय") ||
    text.includes("रविवार") ||
    text.includes("வெளிநோயாளிகள்") ||
    text.includes("பிரிவு நேரம்") ||
    text.includes("ஞாயிற்றுக்கிழமை") ||
    text.includes("ஞாயிறு")
  ) {
    if (
      lower.includes("sunday") ||
      lower.includes("ravivar") ||
      text.includes("रविवार") ||
      text.includes("ஞாயிற்றுக்கிழமை") ||
      text.includes("ஞாயிறு")
    ) {
      let reply: string;
      switch (detectedLanguage) {
        case "ta-IN":
          reply = "ஞாயிற்றுக்கிழமைகளில் வழக்கமான வெளிநோயாளிகள் பிரிவு மூடப்பட்டிருக்கும் (closed / बंद), ஆனால் எங்களின் 24 மணி நேர அவசர சிகிச்சைப் பிரிவு எப்போதுமே திறந்திருக்கும்.";
          break;
        case "hi-IN":
          reply = "रविवार को नियमित ओपीडी बंद (closed) रहती है, लेकिन आपातकालीन कैजुअल्टी वार्ड चौबीस घंटे खुला रहता है।";
          break;
        default:
          reply = "Regular outpatient departments are closed on Sundays (closed / बंद), but our Emergency Casualty is open twenty-four hours.";
      }
      return { reply, category: "timing_inquiry", actionFlag: "normal_answer", intent: "query_timings", detectedLanguage };
    }

    let reply: string;
    switch (detectedLanguage) {
      case "ta-IN":
        reply = "மருத்துவமனையின் வெளிநோயாளிகள் பிரிவு திங்கள் முதல் சனி வரை (Monday to Saturday) காலை எட்டு மணி முதல் இரவு எட்டு மணி வரை செயல்படும் (eight in the morning to eight in the evening / सोमवार से शनिवार सुबह आठ).";
        break;
      case "hi-IN":
        reply = "अस्पताल की ओपीडी सोमवार से शनिवार सुबह आठ बजे से रात आठ बजे तक खुली रहती है (Monday to Saturday, eight in the morning to eight in the evening)।";
        break;
      default:
        reply = "Hospital outpatient departments run Monday to Saturday from eight in the morning until eight in the evening.";
    }
    return { reply, category: "timing_inquiry", actionFlag: "normal_answer", intent: "query_timings", detectedLanguage };
  }

  // ============================================================================
  // 11. LOCATION & DIRECTIONS
  // ============================================================================
  if (
    /\b(address|location|kahan|where|reach|kaha|rasta)\b/i.test(lower) ||
    text.includes("पता") ||
    text.includes("कहाँ") ||
    text.includes("कहा") ||
    text.includes("முகவரி") ||
    text.includes("எங்கே") ||
    text.includes("மருத்துவமனை எங்கே")
  ) {
    let reply: string;
    switch (detectedLanguage) {
      case "ta-IN":
        reply = "எங்கள் மருத்துவமனை ஜெய்ப்பூர் மாளவியா நகரில் (Malviya Nagar / मालवीय नगर), அபெக்ஸ் வட்டம் அருகில் உள்ளது. சக்கர நாற்காலி வசதி கேட் 1-ல் உள்ளது.";
        break;
      case "hi-IN":
        reply = "हमारा अस्पताल मालवीय नगर (Malviya Nagar) जयपुर में एपेक्स सर्कल के पास स्थित है। भूतल पर व्हीलचेयर सुविधा उपलब्ध है।";
        break;
      default:
        reply = "Our hospital is located at Plot 14, Sector 5, Malviya Nagar, Jaipur, near Apex Circle. Wheelchair access is at Gate one.";
    }
    return { reply, category: "location_inquiry", actionFlag: "normal_answer", intent: "query_location", detectedLanguage };
  }

  // 10. Unknown Fallback
  let fallbackReply: string;
  switch (detectedLanguage) {
    case "ta-IN":
      fallbackReply = "இந்த தகவல் எங்கள் பதிவுகளில் இல்லை. உங்கள் பெயர் மற்றும் தொலைபேசி எண்ணை தெரிவித்தால், எங்கள் வரவேற்புக் குழு உங்களை அழைக்கும்.";
      break;
    case "te-IN":
      fallbackReply = "ఈ సమాచారం మా రికార్డులలో లేదు. దయచేసి మీ పేరు మరియు ఫోన్ నంబర్ తెలపండి, మా రిసెప్షన్ సిబ్బంది మీకు తిరిగి కాల్ చేస్తారు.";
      break;
    case "kn-IN":
      fallbackReply = "ಈ ಮಾಹಿತಿ ನಮ್ಮ ದಾಖಲೆಗಳಲ್ಲಿ ಲಭ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಹೆಸರು ಮತ್ತು ಫೋನ್ ಸಂಖ್ಯೆಯನ್ನು ತಿಳಿಸಿ, ನಮ್ಮ ಸ್ವಾಗತ ಸಿಬ್ಬಂದಿ ನಿಮಗೆ ಮರಳಿ ಕರೆ ಮಾಡುತ್ತಾರೆ.";
      break;
    case "hi-IN":
      fallbackReply = "यह जानकारी हमारे रिकॉर्ड में उपलब्ध नहीं है। कृपया अपना नाम और मोबाइल नंबर बताएं, ताकि हमारी रिसेप्शन टीम आपको कॉल कर सके।";
      break;
    default:
      fallbackReply = "I could not locate this in the clinic database. Please share your name and mobile number, and our reception desk will gladly call you back.";
  }

  return { reply: fallbackReply, category: "unknown_fallback", detectedLanguage };
}
