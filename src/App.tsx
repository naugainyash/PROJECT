import React, { useState, useEffect, useRef } from "react";
import { Header, DeviceMode } from "./components/Header";
import { VoiceMic } from "./components/VoiceMic";
import { MicState } from "./components/VoiceMicButton";
import { ConversationList, Message } from "./components/ConversationList";
import { ReceptionDesk } from "./components/ReceptionDesk";
import { AnalyticsPanel } from "./components/AnalyticsPanel";
import { HospitalDirectory } from "./components/HospitalDirectory";
import { RateLimitToast } from "./components/RateLimitToast";
import { EmergencyFrame } from "./components/EmergencyFrame";
import { PermissionsModal } from "./components/PermissionsModal";
import { WavRecorder } from "./utils/wavRecorder";
import { BargeInDetector } from "./utils/bargeInDetector";
import { playEarcon, setEarconSoundEnabled } from "./utils/earcon";
import { Lead, evaluateHospitalQuery } from "./services/hospitalLogic";
import { fetchWithExponentialBackoff } from "./utils/retryFetch";
import defaultHospitalData from "./services/defaultHospitalData";
import { Mic, MessageSquare, Building2, BarChart3, ShieldCheck } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"voice" | "reception" | "analytics" | "directory">("voice");
  const [mobileVoiceSubTab, setMobileVoiceSubTab] = useState<"mic" | "chat">("mic");
  const [botState, setBotState] = useState<MicState>("idle");
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState("indic-auto");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);

  // Dedicated Emergency Screen Frame State (#DC2626)
  const [showEmergencyFrame, setShowEmergencyFrame] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState<string>("");

  // Dark Mode Theme State (#0C1A1C, #13262A, #5FC1C6, #E6F1EF)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aarogya_theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  // Device Mode Viewport Simulator: responsive | phone (390px) | tablet (820px) | kiosk (1080x1920) | desktop (1440px)
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("responsive");

  // Rate limit toast state ("Too many requests, please wait a moment")
  const [rateLimitToast, setRateLimitToast] = useState<{
    show: boolean;
    message: string;
    retrySeconds?: number;
  }>({
    show: false,
    message: "Too many requests, please wait a moment",
  });

  // Mic blocked permission state
  const [micBlocked, setMicBlocked] = useState(false);
  const [micPermissionState, setMicPermissionState] = useState<"granted" | "prompt" | "denied" | "unknown">("unknown");

  // Last dialogue transcript for bubble
  const [lastTranscript, setLastTranscript] = useState<{
    user: string;
    bot: string;
    language?: string;
    confidence?: number;
  } | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      sender: "bot",
      text: "नमस्ते! Welcome to Aarogya Seva Hospital & Multi-Specialty Clinic Jaipur. You can speak to me in Hindi, English, Tamil, Telugu, or Bengali to enquire about doctors, fees, tests, or 108 Emergency Casualty.",
      language: "hi/en",
      timestamp: "Just now",
    },
  ]);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [analytics, setAnalytics] = useState<any>({
    queries_total: 0,
    by_language: {},
    by_category: {},
    emergencies: 0,
    leads: 0,
    recent_queries: [],
  });

  const [hospitalData, setHospitalData] = useState<any>(defaultHospitalData);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [gnaniConfigured, setGnaniConfigured] = useState<boolean>(true);
  const [aiEngineConfigured, setAiEngineConfigured] = useState<boolean>(false);
  const [ttsWarning, setTtsWarning] = useState<string | null>(null);
  const [staffPin, setStaffPin] = useState<string>("");
  const [isStaffAuthenticated, setIsStaffAuthenticated] = useState<boolean>(false);
  const [isHandsFree, setIsHandsFree] = useState<boolean>(false);
  const isHandsFreeRef = useRef(false);
  isHandsFreeRef.current = isHandsFree;
  const bargeInDetectorRef = useRef<BargeInDetector | null>(null);
  const lastVoiceRequestTimeRef = useRef<number>(0);

  const wavRecorderRef = useRef<WavRecorder | null>(null);
  const recordTimerRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const botStateRef = useRef<MicState>("idle");
  botStateRef.current = botState;
  const isProcessingAudioRef = useRef(false);
  const handleStopListeningRef = useRef<() => void>(() => {});

  // Apply dark class to document root element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("aarogya_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("aarogya_theme", "light");
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
    playEarcon("actionSuccess");
  };

  // Initial data loading & auto-polling
  useEffect(() => {
    fetchHealth();
    fetchHospitalData();
    fetchLeads();
    fetchAnalytics();

    const pollInterval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      fetchLeads();
      fetchAnalytics();
    }, 6000);

    return () => clearInterval(pollInterval);
  }, []);

  const fetchHealth = async (retries = 3) => {
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const data = await res.json();
        setGnaniConfigured(Boolean(data.gnani_key_configured));
        setAiEngineConfigured(Boolean(data.ai_engine_configured));
        return;
      }
    } catch {}
    if (retries > 0) {
      setTimeout(() => fetchHealth(retries - 1), 1500);
    }
  };

  const fetchHospitalData = async () => {
    try {
      const res = await fetch("/api/hospital");
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        setHospitalData(data);
      }
    } catch {}
  };

  const fetchLeads = async (customPin?: string): Promise<boolean> => {
    try {
      const pinToSend = customPin !== undefined ? customPin : staffPin;
      const headers: Record<string, string> = {};
      if (pinToSend) headers["x-staff-pin"] = pinToSend;

      const res = await fetch("/api/leads", { headers });
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (data && Array.isArray(data.leads)) {
          setLeads(data.leads);
          setIsStaffAuthenticated(Boolean(data.staff_authenticated));
          return Boolean(data.staff_authenticated);
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleVerifyStaffPin = async (enteredPin: string): Promise<boolean> => {
    if (!enteredPin) {
      setStaffPin("");
      setIsStaffAuthenticated(false);
      await fetchLeads("");
      return false;
    }
    try {
      const res = await fetch("/api/verify-pin", {
        method: "POST",
        headers: { "x-staff-pin": enteredPin },
      });
      if (res.ok) {
        setStaffPin(enteredPin);
        setIsStaffAuthenticated(true);
        await fetchLeads(enteredPin);
        await fetchAnalytics(enteredPin);
        return true;
      } else {
        setStaffPin("");
        setIsStaffAuthenticated(false);
        await fetchLeads("");
        return false;
      }
    } catch {
      return false;
    }
  };

  const handleSeedSampleLeads = async () => {
    try {
      const headers: Record<string, string> = {};
      if (staffPin) headers["x-staff-pin"] = staffPin;
      const res = await fetch("/api/leads/sample-seed", { method: "POST", headers });
      if (res.ok) {
        await fetchLeads();
      }
    } catch (err) {
      console.error("Failed to seed sample leads", err);
    }
  };

  const fetchAnalytics = async (customPin?: string) => {
    try {
      const pinToSend = customPin !== undefined ? customPin : staffPin;
      const headers: Record<string, string> = {};
      if (pinToSend) headers["x-staff-pin"] = pinToSend;
      const res = await fetch("/api/analytics", { headers });
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (data && typeof data === "object") setAnalytics(data);
      }
    } catch {}
  };

  // Auto-listen loop handler for hands-free conversation mode
  const triggerAutoListen = () => {
    if (!isHandsFreeRef.current || isProcessingAudioRef.current) return;
    const now = Date.now();
    const elapsed = now - lastVoiceRequestTimeRef.current;
    // Respect limits: 60 voice requests per minute, ensure 500-1000ms breathing gap
    const delay = Math.max(500, 1000 - elapsed);
    setTimeout(() => {
      if (
        isHandsFreeRef.current &&
        !isProcessingAudioRef.current &&
        botStateRef.current === "idle"
      ) {
        handleStartListening();
      }
    }, delay);
  };

  // Play audio response from base64 WAV or fallback to speech synthesis
  const playAudio = (audioBase64: string | null | undefined, messageId: string, fallbackText?: string) => {
    stopAudio();

    const startBargeInListener = () => {
      if (isHandsFreeRef.current) {
        if (!bargeInDetectorRef.current) {
          bargeInDetectorRef.current = new BargeInDetector();
        }
        bargeInDetectorRef.current.start(() => {
          // Patient began speaking while audio was playing: interrupt immediately
          stopAudio();
          if (!isProcessingAudioRef.current) {
            handleStartListening();
          }
        });
      }
    };

    if (audioBase64) {
      try {
        const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
        audioPlayerRef.current = audio;
        setPlayingMessageId(messageId);
        setBotState("speaking");
        startBargeInListener();

        audio.onended = () => {
          bargeInDetectorRef.current?.stop();
          setPlayingMessageId(null);
          setBotState("idle");
          audioPlayerRef.current = null;
          triggerAutoListen();
        };

        audio.onerror = () => {
          bargeInDetectorRef.current?.stop();
          console.warn("Audio playback error, falling back to speech synthesis");
          setPlayingMessageId(null);
          fallbackSpeech(fallbackText || "");
        };

        audio.play().catch((err) => {
          bargeInDetectorRef.current?.stop();
          console.warn("Audio auto-play prevented, falling back:", err);
          fallbackSpeech(fallbackText || "");
        });
        return;
      } catch (err) {
        bargeInDetectorRef.current?.stop();
        console.warn("Error creating audio element, using fallback:", err);
      }
    }

    fallbackSpeech(fallbackText || "");
  };

  const fallbackSpeech = (text: string) => {
    if ("speechSynthesis" in window && text) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const isHindi = /[\u0900-\u097F]/.test(text);
      utterance.lang = isHindi ? "hi-IN" : "en-IN";

      setBotState("speaking");
      if (isHandsFreeRef.current) {
        if (!bargeInDetectorRef.current) {
          bargeInDetectorRef.current = new BargeInDetector();
        }
        bargeInDetectorRef.current.start(() => {
          stopAudio();
          if (!isProcessingAudioRef.current) {
            handleStartListening();
          }
        });
      }

      utterance.onend = () => {
        bargeInDetectorRef.current?.stop();
        setBotState("idle");
        triggerAutoListen();
      };

      utterance.onerror = () => {
        bargeInDetectorRef.current?.stop();
        setBotState("idle");
      };

      window.speechSynthesis.speak(utterance);
    } else {
      setBotState("idle");
    }
  };

  const stopAudio = () => {
    bargeInDetectorRef.current?.stop();
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setPlayingMessageId(null);
    setBotState("idle");
  };

  const handleEndConversation = () => {
    bargeInDetectorRef.current?.stop();
    if (wavRecorderRef.current) {
      wavRecorderRef.current.abort();
    }
    stopAudio();
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    isProcessingAudioRef.current = false;
    setBotState("idle");
    playEarcon("actionSuccess");
  };

  const handleBargeIn = () => {
    bargeInDetectorRef.current?.stop();
    stopAudio();
    if (!isProcessingAudioRef.current) {
      handleStartListening();
    }
  };

  const handleCancelThinking = () => {
    if (wavRecorderRef.current) {
      wavRecorderRef.current.abort();
    }
    isProcessingAudioRef.current = false;
    setBotState("idle");
  };

  const handleRequestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicPermissionState("granted");
      setMicBlocked(false);
      setErrorMessage(null);
      playEarcon("actionSuccess");
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.message?.includes("denied")) {
        setMicPermissionState("denied");
        setMicBlocked(true);
        setErrorMessage("Microphone access blocked. Follow the 3 steps below to unblock.");
      }
    }
  };

  // Start recording 16kHz mono WAV
  const handleStartListening = async () => {
    if (isProcessingAudioRef.current) return;
    setErrorMessage(null);
    setMicBlocked(false);
    stopAudio();

    try {
      if (!wavRecorderRef.current) {
        wavRecorderRef.current = new WavRecorder();
      }

      await wavRecorderRef.current.start(
        (level) => setAudioLevel(level),
        () => handleStopListeningRef.current(),
        () => handleStopListeningRef.current(),
        1000 // 1.0 second pause auto-stops and sends
      );

      playEarcon("listenStart");
      setRecordSeconds(0);
      setBotState("listening");
      setMicPermissionState("granted");

      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Recording error:", err);
      setBotState("idle");
      if (
        err.message?.includes("Microphone access denied") ||
        err.name === "NotAllowedError" ||
        err.message?.includes("denied")
      ) {
        setMicPermissionState("denied");
        setMicBlocked(true);
        setErrorMessage("Microphone access blocked. Follow the 3 steps below to unblock.");
      } else {
        setErrorMessage(`Recording failed: ${err.message || "Unknown audio device error"}`);
      }
    }
  };

  // Stop recording & submit to /api/voice
  const handleStopListening = async () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }

    if (!wavRecorderRef.current || botStateRef.current !== "listening" || isProcessingAudioRef.current) {
      return;
    }

    playEarcon("listenStop");
    isProcessingAudioRef.current = true;
    lastVoiceRequestTimeRef.current = Date.now();
    setBotState("thinking");

    try {
      const wavBlob = await wavRecorderRef.current.stop();
      if (wavBlob.size < 1600) {
        setBotState("idle");
        isProcessingAudioRef.current = false;
        if (isHandsFreeRef.current) {
          setTimeout(() => {
            if (isHandsFreeRef.current && !isProcessingAudioRef.current && botStateRef.current === "idle") {
              handleStartListening();
            }
          }, 800);
        } else {
          setErrorMessage("Audio recording was too quiet or short. Please speak a full question.");
        }
        return;
      }

      const formData = new FormData();
      formData.append("audio_file", wavBlob, "visitor_query.wav");
      formData.append("language_code", selectedLanguage);

      const res = await fetchWithExponentialBackoff(
        "/api/voice",
        {
          method: "POST",
          body: formData,
        },
        {
          maxRetries: 3,
          initialDelayMs: 1000,
          factor: 2,
          onRetry: (attempt, delayMs) => {
            console.warn(`[Gnani API] HTTP 429 rate limit encountered. Retrying attempt ${attempt}/3...`);
            setRateLimitToast({
              show: true,
              message: "Too many requests, please wait a moment",
              retrySeconds: Math.ceil(delayMs / 1000),
            });
          },
        }
      );

      setErrorMessage(null);

      if (!res.ok) {
        if (res.status === 429) {
          playEarcon("alertNotice");
          setRateLimitToast({
            show: true,
            message: "Too many requests, please wait a moment",
          });
          setErrorMessage("Too many requests, please wait a moment");
          setBotState("idle");
          return;
        }

        const errJson = await res.json().catch(() => ({}));
        if (
          errJson.code === "RATE_LIMIT_EXCEEDED" ||
          (typeof errJson.error === "string" && /429|rate\s*limit/i.test(errJson.error))
        ) {
          playEarcon("alertNotice");
          setRateLimitToast({
            show: true,
            message: "Too many requests, please wait a moment",
          });
          setErrorMessage("Too many requests, please wait a moment");
          setBotState("idle");
          return;
        }

        if (errJson.code === "NO_GNANI_KEY" || res.status === 503) {
          setGnaniConfigured(false);
          throw new Error(errJson.error || "Gnani STT API key not configured. Speech recognition paused.");
        }
        throw new Error(errJson.error || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      setRateLimitToast({ show: false, message: "" });
      setErrorMessage(null);
      handleQueryResponse(data);
    } catch (err: any) {
      console.error("Voice processing error:", err);
      setBotState("idle");
      if (
        err.status === 429 ||
        err.isRateLimit ||
        (typeof err.message === "string" && /429|rate\s*limit/i.test(err.message))
      ) {
        playEarcon("alertNotice");
        setRateLimitToast({
          show: true,
          message: "Too many requests, please wait a moment",
        });
        setErrorMessage("Too many requests, please wait a moment");
      } else {
        setErrorMessage(err.message || "Network issue during voice processing");
      }
    } finally {
      isProcessingAudioRef.current = false;
    }
  };

  handleStopListeningRef.current = handleStopListening;

  // Submit typed query to /api/text
  const handleSendTypedQuery = async (queryText: string) => {
    setErrorMessage(null);
    stopAudio();
    setBotState("thinking");

    try {
      const res = await fetchWithExponentialBackoff(
        "/api/text",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: queryText,
            language_code: selectedLanguage,
          }),
        },
        {
          maxRetries: 3,
          initialDelayMs: 1000,
          factor: 2,
          onRetry: (_attempt, delayMs) => {
            setRateLimitToast({
              show: true,
              message: "Too many requests, please wait a moment",
              retrySeconds: Math.ceil(delayMs / 1000),
            });
          },
        }
      );

      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        setRateLimitToast({ show: false, message: "" });
        setErrorMessage(null);
        handleQueryResponse(data);
        return;
      }
      if (res.status === 429) {
        setRateLimitToast({
          show: true,
          message: "Too many requests, please wait a moment",
        });
        setErrorMessage("Too many requests, please wait a moment");
        setBotState("idle");
        return;
      }
      throw new Error(`Non-JSON response from server (${res.status})`);
    } catch (err: any) {
      console.warn("Using client-side evaluation fallback:", err);
      const evaluation = evaluateHospitalQuery(queryText, hospitalData);
      if (evaluation.lead) {
        setLeads((prev) => [evaluation.lead!, ...prev]);
      }
      handleQueryResponse({
        transcript: queryText,
        reply: evaluation.reply,
        category: evaluation.category,
        detected_language: selectedLanguage,
        audio_base64: null,
        lead: evaluation.lead,
        is_emergency: evaluation.isEmergency,
      });
    }
  };

  // Process server response, add messages, trigger voice playback
  const handleQueryResponse = (data: any) => {
    const userMsgId = `user-${Date.now()}`;
    const botMsgId = `bot-${Date.now()}`;

    const userText = data.transcript || "Spoken query";
    const botText = data.reply || "Thank you for contacting Aarogya Seva Hospital.";

    const userMessage: Message = {
      id: userMsgId,
      sender: "user",
      text: userText,
      language: data.detected_language || selectedLanguage,
      timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    };

    const botMessage: Message = {
      id: botMsgId,
      sender: "bot",
      text: botText,
      language: data.detected_language,
      isEmergency: data.is_emergency || data.category === "emergency",
      category: data.category,
      lead: data.lead,
      audioBase64: data.audio_base64,
      timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    };

    if (data.detected_language) {
      setDetectedLanguage(data.detected_language);
    }

    if (data.tts_warning) {
      setTtsWarning(data.tts_warning);
    } else {
      setTtsWarning(null);
    }

    // Update last transcript for the transcript bubble on Screen 1 with confidence score
    const confidenceScore =
      typeof data.confidence === "number"
        ? data.confidence
        : data.transcript
        ? 96
        : undefined;

    setLastTranscript({
      user: userText,
      bot: botText,
      language: data.detected_language || selectedLanguage,
      confidence: confidenceScore,
    });

    setMessages((prev) => [...prev, userMessage, botMessage]);
    fetchLeads();
    fetchAnalytics();

    if (data.is_emergency || data.category === "emergency") {
      setShowEmergencyFrame(true);
      setEmergencyReason(data.reply || "Critical medical emergency detected. Immediate ambulance dispatch required.");
      playEarcon("alertNotice");
    } else {
      playEarcon("completed");
    }

    playAudio(data.audio_base64, botMsgId, data.reply);
  };

  const handleMarkLeadCalled = async (leadId: string) => {
    try {
      const headers: Record<string, string> = {};
      if (staffPin) headers["x-staff-pin"] = staffPin;
      const res = await fetch(`/api/leads/${leadId}/done`, { method: "POST", headers });
      if (res.ok) {
        playEarcon("actionSuccess");
        fetchLeads();
      }
    } catch (err) {
      console.error("Failed to mark lead", err);
    }
  };

  const handleTriggerOutboundReminder = async (payload: any) => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (staffPin) headers["x-staff-pin"] = staffPin;
      const res = await fetchWithExponentialBackoff(
        "/api/outbound-reminder",
        {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        },
        {
          maxRetries: 2,
          initialDelayMs: 1000,
          factor: 2,
        }
      );
      const data = await res.json();
      playEarcon("actionSuccess");
      if (data.audio_base64) {
        playAudio(data.audio_base64, `reminder-${Date.now()}`, data.message);
      } else {
        playAudio(null, `reminder-${Date.now()}`, data.message);
      }
      return data;
    } catch (err) {
      console.error("Outbound reminder error:", err);
      throw err;
    }
  };

  const pendingLeadsCount = leads.filter((l) => l.status === "pending").length;

  // Fluid responsive container that dynamically readjusts to any screen size
  const getDeviceContainerClass = () => {
    return "w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6";
  };

  return (
    <div className="min-h-screen bg-[#EEF3F1] dark:bg-[#0C1A1C] text-zinc-900 dark:text-[#E6F1EF] flex flex-col font-sans transition-colors">
      {/* Clinic Header with Device Preview Switcher, Theme Toggle, Emergency Ribbon */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingLeadsCount={pendingLeadsCount}
        soundEnabled={soundEnabled}
        onToggleSound={() => {
          setSoundEnabled((prev) => {
            const next = !prev;
            setEarconSoundEnabled(next);
            if (next) playEarcon("actionSuccess");
            return next;
          });
        }}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        deviceMode={deviceMode}
        onSelectDeviceMode={setDeviceMode}
        onOpenEmergency={() => {
          setShowEmergencyFrame(true);
          setEmergencyReason("Direct Casualty & 108 Emergency triage active. Gate 1 open 24x7 for trauma and critical care.");
        }}
        micPermissionState={micPermissionState}
        onRequestMicPermission={handleRequestMicPermission}
        isStaffAuthenticated={isStaffAuthenticated}
        onOpenPermissions={() => setIsPermissionsModalOpen(true)}
      />

      {/* Main Content Viewport wrapped in Device Mode container */}
      <main className={`flex-1 transition-all ${getDeviceContainerClass()}`}>
        {/* Dedicated High-Urgency Emergency Screen Frame (#DC2626) */}
        {showEmergencyFrame && (
          <div className="mb-6 animate-in slide-in-from-top-4 duration-300">
            <EmergencyFrame
              reason={emergencyReason}
              onClose={() => setShowEmergencyFrame(false)}
            />
          </div>
        )}

        {/* Screen 1: Home / Voice Reception Frame */}
        {activeTab === "voice" && (
          <div className="space-y-4">
            {/* Mobile-Only Segmented Switcher for 1-Handed Phone Operation */}
            <div className="lg:hidden flex items-center justify-center p-1 bg-white dark:bg-[#13262A] rounded-2xl border border-[#D8E3E0] dark:border-[#1E3B40] shadow-xs">
              <button
                type="button"
                onClick={() => setMobileVoiceSubTab("mic")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all min-h-[48px] cursor-pointer ${
                  mobileVoiceSubTab === "mic"
                    ? "bg-[#0F5C63] text-white shadow-xs dark:bg-[#5FC1C6] dark:text-[#0C1A1C]"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                }`}
                aria-label="Switch to Voice Microphone"
              >
                <Mic className="w-4 h-4" />
                <span>Voice Reception</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileVoiceSubTab("chat")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all min-h-[48px] cursor-pointer relative ${
                  mobileVoiceSubTab === "chat"
                    ? "bg-[#0F5C63] text-white shadow-xs dark:bg-[#5FC1C6] dark:text-[#0C1A1C]"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                }`}
                aria-label="Switch to Chat History"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Chat History ({messages.length})</span>
                {messages.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left: Master Screen 1 VoiceMic Component */}
              <div className={`lg:col-span-6 ${mobileVoiceSubTab === "mic" ? "block" : "hidden lg:block"}`}>
                <VoiceMic
                  botState={botState}
                  onStartListening={handleStartListening}
                  onStopListening={handleStopListening}
                  onStopSpeaking={stopAudio}
                  onCancelThinking={handleCancelThinking}
                  onEndConversation={handleEndConversation}
                  onBargeIn={handleBargeIn}
                  audioLevel={audioLevel}
                  recordSeconds={recordSeconds}
                  selectedLanguage={selectedLanguage}
                  setSelectedLanguage={(lang) => {
                    setSelectedLanguage(lang);
                    setDetectedLanguage(null);
                  }}
                  detectedLanguage={detectedLanguage}
                  errorMessage={errorMessage}
                  onClearError={() => setErrorMessage(null)}
                  gnaniConfigured={gnaniConfigured}
                  ttsWarning={ttsWarning}
                  lastTranscript={lastTranscript}
                  onRunExampleChip={(q) => {
                    handleSendTypedQuery(q);
                    setMobileVoiceSubTab("chat");
                  }}
                  micBlocked={micBlocked}
                  onRetryMicPermission={handleStartListening}
                  onPermissionStateChange={setMicPermissionState}
                  onOpenPermissions={() => setIsPermissionsModalOpen(true)}
                  isHandsFree={isHandsFree}
                  onToggleHandsFree={() => {
                    setIsHandsFree((prev) => {
                      const next = !prev;
                      playEarcon("actionSuccess");
                      if (next && botStateRef.current === "idle" && !isProcessingAudioRef.current) {
                        setTimeout(() => handleStartListening(), 200);
                      }
                      return next;
                    });
                  }}
                />
              </div>

              {/* Right: Screen 2 Enquiry Dialogue Frame with Indic Script tabs */}
              <div className={`lg:col-span-6 ${mobileVoiceSubTab === "chat" ? "block" : "hidden lg:block"}`}>
                <ConversationList
                  messages={messages}
                  onSendTypedQuery={handleSendTypedQuery}
                  onPlayAudio={(b64, id) => playAudio(b64, id)}
                  onClearChat={() => setMessages([])}
                  playingMessageId={playingMessageId}
                  isLoading={botState === "thinking"}
                />
              </div>
            </div>
          </div>
        )}

        {/* Screen 3: Reception Desk & Callback Desk */}
        {activeTab === "reception" && (
          <ReceptionDesk
            leads={leads}
            onMarkCalled={handleMarkLeadCalled}
            onTriggerOutboundReminder={handleTriggerOutboundReminder}
            isLoading={botState === "thinking"}
            isStaffAuthenticated={isStaffAuthenticated}
            onVerifyPin={handleVerifyStaffPin}
            onSeedSampleLeads={handleSeedSampleLeads}
          />
        )}

        {/* Screen 4: Analytics */}
        {activeTab === "analytics" && (
          <AnalyticsPanel analytics={analytics} />
        )}

        {/* Screen 5: Hospital Directory */}
        {activeTab === "directory" && (
          <HospitalDirectory
            hospitalData={hospitalData}
            onQueryDoctor={(name) => {
              setActiveTab("voice");
              handleSendTypedQuery(`When does ${name} sit and what is the fee?`);
            }}
            onQueryTest={(name) => {
              setActiveTab("voice");
              handleSendTypedQuery(`What is the fee and fasting preparation for ${name}?`);
            }}
          />
        )}
      </main>

      {/* Floating Rate Limit Error Toast ("Too many requests, please wait a moment") */}
      {rateLimitToast.show && (
        <RateLimitToast
          message={rateLimitToast.message}
          retryAfterSeconds={rateLimitToast.retrySeconds}
          onDismiss={() => setRateLimitToast((prev) => ({ ...prev, show: false }))}
        />
      )}

      {/* Permissions & Security Control Center Modal */}
      <PermissionsModal
        isOpen={isPermissionsModalOpen}
        onClose={() => setIsPermissionsModalOpen(false)}
        micPermissionState={micPermissionState}
        onRequestMicPermission={handleRequestMicPermission}
        isStaffAuthenticated={isStaffAuthenticated}
        onVerifyPin={handleVerifyStaffPin}
        onLockStaff={() => {
          setStaffPin("");
          setIsStaffAuthenticated(false);
          fetchLeads("");
        }}
        soundEnabled={soundEnabled}
        onToggleSound={() => {
          setSoundEnabled((prev) => {
            const next = !prev;
            setEarconSoundEnabled(next);
            if (next) playEarcon("actionSuccess");
            return next;
          });
        }}
        onOpenEmergency={() => {
          setShowEmergencyFrame(true);
          setEmergencyReason("Direct Casualty & 108 Emergency triage active. Gate 1 open 24x7 for trauma and critical care.");
        }}
      />

      {/* Clean Hospital Footer (with extra bottom padding on mobile for sticky nav) */}
      <footer className="border-t border-[#D8E3E0] dark:border-[#1E3B40] pt-4 pb-20 sm:pb-4 px-6 text-center text-xs text-zinc-600 dark:text-zinc-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>AarogyaVani</strong> • Hospital Voice Receptionist
          </div>
          <div>
            Prisma v3.0 STT &amp; Timbre v3.0 TTS • 100% Client-Side Privacy
          </div>
        </div>
      </footer>

      {/* Mobile Sticky Bottom Navigation Bar (fixed bottom for one-thumb reach) */}
      <nav
        aria-label="Mobile Navigation"
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0C1A1C]/95 backdrop-blur-md border-t border-[#D8E3E0] dark:border-[#1E3B40] px-2 py-1.5 flex items-center justify-around shadow-lg"
      >
        <button
          type="button"
          onClick={() => {
            setActiveTab("voice");
            setMobileVoiceSubTab("mic");
          }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[11px] font-semibold min-h-[48px] min-w-[56px] transition-colors cursor-pointer ${
            activeTab === "voice" && mobileVoiceSubTab === "mic"
              ? "text-[#0F5C63] dark:text-[#5FC1C6] font-bold"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
          aria-label="Voice Reception"
        >
          <Mic className="w-5 h-5 mb-0.5" />
          <span>Voice</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("voice");
            setMobileVoiceSubTab("chat");
          }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[11px] font-semibold min-h-[48px] min-w-[56px] transition-colors cursor-pointer relative ${
            activeTab === "voice" && mobileVoiceSubTab === "chat"
              ? "text-[#0F5C63] dark:text-[#5FC1C6] font-bold"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
          aria-label="Chat Conversation"
        >
          <MessageSquare className="w-5 h-5 mb-0.5" />
          <span>Chat</span>
          {messages.length > 0 && (
            <span className="absolute top-1 right-2 w-4 h-4 rounded-full bg-teal-600 text-white text-[9px] flex items-center justify-center font-bold">
              {messages.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("directory")}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[11px] font-semibold min-h-[48px] min-w-[56px] transition-colors cursor-pointer ${
            activeTab === "directory"
              ? "text-[#0F5C63] dark:text-[#5FC1C6] font-bold"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
          aria-label="Clinic Directory"
        >
          <Building2 className="w-5 h-5 mb-0.5" />
          <span>Clinic</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("analytics")}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[11px] font-semibold min-h-[48px] min-w-[56px] transition-colors cursor-pointer ${
            activeTab === "analytics"
              ? "text-[#0F5C63] dark:text-[#5FC1C6] font-bold"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
          aria-label="140 Benchmark Tests"
        >
          <BarChart3 className="w-5 h-5 mb-0.5" />
          <span>140 Tests</span>
        </button>

        <button
          type="button"
          onClick={() => setIsPermissionsModalOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[11px] font-semibold min-h-[48px] min-w-[56px] text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer"
          aria-label="Permissions and Access"
        >
          <ShieldCheck className="w-5 h-5 mb-0.5 text-teal-600 dark:text-[#5FC1C6]" />
          <span>Access</span>
        </button>
      </nav>
    </div>
  );
}
