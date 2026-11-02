
import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "node:crypto";


const ADMIN_EMAIL = "knowletive@gmail.com";
const ADMIN_PASSWORD = "data@123";

function createSession(expiresAt: number, secret: string) {
  const payload = Buffer.from(
    JSON.stringify({ role: "admin", exp: expiresAt })
  ).toString("base64url");

  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password =
      typeof body.password === "string" ? body.password : "";

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { message: "Invalid administrator email or password." },
        { status: 401 }
      );
    }

    const secret = process.env.ADMIN_SESSION_SECRET;

    if (!secret || secret.length < 32) {
      return NextResponse.json(
        { message: "Admin session secret is not configured. Set ADMIN_SESSION_SECRET in .env.local." },
        { status: 500 }
      );
    }

    const expiresAt = Math.floor(Date.now() / 1000) + 8 * 60 * 60;
    const session = createSession(expiresAt, secret);

    const response = NextResponse.json({
      success: true,
      message: "Administrator login successful.",
    });

    response.cookies.set("admin_session", session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 60 * 60,
    });

    return response;
  } catch {
    return NextResponse.json(
      { message: "Invalid request. Please try again." },
      { status: 400 }
    );
  }
}
