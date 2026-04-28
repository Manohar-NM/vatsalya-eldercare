import { useState } from "react";
import API from "../services/api";
import vatsalyaLogo from "../assets/vatsalya-logo.jpeg";
import "./Login.css";

export default function Login() {
  const [isLogin, setIsLogin] = useState(() => new URLSearchParams(window.location.search).get("mode") !== "signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        const res = await API.post("/users/login", { email, password });
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("childId", res.data._id);
        localStorage.setItem("userName", res.data.name || "Caregiver");
        localStorage.setItem("userEmail", res.data.email);
        window.location.href = "/dashboard";
      } else {
        await API.post("/users/register", { name, age: Number(age), email, password });
        setIsLogin(true);
        setError("");
        alert("Registration successful! Please login.");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" id="login-page">
      {/* Decorative Background */}
      <div className="login-bg">
        <div className="bg-circle bg-circle-1"></div>
        <div className="bg-circle bg-circle-2"></div>
        <div className="bg-circle bg-circle-3"></div>
      </div>

      <div className="login-container">
        {/* Left - Branding */}
        <div className="login-branding">
          <div className="branding-content">
            <div className="brand-logo">
              <img src={vatsalyaLogo} alt="Vatsalya logo" />
            </div>
            <h1 className="brand-title">Vatsalya</h1>
            <p className="brand-tagline">Elderly care, reimagined with love & technology</p>
            
            <div className="brand-features">
              <div className="feature-item">
                <span className="feature-icon">🏥</span>
                <span>Real-time Health Monitoring</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🚨</span>
                <span>Instant SOS Alerts</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">💊</span>
                <span>Medicine Management</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">👨‍⚕️</span>
                <span>Care Team Coordination</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Form */}
        <div className="login-form-section">
          <div className="login-form-wrapper">
            <div className="form-header">
              <h2>{isLogin ? "Welcome Back" : "Create Account"}</h2>
              <p>{isLogin ? "Sign in to your caregiver portal" : "Register as a new caregiver"}</p>
            </div>

            {error && (
              <div className="form-error" id="login-error">
                <span>⚠️</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              {!isLogin && (
                <>
                  <div className="form-group">
                    <label htmlFor="name">Full Name</label>
                    <div className="input-wrapper">
                      <span className="input-icon">👤</span>
                      <input
                        id="name"
                        type="text"
                        placeholder="Enter your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="age">Age</label>
                    <div className="input-wrapper">
                      <span className="input-icon">🎂</span>
                      <input
                        id="age"
                        type="number"
                        placeholder="Enter your age"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <div className="input-wrapper">
                  <span className="input-icon">✉️</span>
                  <input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔒</span>
                  <input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary login-btn" id="login-submit-btn" disabled={loading}>
                {loading ? (
                  <span className="btn-loader"></span>
                ) : (
                  isLogin ? "Sign In" : "Create Account"
                )}
              </button>
            </form>

            <div className="form-toggle">
              <span>{isLogin ? "Don't have an account?" : "Already have an account?"}</span>
              <button onClick={() => { setIsLogin(!isLogin); setError(""); }} id="toggle-auth-btn">
                {isLogin ? "Register" : "Sign In"}
              </button>
            </div>

            {/* Extras: Demo & Parent Portal */}
            <div className="login-extras">
              {isLogin && (
                <button
                  className="demo-fill-btn"
                  id="demo-fill-btn"
                  onClick={() => {
                    setEmail("demo@vatsalya.com");
                    setPassword("demo123");
                  }}
                >
                  Auto-fill Demo Login
                </button>
              )}
              
              <div className="parent-login-divider">
                <span>OR</span>
              </div>

              <button 
                className="btn btn-outline parent-portal-btn"
                onClick={() => window.location.href = "/parent"}
              >
                📱 Parent Device Login (Unique ID)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
