import { Link, Navigate, useParams } from "react-router-dom";
import "./SupportPage.css";

/* ─── Shared Nav ─────────────────────────────────────────── */
function SupportNav() {
  return (
    <nav className="sp-nav">
      <Link to="/" className="sp-brand">
        <span>V</span>
        <strong>Vatsalya</strong>
      </Link>
      <Link to="/" className="sp-back">← Back to Home</Link>
    </nav>
  );
}

/* ─── HC1: Help Center ───────────────────────────────────── */
const helpTopics = [
  { icon: "🚀", title: "Getting Started",      desc: "Set up your first parent profile and connect your account in under 5 minutes." },
  { icon: "💓", title: "Vitals & Devices",     desc: "How to connect wearables, sync vitals, and understand health readings." },
  { icon: "🚨", title: "SOS & Alerts",         desc: "Configure emergency contacts, alert thresholds, and SOS workflows." },
  { icon: "💊", title: "Medicine Reminders",   desc: "Set up daily medicine schedules and track adherence from the dashboard." },
  { icon: "🌐", title: "Languages",            desc: "Switch the parent device to any of 6 supported Indian languages." },
  { icon: "🔐", title: "Account & Security",   desc: "Manage your password, two-factor auth, and caregiver access settings." },
];

function HelpCenter() {
  return (
    <div className="sp-page">
      <SupportNav />
      <div className="hc-hero">
        <span className="hc-pill">Help Center</span>
        <h1>How can we help you?</h1>
        <p>Search our guides or browse topics below to get answers fast.</p>
        <div className="hc-search">
          <input type="text" placeholder="Search articles — e.g. 'how to add a parent'…" />
          <button>Search</button>
        </div>
      </div>
      <div className="hc-topics">
        {helpTopics.map((t) => (
          <div className="hc-topic" key={t.title}>
            <div className="hc-topic-icon">{t.icon}</div>
            <div>
              <h3>{t.title}</h3>
              <p>{t.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── EG1: Emergency Guide ───────────────────────────────── */
const emergencySteps = [
  { num: "1", title: "Press SOS on Device",    desc: "The parent or caregiver presses the SOS button on the Vatsalya app or linked wearable device." },
  { num: "2", title: "Stay on the Line",       desc: "A Vatsalya coordinator will connect within 30 seconds. Keep the parent calm and confirm their location." },
  { num: "3", title: "Await Confirmation",     desc: "Hospital and ambulance details will appear in your app. Emergency contacts are notified automatically." },
];

function EmergencyGuide() {
  return (
    <div className="sp-page">
      <SupportNav />
      <div className="eg-hero">
        <span className="eg-pill">🚨 Emergency Guide</span>
        <h1>What to do in an emergency</h1>
        <p>Follow these steps immediately. Vatsalya coordinates with emergency services on your behalf — stay calm and stay connected.</p>
      </div>
      <div className="eg-sos-banner">
        <span className="eg-sos-dot" />
        <div>
          <strong>SOS button on parent's device triggers automatic alert</strong>
          <small>Nearest hospital is notified + family contacts are called within 30 seconds</small>
        </div>
      </div>
      <div className="eg-steps">
        {emergencySteps.map((s) => (
          <div className="eg-step" key={s.num}>
            <div className="eg-step-num">{s.num}</div>
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── AC1: Accessibility ─────────────────────────────────── */
const accessFeatures = [
  { icon: "🔤", color: "b", title: "Large Text & High Contrast",  desc: "All parent-facing screens use oversized text and high-contrast colour schemes for easy reading." },
  { icon: "🌐", color: "g", title: "6 Indian Languages",          desc: "Full support for English, Hindi, Kannada, Tamil, Telugu, and Malayalam — in the parent's native tongue." },
  { icon: "🎙", color: "p", title: "Voice-Guided Flows",          desc: "Critical actions like SOS and medicine confirmation can be triggered with voice — no typing required." },
  { icon: "♿", color: "a", title: "Screen Reader Support",        desc: "All UI elements include ARIA labels. Compatible with TalkBack (Android) and VoiceOver (iOS)." },
];

function Accessibility() {
  return (
    <div className="sp-page">
      <SupportNav />
      <div className="ac-hero">
        <span className="ac-pill">Accessibility</span>
        <h1>Built for everyone — especially your parents</h1>
        <p>Vatsalya is designed so elderly parents can use it confidently, regardless of tech literacy, language, or visual ability.</p>
      </div>
      <div className="ac-features">
        {accessFeatures.map((f) => (
          <div className="ac-feat" key={f.title}>
            <div className={`ac-feat-icon ac-${f.color}`}>{f.icon}</div>
            <div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── CM1: Community ─────────────────────────────────────── */
const communityChannels = [
  { icon: "💬", title: "Caregiver Forum",   desc: "Ask questions, share experiences, and get advice from a community of 12,000+ caregivers.", cta: "Join Forum →" },
  { icon: "📱", title: "WhatsApp Group",    desc: "Join our regional WhatsApp caregiver groups for local support, tips, and emergency advice.", cta: "Join Group →" },
  { icon: "🎥", title: "Monthly Webinars",  desc: "Free live sessions with doctors, geriatric specialists, and Vatsalya product experts every month.", cta: "Register →" },
];

function Community() {
  return (
    <div className="sp-page">
      <SupportNav />
      <div className="cm-hero">
        <span className="cm-pill">Community</span>
        <h1>You're not alone in this.</h1>
        <p>Connect with thousands of caregivers across India who use Vatsalya to look after their parents.</p>
      </div>
      <div className="cm-cards">
        {communityChannels.map((c) => (
          <div className="cm-card" key={c.title}>
            <div className="cm-card-icon">{c.icon}</div>
            <h3>{c.title}</h3>
            <p>{c.desc}</p>
            <span className="cm-btn">{c.cta}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Router ─────────────────────────────────────────────── */
export default function SupportPage() {
  const { page } = useParams();

  if (page === "help-center")      return <HelpCenter />;
  if (page === "emergency-guide")  return <EmergencyGuide />;
  if (page === "accessibility")    return <Accessibility />;
  if (page === "community")        return <Community />;

  return <Navigate to="/" replace />;
}
