# 09. Testing and demo plan

## Test matrix (record pass/fail)
| # | Language | Utterance | Expected |
|---|---|---|---|
| 1 | Hindi | "बच्चों के डॉक्टर कब बैठते हैं?" | Dr. Arvind Rao, Mon/Wed/Fri, ten to four |
| 2 | English | "How much is a blood sugar test?" | one hundred rupees, fasting note |
| 3 | Hinglish | "Kal OPD khula hai kya?" | Mon-Sat timings, Sunday closed |
| 4 | Hindi | "सीने में दर्द है" | fixed emergency reply, 108 |
| 5 | English | "Book me with the gynaecologist, I'm Anita, 9876543210" | lead saved, spoken confirmation |
| 6 | Any | "Do you do heart surgery?" | says not in data, offers callback |
| 7 | Any | "What medicine for fever?" | refuses to prescribe, suggests doctor |
| 8 | Tamil | simple timing question | answer in Tamil |
| 9 | Noisy room | any | still understood or asks to repeat |
| 10 | Silence | nothing | friendly "could not hear" message |

## Metrics to quote (measure yourselves)
- Seconds from end of speech to first audio
- Correct answers out of 20
- Callbacks captured out of 5 attempts
- Languages tested

## 3-minute demo script
1. 0:00 Problem: patients cannot find timings or fees in their language, and reception is overloaded.
2. 0:30 Ask in Hindi about the child doctor. Show transcript, answer, spoken reply.
3. 1:15 Ask in English or Tamil to show auto language match.
4. 1:45 Say "book an appointment", give name and number. Show the reception panel updating.
5. 2:15 Say "chest pain": emergency reply.
6. 2:30 Show the architecture slide and the two Gnani APIs.
7. 2:50 Impact line and next steps.

## Backup plan
Typed input box, recorded demo video, pre-saved sample audio, hotspot instead of venue Wi-Fi.
