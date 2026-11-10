import React, { useState, useRef, useEffect, useMemo } from "react";
import { Send, Volume2, ShieldAlert, CheckCircle2, RotateCcw, Bot, User, ArrowDown, PhoneCall } from "lucide-react";

export interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  language?: string;
  isEmergency?: boolean;
  category?: string;
  lead?: {
    name: string;
    phone: string;
    reason: string;
  };
  audioBase64?: string | null;
  timestamp: string;
}

interface ConversationListProps {
  messages: Message[];
  onSendTypedQuery: (query: string) => void;
  onPlayAudio: (audioBase64: string, messageId: string) => void;
  onClearChat: () => void;
  playingMessageId: string | null;
  isLoading: boolean;
}

type ScriptTab = "all" | "hi" | "ta" | "te" | "bn";

// Native Curated Script Threads for Tamil, Telugu, Bengali & Hindi
const NATIVE_SCRIPT_THREADS: Record<
  "hi" | "ta" | "te" | "bn",
  {
    langName: string;
    scriptFont: string;
    placeholder: string;
    conversation: { sender: "user" | "bot"; text: string; isEmergency?: boolean }[];
  }
> = {
  hi: {
    langName: "हिन्दी (Hindi)",
    scriptFont: "font-devanagari leading-[1.6]",
    placeholder: "हिन्दी में अपना सवाल पूछें...",
    conversation: [
      {
        sender: "user",
        text: "नमस्ते, बच्चों के डॉक्टर कब बैठते हैं और फीस कितनी है?",
      },
      {
        sender: "bot",
        text: "नमस्ते! हमारे बाल रोग विशेषज्ञ डॉ. अरविंद राव सोमवार, बुधवार और शुक्रवार सुबह 9:00 बजे से दोपहर 1:00 बजे तक बैठते हैं। परामर्श शुल्क ₹500 है।",
      },
      {
        sender: "user",
        text: "ब्लड शुगर टेस्ट के लिए खाली पेट आना है?",
      },
      {
        sender: "bot",
        text: "जी हाँ, फास्टिंग ब्लड शुगर (FBS) जांच के लिए 8 से 10 घंटे खाली पेट रहना आवश्यक है। जांच शुल्क ₹100 है और लैब सुबह 7:00 बजे खुलती है।",
      },
      {
        sender: "user",
        text: "मरीज के सीने में बहुत तेज दर्द है और पसीना आ रहा है!",
        isEmergency: true,
      },
      {
        sender: "bot",
        text: "आपातकालीन चेतावनी: यह गंभीर स्थिति हो सकती है! कृपया तुरंत गेट नंबर 1 पर स्थित 24x7 कैजुअल्टी वार्ड पहुँचें या तुरंत 108 नंबर पर एम्बुलेंस बुलाएँ।",
        isEmergency: true,
      },
    ],
  },
  ta: {
    langName: "தமிழ் (Tamil)",
    scriptFont: "font-tamil leading-[1.6]",
    placeholder: "தமிழில் உங்கள் மருத்துவ கேள்வியைத் தட்டச்சு செய்க...",
    conversation: [
      {
        sender: "user",
        text: "வணக்கம், குழந்தை நல மருத்துவர் எப்போது வருவார்?",
      },
      {
        sender: "bot",
        text: "வணக்கம்! எங்கள் குழந்தை நல சிறப்பு மருத்துவர் டாக்டர் அரவிந்த் ராவ் திங்கள், புதன் மற்றும் வெள்ளிக்கிழமைகளில் காலை 9:00 மணி முதல் மதியம் 1:00 மணி வரை பார்க்கிறார். ஆலோசனைக் கட்டணம் ஐந்து நூறு ரூபாய் (₹500).",
      },
      {
        sender: "user",
        text: "இரத்த சர்க்கரை பரிசோதனைக்கு வெறும் வயிற்றில் வர வேண்டுமா?",
      },
      {
        sender: "bot",
        text: "ஆம், இரத்த சர்க்கரை பரிசோதனைக்கு (Fasting Blood Sugar) எட்டு முதல் பத்து மணி நேரம் வெறும் வயிற்றில் வர வேண்டும். பரிசோதனை கட்டணம் நூறு ரூபாய் (₹100). மாதிரி சேகரிப்பு காலை 7:00 மணிக்கு தொடங்குகிறது.",
      },
      {
        sender: "user",
        text: "நோயாளிக்கு கடுமையான நெஞ்சு வலி மற்றும் மூச்சுத் திணறல் உள்ளது!",
        isEmergency: true,
      },
      {
        sender: "bot",
        text: "அவசர எச்சரிக்கை: இது அவசர நிலை! உடனடியாக கேட் 1-ல் உள்ள 24x7 அவசர சிகிச்சை பிரிவுக்கு (Casualty) செல்லவும் அல்லது அவசர ஊர்திக்கு 108 என்ற எண்ணை அழைக்கவும். தாமதிக்க வேண்டாம்.",
        isEmergency: true,
      },
    ],
  },
  te: {
    langName: "తెలుగు (Telugu)",
    scriptFont: "font-telugu leading-[1.6]",
    placeholder: "తెలుగులో మీ వైద్య ప్రశ్నను టైప్ చేయండి...",
    conversation: [
      {
        sender: "user",
        text: "నమస్కారం, పిల్లల డాక్టర్ ఎప్పుడు వస్తారు?",
      },
      {
        sender: "bot",
        text: "నమస్కారం! మా పిల్లల నిపుణుడు డాక్టర్ అరవింద్ రావు గారు సోమవారం, బుధవారం మరియు శుక్రవారాల్లో ఉదయం 9:00 నుండి మధ్యాహ్నం 1:00 వరకు అందుబాటులో ఉంటారు. కన్సల్టేషన్ ఫీజు ఐదు వందల రూపాయలు (₹500).",
      },
      {
        sender: "user",
        text: "బ్లడ్ షుగర్ టెస్ట్ కోసం ఉపవాసంతో రావాలా?",
      },
      {
        sender: "bot",
        text: "అవును, ఫాస్టింగ్ బ్లడ్ షుగర్ టెస్ట్ కోసం 8 నుండి 10 గంటల ఉపవాసం అవసరం. పరీక్ష ఫీజు వంద రూపాయలు (₹100). ల్యాబ్ ఉదయం 7:00 గంటలకు తెరుచుకుంటుంది.",
      },
      {
        sender: "user",
        text: "రోగికి తీవ్రమైన గుండె నొప్పి మరియు ఊపిరి ఆడకపోవడం ఉంది!",
        isEmergency: true,
      },
      {
        sender: "bot",
        text: "అత్యవసర హెచ్చరిక: ఇది ప్రాణాంతక పరిస్థితి కావచ్చు! దయచేసి వెంటనే గేట్ 1 వద్ద ఉన్న 24x7 క్యాజువాలిటీ విభాగానికి చేరుకోండి లేదా 108 అంబులెన్స్‌కు వెంటనే కాల్ చేయండి.",
        isEmergency: true,
      },
    ],
  },
  bn: {
    langName: "বাংলা (Bengali)",
    scriptFont: "font-bengali leading-[1.6]",
    placeholder: "বাংলায় আপনার প্রশ্ন টাইপ করুন...",
    conversation: [
      {
        sender: "user",
        text: "নমস্কার, শিশুরোগ বিশেষজ্ঞ ডাক্তারবাবু কখন বসেন?",
      },
      {
        sender: "bot",
        text: "নমস্কার! আমাদের শিশু বিশেষজ্ঞ ডাঃ অরবিন্দ রাও সোম, বুধ এবং শুক্রবার সকাল ৯:০০ টা থেকে দুপুর ১:০০ টা পর্যন্ত রোগী দেখেন। পরামর্শ ফি পাঁচশত টাকা (₹৫০০)।",
      },
      {
        sender: "user",
        text: "ব্লাড সুগার টেস্টের জন্য কি খালি পেটে আসতে হবে?",
      },
      {
        sender: "bot",
        text: "হ্যাঁ, ফাস্টিং ব্লাড সুগার (FBS) পরীক্ষার জন্য আট থেকে দশ ঘন্টা খালি পেটে থাকা আবশ্যক। টেস্টের ফি একশত টাকা (₹১০০)। সকাল ৭:০০ টা থেকে নমুনা সংগ্রহ শুরু হয়।",
      },
      {
        sender: "user",
        text: "রোগীর বুকে তীব্র ব্যথা ও শ্বাসকষ্ট হচ্ছে!",
        isEmergency: true,
      },
      {
        sender: "bot",
        text: "জরুরী সতর্কতা: এটি একটি মেডিকেল ইমার্জেন্সি! অনুগ্রহ করে অবিলম্বে গেট ১-এ অবস্থিত ২৪x৭ ক্যাজুয়ালটি বিভাগে যান অথবা অবিলম্বে ১০৮ নম্বরে অ্যাম্বুলেন্স ডাকুন।",
        isEmergency: true,
      },
    ],
  },
};

export const ConversationList: React.FC<ConversationListProps> = ({
  messages,
  onSendTypedQuery,
  onPlayAudio,
  onClearChat,
  playingMessageId,
  isLoading,
}) => {
  const [typedInput, setTypedInput] = useState("");
  const [activeScriptTab, setActiveScriptTab] = useState<ScriptTab>("all");
  const [isScrolledUp, setIsScrolledUp] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isScrolledUp) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeScriptTab, isScrolledUp]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    setIsScrolledUp(distanceToBottom > 80);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setIsScrolledUp(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedInput.trim() || isLoading) return;
    onSendTypedQuery(typedInput.trim());
    setTypedInput("");
  };

  // Helper to determine script font class based on language
  const getScriptClass = (lang?: string) => {
    if (!lang) return "font-sans";
    if (lang.includes("ta")) return "font-tamil leading-[1.6]";
    if (lang.includes("te")) return "font-telugu leading-[1.6]";
    if (lang.includes("bn")) return "font-bengali leading-[1.6]";
    if (lang.includes("hi") || lang.includes("mr")) return "font-devanagari leading-[1.6]";
    return "font-sans";
  };

  return (
    <div
      role="region"
      aria-label="Screen 2: Conversation Frame"
      className="bg-white dark:bg-[#13262A] border border-[#D8E3E0] dark:border-[#1E3B40] rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col h-[540px] sm:h-[580px] md:h-[620px] relative transition-all"
    >
      {/* 1. Header with Language Script Tabs (Tamil, Telugu, Bengali Duplications) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-100 dark:border-[#1E3B40] gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-[#0C1A1C] text-[#0F5C63] dark:text-[#5FC1C6] flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-[#E6F1EF] tracking-tight">
              Enquiry Dialogue
            </h2>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Live &amp; Multilingual Scripts
            </span>
          </div>
        </div>

        {/* Script Switcher Tabs: All Live | தமிழ் | తెలుగు | বাংলা */}
        <div
          role="tablist"
          aria-label="Indic Script tabs"
          className="flex items-center gap-1 bg-[#EEF3F1] dark:bg-[#0C1A1C] p-1 rounded-2xl overflow-x-auto text-xs font-semibold"
        >
          <button
            role="tab"
            aria-selected={activeScriptTab === "all"}
            onClick={() => setActiveScriptTab("all")}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer min-h-[48px] ${
              activeScriptTab === "all"
                ? "bg-white dark:bg-[#13262A] text-[#0F5C63] dark:text-[#5FC1C6] shadow-xs font-bold"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-white/50"
            }`}
          >
            Live ({messages.length})
          </button>

          <button
            role="tab"
            aria-selected={activeScriptTab === "hi"}
            onClick={() => setActiveScriptTab("hi")}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer font-devanagari min-h-[48px] ${
              activeScriptTab === "hi"
                ? "bg-white dark:bg-[#13262A] text-[#0F5C63] dark:text-[#5FC1C6] shadow-xs font-bold"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-white/50"
            }`}
          >
            हिन्दी
          </button>

          <button
            role="tab"
            aria-selected={activeScriptTab === "ta"}
            onClick={() => setActiveScriptTab("ta")}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer font-tamil min-h-[48px] ${
              activeScriptTab === "ta"
                ? "bg-white dark:bg-[#13262A] text-[#0F5C63] dark:text-[#5FC1C6] shadow-xs font-bold"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-white/50"
            }`}
          >
            தமிழ்
          </button>

          <button
            role="tab"
            aria-selected={activeScriptTab === "te"}
            onClick={() => setActiveScriptTab("te")}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer font-telugu min-h-[48px] ${
              activeScriptTab === "te"
                ? "bg-white dark:bg-[#13262A] text-[#0F5C63] dark:text-[#5FC1C6] shadow-xs font-bold"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-white/50"
            }`}
          >
            తెలుగు
          </button>

          <button
            role="tab"
            aria-selected={activeScriptTab === "bn"}
            onClick={() => setActiveScriptTab("bn")}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer font-bengali min-h-[48px] ${
              activeScriptTab === "bn"
                ? "bg-white dark:bg-[#13262A] text-[#0F5C63] dark:text-[#5FC1C6] shadow-xs font-bold"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-white/50"
            }`}
          >
            বাংলা
          </button>
        </div>

        {activeScriptTab === "all" && messages.length > 0 && (
          <button
            onClick={onClearChat}
            className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1 transition-colors px-2 py-1 rounded-xl cursor-pointer min-h-[48px]"
            aria-label="Clear dialogue thread"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>

      {/* 2. Dialogue Thread Viewport */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 overscroll-contain"
      >
        {activeScriptTab === "all" ? (
          messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 dark:text-zinc-400">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-[#0C1A1C] text-[#0F5C63] dark:text-[#5FC1C6] flex items-center justify-center mb-3">
                <Bot className="w-6 h-6" aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-[#E6F1EF]">
                Dialogue thread is ready
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 max-w-sm">
                Speak into the microphone or type below. Try tapping the <strong>தமிழ்</strong>, <strong>తెలుగు</strong>, or <strong>বাংলা</strong> tabs above to view verified native script clinical dialogues.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs sm:text-sm ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.sender === "bot" && (
                  <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-[#0C1A1C] text-[#0F5C63] dark:text-[#5FC1C6] flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" aria-hidden="true" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 sm:p-4 shadow-xs transition-all ${
                    msg.sender === "user"
                      ? "bg-[#0F5C63] text-white dark:bg-[#5FC1C6] dark:text-[#0C1A1C] rounded-tr-sm"
                      : msg.isEmergency
                      ? "bg-red-50 dark:bg-[#1E0E12] border-2 border-red-500 dark:border-red-600 text-red-950 dark:text-red-100 rounded-tl-sm shadow-md shadow-red-500/10 ring-1 ring-red-400"
                      : "bg-[#EEF3F1] dark:bg-[#0C1A1C] border border-zinc-200 dark:border-[#1E3B40] text-zinc-900 dark:text-[#E6F1EF] rounded-tl-sm"
                  }`}
                >
                  {/* Distinct Emergency Casualty Header Badge */}
                  {msg.isEmergency && msg.sender === "bot" && (
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400 font-bold text-xs tracking-tight">
                      <ShieldAlert className="w-4 h-4 animate-bounce text-red-600 dark:text-red-400 shrink-0" aria-hidden="true" />
                      <span>🚨 108 CASUALTY EMERGENCY • IMMEDIATE ACTION</span>
                    </div>
                  )}

                  <p className={`${getScriptClass(msg.language)} leading-[1.6]`}>
                    {msg.text}
                  </p>

                  {/* Immediate Emergency Action Shortcuts */}
                  {msg.isEmergency && msg.sender === "bot" && (
                    <div className="mt-3 pt-2.5 border-t border-red-200 dark:border-red-900/60 flex flex-wrap items-center gap-2">
                      <a
                        href="tel:108"
                        className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm min-h-[40px] cursor-pointer"
                        aria-label="Direct dial 108 national ambulance"
                      >
                        <PhoneCall className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Call 108 Ambulance</span>
                      </a>
                      <span className="text-[11px] font-semibold text-red-800 dark:text-red-300">
                        Gate 1 Casualty Ward • Open 24x7
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-black/10 dark:border-white/10 text-[10px] opacity-80">
                    <span>{msg.timestamp}</span>
                    {msg.audioBase64 && onPlayAudio && (
                      <button
                        onClick={() => onPlayAudio(msg.audioBase64!, msg.id)}
                        className="px-2 py-1 rounded-lg bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 flex items-center gap-1 cursor-pointer min-h-[48px]"
                        aria-label="Replay audio response"
                      >
                        <Volume2 className="w-3 h-3" aria-hidden="true" />
                        <span>Listen</span>
                      </button>
                    )}
                  </div>
                </div>

                {msg.sender === "user" && (
                  <div className="w-8 h-8 rounded-xl bg-zinc-200 dark:bg-[#0C1A1C] text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" aria-hidden="true" />
                  </div>
                )}
              </div>
            ))
          )
        ) : (
          /* Dedicated Native Script Thread for Tamil, Telugu, or Bengali */
          <div className="space-y-3 animate-in fade-in">
            <div className="p-2.5 rounded-2xl bg-teal-50 dark:bg-[#0C1A1C] border border-teal-200 dark:border-[#1E3B40] text-xs font-semibold text-teal-900 dark:text-[#5FC1C6] flex items-center justify-between">
              <span>Verified Native Script Dialogue: {NATIVE_SCRIPT_THREADS[activeScriptTab].langName}</span>
              <span className="text-[10px] font-mono">Gnani Timbre (Lakshmi Voice)</span>
            </div>

            {NATIVE_SCRIPT_THREADS[activeScriptTab].conversation.map((item, idx) => (
              <div
                key={idx}
                className={`flex gap-3 text-xs sm:text-sm ${
                  item.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {item.sender === "bot" && (
                  <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-[#0C1A1C] text-[#0F5C63] dark:text-[#5FC1C6] flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" aria-hidden="true" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 sm:p-4 shadow-xs ${
                    item.sender === "user"
                      ? "bg-[#0F5C63] text-white dark:bg-[#5FC1C6] dark:text-[#0C1A1C] rounded-tr-sm"
                      : item.isEmergency
                      ? "bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100 rounded-tl-sm"
                      : "bg-[#EEF3F1] dark:bg-[#0C1A1C] border border-zinc-200 dark:border-[#1E3B40] text-zinc-900 dark:text-[#E6F1EF] rounded-tl-sm"
                  }`}
                >
                  <p className={NATIVE_SCRIPT_THREADS[activeScriptTab].scriptFont}>
                    {item.text}
                  </p>
                </div>

                {item.sender === "user" && (
                  <div className="w-8 h-8 rounded-xl bg-zinc-200 dark:bg-[#0C1A1C] text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" aria-hidden="true" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Jump to Bottom Button */}
      {isScrolledUp && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-20 right-8 px-3 py-1.5 rounded-full bg-[#0F5C63] dark:bg-[#5FC1C6] text-white dark:text-[#0C1A1C] shadow-lg text-xs font-semibold flex items-center gap-1 transition-transform transform active:scale-95 cursor-pointer min-h-[48px]"
        >
          <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Latest</span>
        </button>
      )}

      {/* 3. Input Form: One Clear, Prominent Primary Action Button */}
      <form onSubmit={handleSubmit} className="mt-3 pt-3 border-t border-zinc-100 dark:border-[#1E3B40]">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={typedInput}
            onChange={(e) => setTypedInput(e.target.value)}
            disabled={isLoading}
            placeholder={
              activeScriptTab !== "all"
                ? NATIVE_SCRIPT_THREADS[activeScriptTab].placeholder
                : "Type clinical question in Hindi, English, Tamil, Telugu..."
            }
            className="flex-1 bg-[#EEF3F1]/80 dark:bg-[#0C1A1C] border border-zinc-200 dark:border-[#1E3B40] rounded-2xl px-4 py-3 text-zinc-900 dark:text-[#E6F1EF] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0F5C63] dark:focus:ring-[#5FC1C6] min-h-[48px]"
          />
          <button
            type="submit"
            disabled={!typedInput.trim() || isLoading}
            className="px-5 py-3 rounded-2xl bg-[#0F5C63] hover:bg-[#0B464B] dark:bg-[#5FC1C6] dark:hover:bg-[#4eb3b8] text-white dark:text-[#0C1A1C] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer min-h-[48px] shrink-0"
            aria-label="Send clinical inquiry"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Send Question</span>
          </button>
        </div>
      </form>
    </div>
  );
};
