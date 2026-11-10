/**
 * Medical triage classification and response routing service.
 * Supports emergency, urgent advice, self-harm crisis support, and symptom routing.
 */

import { checkEmergency, checkSelfHarm } from "./hospitalLogic";

export type TriageCategory =
  | "emergency"
  | "urgent"
  | "selfharm"
  | "symptom_routing"
  | "general";

export interface TriageResult {
  category: "emergency" | "urgent_advice" | "selfharm" | "symptom_routing" | "general";
  reply: string;
  doctor?: string;
  department?: string;
}

/**
 * Classify user query into triage level.
 */
export function classifyTriage(query: string): "emergency" | "urgent" | "selfharm" | "symptom" | "general" {
  const text = (query || "").trim();
  const lower = text.toLowerCase();

  // 1. Check self-harm / crisis ideation first
  if (checkSelfHarm(text)) {
    return "selfharm";
  }

  // 2. Urgent symptoms (severe pain, vomiting, acute distress without casualty red flag)
  // E.g. "severe stomach pain with vomiting", "severe stomach pain", "intense abdominal pain"
  const isUrgentSymptom =
    /\b(severe\s*stomach\s*pain|intense\s*abdominal\s*pain|severe\s*vomiting|high\s*fever\s*with\s*chills|severe\s*pain)\b/i.test(lower) ||
    (/\bsevere\b/i.test(lower) && /\b(stomach|abdomen|abdominal|vomiting|headache|back\s*pain)\b/i.test(lower));

  if (isUrgentSymptom) {
    return "urgent";
  }

  // 3. Emergency red flags (chest pain, unconscious, baby not breathing, snake bite, poisoning, seizure, etc.)
  const emergencyCheck = checkEmergency(text, "en-IN");
  if (emergencyCheck !== null) {
    return "emergency";
  }

  // 4. Routine symptom routing
  if (
    /\b(stomach\s*pain|pet\s*me\s*dard|headache|back\s*pain|knee\s*pain|tooth\s*pain|fever|cold|cough|bukhar|sirdard)\b/i.test(lower) ||
    /(पेट\s*में\s*दर्द|सिरदर्द|बुखार|खांसी|जुकाम)/i.test(text)
  ) {
    return "symptom";
  }

  return "general";
}

/**
 * Generate compassionate, clinically sound triage reply according to category.
 */
export function triageReply(
  query: string,
  hospital: any,
  isHindi: boolean = false
): TriageResult | null {
  const text = (query || "").trim();
  const lower = text.toLowerCase();
  const classification = classifyTriage(text);

  // Self-harm / suicide crisis line (Tele-MANAS 14416 / 112)
  if (classification === "selfharm") {
    return {
      category: "selfharm",
      reply: isHindi
        ? "हम आपकी परवाह करते हैं और आप अकेले नहीं हैं। कृपया तुरंत राष्ट्रीय तेली मानस (Tele-MANAS) मानसिक स्वास्थ्य हेल्पलाइन 14416 या 1800-891-4416 पर कॉल करें। यह सेवा 24/7 निःशुल्क और पूर्णतः गोपनीय है। आपात स्थिति में 112 पर भी संपर्क किया जा सकता है।"
        : "We care about you and you are not alone. Please reach out immediately to the National Tele-MANAS Helpline at 14416 (toll-free: 1800-891-4416) or call emergency services at 112. This service is free, confidential, and available 24/7.",
    };
  }

  // Urgent advice (e.g. severe stomach pain with vomiting)
  if (classification === "urgent" || lower.includes("severe stomach pain")) {
    return {
      category: "urgent_advice",
      reply: isHindi
        ? "तीव्र पेट दर्द या लगातार उल्टी की स्थिति में तत्काल चिकित्सकीय परामर्श की आवश्यकता होती है। कृपया तुरंत हमारे कैजुअल्टी वार्ड में दिखाएं या वरिष्ठ फिजीशियन डॉ. राजेश शर्मा (जनरल मेडिसिन) से परामर्श लें।"
        : "Severe stomach pain or persistent vomiting requires prompt medical attention. Please visit our urgent care / casualty triage or consult Senior Physician Dr. Rajesh Sharma (General Medicine) immediately for evaluation.",
      doctor: "Dr. Rajesh Sharma",
      department: "General Medicine",
    };
  }

  // Emergency casualty alert
  if (classification === "emergency") {
    return {
      category: "emergency",
      reply: isHindi
        ? "रेड फ्लैग मेडिकल इमरजेंसी! कृपया तुरंत 108 एम्बुलेंस को कॉल करें या निकटतम अस्पताल कैजुअल्टी विभाग में पहुंचें।"
        : "RED FLAG EMERGENCY: Please call 108 for an ambulance immediately or proceed to the nearest hospital casualty emergency room.",
    };
  }

  // Routine symptom routing (e.g., stomach pain -> Dr. Rajesh Sharma)
  if (
    classification === "symptom" ||
    lower.includes("stomach pain") ||
    lower.includes("pet me dard") ||
    text.includes("पेट में दर्द")
  ) {
    const physician =
      hospital?.doctors?.find((d: any) =>
        /rajesh\s*sharma|general\s*medicine|physician/i.test(d.name || d.specialty || "")
      )?.name || "Dr. Rajesh Sharma";

    return {
      category: "symptom_routing",
      reply: isHindi
        ? `पेट में दर्द या सामान्य अस्वस्थता के लिए आप हमारे वरिष्ठ फिजीशियन ${physician} (जनरल मेडिसिन, ओपीडी कमरा 104) से परामर्श ले सकते हैं। वे सोमवार से शनिवार सुबह 9:00 बजे से दोपहर 1:00 बजे तक उपलब्ध हैं।`
        : `For stomach pain, you can consult ${physician} (Senior Physician, General Medicine) in OPD Room 104. OPD consultations run Monday through Saturday from 9:00 AM to 1:00 PM. Would you like to book an appointment?`,
      doctor: physician,
      department: "General Medicine",
    };
  }

  return {
    category: "general",
    reply: isHindi
      ? "नमस्ते! संजीवनी सुपरस्पेशियलिटी अस्पताल में आपका स्वागत है। मैं आपकी क्या सहायता कर सकता हूँ?"
      : "Welcome to Sanjeevani Superspeciality Hospital. How can I assist you today with appointments, doctors, or hospital services?",
  };
}
