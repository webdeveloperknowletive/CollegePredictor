"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://127.0.0.1:8000"
    : "");

type SignupForm = {
  fullName: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword: string;
};

type FieldName = keyof SignupForm;
type FieldErrors = Partial<Record<FieldName, string>>;

const initialForm: SignupForm = {
  fullName: "",
  email: "",
  mobile: "",
  password: "",
  confirmPassword: "",
};

/* ---------- Validation (same rules as before) ---------- */

function validateField(name: FieldName, form: SignupForm): string {
  switch (name) {
    case "fullName":
      return /^[A-Za-z][A-Za-z\s.'-]{1,79}$/.test(form.fullName.trim())
        ? ""
        : "Enter a valid full name using at least 2 letters.";
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.email.trim().toLowerCase()
      )
        ? ""
        : "Enter a valid email address.";
    case "mobile":
      return /^[6-9]\d{9}$/.test(form.mobile)
        ? ""
        : "Enter a valid 10-digit Indian mobile number.";
    case "password":
      return form.password.length >= 8
        ? ""
        : "Your password must contain at least 8 characters.";
    case "confirmPassword":
      if (!form.confirmPassword) return "Please re-enter your password.";
      return form.password === form.confirmPassword
        ? ""
        : "Your passwords do not match.";
  }
}

const FIELD_ORDER: FieldName[] = [
  "fullName",
  "email",
  "mobile",
  "password",
  "confirmPassword",
];

function passwordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (password.length >= 12 && score >= 3) score = 4;

  const labels = ["Too weak", "Weak", "Fair", "Good", "Strong"];
  return { score, label: password ? labels[score] : "" };
}

/* ---------- Inline icons ---------- */

const Icon = {
  user: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20c.9-3.6 4-5.5 7.5-5.5s6.6 1.9 7.5 5.5" />
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7.5 8 6 8-6" />
    </svg>
  ),
  phone: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M11 18.5h2" />
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
  cap: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m2 9 10-5 10 5-10 5L2 9Z" />
      <path d="M6 11.5V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5" />
      <path d="M22 9v6" />
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
  arrow: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  ),
};

const BENEFITS = [
  {
    icon: Icon.trend,
    title: "Historical Cutoff Data",
    description: "Explore cutoff trends across CAP rounds.",
  },
  {
    icon: Icon.target,
    title: "Smart College Predictions",
    description: "Find options matching your percentile and category.",
  },
  {
    icon: Icon.bookmark,
    title: "Saved Predictions",
    description: "Access your prediction history anytime.",
  },
];

export default function SignupPage() {
  const [form, setForm] = useState<SignupForm>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = passwordStrength(form.password);

  function updateField(name: FieldName, value: string) {
    setForm((previous) => ({ ...previous, [name]: value }));
    setFieldErrors((previous) => ({ ...previous, [name]: undefined }));
    setError("");
    setSuccess("");
  }

  function handleBlur(name: FieldName) {
    // Only validate once the user has typed something in the field.
    if (!form[name]) return;
    const message = validateField(name, form);
    setFieldErrors((previous) => ({ ...previous, [name]: message || undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const errors: FieldErrors = {};
    for (const name of FIELD_ORDER) {
      const message = validateField(name, form);
      if (message) errors[name] = message;
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      const first = FIELD_ORDER.find((name) => errors[name]);
      if (first) document.getElementById(first)?.focus();
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          mobile: form.mobile,
          password: form.password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          typeof data.detail === "string"
            ? data.detail
            : "Registration failed. Please try again."
        );
        return;
      }

      setSuccess("Account created successfully! Redirecting to login...");
      window.setTimeout(() => {
        window.location.href = "/login";
      }, 1200);
    } catch {
      setError(
        "Cannot connect to the server. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ---------- Reusable text field ---------- */
  function renderField(config: {
    name: FieldName;
    label: string;
    icon: React.ReactNode;
    type?: string;
    placeholder: string;
    autoComplete: string;
    inputMode?: "numeric" | "email" | "text";
    maxLength?: number;
    prefix?: string;
    transform?: (value: string) => string;
  }) {
    const { name, label, icon, type = "text", placeholder, autoComplete } = config;
    const err = fieldErrors[name];

    return (
      <div className="sp-field">
        <label htmlFor={name} className="sp-label">
          {label}
        </label>
        <div className={`sp-input-wrap ${err ? "has-error" : ""}`}>
          <span className="sp-input-icon">{icon}</span>
          {config.prefix && <span className="sp-prefix">{config.prefix}</span>}
          <input
            id={name}
            name={name}
            type={type}
            inputMode={config.inputMode}
            autoComplete={autoComplete}
            placeholder={placeholder}
            value={form[name]}
            maxLength={config.maxLength}
            disabled={loading}
            aria-invalid={!!err}
            aria-describedby={err ? `${name}-error` : undefined}
            onChange={(e) =>
              updateField(
                name,
                config.transform
                  ? config.transform(e.target.value)
                  : e.target.value
              )
            }
            onBlur={() => handleBlur(name)}
            className={`sp-input ${config.prefix ? "has-prefix" : ""}`}
          />
        </div>
        {err && (
          <p id={`${name}-error`} className="sp-field-error">
            {err}
          </p>
        )}
      </div>
    );
  }

  /* ---------- Password field with show/hide ---------- */
  function renderPasswordField(config: {
    name: "password" | "confirmPassword";
    label: string;
    placeholder: string;
    visible: boolean;
    toggle: () => void;
  }) {
    const { name, label, placeholder, visible, toggle } = config;
    const err = fieldErrors[name];

    return (
      <div className="sp-field">
        <label htmlFor={name} className="sp-label">
          {label}
        </label>
        <div className={`sp-input-wrap ${err ? "has-error" : ""}`}>
          <span className="sp-input-icon">{Icon.lock}</span>
          <input
            id={name}
            name={name}
            type={visible ? "text" : "password"}
            autoComplete="new-password"
            placeholder={placeholder}
            value={form[name]}
            disabled={loading}
            aria-invalid={!!err}
            aria-describedby={err ? `${name}-error` : undefined}
            onChange={(e) => updateField(name, e.target.value)}
            onBlur={() => handleBlur(name)}
            className="sp-input sp-input-password"
          />
          <button
            type="button"
            className="sp-toggle"
            onClick={toggle}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
          >
            {visible ? Icon.eyeOff : Icon.eye}
          </button>
        </div>
        {err && (
          <p id={`${name}-error`} className="sp-field-error">
            {err}
          </p>
        )}

        {name === "password" && form.password && (
          <div className="sp-strength" aria-live="polite">
            <div className="sp-strength-bars">
              {[1, 2, 3, 4].map((level) => (
                <span
                  key={level}
                  className={`sp-bar ${
                    strength.score >= level ? `on s${strength.score}` : ""
                  }`}
                />
              ))}
            </div>
            <span className={`sp-strength-label s${strength.score}`}>
              {strength.label}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <style>{css}</style>

      <main className="sp-page">
        <div className="sp-overlay" />

        <header className="sp-header">
          <div className="sp-brand">
            <span className="sp-brand-mark">{Icon.cap}</span>
            <span className="sp-brand-text">
              <span className="sp-brand-name">College Predictor</span>
              <span className="sp-brand-sub">MHT-CET · Maharashtra</span>
            </span>
          </div>
        </header>

        <div className="sp-content">
          {/* ---------- Left: benefits ---------- */}
          <section className="sp-hero" aria-label="Why join College Predictor">
            <span className="sp-pill">
              <span className="sp-pill-dot" /> Free to join
            </span>

            <h1 className="sp-title">
              Start your journey.
              <br />
              Choose with
              <br />
              <span className="sp-title-accent">confidence.</span>
            </h1>

            <div className="sp-rule" />

            <p className="sp-lead">
              Create your free account to explore historical MHT-CET cutoffs,
              get personalised college predictions, and save your results for
              later.
            </p>

            <ul className="sp-benefits">
              {BENEFITS.map((item) => (
                <li key={item.title} className="sp-benefit">
                  <span className="sp-benefit-icon">{item.icon}</span>
                  <span>
                    <span className="sp-benefit-title">{item.title}</span>
                    <span className="sp-benefit-desc">{item.description}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* ---------- Right: form card ---------- */}
          <section className="sp-card" aria-labelledby="signup-heading">
            <div className="sp-card-head">
              <h2 id="signup-heading" className="sp-card-title">
                Create your account
              </h2>
              <p className="sp-card-sub">
                Start your MHT-CET college prediction journey.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              {renderField({
                name: "fullName",
                label: "Full Name",
                icon: Icon.user,
                placeholder: "Enter your full name",
                autoComplete: "name",
                maxLength: 80,
              })}

              {renderField({
                name: "email",
                label: "Email Address",
                icon: Icon.mail,
                type: "email",
                inputMode: "email",
                placeholder: "you@example.com",
                autoComplete: "email",
              })}

              {renderField({
                name: "mobile",
                label: "Mobile Number",
                icon: Icon.phone,
                type: "tel",
                inputMode: "numeric",
                placeholder: "10-digit mobile number",
                autoComplete: "tel-national",
                maxLength: 10,
                prefix: "+91",
                transform: (value) => value.replace(/\D/g, "").slice(0, 10),
              })}

              {renderPasswordField({
                name: "password",
                label: "Password",
                placeholder: "Minimum 8 characters",
                visible: showPassword,
                toggle: () => setShowPassword((v) => !v),
              })}

              {renderPasswordField({
                name: "confirmPassword",
                label: "Confirm Password",
                placeholder: "Re-enter your password",
                visible: showConfirm,
                toggle: () => setShowConfirm((v) => !v),
              })}

              <div aria-live="polite">
                {error && (
                  <div role="alert" className="sp-alert sp-alert-error">
                    {Icon.alert}
                    <span>{error}</span>
                  </div>
                )}
                {success && (
                  <div role="status" className="sp-alert sp-alert-success">
                    {Icon.check}
                    <span>{success}</span>
                  </div>
                )}
              </div>

              <button type="submit" disabled={loading} className="sp-submit">
                {loading ? (
                  <>
                    <span className="sp-spinner" aria-hidden="true" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
                    {Icon.arrow}
                  </>
                )}
              </button>
            </form>

            <p className="sp-login">
              Already have an account?{" "}
              <Link href="/login" className="sp-link">
                Log in
              </Link>
            </p>
          </section>
        </div>

        <footer className="sp-footer">
          © College Predictor · Predictions are based on historical data and
          are not a guarantee of admission.
        </footer>
      </main>
    </>
  );
}

/* ====================================================================== */

const css = `
.sp-page {
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
  color: var(--text);
  background-color: #edf3f9;
  background-image: url('/images/college-bg.jpg');
  background-size: cover;
  background-position: center;
  font-family: Inter, "Segoe UI", system-ui, -apple-system, Arial, sans-serif;
  overflow: hidden;
  isolation: isolate;
}
.sp-page *, .sp-page *::before, .sp-page *::after { box-sizing: border-box; }
.sp-page svg {
  width: 1em; height: 1em; fill: none; stroke: currentColor;
  stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; flex-shrink: 0;
}

.sp-overlay {
  position: absolute; inset: 0; z-index: -1;
  background:
    radial-gradient(900px 500px at 12% 18%, rgba(58,91,255,.08), transparent 60%),
    linear-gradient(95deg, rgba(255,253,249,.97) 0%, rgba(255,253,249,.88) 45%, rgba(231,241,250,.62) 100%);
}

/* ---------- Header ---------- */
.sp-header { display: flex; justify-content: center; margin-bottom: clamp(16px, 3vh, 32px); }
.sp-brand { display: flex; align-items: center; gap: 12px; }
.sp-brand-mark {
  width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; font-size: 24px;
  color: #fff; background: linear-gradient(135deg, var(--navy), var(--blue));
  box-shadow: 0 8px 20px rgba(41,55,86,.25);
}
.sp-brand-text { display: flex; flex-direction: column; line-height: 1.15; }
.sp-brand-name { font-family: Georgia, "Times New Roman", serif; font-size: clamp(22px, 3vw, 28px); font-weight: 700; letter-spacing: -.5px; }
.sp-brand-sub { margin-top: 4px; font-size: 10px; font-weight: 700; letter-spacing: 2.6px; text-transform: uppercase; color: var(--gold); }

/* ---------- Layout ---------- */
.sp-content {
  width: 100%; max-width: 1080px; margin: auto;
  display: grid; align-items: center;
  grid-template-columns: minmax(0, 1fr) minmax(0, 460px);
  gap: clamp(32px, 6vw, 80px);
  padding: 8px 0 24px;
}

/* ---------- Hero ---------- */
.sp-pill {
  display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 999px;
  font-size: 11px; font-weight: 600; letter-spacing: .3px; color: var(--navy-2);
  background: rgba(255,255,255,.75); border: 1px solid var(--line); backdrop-filter: blur(6px);
}
.sp-pill-dot { width: 7px; height: 7px; border-radius: 50%; background: #2fb36b; box-shadow: 0 0 0 3px rgba(47,179,107,.2); }
.sp-title {
  margin: 18px 0 18px; font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(32px, 4.2vw, 46px); font-weight: 500; line-height: 1.2; letter-spacing: -.5px;
}
.sp-title-accent { background: linear-gradient(90deg, #3a5bff, #6a7dff); -webkit-background-clip: text; background-clip: text; color: transparent; }
.sp-rule { width: 36px; height: 3px; border-radius: 2px; background: var(--gold); margin-bottom: 16px; }
.sp-lead { margin: 0; max-width: 440px; font-size: 14px; line-height: 1.8; color: var(--muted); }

.sp-benefits { list-style: none; padding: 0; margin: 28px 0 0; display: grid; gap: 12px; max-width: 440px; }
.sp-benefit {
  display: flex; align-items: center; gap: 14px; padding: 12px 14px; border-radius: 12px;
  background: rgba(255,255,255,.7); border: 1px solid rgba(221,227,238,.9); backdrop-filter: blur(6px);
  transition: transform .2s ease, box-shadow .2s ease, background .2s ease;
}
.sp-benefit:hover { transform: translateY(-2px); background: #fff; box-shadow: 0 10px 26px rgba(27,42,70,.08); }
.sp-benefit-icon { width: 38px; height: 38px; border-radius: 10px; display: grid; place-items: center; font-size: 19px; color: var(--blue); background: var(--blue-soft); }
.sp-benefit-title { display: block; font-size: 13px; font-weight: 700; }
.sp-benefit-desc { display: block; margin-top: 3px; font-size: 12px; color: var(--muted); }

/* ---------- Card ---------- */
.sp-card {
  width: 100%; justify-self: end; padding: 32px 30px 26px; border-radius: 18px; background: #fff;
  border-top: 4px solid var(--navy-2);
  box-shadow: 0 24px 60px rgba(27,42,70,.16), 0 2px 6px rgba(27,42,70,.06);
  animation: sp-rise .5s ease both;
}
@keyframes sp-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }

.sp-card-head { margin-bottom: 24px; }
.sp-card-title { margin: 0; font-family: Georgia, serif; font-size: 24px; font-weight: 600; }
.sp-card-sub { margin: 6px 0 0; font-size: 13px; color: #718096; }

.sp-field { margin-bottom: 16px; }
.sp-label { display: block; margin-bottom: 7px; font-size: 13px; font-weight: 600; color: #24324e; }

.sp-input-wrap { position: relative; display: flex; align-items: center; }
.sp-input-icon {
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  font-size: 17px; color: #94a0b6; pointer-events: none; display: grid; transition: color .15s ease; z-index: 1;
}
.sp-input {
  width: 100%; height: 46px; padding: 0 14px 0 42px; border: 1px solid var(--line); border-radius: 10px;
  background: #fbfcfe; color: var(--text); font-size: 14px; font-family: inherit; outline: none;
  transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
}
.sp-input::placeholder { color: #9aa6ba; }
.sp-input:hover { border-color: #c5cee0; }
.sp-input:focus { border-color: var(--blue); background: #fff; box-shadow: 0 0 0 4px rgba(58,91,255,.14); }
.sp-input-wrap:focus-within .sp-input-icon { color: var(--blue); }
.sp-input:disabled { opacity: .7; cursor: not-allowed; }
.sp-input-password { padding-right: 48px; }
.sp-input-wrap.has-error .sp-input { border-color: var(--danger); background: #fffafa; }
.sp-input-wrap.has-error .sp-input:focus { box-shadow: 0 0 0 4px rgba(198,40,40,.12); }

.sp-prefix {
  position: absolute; left: 42px; top: 50%; transform: translateY(-50%);
  font-size: 14px; font-weight: 600; color: #3b4a66; padding-right: 8px;
  border-right: 1px solid var(--line); line-height: 20px; pointer-events: none; z-index: 1;
}
.sp-input.has-prefix { padding-left: 88px; }

.sp-toggle {
  position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 34px; height: 34px;
  display: grid; place-items: center; border: none; border-radius: 8px; background: transparent;
  color: #7c89a0; font-size: 18px; cursor: pointer; transition: background .15s, color .15s;
}
.sp-toggle:hover { background: #eef1f8; color: var(--blue); }
.sp-toggle:focus-visible { outline: 2px solid var(--blue); outline-offset: 1px; }

.sp-field-error { margin: 6px 0 0; font-size: 12px; color: var(--danger); }

/* ---------- Password strength ---------- */
.sp-strength { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
.sp-strength-bars { display: flex; gap: 4px; flex: 1; }
.sp-bar { flex: 1; height: 4px; border-radius: 2px; background: #e4e9f2; transition: background .2s ease; }
.sp-bar.on.s0, .sp-bar.on.s1 { background: #e5484d; }
.sp-bar.on.s2 { background: #f5a524; }
.sp-bar.on.s3 { background: #7cc24a; }
.sp-bar.on.s4 { background: #2fb36b; }
.sp-strength-label { font-size: 11.5px; font-weight: 600; min-width: 56px; text-align: right; }
.sp-strength-label.s0, .sp-strength-label.s1 { color: #e5484d; }
.sp-strength-label.s2 { color: #c78100; }
.sp-strength-label.s3 { color: #4d8f1f; }
.sp-strength-label.s4 { color: #1c8f55; }

/* ---------- Alerts ---------- */
.sp-alert { display: flex; align-items: flex-start; gap: 10px; margin: 4px 0 16px; padding: 12px 14px; border-radius: 10px; font-size: 13px; line-height: 1.5; }
.sp-alert svg { font-size: 18px; margin-top: 1px; }
.sp-alert-error { background: #fff1f1; color: var(--danger); border: 1px solid #f6caca; }
.sp-alert-success { background: #edf8f0; color: var(--ok); border: 1px solid #c4e6cf; }

/* ---------- Submit ---------- */
.sp-submit {
  width: 100%; height: 48px; margin-top: 6px; display: flex; align-items: center; justify-content: center; gap: 10px;
  border: none; border-radius: 10px; color: #fff; font-size: 14.5px; font-weight: 700; font-family: inherit; letter-spacing: .2px;
  cursor: pointer; background: linear-gradient(135deg, var(--navy-2), #1c2a4a); box-shadow: 0 10px 22px rgba(41,55,86,.28);
  transition: transform .15s ease, box-shadow .15s ease, filter .15s ease;
}
.sp-submit svg { font-size: 18px; transition: transform .15s ease; }
.sp-submit:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.08); box-shadow: 0 14px 28px rgba(41,55,86,.32); }
.sp-submit:hover:not(:disabled) svg { transform: translateX(3px); }
.sp-submit:active:not(:disabled) { transform: translateY(0); }
.sp-submit:focus-visible { outline: 3px solid rgba(58,91,255,.4); outline-offset: 2px; }
.sp-submit:disabled { background: #7b87a4; box-shadow: none; cursor: wait; }

.sp-spinner { width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; animation: sp-spin .7s linear infinite; }
@keyframes sp-spin { to { transform: rotate(360deg); } }

.sp-login { margin: 22px 0 0; text-align: center; font-size: 13px; color: var(--muted); }
.sp-link { color: var(--blue); font-weight: 700; text-decoration: none; }
.sp-link:hover { text-decoration: underline; }

.sp-footer { text-align: center; font-size: 11.5px; color: #7a879c; padding-top: 6px; }

/* ---------- Responsive ---------- */
@media (max-width: 900px) {
  .sp-content { grid-template-columns: 1fr; gap: 28px; max-width: 480px; }
  .sp-card { justify-self: stretch; order: -1; }
  .sp-hero { text-align: center; }
  .sp-lead, .sp-benefits { margin-left: auto; margin-right: auto; }
  .sp-rule { margin-left: auto; margin-right: auto; }
  .sp-benefit { text-align: left; }
}
@media (max-width: 480px) {
  .sp-card { padding: 26px 20px 22px; }
  .sp-hero { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .sp-page *, .sp-page *::before, .sp-page *::after { animation: none !important; transition: none !important; }
}
`;