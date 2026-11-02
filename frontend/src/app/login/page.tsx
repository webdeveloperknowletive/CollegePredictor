"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import Link from "next/link";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type LoginResponse = {
  status?: string;
  message?: string;
  detail?: unknown;
  access_token?: string;
  token_type?: string;
  student?: {
    id: number;
    full_name: string;
    email: string;
    mobile: string;
  };
};

/* ---------- Small inline icons (no extra dependencies) ---------- */

const Icon = {
  mail: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7.5 8 6 8-6" />
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </svg>
  ),
  eye: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  eyeOff: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.2" />
      <path d="M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7c1.7 0 3.2-.5 4.5-1.2" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  ),
  trend: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </svg>
  ),
  target: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" />
    </svg>
  ),
  bookmark: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.5L5 21V4.5a1 1 0 0 1 1-1Z" />
    </svg>
  ),
  cap: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m2 9 10-5 10 5-10 5L2 9Z" />
      <path d="M6 11.5V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5" />
      <path d="M22 9v6" />
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 7.5v5.5" />
      <circle cx="12" cy="16.5" r=".6" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" />
      <path d="m8 12.3 2.8 2.8L16 9.5" />
    </svg>
  ),
  tick: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6L12 3Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </svg>
  ),
};

const FEATURES = [
  {
    icon: Icon.trend,
    title: "Historical Cutoff Data",
    description: "Explore college cutoff trends across CAP rounds.",
  },
  {
    icon: Icon.target,
    title: "Smart College Predictions",
    description: "Find the best options for your percentile and category.",
  },
  {
    icon: Icon.bookmark,
    title: "Saved Predictions",
    description: "Keep track of your prediction history in one place.",
  },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Sets the CSS variable that staggers each entrance animation. */
function delay(ms: number): CSSProperties {
  return { ["--d" as string]: `${ms}ms` } as CSSProperties;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const busy = loading || redirecting;

  function clearFeedback() {
    setError("");
    setMessage("");
  }

  function validate() {
    const errors: { email?: string; password?: string } = {};
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      errors.email = "Email address is required.";
    } else if (!EMAIL_PATTERN.test(normalizedEmail)) {
      errors.email = "Enter a valid email address.";
    }

    if (!password) {
      errors.password = "Password is required.";
    }

    setFieldErrors(errors);
    return { valid: Object.keys(errors).length === 0, normalizedEmail };
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();

    const { valid, normalizedEmail } = validate();
    if (!valid) return;

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      const data: LoginResponse = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Keep auth failures generic; FastAPI `detail` may be an object/array.
        if ([400, 401, 403, 422].includes(response.status)) {
          setError("Incorrect email or password.");
        } else {
          setError("Unable to log in right now. Please try again.");
        }
        return;
      }

      if (!data.access_token || !data.student) {
        setError(
          "The server did not return an authentication token. Please contact support."
        );
        return;
      }

      sessionStorage.setItem("collegePredictorToken", data.access_token);
      sessionStorage.setItem(
        "collegePredictorStudent",
        JSON.stringify({
          id: data.student.id,
          full_name: data.student.full_name,
          email: data.student.email,
          mobile: data.student.mobile,
        })
      );

      setMessage("Login successful! Redirecting...");
      setRedirecting(true);
      // A short pause lets the success animation play before the page changes.
      window.setTimeout(() => window.location.assign("/predict"), 700);
    } catch {
      setError(
        "Cannot connect to the server. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{css}</style>

      <main className={`lp-page ${redirecting ? "is-leaving" : ""}`}>
        {/* ---------- Animated background ---------- */}
        <div className="lp-overlay" aria-hidden="true" />
        <div className="lp-grid" aria-hidden="true" />
        <div className="lp-orb lp-orb-1" aria-hidden="true" />
        <div className="lp-orb lp-orb-2" aria-hidden="true" />
        <div className="lp-orb lp-orb-3" aria-hidden="true" />

        {/* ---------- Top brand bar ---------- */}
        <header className="lp-header lp-rise" style={delay(0)}>
          <div className="lp-brand">
            <span className="lp-brand-mark">{Icon.cap}</span>
            <span className="lp-brand-text">
              <span className="lp-brand-name">College Predictor</span>
              <span className="lp-brand-sub">MHT-CET · Maharashtra</span>
            </span>
          </div>
        </header>

        <div className="lp-content">
          {/* ---------- Left: hero ---------- */}
          <section className="lp-hero" aria-label="About College Predictor">
            <span className="lp-pill lp-rise" style={delay(80)}>
              <span className="lp-pill-dot" /> Engineering admissions 2026
            </span>

            <h1 className="lp-title lp-rise" style={delay(160)}>
              Smart Prediction.
              <br />
              Better Choices.
              <br />
              <span className="lp-title-accent">Bright Future.</span>
            </h1>

            <div className="lp-rule lp-rise" style={delay(240)} />

            <p className="lp-lead lp-rise" style={delay(300)}>
              Explore engineering college options using historical MHT-CET
              cutoff data. Compare branches, categories, cities, and CAP
              rounds to make informed decisions about your future.
            </p>

            <ul className="lp-features">
              {FEATURES.map((item, index) => (
                <li
                  key={item.title}
                  className="lp-feature lp-rise"
                  style={delay(400 + index * 120)}
                >
                  <span className="lp-feature-icon" style={delay(index * 500)}>
                    {item.icon}
                  </span>
                  <span>
                    <span className="lp-feature-title">{item.title}</span>
                    <span className="lp-feature-desc">{item.description}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* ---------- Right: login card ---------- */}
          <section
            className="lp-card lp-rise"
            style={delay(200)}
            aria-labelledby="login-heading"
          >
            <div className="lp-card-bar" aria-hidden="true" />

            <div className="lp-card-head">
              <span className="lp-card-icon">{Icon.shield}</span>
              <div>
                <h2 id="login-heading" className="lp-card-title">
                  Welcome back!
                </h2>
                <p className="lp-card-sub">
                  Log in to continue to your account
                </p>
              </div>
            </div>

            <form onSubmit={handleLogin} noValidate>
              {/* Email */}
              <div className="lp-field">
                <label htmlFor="email" className="lp-label">
                  Email
                </label>
                <div
                  className={`lp-input-wrap ${
                    fieldErrors.email ? "has-error" : ""
                  }`}
                >
                  <span className="lp-input-icon">{Icon.mail}</span>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="Enter your registered email"
                    value={email}
                    disabled={busy}
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={
                      fieldErrors.email ? "email-error" : undefined
                    }
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearFeedback();
                      if (fieldErrors.email)
                        setFieldErrors((f) => ({ ...f, email: undefined }));
                    }}
                    className="lp-input"
                  />
                </div>
                {fieldErrors.email && (
                  <p id="email-error" className="lp-field-error">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="lp-field">
                <label htmlFor="password" className="lp-label">
                  Password
                </label>
                <div
                  className={`lp-input-wrap ${
                    fieldErrors.password ? "has-error" : ""
                  }`}
                >
                  <span className="lp-input-icon">{Icon.lock}</span>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    disabled={busy}
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={
                      fieldErrors.password ? "password-error" : undefined
                    }
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearFeedback();
                      if (fieldErrors.password)
                        setFieldErrors((f) => ({ ...f, password: undefined }));
                    }}
                    onKeyUp={(e) =>
                      setCapsLockOn(e.getModifierState("CapsLock"))
                    }
                    onKeyDown={(e) =>
                      setCapsLockOn(e.getModifierState("CapsLock"))
                    }
                    onBlur={() => setCapsLockOn(false)}
                    className="lp-input lp-input-password"
                  />
                  <button
                    type="button"
                    className="lp-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                  >
                    {showPassword ? Icon.eyeOff : Icon.eye}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p id="password-error" className="lp-field-error">
                    {fieldErrors.password}
                  </p>
                )}
                {capsLockOn && <p className="lp-caps">Caps Lock is on</p>}
              </div>

              {/* Feedback (the key replays the shake each time the error changes) */}
              <div aria-live="polite">
                {error && (
                  <div
                    key={error}
                    role="alert"
                    className="lp-alert lp-alert-error lp-shake"
                  >
                    {Icon.alert}
                    <span>{error}</span>
                  </div>
                )}
                {message && (
                  <div role="status" className="lp-alert lp-alert-success lp-pop">
                    {Icon.check}
                    <span>{message}</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={busy}
                className={`lp-submit ${redirecting ? "is-success" : ""}`}
              >
                {redirecting ? (
                  <>
                    <span className="lp-tick lp-pop">{Icon.tick}</span>
                    Success
                  </>
                ) : loading ? (
                  <>
                    <span className="lp-spinner" aria-hidden="true" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Log In
                    {Icon.arrow}
                  </>
                )}
              </button>
            </form>

            <p className="lp-signup">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="lp-link lp-link-strong">
                Sign up
              </Link>
            </p>

            <div className="lp-divider">
              <span>or</span>
            </div>

            <Link href="/admin/login" className="lp-admin">
              Admin login
            </Link>
          </section>
        </div>

        <footer className="lp-footer lp-rise" style={delay(700)}>
          © College Predictor · Predictions are based on historical data and
          are not a guarantee of admission.
        </footer>
      </main>
    </>
  );
}

/* ====================================================================== */

const css = `
@property --lp-angle { syntax: "<angle>"; initial-value: 0deg; inherits: false; }

.lp-page {
  --navy: #15213d;
  --navy-2: #293756;
  --blue: #3a5bff;
  --blue-soft: #e8ecff;
  --gold: #b77a26;
  --text: #172746;
  --muted: #5d6c85;
  --line: #dde3ee;
  --danger: #c62828;
  --ok: #18713a;

  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 24px clamp(18px, 5vw, 64px) 20px;
  box-sizing: border-box;
  color: var(--text);
  background-color: #edf3f9;
  background-image: url('/images/college-bg.jpg');
  background-size: cover;
  background-position: center;
  font-family: Inter, "Segoe UI", system-ui, -apple-system, Arial, sans-serif;
  overflow: hidden;
  isolation: isolate;
  transition: opacity .6s ease, transform .6s ease;
}
.lp-page.is-leaving { opacity: 0; transform: scale(1.015); }
.lp-page *, .lp-page *::before, .lp-page *::after { box-sizing: border-box; }
.lp-page svg {
  width: 1em; height: 1em; fill: none; stroke: currentColor;
  stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round;
  flex-shrink: 0;
}

/* ---------- Animated background ---------- */
.lp-overlay {
  position: absolute; inset: 0; z-index: -3;
  background:
    radial-gradient(900px 500px at 12% 18%, rgba(58,91,255,.08), transparent 60%),
    linear-gradient(95deg, rgba(255,253,249,.97) 0%, rgba(255,253,249,.88) 45%, rgba(231,241,250,.62) 100%);
}
.lp-grid {
  position: absolute; inset: 0; z-index: -2; opacity: .35; pointer-events: none;
  background-image: radial-gradient(#94a3b8 1px, transparent 1px);
  background-size: 26px 26px;
  -webkit-mask-image: linear-gradient(to bottom, #000, transparent 85%);
  mask-image: linear-gradient(to bottom, #000, transparent 85%);
}
.lp-orb { position: absolute; z-index: -1; border-radius: 50%; filter: blur(70px); pointer-events: none; }
.lp-orb-1 { width: 420px; height: 420px; top: -120px; right: -80px; background: rgba(99,102,241,.28); animation: lp-float 14s ease-in-out infinite; }
.lp-orb-2 { width: 360px; height: 360px; bottom: -100px; left: -100px; background: rgba(56,189,248,.26); animation: lp-float 17s ease-in-out infinite reverse; }
.lp-orb-3 { width: 240px; height: 240px; top: 40%; left: 42%; background: rgba(167,139,250,.18); animation: lp-float 20s ease-in-out infinite; }
@keyframes lp-float {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(24px, -34px, 0) scale(1.08); }
}

/* ---------- Entrance animation (staggered with --d) ---------- */
.lp-rise { animation: lp-rise .75s cubic-bezier(.2,.7,.2,1) both; animation-delay: var(--d, 0ms); }
@keyframes lp-rise { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: none; } }
.lp-pop { animation: lp-pop .45s cubic-bezier(.2,.9,.3,1.3) both; }
@keyframes lp-pop { from { opacity: 0; transform: scale(.7); } to { opacity: 1; transform: none; } }
.lp-shake { animation: lp-shake .45s ease both; }
@keyframes lp-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-7px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(3px); }
}

/* ---------- Header ---------- */
.lp-header { display: flex; justify-content: center; margin-bottom: clamp(20px, 4vh, 44px); }
.lp-brand { display: flex; align-items: center; gap: 12px; }
.lp-brand-mark {
  width: 44px; height: 44px; border-radius: 12px;
  display: grid; place-items: center; font-size: 24px;
  color: #fff; background: linear-gradient(135deg, var(--navy), var(--blue));
  box-shadow: 0 8px 20px rgba(41, 55, 86, .25);
  transition: transform .4s cubic-bezier(.2,.9,.3,1.3);
}
.lp-brand:hover .lp-brand-mark { transform: rotate(-8deg) scale(1.08); }
.lp-brand-text { display: flex; flex-direction: column; line-height: 1.15; }
.lp-brand-name {
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(22px, 3vw, 28px); font-weight: 700; letter-spacing: -.5px;
}
.lp-brand-sub {
  margin-top: 4px; font-size: 10px; font-weight: 700;
  letter-spacing: 2.6px; text-transform: uppercase; color: var(--gold);
}

/* ---------- Layout ---------- */
.lp-content {
  width: 100%; max-width: 1080px; margin: auto;
  display: grid; align-items: center;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 420px);
  gap: clamp(32px, 6vw, 80px);
  padding: 8px 0 24px;
}

/* ---------- Hero ---------- */
.lp-pill {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 12px; border-radius: 999px;
  font-size: 11px; font-weight: 600; letter-spacing: .3px;
  color: var(--navy-2); background: rgba(255,255,255,.75);
  border: 1px solid var(--line); backdrop-filter: blur(6px);
}
.lp-pill-dot {
  position: relative; width: 7px; height: 7px; border-radius: 50%; background: #2fb36b;
}
.lp-pill-dot::after {
  content: ""; position: absolute; inset: 0; border-radius: 50%; background: #2fb36b;
  animation: lp-ping 1.8s cubic-bezier(0,0,.2,1) infinite;
}
@keyframes lp-ping { 75%, 100% { transform: scale(3); opacity: 0; } }

.lp-title {
  margin: 18px 0 18px;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(32px, 4.2vw, 46px); font-weight: 500; line-height: 1.2;
  letter-spacing: -.5px;
}
.lp-title-accent {
  background: linear-gradient(90deg, #3a5bff, #8b5cf6, #3a5bff);
  background-size: 200% auto;
  -webkit-background-clip: text; background-clip: text; color: transparent;
  animation: lp-shine 6s linear infinite;
}
@keyframes lp-shine { to { background-position: 200% center; } }

.lp-rule { width: 36px; height: 3px; border-radius: 2px; background: var(--gold); margin-bottom: 16px; transform-origin: left; }
.lp-lead { margin: 0; max-width: 440px; font-size: 14px; line-height: 1.8; color: var(--muted); }

.lp-features { list-style: none; padding: 0; margin: 28px 0 0; display: grid; gap: 12px; max-width: 440px; }
.lp-feature {
  display: flex; align-items: center; gap: 14px; padding: 12px 14px;
  border-radius: 12px; background: rgba(255,255,255,.7);
  border: 1px solid rgba(221,227,238,.9); backdrop-filter: blur(6px);
  transition: transform .25s ease, box-shadow .25s ease, background .25s ease, border-color .25s ease;
}
.lp-feature:hover { transform: translateX(6px); background: #fff; border-color: #c9d4ff; box-shadow: 0 10px 26px rgba(27,42,70,.08); }
.lp-feature-icon {
  width: 38px; height: 38px; border-radius: 10px; display: grid; place-items: center;
  font-size: 19px; color: var(--blue); background: var(--blue-soft);
  animation: lp-bob 4.5s ease-in-out infinite; animation-delay: var(--d, 0ms);
  transition: background .25s ease, color .25s ease;
}
.lp-feature:hover .lp-feature-icon { background: var(--blue); color: #fff; }
@keyframes lp-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
.lp-feature-title { display: block; font-size: 13px; font-weight: 700; }
.lp-feature-desc { display: block; margin-top: 3px; font-size: 12px; color: var(--muted); }

/* ---------- Card with moving border ---------- */
.lp-card {
  position: relative;
  width: 100%; justify-self: end;
  padding: 32px 30px 26px; border-radius: 18px; background: rgba(255,255,255,.96);
  box-shadow: 0 24px 60px rgba(27,42,70,.16), 0 2px 6px rgba(27,42,70,.06);
  backdrop-filter: blur(10px);
}
.lp-card::before {
  content: ""; position: absolute; inset: 0; border-radius: inherit; padding: 2px; pointer-events: none;
  background: conic-gradient(from var(--lp-angle), transparent 0%, transparent 58%, #60a5fa 72%, #6366f1 84%, #a78bfa 94%, transparent 100%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
  animation: lp-spin-angle 4.5s linear infinite;
}
@keyframes lp-spin-angle { to { --lp-angle: 360deg; } }
.lp-card-bar {
  position: absolute; left: 0; right: 0; top: 0; height: 4px; border-radius: 18px 18px 0 0;
  background: linear-gradient(90deg, var(--navy-2), var(--blue), #8b5cf6, var(--blue), var(--navy-2));
  background-size: 200% 100%; animation: lp-bar 6s linear infinite;
}
@keyframes lp-bar { to { background-position: 200% 0; } }

.lp-card-head { display: flex; align-items: center; gap: 14px; margin-bottom: 26px; }
.lp-card-icon {
  width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center;
  font-size: 22px; color: var(--blue); background: var(--blue-soft);
  animation: lp-bob 4s ease-in-out infinite;
}
.lp-card-title { margin: 0; font-family: Georgia, serif; font-size: 22px; font-weight: 600; }
.lp-card-sub { margin: 4px 0 0; font-size: 12.5px; color: #718096; }

.lp-field { margin-bottom: 18px; }
.lp-label { display: block; margin-bottom: 8px; font-size: 13px; font-weight: 600; color: #24324e; transition: color .2s ease; }
.lp-field:focus-within .lp-label { color: var(--blue); }

.lp-input-wrap { position: relative; }
.lp-input-icon {
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  font-size: 17px; color: #94a0b6; pointer-events: none; display: grid;
  transition: color .2s ease, transform .25s cubic-bezier(.2,.9,.3,1.3);
}
.lp-input {
  width: 100%; height: 48px; padding: 0 14px 0 42px;
  border: 1px solid var(--line); border-radius: 10px;
  background: #fbfcfe; color: var(--text); font-size: 14px; font-family: inherit;
  outline: none; transition: border-color .2s ease, box-shadow .2s ease, background .2s ease, transform .2s ease;
}
.lp-input::placeholder { color: #9aa6ba; }
.lp-input:hover { border-color: #c5cee0; }
.lp-input:focus { border-color: var(--blue); background: #fff; box-shadow: 0 0 0 4px rgba(58,91,255,.14); transform: translateY(-1px); }
.lp-input-wrap:focus-within .lp-input-icon { color: var(--blue); transform: translateY(-50%) scale(1.15); }
.lp-input:disabled { opacity: .7; cursor: not-allowed; }
.lp-input-password { padding-right: 48px; }
.lp-input-wrap.has-error .lp-input { border-color: var(--danger); background: #fffafa; }
.lp-input-wrap.has-error .lp-input:focus { box-shadow: 0 0 0 4px rgba(198,40,40,.12); }

.lp-toggle {
  position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
  width: 36px; height: 36px; display: grid; place-items: center;
  border: none; border-radius: 8px; background: transparent;
  color: #7c89a0; font-size: 18px; cursor: pointer; transition: background .15s, color .15s, transform .15s;
}
.lp-toggle:hover { background: #eef1f8; color: var(--blue); }
.lp-toggle:active { transform: translateY(-50%) scale(.9); }
.lp-toggle:focus-visible { outline: 2px solid var(--blue); outline-offset: 1px; }

.lp-field-error { margin: 6px 0 0; font-size: 12px; color: var(--danger); animation: lp-rise .3s ease both; }
.lp-caps { margin: 6px 0 0; font-size: 12px; color: #9a6a00; animation: lp-rise .3s ease both; }

/* ---------- Alerts ---------- */
.lp-alert {
  display: flex; align-items: flex-start; gap: 10px; margin-bottom: 16px;
  padding: 12px 14px; border-radius: 10px; font-size: 13px; line-height: 1.5;
}
.lp-alert svg { font-size: 18px; margin-top: 1px; }
.lp-alert-error { background: #fff1f1; color: var(--danger); border: 1px solid #f6caca; }
.lp-alert-success { background: #edf8f0; color: var(--ok); border: 1px solid #c4e6cf; }

/* ---------- Submit ---------- */
.lp-submit {
  position: relative; overflow: hidden;
  width: 100%; height: 48px; display: flex; align-items: center; justify-content: center; gap: 10px;
  border: none; border-radius: 10px; color: #fff; font-size: 14.5px; font-weight: 700; font-family: inherit;
  letter-spacing: .2px; cursor: pointer;
  background: linear-gradient(135deg, var(--navy-2), #1c2a4a);
  box-shadow: 0 10px 22px rgba(41,55,86,.28);
  transition: transform .15s ease, box-shadow .15s ease, filter .15s ease, background .4s ease;
}
.lp-submit::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  transform: translateX(-130%) skewX(-20deg);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent);
  transition: transform .75s ease;
}
.lp-submit:hover:not(:disabled)::after { transform: translateX(130%) skewX(-20deg); }
.lp-submit svg { font-size: 18px; transition: transform .2s ease; }
.lp-submit:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.1); box-shadow: 0 16px 30px rgba(41,55,86,.34); }
.lp-submit:hover:not(:disabled) svg { transform: translateX(4px); }
.lp-submit:active:not(:disabled) { transform: translateY(0) scale(.99); }
.lp-submit:focus-visible { outline: 3px solid rgba(58,91,255,.4); outline-offset: 2px; }
.lp-submit:disabled { background: #7b87a4; box-shadow: none; cursor: wait; }
.lp-submit.is-success, .lp-submit.is-success:disabled { background: linear-gradient(135deg, #16a34a, #15803d); box-shadow: 0 10px 22px rgba(22,163,74,.35); cursor: default; }
.lp-tick { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: rgba(255,255,255,.22); }
.lp-tick svg { font-size: 14px; stroke-width: 2.6; }

.lp-spinner {
  width: 16px; height: 16px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,.4); border-top-color: #fff;
  animation: lp-spin .7s linear infinite;
}
@keyframes lp-spin { to { transform: rotate(360deg); } }

/* ---------- Footer area of card ---------- */
.lp-signup { margin: 22px 0 18px; text-align: center; font-size: 13px; color: var(--muted); }
.lp-link { color: var(--blue); text-decoration: none; position: relative; }
.lp-link-strong { font-weight: 700; }
.lp-link::after {
  content: ""; position: absolute; left: 0; right: 0; bottom: -2px; height: 2px; border-radius: 2px;
  background: currentColor; transform: scaleX(0); transform-origin: left; transition: transform .25s ease;
}
.lp-link:hover::after { transform: scaleX(1); }
.lp-divider { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; color: #9aa4b5; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
.lp-divider::before, .lp-divider::after { content: ""; flex: 1; height: 1px; background: #e8ebf0; }
.lp-admin {
  display: block; text-align: center; padding: 11px; border-radius: 10px;
  border: 1px solid var(--line); color: var(--navy-2); font-size: 13px; font-weight: 600;
  text-decoration: none; transition: background .2s, border-color .2s, color .2s, transform .2s, box-shadow .2s;
}
.lp-admin:hover { background: #f4f6fb; border-color: #c5cee0; color: var(--blue); transform: translateY(-1px); box-shadow: 0 6px 16px rgba(27,42,70,.08); }

.lp-footer { text-align: center; font-size: 11.5px; color: #7a879c; padding-top: 6px; }

/* ---------- Responsive ---------- */
@media (max-width: 900px) {
  .lp-content { grid-template-columns: 1fr; gap: 28px; max-width: 460px; }
  .lp-card { justify-self: stretch; order: -1; }
  .lp-hero { text-align: center; }
  .lp-lead, .lp-features { margin-left: auto; margin-right: auto; }
  .lp-rule { margin-left: auto; margin-right: auto; transform-origin: center; }
  .lp-feature { text-align: left; }
  .lp-feature:hover { transform: translateY(-2px); }
}
@media (max-width: 480px) {
  .lp-card { padding: 26px 20px 22px; }
  .lp-hero { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .lp-page *, .lp-page *::before, .lp-page *::after { animation: none !important; transition: none !important; }
  .lp-page.is-leaving { opacity: 1; transform: none; }
}
`;