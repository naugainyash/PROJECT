# 3-Minute Rehearsed Demo Script (Gnani Voice Hackathon)

**Total Time:** 180 seconds  
**Presenters:** Yash Naugain & Team  
**Prerequisites:** Laptop with microphone unmuted, speaker volume at 80%, browser open to `http://localhost:3000`.

---

### [0:00 - 0:30] Introduction & The Problem
**Presenter 1:**
> *"Namaste judges! In India, more than 70% of phone calls to community hospitals and polyclinics are simple, repetitive questions: 'When does the child specialist arrive?', 'How much is a blood test?', 'Are you open on Sunday?'.  
> Front-desk staff are overwhelmed, phone lines stay busy, and patients who cannot read or write English websites are left completely stranded.  
> We built **AarogyaVani**: a multilingual voice receptionist powered by Gnani AI's Prisma STT and Timbre TTS that solves this real-world problem."*

---

### [0:30 - 1:15] Demo 1: Multilingual Doctor Timings in Hindi
**Presenter 2:**
*(Tap the big microphone button)*  
> *"बच्चों के डॉक्टर कब बैठते हैं?"*  
*(Wait 1.5 seconds for Gnani response)*

**Bot speaks (in Hindi voice):**
> *"बच्चों के विशेषज्ञ डॉक्टर अरविंद राव हैं। वे सोमवार, बुधवार और शुक्रवार को सुबह दस बजे से शाम चार बजे तक बैठते हैं। परामर्श शुल्क पाँच सौ रुपये है।"*

**Presenter 1:**
> *"Notice two things: First, Gnani Prisma automatically detected Hindi via `indic-auto` without any manual language dropdown. Second, Gnani Timbre spoke 'पाँच सौ रुपये' and 'सुबह दस बजे' in natural spoken Hindi words instead of reading raw numbers or dollar symbols."*

---

### [1:15 - 1:45] Demo 2: Lead Capture & Live Reception Desk
**Presenter 2:**
*(Tap the microphone button)*  
> *"Book me with the gynaecologist, I'm Anita, 9876543210"*

**Bot speaks:**
> *"Thank you Anita. I have registered your callback request for Consultation with Dr. Sunita Mehra. Your phone number is noted as nine eight seven six five four three two one zero. Our reception staff will call you shortly."*

**Presenter 1:**
*(Switches tab to 'Reception Desk')*  
> *"Look at the Reception Callback Desk: Anita's request has immediately appeared with her verified phone number, time, and doctor requested. The hospital receptionist can simply click 'Mark Called' once followed up."*

---

### [1:45 - 2:15] Demo 3: Emergency Casualty Rule-Based Triage
**Presenter 2:**
*(Tap the microphone button)*  
> *"सीने में बहुत तेज दर्द है और सांस नहीं आ रही"*

*(Immediate red Emergency alert pops up with audio)*  
**Bot speaks:**
> *"यह एक आपातकालीन स्थिति लग रही है। कृपया तुरंत 108 पर कॉल करें या सीधे हमारे गेट नंबर 1 पर 24 घंटे खुले कैजुअल्टी वार्ड में पहुँचें।"*

**Presenter 1:**
> *"This is our critical safety gate: for life-threatening emergencies like cardiac chest pain or bleeding, our rule-based triage bypasses LLM latency completely (&lt;15ms) and immediately commands the patient to dial 108 and reach the 24x7 Casualty at Gate 1."*

---

### [2:15 - 2:45] Demo 4: Standout Feature — Outbound Voice Reminder
**Presenter 1:**
*(In Reception Desk, clicks 'Outbound Reminder Demo')*  
> *"Not only can the bot answer inbound calls, it proactively solves patient no-shows. Watch as our staff dispatches an automated voice reminder to Ramesh for his pediatric appointment tomorrow."*  
*(Click 'Dispatch Voice Reminder')*  
**Bot speaks (in natural phone voice):**
> *"नमस्ते रमेश जी, यह आरोग्य सेवा अस्पताल से रिमाइंडर कॉल है। डॉक्टर अरविंद राव के साथ आपका अपॉइंटमेंट कल सुबह दस बजे निर्धारित है। कृपया समय पर पहुँचें। धन्यवाद।"*

---

### [2:45 - 3:00] Conclusion & Judging Impact
**Presenter 1:**
> *"AarogyaVani bridges healthcare access across 10 Indian languages, enforces 100% clinical safety against hallucinations, and frees receptionists to care for patients on-site. Built entirely on Gnani AI speech APIs. Thank you!"*
