import { Link } from "react-router-dom";
import "./Landing.css";

const steps = [
  {
    num: "01",
    icon: "👤",
    title: "Add Parent Profile",
    text: "Enter basic health info, blood type, current medications, and primary emergency contacts. Takes under 5 minutes and works in 6 Indian languages.",
  },
  {
    num: "02",
    icon: "💓",
    title: "Connect Vitals",
    text: "Link a smart band or use existing health devices. Vatsalya supports most popular wearables and auto-syncs vitals every 30 seconds.",
  },
  {
    num: "03",
    icon: "🔔",
    title: "Real-time Alerts",
    text: "Sit back. Our AI filters routine variations and only notifies you when something genuinely needs attention — no alert fatigue.",
  },
];

const testimonials = [
  ["Being in San Jose while my parents are in Pune used to keep me up at night. Vatsalya finally made care feel close again.", "Anirudh Shah", "Software Engineer, San Jose"],
  ["The Marathi interface was the game changer. My father actually enjoys checking his heart rate on the tablet now.", "Priya Kulkarni", "HR Manager, Mumbai"],
  ["The SOS feature literally saved my mother's life during a seizure. It alerted me and the hospital team instantly.", "Vikram Rao", "Entrepreneur, London"]
];

export default function Landing() {
  const token = localStorage.getItem("token");
  const userName = localStorage.getItem("userName") || "Caregiver";
  const isLoggedIn = Boolean(token);

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <Link to="/" className="landing-brand"><span>V</span><strong>Vatsalya</strong></Link>
        <div className="landing-links">
          <a href="#features">Features</a>
          <a href="#how">How It Works</a>
          <a href="#languages">Languages</a>
          <a href="#pricing">Pricing</a>
          <a href="#contact">Contact</a>
        </div>
        <div className="landing-auth">
          {isLoggedIn ? (
            <>
              <span className="logged-in-pill">Signed in as {userName}</span>
              <Link to="/dashboard">Dashboard</Link>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/login?mode=signup">Get Started</Link>
            </>
          )}
        </div>
      </nav>

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <span className="hero-kicker">Caregiver Technology Platform</span>
            <h1>Stay Close to the Ones Who Raised You — Even From Far Away</h1>
            <p>Vatsalya uses AI to monitor vitals, track medicine adherence, and provide real-time emergency alerts. Peace of mind for you, professional care for your parents.</p>
            <div className="hero-actions">
              <Link className="landing-primary" to={isLoggedIn ? "/dashboard" : "/login?mode=signup"}>
                {isLoggedIn ? "Continue to Dashboard" : "Get Started Free"}
              </Link>
              <a className="landing-secondary" href="#how">See How It Works</a>
            </div>
            {isLoggedIn && (
              <div className="session-return-note">
                Your session is active. Viewing this landing page will not log you out.
              </div>
            )}
            <div className="hero-stats">
              <span>24/7 Real-time Monitoring</span>
              <span>AI Alerts</span>
              <span>6 Indian Languages</span>
            </div>
          </div>
        </section>

        <section className="quiet-band" id="features">
          <h2 className="features-heading">Everything your parents need. All in one place.</h2>
          <p>Living far from aging parents means missing the small signs. Vatsalya watches continuously, so you never miss what matters.</p>
          <div className="feature-pill-grid">
            <FeaturePill icon="⏱" color="r" title="Delayed Response Detection" />
            <FeaturePill icon="💊" color="a" title="Medicine Adherence" />
            <FeaturePill icon="📈" color="b" title="Silent Vitals Monitoring" />
            <FeaturePill icon="🚨" color="g" title="SOS Emergency Alerts" />
            <FeaturePill icon="🏥" color="p" title="Hospital Coordination" />
            <FeaturePill icon="🌐" color="t" title="6 Indian Languages" />
          </div>
        </section>

        <section className="workflow-section" id="how">
          <div className="workflow-head">
            <h2 className="workflow-heading">Up and running in 3 simple steps</h2>
            <p>Everything you need to care for your parents, in one unified AI-powered platform.</p>
          </div>
          <div className="workflow-rows">
            {steps.map((step, i) => (
              <div className={`workflow-row${i % 2 === 1 ? " workflow-row-rev" : ""}`} key={step.num}>
                <div className="workflow-visual">
                  <span className="workflow-icon">{step.icon}</span>
                </div>
                <div className="workflow-text">
                  <span className="workflow-badge">Step {step.num}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="emergency-section">
          <div className="phone-card">
            <div className="phone-alert">
              <strong>Emergency Routing</strong>
              <small>Searching nearest</small>
            </div>
            <div className="hospital-line"><span>Apollo Hospital</span><small>2.4 km away / Emergency Ready</small></div>
            <div className="hospital-line muted"><span>Fortis Healthcare</span><small>4.1 km away</small></div>
            <div className="phone-video">Vatsalya</div>
          </div>
          <div className="emergency-copy">
            <span className="red-dot" />
            <p>When every second counts, Vatsalya's SOS system doesn't just alert you, it coordinates. We identify the nearest hospital, share parents' medical history with the ambulance, and open a direct line of communication with you.</p>
            <div className="mini-features">
              <span>Smart Lookup</span>
              <span>Medical Bio-Share</span>
            </div>
          </div>
        </section>

        <section className="language-section" id="languages">
          <p>Because technology shouldn't feel like a foreign language to those who need it most.</p>
          <div className="language-chips">
            {["English", "Hindi", "Kannada", "Tamil", "Telugu", "Malayalam"].map((language) => <span key={language}>{language}</span>)}
          </div>
        </section>

        <section className="testimonial-section">
          {testimonials.map(([quote, name, role]) => (
            <article key={name}>
              <p>"{quote}"</p>
              <strong>{name}</strong>
              <small>{role}</small>
            </article>
          ))}
        </section>

      </main>

      <footer className="landing-footer" id="contact">
        <div>
          <strong>Vatsalya</strong>
          <p>Compassionate AI for aging parents. Monitoring vitals, managing health, and keeping families connected across distances.</p>
        </div>
        <FooterColumn
          title="Product"
          items={[
            { label: "Features", href: "#features" },
            { label: "How It Works", href: "#how" },
            { label: "Pricing", to: isLoggedIn ? "/dashboard" : "/login?mode=signup" },
            { label: "Languages", href: "#languages" }
          ]}
        />
        <FooterColumn
          title="Company"
          items={[
            { label: "About Us", to: "/company/about" },
            { label: "Privacy Policy", to: "/company/privacy-policy" },
            { label: "Terms of Service", to: "/company/terms-of-service" },
            { label: "Contact", to: "/company/contact" }
          ]}
        />
        <FooterColumn
          title="Support"
          items={[
            { label: "Help Center",      to: "/support/help-center" },
            { label: "Emergency Guide",  to: "/support/emergency-guide" },
            { label: "Accessibility",    to: "/support/accessibility" },
            { label: "Community",        to: "/support/community" },
          ]}
        />
      </footer>
    </div>
  );
}

function FeaturePill({ icon, color, title }) {
  return (
    <div className="feature-pill">
      <div className={`feature-pill-icon fp-${color}`}>{icon}</div>
      <strong>{title}</strong>
    </div>
  );
}

function FooterColumn({ title, items }) {
  return (
    <div>
      <strong>{title}</strong>
      {items.map((item) => {
        const link = typeof item === "string" ? { label: item, href: "#contact" } : item;
        return link.to ? (
          <Link to={link.to} key={link.label}>{link.label}</Link>
        ) : (
          <a href={link.href} key={link.label}>{link.label}</a>
        );
      })}
    </div>
  );
}
