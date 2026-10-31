import { Link } from "react-router-dom";
import vatsalyaLogo from "../assets/vatsalya-logo.jpeg";
import landingHeroCare from "../assets/landing-hero-care.jpeg";
import "./Landing.css";

const features = [
  {
    title: "AI Fall Detection",
    text: "Fall SOS alerts and location sharing keep families informed during emergencies.",
    icon: "SOS"
  },
  {
    title: "Zero-Literacy Voice",
    text: "Parents can speak in their language and send clear English alerts to children.",
    icon: "Mic"
  },
  {
    title: "Caregiver Dashboard",
    text: "Monitor vitals, medicines, reminders, voice messages, and emergency alerts.",
    icon: "Live"
  },
  {
    title: "Doorstep Healthcare",
    text: "Keep prescriptions, hospitals, medicines, and care actions in one place.",
    icon: "Care"
  }
];

export default function Landing() {
  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <Link to="/" className="landing-brand" aria-label="Vatsalya home">
          <img className="landing-logo" src={vatsalyaLogo} alt="Vatsalya logo" />
          <span>Vatsalya</span>
        </Link>
        <div className="landing-nav-links">
          <a href="#features">Features</a>
          <Link to="/login">Login</Link>
          <Link className="landing-nav-cta" to="/login?mode=signup">Get Started</Link>
        </div>
      </nav>

      <main>
        <section className="landing-hero">
          <div className="hero-copy">
            <h1>Peace of mind for you. 24/7 emergency care for your parents back home.</h1>
            <p>
              Vatsalya connects elderly parents, children, health records, SOS alerts,
              medicines, voice assistance, and nearby emergency support in one calm dashboard.
            </p>
            <div className="hero-actions">
              <Link className="landing-primary-btn" to="/login?mode=signup">Get Vatsalya Today</Link>
              <a className="landing-secondary-btn" href="#features">Watch How It Works</a>
            </div>
          </div>

          <div className="hero-visual hero-real-visual" aria-label="Vatsalya emergency care preview">
            <img className="hero-reference-image" src={landingHeroCare} alt="Elder parent using Vatsalya SOS with caregiver dashboard preview" />
          </div>
        </section>

        <section className="landing-features" id="features">
          <span className="section-symbol">•••</span>
          <h2>Integrated Care for a Flourishing Life</h2>
          <div className="feature-honeycomb">
            {features.map((feature) => (
              <article className="feature-tile" key={feature.title}>
                <span className="feature-icon">{feature.icon}</span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="voice-path">
          <div>
            <span className="voice-label">Voice controlled SOS path</span>
            <h3>Parent speaks. Vatsalya translates. Child receives and acts.</h3>
          </div>
          <div className="voice-steps">
            <span>Voice</span>
            <span>Translate</span>
            <span>Notify</span>
            <span>Dispatch</span>
          </div>
        </section>

        <section className="landing-cta">
          <h2>Don't wait for an emergency. Discover peace of mind.</h2>
          <p>Join working professionals who trust Vatsalya to keep their parents safe.</p>
          <div className="hero-actions">
            <Link className="landing-primary-btn" to="/login?mode=signup">Create Free Account</Link>
            <Link className="landing-secondary-btn light" to="/login">Login</Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-brand">
          <img className="landing-logo" src={vatsalyaLogo} alt="Vatsalya logo" />
          <span>Vatsalya</span>
        </div>
        <span>Built with love for parents and children.</span>
      </footer>
    </div>
  );
}
