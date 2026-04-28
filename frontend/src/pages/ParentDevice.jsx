import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import API from "../services/api";
import socket from "../socket/socket";
import vatsalyaLogo from "../assets/vatsalya-logo.jpeg";
import "./ParentDevice.css";

const translateCareMessage = (text) => {
  const normalized = text.toLowerCase();

  if (
    normalized.includes("tablet") ||
    normalized.includes("medicine") ||
    normalized.includes("dawai") ||
    normalized.includes("chahiye") ||
    normalized.includes("beku") ||
    normalized.includes("mathre") ||
    normalized.includes("goli") ||
    normalized.includes("మందు") ||
    normalized.includes("మాత్ర") ||
    normalized.includes("marunthu") ||
    normalized.includes("mathirai") ||
    normalized.includes("மருந்து") ||
    normalized.includes("மாத்திரை") ||
    normalized.includes("marunnu") ||
    normalized.includes("gulika") ||
    normalized.includes("മരുന്ന്") ||
    normalized.includes("ഗുളിക")
  ) {
    return "I need medicine or tablets.";
  }

  if (
    normalized.includes("water") ||
    normalized.includes("paani") ||
    normalized.includes("neeru") ||
    normalized.includes("నీళ్ళు") ||
    normalized.includes("నీరు") ||
    normalized.includes("neellu") ||
    normalized.includes("thanni") ||
    normalized.includes("தண்ணீர்") ||
    normalized.includes("vellam") ||
    normalized.includes("വെള്ളം")
  ) {
    return "I need water.";
  }

  if (
    normalized.includes("food") ||
    normalized.includes("khana") ||
    normalized.includes("oota") ||
    normalized.includes("hungry") ||
    normalized.includes("ఆహారం") ||
    normalized.includes("అన్నం") ||
    normalized.includes("annam") ||
    normalized.includes("sapadu") ||
    normalized.includes("saapadu") ||
    normalized.includes("சாப்பாடு") ||
    normalized.includes("unavu") ||
    normalized.includes("ഭക്ഷണം") ||
    normalized.includes("choru") ||
    normalized.includes("ചോറ്")
  ) {
    return "I need food.";
  }

  if (
    normalized.includes("help") ||
    normalized.includes("madad") ||
    normalized.includes("sahaya") ||
    normalized.includes("సహాయం") ||
    normalized.includes("సాయం") ||
    normalized.includes("udavi") ||
    normalized.includes("உதவி") ||
    normalized.includes("സഹായം") ||
    normalized.includes("sahayam")
  ) {
    return "I need help.";
  }

  return text;
};

const getVoiceLanguageFallbacks = (selectedLanguage) => {
  const languages = [selectedLanguage, "en-IN", "hi-IN", "kn-IN", "te-IN", "ta-IN", "ml-IN"];
  return [...new Set(languages)];
};

const PAGE_LANGUAGE_OPTIONS = [
  { code: "en-IN", label: "English" },
  { code: "hi-IN", label: "Hindi" },
  { code: "kn-IN", label: "Kannada" },
  { code: "te-IN", label: "Telugu" },
  { code: "ta-IN", label: "Tamil" },
  { code: "ml-IN", label: "Malayalam" }
];

const UI_TRANSLATIONS = {
  "en-IN": {
    language: "Language",
    logout: "Logout",
    hello: "Hello",
    connected: "Your caregiver is connected and monitoring",
    sosSub: "Press for Emergency",
    takeMedicine: "Take Medicine",
    remindersSet: "reminder(s) set",
    askCaregiverToSet: "Ask caregiver to set",
    drinkWater: "Drink Water",
    foodIntake: "Food Intake",
    sendVoice: "Send Voice Message",
    listening: "Listening...",
    speakLanguages: "Speak in English, Hindi, Kannada, Telugu, Tamil, or Malayalam",
    needTablets: "Need tablets",
    needWater: "Need water",
    needFood: "Need food",
    needHelp: "Need help",
    typeIfMicFails: "Type message if mic fails",
    send: "Send",
    doctorAppointments: "Doctor Appointments",
    doctorVisit: "Doctor visit",
    noAppointments: "No upcoming appointments.",
    dailyActivity: "Daily Activity",
    activityPlaceholder: "e.g. Morning walk",
    add: "Add",
    minTarget: "min target",
    score: "Score",
    start: "Start",
    finish: "Finish",
    done: "Done",
    myMedicines: "My Medicines",
    order: "Order",
    orderSuccess: "Order placed! Your caregiver has been notified.",
    noMeds: "No medicines assigned yet. Your caregiver will add them.",
    medHint: "Tap medicines to select, then press Order",
    daily: "Daily",
    emergency: "Emergency",
    refresh: "Refresh",
    emergencySOS: "Emergency SOS",
    caregiverAlerted: "Your caregiver will be alerted immediately",
    seconds: "seconds",
    sosAuto: "SOS triggers automatically when timer ends",
    imSafe: "I'm Safe",
    triggerNow: "Trigger Now",
    alertSent: "Alert Sent!",
    helpOnWay: "Your caregiver has been notified. Help is on the way.",
    close: "Close",
    sent: "Sent",
    speakFirst: "Please speak or type a message first.",
    sendFailed: "Could not send voice message.",
    unsupported: "Voice recognition is not supported here. Type the message below and send.",
    listeningNow: "Listening now. Speak normally for a few seconds.",
    heard: "Heard",
    micBlocked: "Microphone permission is blocked. Allow microphone access in the browser, then try again.",
    noMic: "No microphone was found. Check the device mic and browser input settings.",
    tryingLanguage: "Still listening. Trying another language setting.",
    notEnoughWords: "I could not hear enough words. Use the quick buttons below or type the message once.",
    micStartFailed: "Mic could not start. Refresh the page and allow microphone access."
  },
  "hi-IN": {
    language: "भाषा",
    logout: "लॉगआउट",
    hello: "नमस्ते",
    connected: "आपका देखभालकर्ता जुड़ा है और निगरानी कर रहा है",
    sosSub: "आपातकाल के लिए दबाएं",
    takeMedicine: "दवा लें",
    remindersSet: "रिमाइंडर सेट",
    askCaregiverToSet: "देखभालकर्ता से सेट करवाएं",
    drinkWater: "पानी पिएं",
    foodIntake: "भोजन",
    sendVoice: "वॉइस संदेश भेजें",
    listening: "सुन रहा है...",
    speakLanguages: "English, Hindi, Kannada, Telugu, Tamil, या Malayalam में बोलें",
    needTablets: "दवा चाहिए",
    needWater: "पानी चाहिए",
    needFood: "खाना चाहिए",
    needHelp: "मदद चाहिए",
    typeIfMicFails: "माइक न चले तो संदेश लिखें",
    send: "भेजें",
    doctorAppointments: "डॉक्टर अपॉइंटमेंट",
    doctorVisit: "डॉक्टर विजिट",
    noAppointments: "कोई आने वाला अपॉइंटमेंट नहीं.",
    dailyActivity: "दैनिक गतिविधि",
    activityPlaceholder: "जैसे सुबह की सैर",
    add: "जोड़ें",
    minTarget: "मिनट लक्ष्य",
    score: "स्कोर",
    start: "शुरू",
    finish: "समाप्त",
    done: "हो गया",
    myMedicines: "मेरी दवाएं",
    order: "ऑर्डर",
    orderSuccess: "ऑर्डर हो गया! आपके देखभालकर्ता को सूचना भेज दी गई.",
    noMeds: "अभी कोई दवा असाइन नहीं है. आपका देखभालकर्ता जोड़ेगा.",
    medHint: "दवा चुनें, फिर ऑर्डर दबाएं",
    daily: "रोजाना",
    emergency: "आपातकाल",
    refresh: "रिफ्रेश",
    emergencySOS: "आपातकालीन SOS",
    caregiverAlerted: "आपके देखभालकर्ता को तुरंत सूचना दी जाएगी",
    seconds: "सेकंड",
    sosAuto: "टाइमर खत्म होने पर SOS अपने आप भेजेगा",
    imSafe: "मैं सुरक्षित हूं",
    triggerNow: "अभी भेजें",
    alertSent: "अलर्ट भेजा गया!",
    helpOnWay: "आपके देखभालकर्ता को सूचना मिल गई है. मदद रास्ते में है.",
    close: "बंद करें"
  },
  "kn-IN": {
    language: "ಭಾಷೆ",
    logout: "ಲಾಗ್ ಔಟ್",
    hello: "ನಮಸ್ಕಾರ",
    connected: "ನಿಮ್ಮ ಕೇರ್ ಗಿವರ್ ಸಂಪರ್ಕದಲ್ಲಿದ್ದಾರೆ ಮತ್ತು ಗಮನಿಸುತ್ತಿದ್ದಾರೆ",
    sosSub: "ತುರ್ತು ಸಹಾಯಕ್ಕೆ ಒತ್ತಿರಿ",
    takeMedicine: "ಔಷಧಿ ತೆಗೆದುಕೊಳ್ಳಿ",
    remindersSet: "ರಿಮೈಂಡರ್ ಸೆಟ್",
    askCaregiverToSet: "ಕೇರ್ ಗಿವರ್ ಸೆಟ್ ಮಾಡಲಿ",
    drinkWater: "ನೀರು ಕುಡಿಯಿರಿ",
    foodIntake: "ಆಹಾರ",
    sendVoice: "ಧ್ವನಿ ಸಂದೇಶ ಕಳುಹಿಸಿ",
    listening: "ಕೇಳುತ್ತಿದೆ...",
    speakLanguages: "English, Hindi, Kannada, Telugu, Tamil, ಅಥವಾ Malayalam ನಲ್ಲಿ ಮಾತನಾಡಿ",
    needTablets: "ಮಾತ್ರೆ ಬೇಕು",
    needWater: "ನೀರು ಬೇಕು",
    needFood: "ಆಹಾರ ಬೇಕು",
    needHelp: "ಸಹಾಯ ಬೇಕು",
    typeIfMicFails: "ಮೈಕ್ ಕೆಲಸ ಮಾಡದಿದ್ದರೆ ಸಂದೇಶ ಬರೆಯಿರಿ",
    send: "ಕಳುಹಿಸಿ",
    doctorAppointments: "ಡಾಕ್ಟರ್ ಅಪಾಯಿಂಟ್ಮೆಂಟ್",
    doctorVisit: "ಡಾಕ್ಟರ್ ಭೇಟಿ",
    noAppointments: "ಮುಂದಿನ ಅಪಾಯಿಂಟ್ಮೆಂಟ್ ಇಲ್ಲ.",
    dailyActivity: "ದೈನಂದಿನ ಚಟುವಟಿಕೆ",
    activityPlaceholder: "ಉದಾ. ಬೆಳಗಿನ ನಡೆ",
    add: "ಸೇರಿಸಿ",
    minTarget: "ನಿಮಿಷ ಗುರಿ",
    score: "ಸ್ಕೋರ್",
    start: "ಪ್ರಾರಂಭಿಸಿ",
    finish: "ಮುಗಿಸಿ",
    done: "ಆಯಿತು",
    myMedicines: "ನನ್ನ ಔಷಧಿಗಳು",
    order: "ಆರ್ಡರ್",
    orderSuccess: "ಆರ್ಡರ್ ಮಾಡಲಾಗಿದೆ! ನಿಮ್ಮ ಕೇರ್ ಗಿವರ್‌ಗೆ ತಿಳಿಸಲಾಗಿದೆ.",
    noMeds: "ಇನ್ನೂ ಔಷಧಿ ಸೇರಿಸಲಾಗಿಲ್ಲ. ನಿಮ್ಮ ಕೇರ್ ಗಿವರ್ ಸೇರಿಸುತ್ತಾರೆ.",
    medHint: "ಔಷಧಿ ಆಯ್ಕೆ ಮಾಡಿ, ನಂತರ ಆರ್ಡರ್ ಒತ್ತಿರಿ",
    daily: "ಪ್ರತಿದಿನ",
    emergency: "ತುರ್ತು",
    refresh: "ರಿಫ್ರೆಶ್",
    emergencySOS: "ತುರ್ತು SOS",
    caregiverAlerted: "ನಿಮ್ಮ ಕೇರ್ ಗಿವರ್‌ಗೆ ತಕ್ಷಣ ಮಾಹಿತಿ ಹೋಗುತ್ತದೆ",
    seconds: "ಸೆಕೆಂಡು",
    sosAuto: "ಟೈಮರ್ ಮುಗಿದಾಗ SOS ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಕಳುಹಿಸುತ್ತದೆ",
    imSafe: "ನಾನು ಸುರಕ್ಷಿತ",
    triggerNow: "ಈಗ ಕಳುಹಿಸಿ",
    alertSent: "ಅಲರ್ಟ್ ಕಳುಹಿಸಲಾಗಿದೆ!",
    helpOnWay: "ನಿಮ್ಮ ಕೇರ್ ಗಿವರ್‌ಗೆ ಮಾಹಿತಿ ಸಿಕ್ಕಿದೆ. ಸಹಾಯ ಬರುತ್ತಿದೆ.",
    close: "ಮುಚ್ಚಿ"
  },
  "te-IN": {
    language: "భాష",
    logout: "లాగౌట్",
    hello: "నమస్కారం",
    connected: "మీ కేర్ గివర్ కనెక్ట్ అయ్యి గమనిస్తున్నారు",
    sosSub: "అత్యవసరానికి నొక్కండి",
    takeMedicine: "మందు తీసుకోండి",
    remindersSet: "రిమైండర్ సెట్",
    askCaregiverToSet: "కేర్ గివర్‌ను సెట్ చేయమని అడగండి",
    drinkWater: "నీళ్లు తాగండి",
    foodIntake: "ఆహారం",
    sendVoice: "వాయిస్ మెసేజ్ పంపండి",
    listening: "వింటోంది...",
    speakLanguages: "English, Hindi, Kannada, Telugu, Tamil, లేదా Malayalam లో మాట్లాడండి",
    needTablets: "మాత్రలు కావాలి",
    needWater: "నీళ్లు కావాలి",
    needFood: "ఆహారం కావాలి",
    needHelp: "సహాయం కావాలి",
    typeIfMicFails: "మైక్ పనిచేయకపోతే మెసేజ్ టైప్ చేయండి",
    send: "పంపండి",
    doctorAppointments: "డాక్టర్ అపాయింట్మెంట్లు",
    doctorVisit: "డాక్టర్ విజిట్",
    noAppointments: "రాబోయే అపాయింట్మెంట్లు లేవు.",
    dailyActivity: "రోజువారీ కార్యాచరణ",
    activityPlaceholder: "ఉదా. ఉదయం నడక",
    add: "జోడించండి",
    minTarget: "నిమిషాల లక్ష్యం",
    score: "స్కోర్",
    start: "ప్రారంభం",
    finish: "ముగించు",
    done: "పూర్తి",
    myMedicines: "నా మందులు",
    order: "ఆర్డర్",
    orderSuccess: "ఆర్డర్ పెట్టబడింది! మీ కేర్ గివర్‌కు తెలియజేశాం.",
    noMeds: "ఇంకా మందులు అసైన్ కాలేదు. మీ కేర్ గివర్ జోడిస్తారు.",
    medHint: "మందులు ఎంచుకుని, ఆర్డర్ నొక్కండి",
    daily: "రోజూ",
    emergency: "అత్యవసరం",
    refresh: "రిఫ్రెష్",
    emergencySOS: "అత్యవసర SOS",
    caregiverAlerted: "మీ కేర్ గివర్‌కు వెంటనే అలర్ట్ వెళ్తుంది",
    seconds: "సెకన్లు",
    sosAuto: "టైమర్ ముగిసినప్పుడు SOS ఆటోమేటిక్‌గా పంపబడుతుంది",
    imSafe: "నేను సురక్షితం",
    triggerNow: "ఇప్పుడే పంపండి",
    alertSent: "అలర్ట్ పంపబడింది!",
    helpOnWay: "మీ కేర్ గివర్‌కు తెలియజేశాం. సహాయం వస్తోంది.",
    close: "మూసివేయండి"
  },
  "ta-IN": {
    language: "மொழி",
    logout: "வெளியேறு",
    hello: "வணக்கம்",
    connected: "உங்கள் பராமரிப்பாளர் இணைக்கப்பட்டு கண்காணிக்கிறார்",
    sosSub: "அவசரத்திற்கு அழுத்தவும்",
    takeMedicine: "மருந்து எடுத்துக்கொள்ளுங்கள்",
    remindersSet: "நினைவூட்டல் அமைக்கப்பட்டது",
    askCaregiverToSet: "பராமரிப்பாளரை அமைக்கச் சொல்லுங்கள்",
    drinkWater: "தண்ணீர் குடிக்கவும்",
    foodIntake: "உணவு",
    sendVoice: "குரல் செய்தி அனுப்பு",
    listening: "கேட்கிறது...",
    speakLanguages: "English, Hindi, Kannada, Telugu, Tamil, அல்லது Malayalam-ல் பேசுங்கள்",
    needTablets: "மாத்திரை வேண்டும்",
    needWater: "தண்ணீர் வேண்டும்",
    needFood: "உணவு வேண்டும்",
    needHelp: "உதவி வேண்டும்",
    typeIfMicFails: "மைக் வேலை செய்யாவிட்டால் செய்தி தட்டச்சு செய்யவும்",
    send: "அனுப்பு",
    doctorAppointments: "மருத்துவர் நேரங்கள்",
    doctorVisit: "மருத்துவர் சந்திப்பு",
    noAppointments: "வரவிருக்கும் நேரம் இல்லை.",
    dailyActivity: "தினசரி செயல்பாடு",
    activityPlaceholder: "எ.கா. காலை நடை",
    add: "சேர்",
    minTarget: "நிமிட இலக்கு",
    score: "மதிப்பெண்",
    start: "தொடங்கு",
    finish: "முடி",
    done: "முடிந்தது",
    myMedicines: "என் மருந்துகள்",
    order: "ஆர்டர்",
    orderSuccess: "ஆர்டர் செய்யப்பட்டது! உங்கள் பராமரிப்பாளருக்கு தெரிவிக்கப்பட்டது.",
    noMeds: "இன்னும் மருந்துகள் ஒதுக்கப்படவில்லை. உங்கள் பராமரிப்பாளர் சேர்ப்பார்.",
    medHint: "மருந்துகளை தேர்ந்தெடுத்து, ஆர்டர் அழுத்தவும்",
    daily: "தினமும்",
    emergency: "அவசரம்",
    refresh: "புதுப்பி",
    emergencySOS: "அவசர SOS",
    caregiverAlerted: "உங்கள் பராமரிப்பாளருக்கு உடனே எச்சரிக்கை அனுப்பப்படும்",
    seconds: "விநாடிகள்",
    sosAuto: "டைமர் முடிந்ததும் SOS தானாக அனுப்பப்படும்",
    imSafe: "நான் பாதுகாப்பாக இருக்கிறேன்",
    triggerNow: "இப்போது அனுப்பு",
    alertSent: "எச்சரிக்கை அனுப்பப்பட்டது!",
    helpOnWay: "உங்கள் பராமரிப்பாளருக்கு தெரிவிக்கப்பட்டது. உதவி வருகிறது.",
    close: "மூடு"
  },
  "ml-IN": {
    language: "ഭാഷ",
    logout: "ലോഗൗട്ട്",
    hello: "നമസ്കാരം",
    connected: "നിങ്ങളുടെ കെയർഗിവർ ബന്ധിപ്പിച്ചിരിക്കുന്നു, നിരീക്ഷിക്കുന്നു",
    sosSub: "അടിയന്തരാവസ്ഥയ്ക്ക് അമർത്തുക",
    takeMedicine: "മരുന്ന് കഴിക്കുക",
    remindersSet: "റിമൈൻഡർ സജ്ജമാക്കി",
    askCaregiverToSet: "കെയർഗിവറോട് സജ്ജമാക്കാൻ പറയുക",
    drinkWater: "വെള്ളം കുടിക്കുക",
    foodIntake: "ഭക്ഷണം",
    sendVoice: "ശബ്ദ സന്ദേശം അയക്കുക",
    listening: "കേൾക്കുന്നു...",
    speakLanguages: "English, Hindi, Kannada, Telugu, Tamil, അല്ലെങ്കിൽ Malayalam-ൽ സംസാരിക്കുക",
    needTablets: "ഗുളിക വേണം",
    needWater: "വെള്ളം വേണം",
    needFood: "ഭക്ഷണം വേണം",
    needHelp: "സഹായം വേണം",
    typeIfMicFails: "മൈക്ക് പ്രവർത്തിക്കില്ലെങ്കിൽ സന്ദേശം ടൈപ്പ് ചെയ്യുക",
    send: "അയക്കുക",
    doctorAppointments: "ഡോക്ടർ അപ്പോയിന്റ്മെന്റുകൾ",
    doctorVisit: "ഡോക്ടർ സന്ദർശനം",
    noAppointments: "വരാനിരിക്കുന്ന അപ്പോയിന്റ്മെന്റ് ഇല്ല.",
    dailyActivity: "ദൈനംദിന പ്രവർത്തനം",
    activityPlaceholder: "ഉദാ. രാവിലെ നടക്കൽ",
    add: "ചേർക്കുക",
    minTarget: "മിനിറ്റ് ലക്ഷ്യം",
    score: "സ്കോർ",
    start: "ആരംഭിക്കുക",
    finish: "പൂർത്തിയാക്കുക",
    done: "കഴിഞ്ഞു",
    myMedicines: "എന്റെ മരുന്നുകൾ",
    order: "ഓർഡർ",
    orderSuccess: "ഓർഡർ നൽകി! നിങ്ങളുടെ കെയർഗിവറിനെ അറിയിച്ചു.",
    noMeds: "ഇനിയും മരുന്നുകൾ നൽകിയിട്ടില്ല. നിങ്ങളുടെ കെയർഗിവർ ചേർക്കും.",
    medHint: "മരുന്നുകൾ തിരഞ്ഞെടുക്കുക, പിന്നെ ഓർഡർ അമർത്തുക",
    daily: "പ്രതിദിനം",
    emergency: "അടിയന്തരാവസ്ഥ",
    refresh: "റിഫ്രെഷ്",
    emergencySOS: "അടിയന്തര SOS",
    caregiverAlerted: "നിങ്ങളുടെ കെയർഗിവറിന് ഉടൻ അറിയിപ്പ് ലഭിക്കും",
    seconds: "സെക്കൻഡ്",
    sosAuto: "ടൈമർ അവസാനിക്കുമ്പോൾ SOS സ്വയം അയക്കും",
    imSafe: "ഞാൻ സുരക്ഷിതൻ",
    triggerNow: "ഇപ്പോൾ അയക്കുക",
    alertSent: "അലർട്ട് അയച്ചു!",
    helpOnWay: "നിങ്ങളുടെ കെയർഗിവറിനെ അറിയിച്ചു. സഹായം വരുന്നു.",
    close: "അടയ്ക്കുക"
  }
};

const translateUI = (language, key) => UI_TRANSLATIONS[language]?.[key] || UI_TRANSLATIONS["en-IN"][key] || key;

export default function ParentDevice() {
  const [step, setStep] = useState("login");
  const [uniqueCode, setUniqueCode] = useState("");
  const [parent, setParent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedMeds, setSelectedMeds] = useState([]);
  const [showSOS, setShowSOS] = useState(false);
  const [sosTriggered, setSosTriggered] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(30);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [activeReminder, setActiveReminder] = useState(null);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState("");
  const [pageLanguage, setPageLanguage] = useState("en-IN");
  const [voiceLanguage, setVoiceLanguage] = useState("en-IN");
  const [newActivity, setNewActivity] = useState({ title: "", targetMinutes: 15 });
  const recognitionRef = useRef(null);
  const voiceTranscriptRef = useRef("");
  const voiceRetryRef = useRef(0);
  const voiceSentRef = useRef(false);
  const voiceFallbacksRef = useRef([]);

  const reminders = useMemo(() => parent?.reminders || {}, [parent?.reminders]);
  const medicineReminders = useMemo(() => reminders.medicines || [], [reminders.medicines]);
  const foodReminders = useMemo(() => reminders.food || {}, [reminders.food]);
  const waterReminder = useMemo(() => reminders.water || {}, [reminders.water]);
  const t = useCallback((key) => translateUI(pageLanguage, key), [pageLanguage]);

  const handlePageLanguageChange = (language) => {
    setPageLanguage(language);
    setVoiceLanguage(language);
  };

  const handleTriggerSOS = useCallback(async () => {
    if (!parent) return;
    setSosTriggered(true);
    try {
      await API.post("/sos/trigger", {
        parentId: parent._id,
        message: `Emergency SOS from ${parent.name}! Immediate help needed.`
      });
    } catch (err) {
      console.error("SOS failed:", err);
      localStorage.setItem("pendingSOS", JSON.stringify({
        parentId: parent._id,
        message: `Emergency SOS from ${parent.name}`,
        time: new Date()
      }));
    }
  }, [parent]);

  useEffect(() => {
    if (!showSOS || sosCountdown <= 0) return;
    const timer = setTimeout(() => setSosCountdown(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [showSOS, sosCountdown]);

  useEffect(() => {
    if (showSOS && sosCountdown === 0 && !sosTriggered) {
      const timer = setTimeout(handleTriggerSOS, 0);
      return () => clearTimeout(timer);
    }
  }, [handleTriggerSOS, showSOS, sosCountdown, sosTriggered]);

  useEffect(() => {
    if (!parent) return;
    socket.emit("joinRoom", `parent_${parent._id}`);

    socket.on("MEDICINE_UPDATED", (data) => {
      setParent(prev => ({ ...prev, medicines: data.medicines }));
    });

    socket.on("REMINDERS_UPDATED", (data) => {
      setParent(prev => ({ ...prev, reminders: data.reminders }));
      setActiveReminder({
        type: "Updated",
        title: "Care reminders updated",
        message: "Your caregiver updated your medicine, water, or food reminders."
      });
    });

    socket.on("APPOINTMENTS_UPDATED", (data) => {
      setParent(prev => ({ ...prev, appointments: data.appointments }));
      setActiveReminder({
        type: "Appointment",
        title: "Doctor appointment updated",
        message: "Your caregiver added or updated a doctor appointment."
      });
    });

    return () => {
      socket.off("MEDICINE_UPDATED");
      socket.off("REMINDERS_UPDATED");
      socket.off("APPOINTMENTS_UPDATED");
    };
  }, [parent]);

  useEffect(() => {
    if (!parent) return;

    const notifyOnce = (key, reminder) => {
      const storageKey = `reminder_${parent._id}_${key}`;
      if (localStorage.getItem(storageKey)) return;
      localStorage.setItem(storageKey, "shown");
      setActiveReminder(reminder);
    };

    const checkReminders = () => {
      const now = new Date();
      const minutesNow = now.getHours() * 60 + now.getMinutes();
      const currentTime = now.toTimeString().slice(0, 5);
      const currentDay = now.toISOString().slice(0, 10);

      medicineReminders.forEach((med, index) => {
        (med.times || []).forEach((time) => {
          if (time === currentTime) {
            notifyOnce(`${currentDay}_medicine_${index}_${time}`, {
              type: "Medicine",
              title: `Take ${med.name}`,
              message: `${med.name} is scheduled now. Times today: ${med.timesPerDay || med.times?.length || 1}.`
            });
          }
        });
      });

      Object.entries(foodReminders).forEach(([meal, time]) => {
        if (time && time === currentTime) {
          notifyOnce(`${currentDay}_food_${meal}_${time}`, {
            type: "Food",
            title: `${meal.charAt(0).toUpperCase() + meal.slice(1)} time`,
            message: "Please take your meal now."
          });
        }
      });

      if (waterReminder.enabled) {
        const [startHour, startMinute] = (waterReminder.startTime || "08:00").split(":").map(Number);
        const [endHour, endMinute] = (waterReminder.endTime || "20:00").split(":").map(Number);
        const start = startHour * 60 + startMinute;
        const end = endHour * 60 + endMinute;
        const interval = Number(waterReminder.intervalMinutes) || 60;

        if (minutesNow >= start && minutesNow <= end && (minutesNow - start) % interval === 0) {
          notifyOnce(`${currentDay}_water_${currentTime}`, {
            type: "Water",
            title: "Drink water",
            message: "Please drink a glass of water now."
          });
        }
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 30000);
    return () => clearInterval(interval);
  }, [parent, medicineReminders, foodReminders, waterReminder]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await API.post("/parents/device/login", { uniqueCode: uniqueCode.trim().toUpperCase() });
      setParent(res.data.parent);
      localStorage.setItem("parentDeviceId", res.data.parent._id);
      setStep("dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const toggleMedicine = (medId) => {
    setSelectedMeds(prev =>
      prev.includes(medId) ? prev.filter(id => id !== medId) : [...prev, medId]
    );
  };

  const handleOrderMedicines = async () => {
    if (selectedMeds.length === 0) return alert(t("medHint"));
    try {
      await API.post("/parents/device/order", {
        parentId: parent._id,
        medicineIds: selectedMeds
      });
      setOrderSuccess(true);
      setSelectedMeds([]);
      setTimeout(() => setOrderSuccess(false), 3000);
    } catch (err) {
      alert(`${t("order")} failed: ${err.response?.data?.message || "Error"}`);
    }
  };

  const sendVoiceMessage = async (originalText) => {
    if (!originalText.trim()) {
      setVoiceStatus(t("speakFirst"));
      return;
    }

    const translatedText = translateCareMessage(originalText);
    try {
      await API.post("/parents/device/voice-message", {
        parentId: parent._id,
        originalText,
        translatedText,
        language: voiceLanguage
      });
      setVoiceDraft("");
      setVoiceStatus(`${t("sent")}: ${translatedText}`);
    } catch (err) {
      setVoiceStatus(err.response?.data?.message || t("sendFailed"));
    }
  };

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        // Recognition may already be closed by the browser.
      }
    };
  }, []);

  const handleVoiceMessage = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceStatus(t("unsupported"));
      return;
    }

    if (listening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // Recognition may already be closed by the browser.
      }
      return;
    }

    voiceTranscriptRef.current = "";
    voiceRetryRef.current = 0;
    voiceSentRef.current = false;
    voiceFallbacksRef.current = getVoiceLanguageFallbacks(voiceLanguage);
    setListening(true);
    setVoiceStatus(t("listeningNow"));

    const startRecognition = (languageIndex = 0) => {
      const recognition = new SpeechRecognition();
      const activeLanguage = voiceFallbacksRef.current[languageIndex] || voiceLanguage;
      recognitionRef.current = recognition;
      recognition.lang = activeLanguage;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;
      recognition.continuous = true;

      const stopTimer = setTimeout(() => {
        try {
          recognition.stop();
        } catch {
          // Browser may already have stopped listening.
        }
      }, 15000);

      recognition.onresult = async (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0]?.transcript || "")
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        if (transcript) {
          voiceTranscriptRef.current = transcript;
          setVoiceDraft(transcript);
          setVoiceStatus(`${t("heard")}: ${transcript}`);
        }

        const hasFinalResult = Array.from(event.results).some((result) => result.isFinal);
        if (hasFinalResult && transcript.length >= 2) {
          clearTimeout(stopTimer);
          voiceSentRef.current = true;
          await sendVoiceMessage(transcript);
          setListening(false);
          try {
            recognition.stop();
          } catch {
            // Browser may already have stopped listening.
          }
        }
      };

      recognition.onerror = (event) => {
        clearTimeout(stopTimer);

        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setListening(false);
          setVoiceStatus(t("micBlocked"));
          return;
        }

        if (voiceTranscriptRef.current.trim() && !voiceSentRef.current) {
          voiceSentRef.current = true;
          sendVoiceMessage(voiceTranscriptRef.current);
          return;
        }

        if (event.error === "audio-capture") {
          setListening(false);
          setVoiceStatus(t("noMic"));
          return;
        }

        voiceRetryRef.current = languageIndex + 1;
        setVoiceStatus(t("tryingLanguage"));
      };

      recognition.onend = () => {
        clearTimeout(stopTimer);

        if (voiceSentRef.current) {
          setListening(false);
          return;
        }

        if (voiceTranscriptRef.current.trim()) {
          voiceSentRef.current = true;
          setListening(false);
          sendVoiceMessage(voiceTranscriptRef.current);
          return;
        }

        const nextLanguageIndex = Math.max(voiceRetryRef.current, languageIndex + 1);
        if (nextLanguageIndex < voiceFallbacksRef.current.length) {
          setVoiceStatus(t("tryingLanguage"));
          startRecognition(nextLanguageIndex);
          return;
        }

        setListening(false);
        setVoiceStatus(t("notEnoughWords"));
      };

      try {
        recognition.start();
      } catch {
        setListening(false);
        setVoiceStatus(t("micStartFailed"));
      }
    };

    startRecognition();
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    if (!newActivity.title.trim()) return;

    try {
      const res = await API.post("/parents/device/activity", {
        parentId: parent._id,
        title: newActivity.title,
        targetMinutes: newActivity.targetMinutes
      });
      setParent(prev => ({ ...prev, activities: res.data.activities }));
      setNewActivity({ title: "", targetMinutes: 15 });
    } catch (err) {
      alert(err.response?.data?.message || `${t("add")} failed`);
    }
  };

  const updateActivityStatus = async (activityId, action) => {
    try {
      const res = await API.put(`/parents/device/${parent._id}/activity/${activityId}`, { action });
      setParent(prev => ({ ...prev, activities: res.data.activities }));
    } catch (err) {
      alert(err.response?.data?.message || `${t("refresh")} failed`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("parentDeviceId");
    setParent(null);
    setStep("login");
    setUniqueCode("");
  };

  if (step === "login") {
    return (
      <div className="pd-login-page" id="parent-device-login">
        <div className="pd-login-bg">
          <div className="pd-bg-circle pd-bg-1"></div>
          <div className="pd-bg-circle pd-bg-2"></div>
        </div>

        <div className="pd-login-card animate-modal">
          <div className="pd-logo">
            <img src={vatsalyaLogo} alt="Vatsalya logo" />
          </div>
          <h1 className="pd-title">Vatsalya</h1>
          <p className="pd-subtitle">Parent Device Portal</p>

          {error && <div className="pd-error">{error}</div>}

          <form onSubmit={handleLogin} className="pd-form">
            <label>Enter Your Unique Code</label>
            <input
              type="text"
              placeholder="e.g. VAT-A1B2C3"
              value={uniqueCode}
              onChange={(e) => setUniqueCode(e.target.value)}
              className="pd-code-input"
              id="unique-code-input"
              required
            />
            <button type="submit" className="btn btn-primary pd-login-btn" disabled={loading}>
              {loading ? "Connecting..." : "Connect Device"}
            </button>
          </form>

          <p className="pd-hint">Ask your caregiver for the unique code</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pd-dashboard" id="parent-device-dashboard">
      <div className="pd-header">
        <div className="pd-header-left">
          <img className="pd-header-logo" src={vatsalyaLogo} alt="Vatsalya logo" />
          <span className="pd-header-title">Vatsalya</span>
        </div>
        <div className="pd-header-actions">
          <label className="pd-language-control">
            <span>{t("language")}</span>
            <select value={pageLanguage} onChange={(e) => handlePageLanguageChange(e.target.value)}>
              {PAGE_LANGUAGE_OPTIONS.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.label}
                </option>
              ))}
            </select>
          </label>
          <button className="pd-logout" onClick={handleLogout}>{t("logout")}</button>
        </div>
      </div>

      <div className="pd-welcome">
        <div className="pd-welcome-avatar">
          {parent.name.charAt(0)}
        </div>
        <h1>{t("hello")}, {parent.name}</h1>
        <p>{t("connected")}</p>
      </div>

      <div className="pd-sos-section">
        <button
          className="pd-sos-btn"
          id="parent-sos-btn"
          onClick={() => { setShowSOS(true); setSosCountdown(30); setSosTriggered(false); }}
        >
          <span className="pd-sos-pulse"></span>
          <span className="pd-sos-text">SOS</span>
          <span className="pd-sos-sub">{t("sosSub")}</span>
        </button>
      </div>

      <div className="pd-reminder-board">
        <button
          className="pd-main-reminder-card"
          onClick={() => setActiveReminder({
            type: t("takeMedicine"),
            title: medicineReminders[0]?.name ? `${t("takeMedicine")}: ${medicineReminders[0].name}` : t("takeMedicine"),
            message: medicineReminders[0]?.times?.length
              ? `Scheduled at ${medicineReminders[0].times.join(", ")}`
              : t("askCaregiverToSet")
          })}
        >
          <span className="pd-reminder-icon medicine">Rx</span>
          <span>
            <strong>{t("takeMedicine")}</strong>
            <small>
              {medicineReminders.length
                ? `${medicineReminders.length} ${t("remindersSet")}`
                : t("askCaregiverToSet")}
            </small>
          </span>
          <span className="pd-reminder-arrow">›</span>
        </button>

        <div className="pd-reminder-grid">
          <button
            className="pd-reminder-tile water"
            onClick={() => setActiveReminder({
              type: t("drinkWater"),
              title: t("drinkWater"),
              message: waterReminder.enabled
                ? `Reminder every ${waterReminder.intervalMinutes || 60} minutes`
                : t("askCaregiverToSet")
            })}
          >
            <span className="pd-tile-icon">H2O</span>
            <strong>{t("drinkWater")}</strong>
          </button>
          <button
            className="pd-reminder-tile food"
            onClick={() => setActiveReminder({
              type: t("foodIntake"),
              title: t("foodIntake"),
              message: `Breakfast ${foodReminders.breakfast || "--"}, Lunch ${foodReminders.lunch || "--"}, Dinner ${foodReminders.dinner || "--"}`
            })}
          >
            <span className="pd-tile-icon">Meal</span>
            <strong>{t("foodIntake")}</strong>
          </button>
        </div>
      </div>

      <div className="pd-voice-section">
        <button
          className={`pd-voice-button ${listening ? "listening" : ""}`}
          onClick={handleVoiceMessage}
        >
          <span className="pd-voice-icon">Mic</span>
          <span>
            <strong>{listening ? t("listening") : t("sendVoice")}</strong>
            <small>{t("speakLanguages")}</small>
          </span>
        </button>
        <div className="pd-quick-voice-grid">
          {[
            [t("needTablets"), "mujhe tablet chahiye"],
            [t("needWater"), "paani chahiye"],
            [t("needFood"), "khana chahiye"],
            [t("needHelp"), "mujhe madad chahiye"]
          ].map(([label, text]) => (
            <button key={label} onClick={() => sendVoiceMessage(text)}>
              {label}
            </button>
          ))}
        </div>
        <div className="pd-voice-manual">
          <input
            type="text"
            placeholder={t("typeIfMicFails")}
            value={voiceDraft}
            onChange={(e) => setVoiceDraft(e.target.value)}
          />
          <button onClick={() => sendVoiceMessage(voiceDraft)}>{t("send")}</button>
        </div>
        {voiceStatus && <p className="pd-voice-status">{voiceStatus}</p>}
      </div>

      <div className="pd-side-panels">
        <section className="pd-side-panel">
          <div className="pd-panel-header">
            <h2>{t("doctorAppointments")}</h2>
          </div>
          {parent.appointments?.length ? (
            <div className="pd-appointment-list">
              {parent.appointments.slice(-4).map((appointment) => (
                <div key={appointment._id} className="pd-appointment-card">
                  <strong>{appointment.doctorName}</strong>
                  <span>{appointment.specialty || t("doctorVisit")}</span>
                  <small>{appointment.date} at {appointment.time}</small>
                  {appointment.notes && <p>{appointment.notes}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="pd-panel-empty">{t("noAppointments")}</p>
          )}
        </section>

        <section className="pd-side-panel">
          <div className="pd-panel-header">
            <h2>{t("dailyActivity")}</h2>
            <span className="pd-score-pill">
              {Math.round(((parent.activities || []).filter(a => a.status === "completed").length / Math.max(1, (parent.activities || []).length)) * 100)}%
            </span>
          </div>
          <form className="pd-activity-form" onSubmit={handleAddActivity}>
            <input
              type="text"
              placeholder={t("activityPlaceholder")}
              value={newActivity.title}
              onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
            />
            <input
              type="number"
              min="1"
              value={newActivity.targetMinutes}
              onChange={(e) => setNewActivity({ ...newActivity, targetMinutes: e.target.value })}
            />
            <button type="submit">{t("add")}</button>
          </form>
          <div className="pd-activity-list">
            {(parent.activities || []).slice(-5).map((activity) => (
              <div key={activity._id} className={`pd-activity-card ${activity.status}`}>
                <div>
                  <strong>{activity.title}</strong>
                  <small>{activity.targetMinutes} {t("minTarget")} | {t("score")} {activity.score || 0}</small>
                </div>
                {activity.status !== "active" && activity.status !== "completed" && (
                  <button onClick={() => updateActivityStatus(activity._id, "start")}>{t("start")}</button>
                )}
                {activity.status === "active" && (
                  <button onClick={() => updateActivityStatus(activity._id, "finish")}>{t("finish")}</button>
                )}
                {activity.status === "completed" && <span className="pd-done-label">{t("done")}</span>}
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="pd-medicines-section">
        <div className="pd-section-header">
          <h2>{t("myMedicines")}</h2>
          {selectedMeds.length > 0 && (
            <button className="btn btn-success pd-order-btn" id="order-medicines-btn" onClick={handleOrderMedicines}>
              {t("order")} ({selectedMeds.length})
            </button>
          )}
        </div>

        {orderSuccess && (
          <div className="pd-order-success animate-fade-in">
            {t("orderSuccess")}
          </div>
        )}

        {(!parent.medicines || parent.medicines.length === 0) ? (
          <div className="pd-no-meds">
            <p>{t("noMeds")}</p>
          </div>
        ) : (
          <div className="pd-med-list">
            {parent.medicines.map((med) => (
              <div
                key={med._id}
                className={`pd-med-item ${selectedMeds.includes(med._id) ? "selected" : ""}`}
                onClick={() => toggleMedicine(med._id)}
              >
                <div className="pd-med-check">
                  {selectedMeds.includes(med._id) ? "✓" : "□"}
                </div>
                <div className="pd-med-icon">Rx</div>
                <div className="pd-med-info">
                  <span className="pd-med-name">{med.name}</span>
                  <span className="pd-med-dose">{med.dosage || ""} | {med.frequency || t("daily")}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="pd-med-hint">{t("medHint")}</p>
      </div>

      <div className="pd-quick-actions">
        <button className="pd-action-card" onClick={() => { setShowSOS(true); setSosCountdown(30); setSosTriggered(false); }}>
          <span className="pd-action-icon">SOS</span>
          <span>{t("emergency")}</span>
        </button>
        <button className="pd-action-card" onClick={() => window.location.reload()}>
          <span className="pd-action-icon">↻</span>
          <span>{t("refresh")}</span>
        </button>
      </div>

      {activeReminder && (
        <div className="modal-overlay pd-reminder-overlay">
          <div className="pd-reminder-modal animate-modal">
            <span className="pd-reminder-modal-type">{activeReminder.type}</span>
            <h2>{activeReminder.title}</h2>
            <p>{activeReminder.message}</p>
            <button className="btn btn-primary" onClick={() => setActiveReminder(null)}>
              {t("done")}
            </button>
          </div>
        </div>
      )}

      {showSOS && (
        <div className="modal-overlay pd-sos-overlay">
          <div className="pd-sos-modal animate-modal">
            {!sosTriggered ? (
              <>
                <div className="pd-sos-modal-icon">SOS</div>
                <h2>{t("emergencySOS")}</h2>
                <p>{t("caregiverAlerted")}</p>

                <div className="pd-sos-countdown-ring">
                  <svg viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#f0f0f0" strokeWidth="4"/>
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#e63946" strokeWidth="4"
                      strokeDasharray="283" strokeDashoffset={283 - (283 * (30 - sosCountdown) / 30)}
                      strokeLinecap="round" transform="rotate(-90 50 50)"
                      style={{ transition: "stroke-dashoffset 1s linear" }}
                    />
                  </svg>
                  <div className="pd-sos-countdown-number">
                    <span>{sosCountdown}</span>
                    <small>{t("seconds")}</small>
                  </div>
                </div>

                <p className="pd-sos-auto">{t("sosAuto")}</p>

                <div className="pd-sos-actions">
                  <button className="btn btn-success" onClick={() => setShowSOS(false)}>
                    {t("imSafe")}
                  </button>
                  <button className="btn btn-danger" onClick={handleTriggerSOS}>
                    {t("triggerNow")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="pd-sos-sent-icon">Sent</div>
                <h2>{t("alertSent")}</h2>
                <p>{t("helpOnWay")}</p>
                <button className="btn btn-primary" onClick={() => setShowSOS(false)} style={{ marginTop: "1.5rem" }}>
                  {t("close")}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
