
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

function verifyAdminSession(token: string | undefined): boolean {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!token || !secret || secret.length < 32) {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payload, signature] = parts;

  const expected = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return false;
  }

  try {
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );

    return data.role === "admin" && Number(data.exp) > Date.now() / 1000;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const session = request.cookies.get("admin_session")?.value;

  if (!verifyAdminSession(session)) {
    return NextResponse.json(
      { message: "Admin login required." },
      { status: 401 }
    );
  }

  const backendUrl =
    process.env.BACKEND_API_URL || "http://127.0.0.1:8000";
  const apiKey = process.env.ADMIN_API_KEY;

  if (!apiKey || apiKey.length < 32) {
    return NextResponse.json(
      { message: "Admin API key is not configured." },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(`${backendUrl}/admin/students`, {
      method: "GET",
      headers: { "X-Admin-Key": apiKey },
      cache: "no-store",
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: "Cannot connect to the College Predictor backend." },
      { status: 503 }
    );
  }
}
