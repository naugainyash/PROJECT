export const defaultHospitalData = {
  hospital_name: "Aarogya Seva Hospital & Multi-Specialty Clinic",
  tagline: "Compassionate Care in Your Own Language",
  location: {
    address: "Plot 14, Sector 5, Malviya Nagar, Jaipur, Rajasthan 302017",
    landmark: "Near Apex Circle, opposite Central Park Malviya Nagar",
    google_maps_note: "Ample parking available at Basement B1. Wheelchair access at Gate 1."
  },
  contacts: {
    reception_phone: "+91 141 278 9000",
    emergency_phone: "108",
    hospital_casualty_direct: "+91 141 278 9999",
    whatsapp_help: "+91 98290 12345"
  },
  opd_hours: {
    regular: "Monday to Saturday, 8:00 AM to 8:00 PM",
    sunday: "Sunday regular OPD closed. Emergency Casualty and In-Patient Ward open 24x7.",
    emergency: "24 hours a day, 7 days a week, 365 days a year (Casualty Gate 1)"
  },
  doctors: [
    {
      id: "dr_arvind_rao",
      name: "Dr. Arvind Rao",
      name_hi: "डॉक्टर अरविंद राव",
      specialty: "Pediatrics (Child Specialist)",
      degrees: "MBBS, MD Pediatrics",
      days: "Monday, Wednesday, Friday",
      hours: "10:00 AM to 4:00 PM",
      spoken_hours_en: "ten in the morning to four in the afternoon",
      spoken_hours_hi: "सुबह दस बजे से शाम चार बजे तक",
      fee: 500,
      fee_spoken_en: "five hundred rupees",
      fee_spoken_hi: "पाँच सौ रुपये",
      room: "Room 102, First Floor"
    },
    {
      id: "dr_sunita_mehra",
      name: "Dr. Sunita Mehra",
      name_hi: "डॉक्टर सुनीता मेहरा",
      specialty: "Obstetrics & Gynaecology (Women Health)",
      degrees: "MBBS, MS OBGYN",
      days: "Tuesday, Thursday, Saturday",
      hours: "11:00 AM to 5:00 PM",
      spoken_hours_en: "eleven in the morning to five in the evening",
      spoken_hours_hi: "सुबह ग्यारह बजे से शाम पाँच बजे तक",
      fee: 600,
      fee_spoken_en: "six hundred rupees",
      fee_spoken_hi: "छह सौ रुपये",
      room: "Room 108, First Floor"
    },
    {
      id: "dr_rajesh_sharma",
      name: "Dr. Rajesh Sharma",
      name_hi: "डॉक्टर राजेश शर्मा",
      specialty: "General Medicine & Diabetology (Senior Physician)",
      degrees: "MBBS, MD Internal Medicine",
      days: "Monday to Friday",
      hours: "9:00 AM to 2:00 PM",
      spoken_hours_en: "nine in the morning to two in the afternoon",
      spoken_hours_hi: "सुबह नौ बजे से दोपहर दो बजे तक",
      fee: 400,
      fee_spoken_en: "four hundred rupees",
      fee_spoken_hi: "चार सौ रुपये",
      room: "Room 101, Ground Floor"
    },
    {
      id: "dr_priya_nair",
      name: "Dr. Priya Nair",
      specialty: "ENT Specialist (Ear, Nose, Throat)",
      degrees: "MBBS, MS ENT",
      days: "Monday, Wednesday, Saturday",
      hours: "2:00 PM to 6:00 PM",
      spoken_hours_en: "two in the afternoon to six in the evening",
      spoken_hours_hi: "दोपहर दो बजे से शाम छह बजे तक",
      fee: 500,
      fee_spoken_en: "five hundred rupees",
      fee_spoken_hi: "पाँच सौ रुपये",
      room: "Room 105, First Floor"
    },
    {
      id: "dr_amit_verma",
      name: "Dr. Amit Verma",
      specialty: "Orthopedics & Joint Care",
      degrees: "MBBS, MS Orthopedics",
      days: "Tuesday, Friday",
      hours: "10:00 AM to 3:00 PM",
      spoken_hours_en: "ten in the morning to three in the afternoon",
      spoken_hours_hi: "सुबह दस बजे से दोपहर तीन बजे तक",
      fee: 700,
      fee_spoken_en: "seven hundred rupees",
      fee_spoken_hi: "सात सौ रुपये",
      room: "Room 104, Ground Floor"
    },
    {
      id: "dr_vikram_singhania",
      name: "Dr. Vikram Singhania",
      specialty: "Visiting Cardiologist (Heart Specialist, Consultations & ECG/Echo only)",
      degrees: "MBBS, DM Cardiology",
      days: "Wednesday, Saturday",
      hours: "4:00 PM to 7:00 PM",
      spoken_hours_en: "four in the afternoon to seven in the evening",
      spoken_hours_hi: "शाम चार बजे से शाम सात बजे तक",
      fee: 800,
      fee_spoken_en: "eight hundred rupees",
      fee_spoken_hi: "आठ सौ रुपये",
      room: "Room 109, First Floor",
      surgery_note: "No open-heart surgery is performed on-site; outpatient heart check-ups, ECG and 2D-Echo only."
    }
  ],
  diagnostic_tests: [
    {
      name: "Fasting Blood Sugar (FBS)",
      aliases: ["sugar test", "blood sugar", "diabetes test", "शुगर टेस्ट"],
      price: 100,
      price_spoken_en: "one hundred rupees",
      price_spoken_hi: "एक सौ रुपये",
      instructions_en: "Requires eight to ten hours of overnight fasting. Only plain water is permitted before the test.",
      instructions_hi: "इसके लिए आठ से दस घंटे का खाली पेट होना जरूरी है। केवल सादा पानी पी सकते हैं।",
      report_time: "Same day within three hours"
    },
    {
      name: "HbA1c (Three Month Blood Sugar Average)",
      aliases: ["hba1c", "three month sugar"],
      price: 450,
      price_spoken_en: "four hundred and fifty rupees",
      price_spoken_hi: "चार सौ पचास रुपये",
      instructions_en: "No fasting required. You can give blood anytime during lab hours.",
      instructions_hi: "खाली पेट होने की कोई जरूरत नहीं है। आप किसी भी समय आ सकते हैं।",
      report_time: "Same day evening"
    },
    {
      name: "Complete Blood Count (CBC)",
      aliases: ["cbc", "blood count", "hemoglobin test", "सीबीसी"],
      price: 300,
      price_spoken_en: "three hundred rupees",
      price_spoken_hi: "तीन सौ रुपये",
      instructions_en: "No special fasting needed. Evaluates hemoglobin, platelets, and white blood cells.",
      instructions_hi: "खाली पेट की आवश्यकता नहीं है। रिपोर्ट चार घंटे में मिल जाएगी।",
      report_time: "Four hours"
    },
    {
      name: "Lipid Profile (Cholesterol Test)",
      aliases: ["cholesterol", "lipid profile", "कोलेस्ट्रॉल"],
      price: 650,
      price_spoken_en: "six hundred and fifty rupees",
      price_spoken_hi: "छह सौ पचास रुपये",
      instructions_en: "Strict overnight fasting of twelve hours is necessary.",
      instructions_hi: "बारह घंटे का सख्त खाली पेट होना जरूरी है।",
      report_time: "Same day evening"
    },
    {
      name: "Thyroid Profile (T3, T4, TSH)",
      aliases: ["thyroid", "tsh test", "थायरॉयड"],
      price: 500,
      price_spoken_en: "five hundred rupees",
      price_spoken_hi: "पाँच सौ रुपये",
      instructions_en: "Morning blood sample before taking thyroid medications is recommended.",
      instructions_hi: "सुबह की दवा लेने से पहले का सैंपल देना बेहतर रहता है।",
      report_time: "Next morning"
    },
    {
      name: "Digital Chest X-Ray",
      aliases: ["x-ray", "chest xray", "छाती का एक्स-रे"],
      price: 400,
      price_spoken_en: "four hundred rupees",
      price_spoken_hi: "चार सौ रुपये",
      instructions_en: "Walk-in service. No preparation needed. Report given within 30 minutes.",
      instructions_hi: "बिना अपॉइंटमेंट आ सकते हैं। रिपोर्ट तीस मिनट में मिल जाती है।",
      report_time: "30 minutes"
    },
    {
      name: "Ultrasound (USG Abdomen & Pelvis)",
      aliases: ["ultrasound", "usg", "sonography", "अल्ट्रासाउंड"],
      price: 1200,
      price_spoken_en: "twelve hundred rupees",
      price_spoken_hi: "बारह सौ रुपये",
      instructions_en: "Requires a full bladder. Drink one liter of water one hour before scan and do not pass urine.",
      instructions_hi: "पेशाब भरा होना जरूरी है। जांच से एक घंटा पहले एक लीटर पानी पिएं।",
      report_time: "Immediate post-scan report"
    },
    {
      name: "ECG (Electrocardiogram)",
      aliases: ["ecg", "heart tracing", "ईसीजी"],
      price: 250,
      price_spoken_en: "two hundred and fifty rupees",
      price_spoken_hi: "दो सौ पचास रुपये",
      instructions_en: "Immediate walk-in testing on ground floor casualty room.",
      instructions_hi: "तुरंत कैजुअल्टी रूम में जांच उपलब्ध है।",
      report_time: "Immediate"
    }
  ],
  unavailable_services: [
    "Open heart bypass surgery",
    "Neurosurgery / Brain surgery",
    "On-site MRI scanner (partner scan center 2 km away, patient transport provided)",
    "Organ transplants"
  ],
  emergency_guideline: {
    keywords: [
      "chest pain",
      "heart attack",
      "bleeding",
      "unconscious",
      "head injury",
      "accident",
      "breathing trouble",
      "सीने में दर्द",
      "खून",
      "बेहोश",
      "एक्सीडेंट",
      "दुर्घटना"
    ],
    response_en: "This sounds like a critical medical emergency. Please call 108 immediately or rush to our 24x7 Emergency Casualty at Gate 1.",
    response_hi: "यह एक आपातकालीन स्थिति लग रही है। कृपया तुरंत 108 पर कॉल करें या सीधे हमारे गेट नंबर 1 पर 24 घंटे खुले कैजुअल्टी वार्ड में पहुँचें।"
  },
  safety_disclaimer: "This is an AI voice assistant. I can only provide hospital operational facts and cannot offer medical diagnosis, prescribe drugs, or substitute for a registered doctor.",
  appointment_slots: [
    { id: "slot-1", time: "10:00 AM - 10:30 AM", label: "Morning (10:00 AM)" },
    { id: "slot-2", time: "11:30 AM - 12:00 PM", label: "Morning (11:30 AM)" },
    { id: "slot-3", time: "02:30 PM - 03:00 PM", label: "Afternoon (02:30 PM)" },
    { id: "slot-4", time: "04:30 PM - 05:00 PM", label: "Evening (04:30 PM)" },
    { id: "slot-5", time: "05:30 PM - 06:00 PM", label: "Evening (05:30 PM)" }
  ]
};

export default defaultHospitalData;
