
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Unable to sign in.");
        return;
      }

      // Change this destination if your admin dashboard uses another route.
      window.location.assign("/admin/dashboard");
    } catch {
      setError("Unable to connect. Please restart the frontend and try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "13px 14px",
    border: "1px solid #dbe3ef",
    borderRadius: 8,
    background: "#fff",
    color: "#172746",
    fontSize: 13,
    boxSizing: "border-box" as const,
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        boxSizing: "border-box",
        fontFamily: "Georgia, 'Times New Roman', serif",
        color: "#172746",
        backgroundColor: "#edf3f9",
        backgroundImage:
          "linear-gradient(110deg, rgba(255,253,249,.95), rgba(235,243,250,.82)), url('/images/college-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 420,
          padding: "32px 30px",
          background: "rgba(255,255,255,.97)",
          border: "1px solid #e5eaf2",
          borderTop: "4px solid #293756",
          borderRadius: 14,
          boxShadow: "0 20px 55px rgba(27,44,76,.15)",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 44,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 12,
              background: "#eef1ff",
              color: "#4169ff",
              fontSize: 22,
            }}
          >
            ♙
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24 }}>Administrator Login</h1>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#718096" }}>
              Secure access to College Predictor
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin}>
          <label htmlFor="admin-email" style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 700 }}>
            Administrator Email
          </label>
          <input
            id="admin-email"
            type="email"
            autoComplete="username"
            placeholder="Enter your admin email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            style={{ ...inputStyle, marginBottom: 20 }}
          />

          <label htmlFor="admin-password" style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 700 }}>
            Password
          </label>
          <div style={{ position: "relative", marginBottom: 22 }}>
            <input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your admin password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              style={{ ...inputStyle, paddingRight: 65 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                border: 0,
                background: "transparent",
                color: "#4169ff",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {error && (
            <div
              role="alert"
              style={{
                marginBottom: 18,
                padding: 12,
                borderRadius: 8,
                background: "#fff1f1",
                border: "1px solid #fecaca",
                color: "#b42318",
                fontFamily: "Arial, sans-serif",
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: 14,
              border: 0,
              borderRadius: 8,
              background: loading ? "#77839b" : "#293756",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "Signing in..." : "Sign In as Administrator"}
          </button>
        </form>

        <div
          style={{
            marginTop: 24,
            paddingTop: 20,
            borderTop: "1px solid #e8ebf0",
            textAlign: "center",
            fontFamily: "Arial, sans-serif",
            fontSize: 12,
            color: "#65748c",
          }}
        >
          Student account?{" "}
          <Link href="/login" style={{ color: "#3159ff", textDecoration: "none", fontWeight: 700 }}>
            Student Login
          </Link>
        </div>
      </section>
    </main>
  );
}
