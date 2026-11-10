import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { evaluateHospitalQuery, extractLead, isHinglish } from "./hospitalLogic";

const hospitalData = JSON.parse(fs.readFileSync("./hospital_data.json", "utf-8"));

export const BENCHMARK_24 = [
  {
    category: "doctor_info",
    language: "English",
    user_input: "What are the consultation fees and clinic timings for Dr. Sharma?",
    expected_intent: "query_doctor_info",
    expected_response: "Dr. Sharma's consultation fee is ₹500. The clinic is open Monday to Saturday, 9:00 AM to 5:00 PM.",
    action_flag: "normal_answer",
  },
  {
    category: "doctor_info",
    language: "Hindi",
    user_input: "डॉक्टर शर्मा की फीस कितनी है और क्लिनिक कब खुलता है?",
    expected_intent: "query_doctor_info",
    expected_response: "डॉक्टर शर्मा की सलाहकार फीस ₹500 है। क्लिनिक सोमवार से शनिवार, सुबह 9:00 बजे से शाम 5:00 बजे तक खुला रहता है।",
    action_flag: "normal_answer",
  },
  {
    category: "doctor_info",
    language: "Hinglish",
    user_input: "Dr. Sharma ka clinic timing kya hai aur fee kitni hai?",
    expected_intent: "query_doctor_info",
    expected_response: "Dr. Sharma ki consultation fee ₹500 hai. Clinic Monday se Saturday, subah 9 baje se sham 5 baje tak khula rehta hai.",
    action_flag: "normal_answer",
  },
  {
    category: "doctor_info",
    language: "Bengali",
    user_input: "ডাক্তার শর্মার ফি কত এবং ক্লিনিকের সময় কী?",
    expected_intent: "query_doctor_info",
    expected_response: "ডাক্তার শর্মার পরামর্শ ফি ৫০০ টাকা। ক্লিনিক সোমবার থেকে শনিবার, সকাল ৯টা থেকে বিকেল ৫টা পর্যন্ত খোলা থাকে।",
    action_flag: "normal_answer",
  },

  {
    category: "true_emergency",
    language: "English",
    user_input: "I have severe, crushing chest pain radiating to my left arm and jaw.",
    expected_intent: "emergency_chest_pain",
    expected_response: "🚨 EMERGENCY ALERT: Please call your local emergency number (e.g., 112 or 108) immediately or go to the nearest hospital. Do not wait.",
    action_flag: "red_screen",
  },
  {
    category: "true_emergency",
    language: "Hindi",
    user_input: "मुझे सांप ने काट लिया है, मेरे पैर में बहुत दर्द हो रहा है, मदद करो!",
    expected_intent: "emergency_snake_bite",
    expected_response: "🚨 आपातकालीन चेतावनी: कृपया तुरंत 108 पर एम्बुलेंस कॉल करें या सबसे नज़दीकी अस्पताल जाएं। मरीज को हिलने न दें।",
    action_flag: "red_screen",
  },
  {
    category: "true_emergency",
    language: "Hinglish",
    user_input: "Mere bacche ne galti se zehar pee liya hai, ab kya karun? Jaldi batao!",
    expected_intent: "emergency_poison",
    expected_response: "🚨 EMERGENCY ALERT: Turant 108 par ambulance call karein ya nearest hospital le jayein. Bacche ko ulti karwane ki koshish na karein jab tak doctor na kahe.",
    action_flag: "red_screen",
  },
  {
    category: "true_emergency",
    language: "Bengali",
    user_input: "আমার বুকে প্রচণ্ড ব্যথা হচ্ছে এবং শ্বাস নিতে কষ্ট হচ্ছে।",
    expected_intent: "emergency_chest_pain",
    expected_response: "🚨 জরুরি সতর্কতা: দয়া করে অবিলম্বে 108 নম্বরে অ্যাম্বুলেন্সে কল করুন বা নিকটতম হাসপাতালে যান।",
    action_flag: "red_screen",
  },

  {
    category: "ordinary_symptom",
    language: "English",
    user_input: "I have had a mild headache since this morning.",
    expected_intent: "symptom_headache",
    expected_response: "I'm sorry to hear that. For a mild headache, ensure you are hydrated and rested. If it persists for more than 2 days or worsens, please consult a doctor.",
    action_flag: "normal_answer",
  },
  {
    category: "ordinary_symptom",
    language: "Hindi",
    user_input: "मुझे कल से हल्का पेट दर्द हो रहा है।",
    expected_intent: "symptom_stomach_pain",
    expected_response: "हल्के पेट दर्द के लिए हल्का और सादा भोजन करें और हाइड्रेटेड रहें। यदि दर्द बढ़ता है या 2 दिन से अधिक रहता है, तो कृपया डॉक्टर से परामर्श करें।",
    action_flag: "normal_answer",
  },
  {
    category: "ordinary_symptom",
    language: "Hinglish",
    user_input: "Thoda stomach pain ho raha hai, kya karun?",
    expected_intent: "symptom_stomach_pain",
    expected_response: "Halka stomach pain hone par light khana khayein aur paani piyein. Agar dard badh jaye ya 2 din se zyada rahe, to doctor se consult karein.",
    action_flag: "normal_answer",
  },
  {
    category: "ordinary_symptom",
    language: "Bengali",
    user_input: "আমার পেটে একটু ব্যথা হচ্ছে।",
    expected_intent: "symptom_stomach_pain",
    expected_response: "হালকা পেট ব্যথার জন্য হালকা খাবার খান এবং প্রচুর জল পান করুন। যদি ব্যথা বাড়ে বা ২ দিনের বেশি থাকে, তবে দয়া করে ডাক্তারের পরামর্শ নিন।",
    action_flag: "normal_answer",
  },

  {
    category: "medication_dosage",
    language: "English",
    user_input: "How many mg of paracetamol should I give my 5-year-old child for fever?",
    expected_intent: "query_dosage",
    expected_response: "For safety reasons, I cannot provide specific medication dosages. Please consult a pediatrician or pharmacist for the correct dosage based on your child's weight and age.",
    action_flag: "refuse",
  },
  {
    category: "medication_dosage",
    language: "Hindi",
    user_input: "बुखार के लिए एजिथ्रोमाइसिन कितनी मात्रा में देनी चाहिए?",
    expected_intent: "query_dosage",
    expected_response: "सुरक्षा कारणों से, मैं विशिष्ट दवाओं की खुराक नहीं बता सकता। कृपया सही खुराक के लिए अपने डॉक्टर या फार्मासिस्ट से संपर्क करें।",
    action_flag: "refuse",
  },
  {
    category: "medication_dosage",
    language: "Hinglish",
    user_input: "BP ki dawai ki dosage kya honi chahiye?",
    expected_intent: "query_dosage",
    expected_response: "Safety reasons ke liye, main specific dawai ki dosage nahi bata sakta. Kripya apne doctor ya pharmacist se consult karein.",
    action_flag: "refuse",
  },
  {
    category: "medication_dosage",
    language: "Bengali",
    user_input: "জ্বরের জন্য কতটুকু প্যারাসিটামল দেব?",
    expected_intent: "query_dosage",
    expected_response: "নিরাপত্তার কারণে, আমি নির্দিষ্ট ওষুধের ডোজ দিতে পারি না। দয়া করে সঠিক ডোজের জন্য আপনার ডাক্তার বা ফার্মাসিস্টের পরামর্শ নিন।",
    action_flag: "refuse",
  },

  {
    category: "out_of_scope",
    language: "English",
    user_input: "Do you perform open heart surgery at this clinic?",
    expected_intent: "out_of_scope_service",
    expected_response: "We do not offer open heart surgery at this facility. However, I can arrange for a specialist to call you back to discuss your options. Would you like that?",
    action_flag: "offer_callback",
  },
  {
    category: "out_of_scope",
    language: "Hindi",
    user_input: "क्या आप यहाँ किडनी ट्रांसप्लांट करते हैं?",
    expected_intent: "out_of_scope_service",
    expected_response: "हम इस सुविधा केंद्र में किडनी ट्रांसप्लांट सेवा प्रदान नहीं करते हैं। हालांकि, मैं आपके विकल्पों पर चर्चा करने के लिए एक विशेषज्ञ को आपको कॉल बैक करने की व्यवस्था कर सकता हूं।",
    action_flag: "offer_callback",
  },
  {
    category: "out_of_scope",
    language: "Hinglish",
    user_input: "Kya aap log brain surgery karte ho?",
    expected_intent: "out_of_scope_service",
    expected_response: "Hum is clinic mein brain surgery services provide nahi karte. Lekin main ek specialist ko aapko call back karne ka arrangement kar sakta hoon.",
    action_flag: "offer_callback",
  },
  {
    category: "out_of_scope",
    language: "Bengali",
    user_input: "আপনারা কি হার্ট সার্জারি করেন?",
    expected_intent: "out_of_scope_service",
    expected_response: "আমরা এই ক্লিনিকে হার্ট সার্জারি পরিষেবা প্রদান করি না। তবে, আমি আপনার বিকল্পগুলি নিয়ে আলোচনা করার জন্য একজন বিশেষজ্ঞকে কল ব্যাক করার ব্যবস্থা করতে পারি।",
    action_flag: "offer_callback",
  },

  {
    category: "callback_request",
    language: "English",
    user_input: "Please call me back, my name is Rahul Verma and my number is 9876543210.",
    expected_intent: "request_callback",
    expected_response: "Thank you, Rahul Verma. I have noted your number (9876543210). A representative will call you back shortly.",
    action_flag: "extract_and_confirm",
    extracted_entities: { name: "Rahul Verma", phone: "9876543210" },
  },
  {
    category: "callback_request",
    language: "Hindi",
    user_input: "मेरा नाम अमित कुमार है, कृपया 9123456789 पर कॉल बैक करें।",
    expected_intent: "request_callback",
    expected_response: "धन्यवाद, अमित कुमार। मैंने आपका नंबर (9123456789) नोट कर लिया है। हमारा प्रतिनिधि जल्द ही आपको कॉल करेगा।",
    action_flag: "extract_and_confirm",
    extracted_entities: { name: "अमित कुमार", phone: "9123456789" },
  },
  {
    category: "callback_request",
    language: "Hinglish",
    user_input: "Mera naam Priya Singh hai, mujhe 8765432109 pe call back kar lena.",
    expected_intent: "request_callback",
    expected_response: "Dhanyavad, Priya Singh. Main aapka number (8765432109) note kar liya hai. Humara representative jald hi aapko call karega.",
    action_flag: "extract_and_confirm",
    extracted_entities: { name: "Priya Singh", phone: "8765432109" },
  },
  {
    category: "callback_request",
    language: "Bengali",
    user_input: "আমার নাম সুজয় দাস, দয়া করে 9830012345 নম্বরে কল ব্যাক করুন।",
    expected_intent: "request_callback",
    expected_response: "ধন্যবাদ, সুজয় দাস। আমি আপনার নম্বর (9830012345) নোট করে নিয়েছি। আমাদের প্রতিনিধি শীঘ্রই আপনাকে কল করবেন।",
    action_flag: "extract_and_confirm",
    extracted_entities: { name: "সুজয় দাস", phone: "9830012345" },
  },
];

test("24-Item Clinical Triage & Intent Benchmark Evaluation", async (t) => {
  for (const item of BENCHMARK_24) {
    await t.test(`[${item.category}] [${item.language}] ${item.user_input}`, () => {
      const result = evaluateHospitalQuery(item.user_input, hospitalData);

      // Verify action_flag
      assert.equal(
        result.actionFlag,
        item.action_flag,
        `Action flag mismatch for "${item.user_input}": expected ${item.action_flag}, got ${result.actionFlag}`
      );

      // Verify expected_intent
      if (item.expected_intent) {
        assert.equal(
          result.intent,
          item.expected_intent,
          `Intent mismatch for "${item.user_input}": expected ${item.expected_intent}, got ${result.intent}`
        );
      }

      // Verify expected_response (exact match)
      assert.equal(
        result.reply,
        item.expected_response,
        `Response mismatch for "${item.user_input}":\nExpected: ${item.expected_response}\nReceived: ${result.reply}`
      );

      // Verify extracted entities for callback_request
      if (item.extracted_entities) {
        assert.ok(result.extractedEntities, "Expected extractedEntities to be present");
        if (item.extracted_entities.name) {
          assert.equal(result.extractedEntities.name, item.extracted_entities.name);
        }
        if (item.extracted_entities.phone) {
          assert.equal(result.extractedEntities.phone, item.extracted_entities.phone);
        }
      }
    });
  }
});
