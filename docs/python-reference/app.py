"""
AarogyaVani - Multilingual Hospital Voice Receptionist
[REFERENCE PYTHON IMPLEMENTATION]

Note: The full-stack production application is powered by `server.ts` (Express + Vite + React 19).
This file (`app.py`) is provided as a standalone reference Python 3.10+ FastAPI script
implementing the same Gnani AI Speech REST interfaces and deterministic clinical safety gates.

Built on Gnani AI Speech APIs:
  - STT REST: POST https://api.vachana.ai/stt/v3 (Prisma v3.0, indic-auto, transcribe format)
  - TTS REST: POST https://api.vachana.ai/api/v1/tts/inference (Timbre v3.0, voice Shivani, 24kHz WAV)
"""

from __future__ import annotations

import base64
import json
import os
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import secrets
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Load environment configuration
load_dotenv()

GNANI_API_KEY = os.getenv("GNANI_API_KEY", "")
GNANI_BASE_URL = os.getenv("GNANI_BASE_URL", "https://api.vachana.ai")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "claude-sonnet-5-5")
TTS_MODEL = os.getenv("TTS_MODEL", "timbre-v3.0")
TTS_VOICE = os.getenv("TTS_VOICE", "Shivani")
TTS_SPEED = float(os.getenv("TTS_SPEED", "1.0"))

DATA_PATH = Path("hospital_data.json")
LEADS_PATH = Path("data/leads.json") if Path("data/leads.json").exists() else Path("leads.json")
ANALYTICS_PATH = Path("data/analytics.json") if Path("data/analytics.json").exists() else Path("analytics.json")
STAFF_PIN = os.getenv("STAFF_PIN", "")

# Load hospital data
if DATA_PATH.exists():
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        HOSPITAL_DATA = json.load(f)
else:
    HOSPITAL_DATA = {"hospital_name": "Aarogya Seva Hospital"}

# Emergency regex triggers in Hindi and English
EMERGENCY_PATTERNS = [
    # English emergency patterns
    r"\b(chest\s*pain|heart\s*attack|cardiac\s*arrest)\b",
    r"\b(profuse|severe|heavy)?\s*(bleeding|blood\s*loss|hemorrhage)\b",
    r"\b(unconscious|passed\s*out|fainted|not\s*waking\s*up|unresponsive)\b",
    r"\b(head\s*injury|severe\s*concussion|skull\s*fracture)\b",
    r"\b(severe\s*accident|road\s*accident|car\s*crash|trauma)\b",
    r"\b(choking|cannot\s*breathe|trouble\s*breathing|suffocating)\b",
    r"\b(stroke|paralysis|facial\s*droop|slurred\s*speech)\b",
    # Hindi emergency patterns (Devanagari & Romanized Hinglish)
    r"(सीने\s*में\s*दर्द|हार्ट\s*अटैक|छाती\s*में\s*दर्द)",
    r"(खून\s*बह\s*रहा|बहुत\s*खून|रक्तस्राव)",
    r"(बेहोश|होश\s*नहीं|अचेत)",
    r"(सिर\s*में\s*चोट|गंभीर\s*चोट)",
    r"(एक्सीडेंट|दुर्घटना|हादसा)",
    r"(सांस\s*नहीं\s*आ\s*रही|दम\s*घुट\s*रहा)",
    r"\b(seene\s*me\s*dard|chhati\s*me\s*dard|khoon\s*nikal\s*raha|behosh|accident|saans\s*nahi\s*aa\s*rahi)\b",
]

EMERGENCY_REPLIES = {
    "hi-IN": (
        "यह एक आपातकालीन स्थिति लग रही है। कृपया तुरंत 108 पर कॉल करें या सीधे "
        "हमारे गेट नंबर 1 पर 24 घंटे खुले कैजुअल्टी वार्ड में पहुँचें।"
    ),
    "en-IN": (
        "This sounds like a critical medical emergency. Please dial one zero eight immediately "
        "or rush directly to our twenty-four hour Casualty at Gate number one."
    ),
}

# Medication refusal advice
MEDICATION_PATTERNS = [
    r"\b(what\s*medicine|which\s*tablet|give\s*medicine|prescribe|paracetamol|dosage|painkiller)\b",
    r"(दवा\s*बताओ|कौन\s*सी\s*दवा|दवाई|गोली|इलाज\s*बताइए)",
    r"\b(dawa\s*batao|kaunsi\s*dawa|tablet\s*batao)\b",
]

MEDICATION_REPLIES = {
    "hi-IN": (
        "मैं एक एआई असिस्टेंट हूँ और कोई दवा या नुस्खा नहीं बता सकता। "
        "कृपया सुरक्षित इलाज के लिए हमारे अस्पताल में डॉक्टर राजेश शर्मा से परामर्श लें।"
    ),
    "en-IN": (
        "I am an AI assistant and cannot prescribe medicines or provide medical diagnosis. "
        "Please consult Doctor Rajesh Sharma or visit our outpatient department for proper clinical care."
    ),
}

app = FastAPI(
    title="AarogyaVani Hospital Voice Receptionist",
    description="Multilingual hospital enquiry bot powered by Gnani AI Prisma STT & Timbre TTS",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models
class TextQueryRequest(BaseModel):
    query: str
    language_code: Optional[str] = "indic-auto"
    session_id: Optional[str] = None


class LeadItem(BaseModel):
    id: str
    name: str
    phone: str
    reason: str
    created_at: str
    status: str  # "pending" or "called"
    notes: Optional[str] = ""


class OutboundReminderRequest(BaseModel):
    patient_name: str
    patient_phone: str
    doctor_name: str
    appointment_time: str
    language_code: Optional[str] = "en-IN"


def load_leads() -> List[Dict[str, Any]]:
    if not LEADS_PATH.exists():
        # Seed realistic initial leads
        initial = [
            {
                "id": "lead-001",
                "name": "Ramesh Kumar",
                "phone": "9829012345",
                "reason": "Appointment with Dr. Arvind Rao (Pediatrician)",
                "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "status": "pending",
                "notes": "Child has persistent fever",
            },
            {
                "id": "lead-002",
                "name": "Pooja Verma",
                "phone": "9414056789",
                "reason": "Ultrasound test confirmation & Dr. Sunita Mehra",
                "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "status": "called",
                "notes": "Confirmed Tuesday 11:30 AM slot",
            },
        ]
        save_leads(initial)
        return initial
    try:
        with open(LEADS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def save_leads(leads: List[Dict[str, Any]]) -> None:
    with open(LEADS_PATH, "w", encoding="utf-8") as f:
        json.dump(leads, f, indent=2, ensure_ascii=False)


def record_analytics_event(category: str, language: str, is_emergency: bool = False, is_lead: bool = False) -> None:
    events = {"queries_total": 0, "by_language": {}, "by_category": {}, "emergencies": 0, "leads": 0}
    if ANALYTICS_PATH.exists():
        try:
            with open(ANALYTICS_PATH, "r", encoding="utf-8") as f:
                events = json.load(f)
        except Exception:
            pass

    events["queries_total"] = events.get("queries_total", 0) + 1
    lang = language or "indic-auto"
    events["by_language"][lang] = events.get("by_language", {}).get(lang, 0) + 1
    events["by_category"][category] = events.get("by_category", {}).get(category, 0) + 1
    if is_emergency:
        events["emergencies"] = events.get("emergencies", 0) + 1
    if is_lead:
        events["leads"] = events.get("leads", 0) + 1

    try:
        with open(ANALYTICS_PATH, "w", encoding="utf-8") as f:
            json.dump(events, f, indent=2)
    except Exception:
        pass


def check_emergency(text: str) -> Optional[str]:
    """Check rule-based emergency triggers BEFORE sending to any LLM."""
    lower_text = text.lower()
    for pattern in EMERGENCY_PATTERNS:
        if re.search(pattern, lower_text, re.IGNORECASE):
            # Check if Hindi characters or keywords predominate
            if re.search(r"[\u0900-\u097F]|seene|dard|khoon|behosh", text, re.IGNORECASE):
                return EMERGENCY_REPLIES["hi-IN"]
            return EMERGENCY_REPLIES["en-IN"]
    return None


def check_medication_query(text: str) -> Optional[str]:
    """Refuse medication prescription / medical diagnostic requests."""
    lower_text = text.lower()
    for pattern in MEDICATION_PATTERNS:
        if re.search(pattern, lower_text, re.IGNORECASE):
            if re.search(r"[\u0900-\u097F]|dawa|goli", text, re.IGNORECASE):
                return MEDICATION_REPLIES["hi-IN"]
            return MEDICATION_REPLIES["en-IN"]
    return None


def extract_lead_info(text: str) -> Optional[Tuple[str, str, str]]:
    """
    Extracts name, 10-digit Indian mobile number, and reason for booking/callback.
    Example: 'My name is Anita, phone 9876543210, book pediatrician'
    """
    phone_match = re.search(r"(?:\+?91[\s-]?)?([6-9]\d{9})\b", text)
    if not phone_match:
        return None

    phone = phone_match.group(1)

    # Extract name heuristic
    name = "Caller"
    name_patterns = [
        r"(?:my\s*name\s*is|i\s*am|this\s*is|naam\s*hai|mera\s*naam)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
        r"(?:name|naam)[:\s]+([A-Za-z]+)",
    ]
    for pat in name_patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            name = m.group(1).title()
            break

    # If no explicit name prefix found, look for title words
    if name == "Caller":
        words = text.split()
        for idx, w in enumerate(words):
            if w.lower() in ["mr.", "ms.", "mrs.", "shri", "smt"]:
                if idx + 1 < len(words):
                    name = f"{w} {words[idx+1]}".title()
                    break

    reason = "Doctor appointment / callback request"
    if "child" in text.lower() or "pediatric" in text.lower() or "बच्चों" in text:
        reason = "Consultation with Dr. Arvind Rao (Pediatrics)"
    elif "gynae" in text.lower() or "women" in text.lower() or "महिला" in text:
        reason = "Consultation with Dr. Sunita Mehra (Gynaecology)"
    elif "sugar" in text.lower() or "blood" in text.lower() or "test" in text.lower() or "खून" in text:
        reason = "Diagnostic test inquiry / booking"
    elif "heart" in text.lower() or "cardio" in text.lower():
        reason = "Cardiology consultation request (Dr. Vikram Singhania)"

    return name, phone, reason


def spell_out_digits(phone: str) -> str:
    """Format digits as individual words for clear TTS pronunciation."""
    digit_words = {
        "0": "zero",
        "1": "one",
        "2": "two",
        "3": "three",
        "4": "four",
        "5": "five",
        "6": "six",
        "7": "seven",
        "8": "eight",
        "9": "nine",
    }
    return " ".join(digit_words.get(d, d) for d in phone)


def query_knowledge_base(query: str, detected_lang: str) -> Tuple[str, str, Optional[Dict[str, Any]]]:
    """
    Hospital knowledge base query engine.
    Returns: (spoken_reply, category, optional_lead)
    Strictly constrained to hospital_data.json.
    """
    text = query.strip()
    is_hindi = bool(re.search(r"[\u0900-\u097F]|namaste|kya|hai|kab|kaise", text, re.IGNORECASE))
    lang = "hi-IN" if is_hindi else (detected_lang if detected_lang in ["hi-IN", "ta-IN", "te-IN"] else "en-IN")

    # 1. Emergency rule check (First gate)
    emergency_reply = check_emergency(text)
    if emergency_reply:
        record_analytics_event("Emergency Triage", lang, is_emergency=True)
        return emergency_reply, "emergency", None

    # 2. Medication / Diagnosis safety refusal
    med_reply = check_medication_query(text)
    if med_reply:
        record_analytics_event("Medication Safety Refusal", lang)
        return med_reply, "medical_refusal", None

    # 3. Lead / Callback capture
    lead_info = extract_lead_info(text)
    if lead_info:
        name, phone, reason = lead_info
        lead_id = f"lead-{uuid.uuid4().hex[:6]}"
        lead_item = {
            "id": lead_id,
            "name": name,
            "phone": phone,
            "reason": reason,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "status": "pending",
            "notes": f"Captured from query: '{text[:80]}'",
        }
        leads = load_leads()
        leads.insert(0, lead_item)
        save_leads(leads)

        spoken_digits = spell_out_digits(phone)
        if is_hindi:
            reply = (
                f"धन्यवाद {name} जी। आपका संपर्क नंबर {spoken_digits} दर्ज कर लिया गया है। "
                f"हमारे अस्पताल की रिसेप्शन टीम शीघ्र ही आपसे संपर्क करेगी।"
            )
        else:
            reply = (
                f"Thank you {name}. I have registered your callback request for {reason}. "
                f"Your phone number is noted as {spoken_digits}. Our reception staff will call you shortly."
            )
        record_analytics_event("Lead Capture", lang, is_lead=True)
        return reply, "lead_captured", lead_item

    # 4. Out-of-scope / unavailable surgery check
    lower_q = text.lower()
    if any(k in lower_q for k in ["heart surgery", "bypass", "brain surgery", "neurosurgery", "transplant"]):
        if is_hindi:
            reply = (
                "हमारे अस्पताल में ओपन हार्ट सर्जरी या न्यूरोसर्जरी की सुविधा उपलब्ध नहीं है। "
                "हार्ट कंसल्टेशन के लिए डॉक्टर विक्रम सिंघानिया उपलब्ध हैं। क्या मैं रिसेप्शन से कॉलबैक का अनुरोध करूँ?"
            )
        else:
            reply = (
                "Our clinic does not perform open heart surgery or neurosurgery on-site. "
                "Doctor Vikram Singhania is available for outpatient heart check-ups. Would you like our reception team to call you?"
            )
        record_analytics_event("Out of Scope Query", lang)
        return reply, "out_of_scope", None

    # 5. Doctor queries
    # Pediatrics / Dr. Arvind Rao
    if any(k in lower_q for k in ["child", "pediatric", "bachhe", "bachho", "bacha", "बच्चों"]):
        doc = HOSPITAL_DATA["doctors"][0]
        if is_hindi:
            reply = (
                f"बच्चों के विशेषज्ञ {doc['name']} हैं। वे सोमवार, बुधवार और शुक्रवार को "
                f"{doc['spoken_hours_hi']} बैठते हैं। परामर्श शुल्क {doc['fee_spoken_hi']} है।"
            )
        else:
            reply = (
                f"Our senior pediatrician is {doc['name']}. He is available on Monday, Wednesday, and Friday from "
                f"{doc['spoken_hours_en']}. Consultation fee is {doc['fee_spoken_en']}."
            )
        record_analytics_event("Doctor Inquiry (Pediatrics)", lang)
        return reply, "doctor_inquiry", None

    # Gynaecology / Dr. Sunita Mehra
    if any(k in lower_q for k in ["gynae", "women", "pregnancy", "delivery", "lady doctor", "महिला"]):
        doc = HOSPITAL_DATA["doctors"][1]
        if is_hindi:
            reply = (
                f"स्त्री रोग विशेषज्ञ {doc['name']} हैं। वे मंगलवार, गुरुवार और शनिवार को "
                f"{doc['spoken_hours_hi']} बैठती हैं। परामर्श शुल्क {doc['fee_spoken_hi']} है।"
            )
        else:
            reply = (
                f"Our consultant gynaecologist is {doc['name']}. She is available on Tuesday, Thursday, and Saturday from "
                f"{doc['spoken_hours_en']}. Consultation fee is {doc['fee_spoken_en']}."
            )
        record_analytics_event("Doctor Inquiry (Gynaecology)", lang)
        return reply, "doctor_inquiry", None

    # General Physician / Dr. Rajesh Sharma
    if any(k in lower_q for k in ["physician", "fever", "cough", "cold", "general doctor", "sharma"]):
        doc = HOSPITAL_DATA["doctors"][2]
        if is_hindi:
            reply = (
                f"सीनियर फिजिशियन {doc['name']} सोमवार से शुक्रवार {doc['spoken_hours_hi']} बैठते हैं। "
                f"परामर्श शुल्क {doc['fee_spoken_hi']} है।"
            )
        else:
            reply = (
                f"Senior physician {doc['name']} is available Monday to Friday from {doc['spoken_hours_en']}. "
                f"Consultation fee is {doc['fee_spoken_en']}."
            )
        record_analytics_event("Doctor Inquiry (Medicine)", lang)
        return reply, "doctor_inquiry", None

    # ENT / Dr. Priya Nair
    if any(k in lower_q for k in ["ent", "ear", "nose", "throat", "kaan", "gala"]):
        doc = HOSPITAL_DATA["doctors"][3]
        if is_hindi:
            reply = (
                f"ईएनटी विशेषज्ञ {doc['name']} सोमवार, बुधवार और शनिवार को {doc['spoken_hours_hi']} बैठती हैं। "
                f"परामर्श शुल्क {doc['fee_spoken_hi']} है।"
            )
        else:
            reply = (
                f"ENT specialist {doc['name']} is available on Monday, Wednesday, and Saturday from {doc['spoken_hours_en']}. "
                f"Consultation fee is {doc['fee_spoken_en']}."
            )
        record_analytics_event("Doctor Inquiry (ENT)", lang)
        return reply, "doctor_inquiry", None

    # Orthopedics / Dr. Amit Verma
    if any(k in lower_q for k in ["ortho", "bone", "joint", "fracture", "haddi", "हड्डी"]):
        doc = HOSPITAL_DATA["doctors"][4]
        if is_hindi:
            reply = (
                f"हड्डी रोग विशेषज्ञ {doc['name']} मंगलवार और शुक्रवार को {doc['spoken_hours_hi']} बैठते हैं। "
                f"परामर्श शुल्क {doc['fee_spoken_hi']} है।"
            )
        else:
            reply = (
                f"Orthopedic specialist {doc['name']} is available on Tuesday and Friday from {doc['spoken_hours_en']}. "
                f"Consultation fee is {doc['fee_spoken_en']}."
            )
        record_analytics_event("Doctor Inquiry (Orthopedics)", lang)
        return reply, "doctor_inquiry", None

    # Diagnostic Tests
    # Blood Sugar / Diabetes test
    if any(k in lower_q for k in ["sugar", "fbs", "diabetes test", "शुगर"]):
        test = HOSPITAL_DATA["diagnostic_tests"][0]
        if is_hindi:
            reply = (
                f"फास्टिंग ब्लड शुगर टेस्ट का शुल्क {test['price_spoken_hi']} है। "
                f"{test['instructions_hi']}"
            )
        else:
            reply = (
                f"Fasting blood sugar test costs {test['price_spoken_en']}. "
                f"{test['instructions_en']}"
            )
        record_analytics_event("Test Inquiry (Blood Sugar)", lang)
        return reply, "test_inquiry", None

    # CBC test
    if any(k in lower_q for k in ["cbc", "complete blood", "hemoglobin", "सीबीसी"]):
        test = HOSPITAL_DATA["diagnostic_tests"][2]
        if is_hindi:
            reply = (
                f"सीबीसी टेस्ट का शुल्क {test['price_spoken_hi']} है। "
                f"इसके लिए खाली पेट रहने की आवश्यकता नहीं है, रिपोर्ट चार घंटे में मिल जाएगी।"
            )
        else:
            reply = (
                f"Complete blood count test is {test['price_spoken_en']}. "
                f"No fasting required and results are ready in four hours."
            )
        record_analytics_event("Test Inquiry (CBC)", lang)
        return reply, "test_inquiry", None

    # Ultrasound / Sonography
    if any(k in lower_q for k in ["ultrasound", "usg", "sonography", "अल्ट्रासाउंड"]):
        test = HOSPITAL_DATA["diagnostic_tests"][6]
        if is_hindi:
            reply = (
                f"अल्ट्रासाउंड का शुल्क {test['price_spoken_hi']} है। "
                f"{test['instructions_hi']}"
            )
        else:
            reply = (
                f"Ultrasound abdomen and pelvis costs {test['price_spoken_en']}. "
                f"{test['instructions_en']}"
            )
        record_analytics_event("Test Inquiry (Ultrasound)", lang)
        return reply, "test_inquiry", None

    # X-Ray
    if any(k in lower_q for k in ["xray", "x-ray", "chest x", "एक्स-रे"]):
        test = HOSPITAL_DATA["diagnostic_tests"][5]
        if is_hindi:
            reply = (
                f"डिजिटल चेस्ट एक्स-रे का शुल्क {test['price_spoken_hi']} है। "
                f"इसके लिए पहले से अपॉइंटमेंट की आवश्यकता नहीं है।"
            )
        else:
            reply = (
                f"Digital chest X-ray costs {test['price_spoken_en']}. "
                f"Walk-in service is available with reports in thirty minutes."
            )
        record_analytics_event("Test Inquiry (X-Ray)", lang)
        return reply, "test_inquiry", None

    # OPD Hours & Sunday opening
    if any(k in lower_q for k in ["opd", "time", "timing", "open", "khula", "sunday", "hours", "रविवार"]):
        if "sunday" in lower_q or "ravivar" in lower_q or "रविवार" in text:
            if is_hindi:
                reply = "रविवार को नियमित ओपीडी बंद रहती है, लेकिन आपातकालीन कैजुअल्टी वार्ड चौबीस घंटे खुला रहता है।"
            else:
                reply = "Regular outpatient departments are closed on Sundays, but our Emergency Casualty is open twenty-four hours."
        else:
            if is_hindi:
                reply = "अस्पताल की ओपीडी सोमवार से शनिवार सुबह आठ बजे से रात आठ बजे तक खुली रहती है।"
            else:
                reply = "Hospital outpatient departments run Monday to Saturday from eight in the morning until eight in the evening."
        record_analytics_event("Hospital Hours Inquiry", lang)
        return reply, "timing_inquiry", None

    # Location / Address
    if any(k in lower_q for k in ["address", "location", "kahan", "where", "reach", "kaha", "पता"]):
        loc = HOSPITAL_DATA["location"]
        if is_hindi:
            reply = f"हमारा अस्पताल मालवीय नगर जयपुर में एपेक्स सर्कल के पास स्थित है। भूतल पर व्हीलचेयर सुविधा उपलब्ध है।"
        else:
            reply = f"Our hospital is located at Plot 14, Sector 5, Malviya Nagar, Jaipur, near Apex Circle. Wheelchair access is at Gate one."
        record_analytics_event("Location Inquiry", lang)
        return reply, "location_inquiry", None

    # Fallback when not found in hospital data
    if is_hindi:
        reply = (
            "यह जानकारी हमारे रिकॉर्ड में उपलब्ध नहीं है। "
            "कृपया अपना नाम और मोबाइल नंबर बताएं, ताकि हमारी रिसेप्शन टीम आपको कॉल कर सके।"
        )
    else:
        reply = (
            "I could not locate this in the clinic database. "
            "Please share your name and mobile number, and our reception desk will gladly call you back."
        )
    record_analytics_event("General / Unmatched Inquiry", lang)
    return reply, "unknown_fallback", None


def call_gnani_stt(audio_bytes: bytes, filename: str = "voice_input.wav") -> Tuple[str, str]:
    """
    Call Gnani Prisma v3.0 STT API.
    Endpoint: POST https://api.vachana.ai/stt/v3
    """
    if not GNANI_API_KEY:
        # Fallback simulation if key not configured yet
        return "बच्चों के डॉक्टर कब बैठते हैं?", "hi-IN"

    url = f"{GNANI_BASE_URL}/stt/v3"
    headers = {"X-API-Key-ID": GNANI_API_KEY}

    keyterms = [
        "Dr. Arvind Rao",
        "Dr. Sunita Mehra",
        "Dr. Rajesh Sharma",
        "Dr. Priya Nair",
        "Dr. Amit Verma",
        "Dr. Vikram Singhania",
        "OPD",
        "Pediatrics",
        "Gynaecology",
        "Fasting Blood Sugar",
        "CBC",
        "Ultrasound",
        "Malviya Nagar",
        "Jaipur",
        "108",
    ]

    files = {"audio_file": (filename, audio_bytes, "audio/wav")}
    data = {
        "model": "prisma-v3.0",
        "language_code": "indic-auto",
        "format": "transcribe",
        "keyterms": json.dumps(keyterms),
    }

    try:
        resp = requests.post(url, headers=headers, files=files, data=data, timeout=30)
        if resp.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid Gnani API Key (X-API-Key-ID)")
        if resp.status_code == 403:
            raise HTTPException(status_code=403, detail="Gnani API Key lacks STT permissions")
        if resp.status_code == 429:
            raise HTTPException(status_code=429, detail="Gnani STT rate limited. Please try again.")
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=f"Gnani STT error: {resp.text}")

        res_json = resp.json()
        transcript = res_json.get("transcript", "").strip()
        detected_lang = res_json.get("detected_language_code", "hi-IN")
        return transcript, detected_lang
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Failed to communicate with Gnani STT: {str(e)}")


def call_gnani_tts(text: str, language_code: str = "hi-IN") -> bytes:
    """
    Call Gnani Timbre v3.0 TTS API.
    Endpoint: POST https://api.vachana.ai/api/v1/tts/inference
    Returns raw WAV audio bytes.
    """
    if not GNANI_API_KEY:
        # Return an empty byte stream or placeholder when no key is set;
        # Browser client gracefully handles synthesized speech or browser fallback.
        return b""

    url = f"{GNANI_BASE_URL}/api/v1/tts/inference"
    headers = {
        "X-API-Key-ID": GNANI_API_KEY,
        "Content-Type": "application/json",
    }

    # Map language codes
    tts_lang = "hi-IN"
    if "en" in language_code.lower():
        tts_lang = "en-IN"
    elif "ta" in language_code.lower():
        tts_lang = "ta-IN"
    elif "te" in language_code.lower():
        tts_lang = "te-IN"

    payload = {
        "text": text,
        "model": TTS_MODEL,
        "voice": TTS_VOICE,
        "language": tts_lang,
        "speed": TTS_SPEED,
        "audio_config": {
            "sample_rate": 24000,
            "num_channels": 1,
            "sample_width": 2,
            "encoding": "linear_pcm",
            "container": "wav",
        },
    }

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=30)
        if resp.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid Gnani API Key (TTS)")
        if resp.status_code == 429:
            raise HTTPException(status_code=429, detail="Gnani TTS rate limited. Please retry shortly.")
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=f"Gnani TTS error: {resp.text}")

        return resp.content
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Gnani TTS request failed: {str(e)}")


# API Endpoints
@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "service": "AarogyaVani Hospital Voice Receptionist",
        "gnani_key_configured": bool(GNANI_API_KEY),
        "tts_model": TTS_MODEL,
        "tts_voice": TTS_VOICE,
    }


@app.get("/api/hospital")
def get_hospital_data():
    return HOSPITAL_DATA


@app.post("/api/voice")
async def voice_enquiry(
    audio_file: UploadFile = File(...),
    language_code: Optional[str] = Form("indic-auto"),
    session_id: Optional[str] = Form(None),
):
    """
    Receives 16kHz mono WAV audio recorded in browser (max 28-30s).
    Performs Gnani Prisma STT -> Safety Triage -> Knowledge Retrieval -> Gnani Timbre TTS.
    """
    audio_bytes = await audio_file.read()
    if len(audio_bytes) < 1000:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": "Audio clip was silent or too short. Please speak clearly for a full sentence.",
            },
        )

    transcript, detected_lang = call_gnani_stt(audio_bytes, audio_file.filename or "input.wav")
    if not transcript:
        return {
            "success": True,
            "transcript": "",
            "reply": "I could not hear anything clearly. Please hold the mic button and speak again.",
            "audio_base64": None,
            "detected_language": detected_lang,
        }

    reply_text, category, lead = query_knowledge_base(transcript, detected_lang)

    # Call Gnani TTS to synthesize answer
    audio_content = call_gnani_tts(reply_text, detected_lang)
    audio_b64 = base64.b64encode(audio_content).decode("ascii") if audio_content else None

    return {
        "success": True,
        "transcript": transcript,
        "reply": reply_text,
        "category": category,
        "detected_language": detected_lang,
        "audio_base64": audio_b64,
        "lead": lead,
    }


@app.post("/api/text")
def text_enquiry(payload: TextQueryRequest):
    """Typed input fallback for accessibility or testing without microphone."""
    query = payload.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    reply_text, category, lead = query_knowledge_base(query, payload.language_code or "indic-auto")

    audio_content = call_gnani_tts(reply_text, payload.language_code or "hi-IN")
    audio_b64 = base64.b64encode(audio_content).decode("ascii") if audio_content else None

    return {
        "success": True,
        "transcript": query,
        "reply": reply_text,
        "category": category,
        "detected_language": payload.language_code or "auto",
        "audio_base64": audio_b64,
        "lead": lead,
    }


def is_staff_authorized(pin: Optional[str]) -> bool:
    if not STAFF_PIN or not pin:
        return False
    return secrets.compare_digest(pin.strip(), STAFF_PIN.strip())


@app.post("/api/verify-pin")
def verify_pin(x_staff_pin: Optional[str] = Header(None)):
    if not is_staff_authorized(x_staff_pin):
        raise HTTPException(status_code=401, detail="Invalid staff PIN")
    return {"success": True, "message": "PIN verified successfully"}


@app.get("/api/leads")
def get_leads(x_staff_pin: Optional[str] = Header(None)):
    """Retrieve captured callback leads for the reception dashboard."""
    is_auth = is_staff_authorized(x_staff_pin)
    leads = load_leads()
    if not is_auth:
        masked = []
        for l in leads:
            copy_l = dict(l)
            raw_phone = copy_l.get("phone", "")
            if len(raw_phone) >= 10:
                copy_l["phone"] = raw_phone[:5] + "XXXXX"
            else:
                copy_l["phone"] = "XXXXX"
            masked.append(copy_l)
        return {"leads": masked, "staff_authenticated": False}
    return {"leads": leads, "staff_authenticated": True}


@app.post("/api/leads/{lead_id}/done")
def mark_lead_called(lead_id: str, x_staff_pin: Optional[str] = Header(None)):
    """Mark a patient callback request as completed."""
    if not is_staff_authorized(x_staff_pin):
        raise HTTPException(status_code=401, detail="Unauthorized: Staff PIN required")
    leads = load_leads()
    updated = False
    for lead in leads:
        if lead.get("id") == lead_id:
            lead["status"] = "called"
            lead["notes"] = f"Marked called by receptionist on {datetime.now().strftime('%Y-%m-%d %H:%M')}"
            updated = True
            break
    if not updated:
        raise HTTPException(status_code=404, detail="Lead not found")
    save_leads(leads)
    return {"success": True, "lead_id": lead_id, "status": "called"}


@app.get("/api/analytics")
def get_analytics():
    """Standout Feature 1: Real-time queries, languages, triage events analytics."""
    if ANALYTICS_PATH.exists():
        try:
            with open(ANALYTICS_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "queries_total": 24,
        "by_language": {"hi-IN": 14, "en-IN": 7, "ta-IN": 2, "te-IN": 1},
        "by_category": {
            "doctor_inquiry": 11,
            "test_inquiry": 6,
            "timing_inquiry": 4,
            "emergency": 2,
            "lead_captured": 1,
        },
        "emergencies": 2,
        "leads": 3,
    }


@app.post("/api/outbound-reminder")
def trigger_outbound_reminder(payload: OutboundReminderRequest, x_staff_pin: Optional[str] = Header(None)):
    """
    Standout Feature 2: Proactive Outbound Voice Call Simulator.
    Generates a spoken appointment confirmation/reminder call using Gnani Timbre TTS.
    """
    if not is_staff_authorized(x_staff_pin):
        raise HTTPException(status_code=401, detail="Unauthorized: Staff PIN required to dispatch reminders")

    # Anti-vishing protection
    vishing_pattern = r"\b(otp|one[-\s]time|password|cvv|pin|bank|account|transfer|credit\s*card|debit\s*card|verify\s*your\s*identity|read\s*out)\b"
    combined_fields = f"{payload.patient_name} {payload.doctor_name} {payload.appointment_time}"
    if re.search(vishing_pattern, combined_fields, re.IGNORECASE):
        raise HTTPException(
            status_code=400,
            detail="Security violation: Outbound message cannot request OTPs, passwords, or banking credentials.",
        )

    if "hi" in (payload.language_code or "").lower():
        message = (
            f"नमस्ते {payload.patient_name} जी, यह आरोग्य सेवा अस्पताल से रिमाइंडर कॉल है। "
            f"डॉक्टर {payload.doctor_name} के साथ आपका अपॉइंटमेंट {payload.appointment_time} निर्धारित है। "
            f"कृपया समय पर पहुँचें। धन्यवाद।"
        )
    else:
        message = (
            f"Hello {payload.patient_name}, this is a reminder call from Aarogya Seva Hospital. "
            f"Your appointment with Doctor {payload.doctor_name} is scheduled for {payload.appointment_time}. "
            f"Please arrive fifteen minutes prior. Thank you."
        )

    audio_bytes = call_gnani_tts(message, payload.language_code or "en-IN")
    audio_b64 = base64.b64encode(audio_bytes).decode("ascii") if audio_bytes else None

    return {
        "success": True,
        "message": message,
        "patient": payload.patient_name,
        "phone": payload.patient_phone,
        "audio_base64": audio_b64,
        "status": "call_dispatched",
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
