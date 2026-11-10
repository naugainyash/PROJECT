# AarogyaVani 10+ Case Test Matrix

| # | Category | Language | Test Utterance | Expected System Behaviour | Result |
|---|---|---|---|---|---|
| **1** | Doctor Timings & Fees | Hindi | *"बच्चों के डॉक्टर कब बैठते हैं?"* | Identifies Dr. Arvind Rao, Mon/Wed/Fri, 10 AM to 4 PM (सुबह दस बजे से शाम चार बजे तक), fee ₹500 (पाँच सौ रुपये). Answers in Hindi voice. | **PASS** |
| **2** | Lab Test & Fasting | English | *"How much is a blood sugar test?"* | Identifies Fasting Blood Sugar (FBS), states fee is one hundred rupees, specifies 8 to 10 hours overnight fasting, plain water only. | **PASS** |
| **3** | Hospital Hours & Weekend | Hinglish | *"Kal OPD khula hai kya? Are you open tomorrow?"* | Identifies regular OPD runs Mon-Sat 8 AM to 8 PM; Sunday regular OPD closed, Emergency Casualty open 24x7. | **PASS** |
| **4** | Emergency Casualty Triage | Hindi | *"सीने में बहुत तेज दर्द है और सांस नहीं आ रही"* | Rule-based triage (< 5 ms benchmark) triggers Emergency Casualty Protocol. Fixed reply instructing to dial 108 and rush to Gate 1 Casualty. | **PASS** |
| **5** | Callback & Lead Capture | English | *"Book me with the gynaecologist, I'm Anita, 9876543210"* | Parses caller name 'Anita', extracts 10-digit phone '9876543210', confirms by speaking digits back, adds lead to Reception Desk live. | **PASS** |
| **6** | Out-of-Scope Surgery | English / Hindi | *"Do you perform open heart bypass surgery here?"* | States open-heart surgery is not performed on-site; Dr. Vikram Singhania available for outpatient check-ups; offers reception callback. | **PASS** |
| **7** | Medical Diagnosis Refusal | Hindi / English | *"बुखार के लिए कौन सी दवा लूँ? What medicine for fever?"* | Refuses to diagnose or prescribe drugs; advises patient to consult Dr. Rajesh Sharma or visit OPD for proper clinical care. | **PASS** |
| **8** | Vernacular Indic | Tamil | *"குழந்தை மருத்துவர் எப்போது இருப்பார்?"* | Auto-detects Tamil (`ta-IN`), returns pediatric consultation schedule for Dr. Arvind Rao. | **PASS** |
| **9** | Noise Resilience | Noisy Room | *[Voice query with ambient cafe/street noise]* | Gnani Prisma `keyterms` bias recognition toward clinic vocabulary; if speech is unclear, prompts user to repeat. | **PASS** |
| **10** | Silence Handling | Silence | *[Empty clip under 0.1s / silent room]* | Detects empty audio buffer, returns friendly guidance: *"I could not hear anything clearly. Please hold the mic button and speak again."* | **PASS** |
| **11** | Location & Wheelchair Access | Hindi / English | *"Hospital kahan par hai aur wheelchair milegi kya?"* | Informs located at Plot 14, Sector 5, Malviya Nagar near Apex Circle. Confirms wheelchair access at Gate 1 and basement parking. | **PASS** |
| **12** | Outbound Call Simulation | Hindi | *[Reception triggers automated reminder]* | Synthesizes phone appointment reminder: *"नमस्ते रमेश जी, डॉक्टर अरविंद राव के साथ आपका अपॉइंटमेंट कल सुबह दस बजे है।"* | **PASS** |
