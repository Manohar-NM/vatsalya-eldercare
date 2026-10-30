import { Link, Navigate, useParams } from "react-router-dom";
import "./CompanyPage.css";

/* ─── About Us data ─────────────────────────────────────── */
const aboutData = {
  eyebrow: "Company",
  title: "About Vatsalya",
  intro:
    "Vatsalya is built for families who care across distance. We combine health monitoring, emergency response workflows, and simple communication tools so working professionals can support aging parents with more confidence.",
  cards: [
    {
      title: "Our Purpose",
      body:
        "We want elder care to feel less reactive and more connected. Vatsalya helps families notice early warning signs, coordinate during emergencies, and keep everyday health routines visible without making parents feel watched.",
    },
    {
      title: "What We Build",
      body:
        "The platform brings together vitals tracking, SOS alerts, medicine reminders, caregiver dashboards, and parent-friendly voice flows in Indian languages. Every feature is designed around speed, clarity, and dignity.",
    },
    {
      title: "Who We Serve",
      body:
        "Vatsalya is for adult children, caregivers, and families who need a dependable way to stay involved in a parent's care while living in another city, country, or demanding work schedule.",
    },
  ],
  values: [
    { icon: "💙", label: "Compassionate Care" },
    { icon: "⚡", label: "Speed in Crisis" },
    { icon: "🤝", label: "Family First" },
  ],
};

/* ─── Privacy Policy data ───────────────────────────────── */
const privacyData = {
  eyebrow: "Trust & Privacy",
  title: "Privacy Policy",
  intro:
    "Vatsalya handles sensitive family and health information. Here is exactly what we collect, why we use it, and the controls your family has.",
  badges: ["🔒 Data Encrypted", "🚫 Never Sold", "✅ GDPR Aligned"],
  items: [
    {
      icon: "📋",
      color: "b",
      title: "Information We Collect",
      body:
        "We may collect caregiver account details, parent profile information, emergency contacts, device readings, medicine schedules, and interaction logs needed to provide monitoring and alert services.",
    },
    {
      icon: "🔎",
      color: "g",
      title: "How We Use Data",
      body:
        "Data is used to show health trends, trigger alerts, route SOS events, personalize language settings, improve reliability, and support customer requests. We do not sell family health data.",
    },
    {
      icon: "🔐",
      color: "p",
      title: "Security & Access",
      body:
        "Access is limited to authorized caregivers and approved care partners. Sensitive records are protected using encryption, audit logs, secure sessions, and role-based permissions.",
    },
  ],
};

/* ─── Generic pages (Terms, Contact) ───────────────────── */
const genericPages = {
  "terms-of-service": {
    eyebrow: "Legal",
    title: "Terms of Service",
    intro:
      "These draft terms describe the expected use of Vatsalya. They are written as product copy for review and should be checked by legal counsel before launch.",
    sections: [
      { title: "Use Of The Platform", body: "Users agree to provide accurate family, health, and emergency contact information and to use Vatsalya only for lawful caregiving, monitoring, and communication purposes." },
      { title: "Emergency Limitations", body: "Vatsalya supports emergency coordination, but it is not a replacement for local emergency services, doctors, hospitals, or direct medical judgment during urgent situations." },
      { title: "Account Responsibility", body: "Caregivers are responsible for maintaining account security, reviewing alerts promptly, keeping contact details updated, and confirming that connected devices are functioning correctly." },
    ],
  },
  contact: {
    eyebrow: "Support",
    title: "Contact Vatsalya",
    intro:
      "Reach the Vatsalya team for product questions, caregiver onboarding, hospital partnerships, or help setting up a parent profile.",
    sections: [
      { title: "Customer Support", body: "Email support@vatsalya.care for account help, setup guidance, device questions, or assistance understanding alerts in the caregiver dashboard." },
      { title: "Partnerships", body: "Hospitals, clinics, pharmacies, and elder-care providers can contact partnerships@vatsalya.care to explore integrations and care coordination workflows." },
      { title: "Office", body: "Vatsalya Care Technologies, Bengaluru, India. Standard response time is one business day for non-emergency requests." },
    ],
  },
};

/* ─── Shared nav ────────────────────────────────────────── */
function CompanyNav() {
  return (
    <nav className="company-nav">
      <Link to="/" className="company-brand">
        <span>V</span>
        <strong>Vatsalya</strong>
      </Link>
      <Link to="/" className="company-home">← Back to Home</Link>
    </nav>
  );
}

/* ─── About Us layout (A1) ──────────────────────────────── */
function AboutPage() {
  const d = aboutData;
  return (
    <div className="company-page">
      <CompanyNav />
      <div className="about-hero">
        <span className="about-eyebrow">{d.eyebrow}</span>
        <h1>{d.title}</h1>
        <p>{d.intro}</p>
      </div>
      <div className="about-cards">
        {d.cards.map((c) => (
          <div className="about-card" key={c.title}>
            <h3>{c.title}</h3>
            <p>{c.body}</p>
          </div>
        ))}
      </div>
      <div className="about-values">
        {d.values.map((v) => (
          <div className="about-value" key={v.label}>
            <span className="about-value-icon">{v.icon}</span>
            <strong>{v.label}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Privacy Policy layout (P1) ───────────────────────── */
function PrivacyPage() {
  const d = privacyData;
  return (
    <div className="company-page">
      <CompanyNav />
      <div className="privacy-hero">
        <span className="privacy-eyebrow">{d.eyebrow}</span>
        <h1>{d.title}</h1>
        <p>{d.intro}</p>
        <div className="privacy-badges">
          {d.badges.map((b) => (
            <span className="privacy-badge" key={b}>{b}</span>
          ))}
        </div>
      </div>
      <div className="privacy-items">
        {d.items.map((item) => (
          <div className="privacy-item" key={item.title}>
            <div className={`privacy-item-icon pic-${item.color}`}>{item.icon}</div>
            <div className="privacy-item-body">
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Generic layout (Terms, Contact) ──────────────────── */
function GenericPage({ content }) {
  return (
    <div className="company-page">
      <CompanyNav />
      <main className="company-main">
        <section className="company-hero">
          <span>{content.eyebrow}</span>
          <h1>{content.title}</h1>
          <p>{content.intro}</p>
        </section>
        <section className="company-content">
          {content.sections.map((section) => (
            <article key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}

/* ─── Router ────────────────────────────────────────────── */
export default function CompanyPage() {
  const { page } = useParams();

  if (page === "about")          return <AboutPage />;
  if (page === "privacy-policy") return <PrivacyPage />;

  const generic = genericPages[page];
  if (!generic) return <Navigate to="/" replace />;
  return <GenericPage content={generic} />;
}
