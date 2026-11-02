
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Please enter your registered email address.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: normalizedEmail }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          typeof data.detail === "string"
            ? data.detail
            : "Unable to process your request. Please try again."
        );
        return;
      }

      setMessage(
        typeof data.message === "string"
          ? data.message
          : "If your email is registered, instructions will be provided."
      );
    } catch {
      setError(
        "Cannot connect to the backend. Make sure FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "28px 5%",
        boxSizing: "border-box",
        fontFamily: "Georgia, 'Times New Roman', serif",
        color: "#172746",
        backgroundColor: "#edf3f9",
        backgroundImage:
          "linear-gradient(90deg, rgba(255,253,249,.96), rgba(255,253,249,.80), rgba(231,241,250,.60)), url('/images/college-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <header style={{ textAlign: "center", marginBottom: 45 }}>
        <div
          style={{
            fontSize: "clamp(28px, 4vw, 38px)",
            fontWeight: 700,
            letterSpacing: "-1px",
          }}
        >
          College Predictor
        </div>

        <div
          style={{
            fontFamily: "Arial, sans-serif",
            fontSize: 10,
            letterSpacing: 3,
            color: "#b77a26",
            marginTop: 8,
            fontWeight: 700,
          }}
        >
          MHT-CET · MAHARASHTRA
        </div>

        <div
          style={{
            width: 28,
            height: 3,
            background: "#c18a36",
            margin: "12px auto 0",
          }}
        />
      </header>

      <section
        style={{
          width: "100%",
          maxWidth: 430,
          margin: "auto",
          padding: "35px 30px",
          background: "#fff",
          borderRadius: 15,
          borderTop: "4px solid #293756",
          boxShadow: "0 18px 50px rgba(27, 42, 70, 0.15)",
          boxSizing: "border-box",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background: "#e9edff",
            color: "#4169ff",
            fontSize: 24,
            marginBottom: 20,
          }}
        >
          ✉
        </div>

        <h1
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 25,
            fontWeight: 500,
            margin: "0 0 12px",
          }}
        >
          Forgot Password?
        </h1>

        <p
          style={{
            fontSize: 13,
            lineHeight: 1.8,
            color: "#65748c",
            marginBottom: 25,
          }}
        >
          Enter the email address associated with your account to request
          password-reset instructions.
        </p>

        <form onSubmit={handleSubmit}>
          <label
            htmlFor="email"
            style={{
              display: "block",
              marginBottom: 8,
              fontSize: 13,
              fontWeight: 600,
              color: "#24324e",
            }}
          >
            Registered Email Address
          </label>

          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Enter your registered email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError("");
              setMessage("");
            }}
            required
            style={{
              width: "100%",
              padding: "13px 14px",
              border: "1px solid #dce2ed",
              borderRadius: 8,
              background: "#fff",
              color: "#17233d",
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
              marginBottom: 20,
            }}
          />

          {error && (
            <div
              role="alert"
              style={{
                padding: 12,
                borderRadius: 7,
                background: "#fff0f0",
                color: "#c62828",
                fontSize: 12,
                lineHeight: 1.6,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          {message && (
            <div
              role="status"
              style={{
                padding: 12,
                borderRadius: 7,
                background: "#edf8f0",
                color: "#18713a",
                fontSize: 12,
                lineHeight: 1.6,
                marginBottom: 16,
              }}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: 14,
              border: "none",
              borderRadius: 8,
              background: loading ? "#7b87a4" : "#293756",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "Processing..." : "Request Password Reset →"}
          </button>
        </form>

        <div
          style={{
            textAlign: "center",
            marginTop: 25,
            fontSize: 12,
            color: "#65748c",
          }}
        >
          Remember your password?{" "}
          <Link
            href="/login"
            style={{
              color: "#3159ff",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Back to Login
          </Link>
        </div>
      </section>
    </main>
  );
}
