
import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect the homepage to the login page.
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Show the existing homepage's predictor at /predict.
  if (pathname === "/predict") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/predict"],
};
