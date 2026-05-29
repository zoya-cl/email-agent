import { NextResponse } from "next/server";

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Pixel Tracker", charset="UTF-8"',
    },
  });
}

export function middleware(req) {
  const expectedPass = process.env.DASHBOARD_PASSWORD;
  if (!expectedPass) return NextResponse.next();

  const expectedUser = process.env.DASHBOARD_USER || "admin";

  const header = req.headers.get("authorization") || "";
  if (header.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const idx = decoded.indexOf(":");
      const user = idx === -1 ? decoded : decoded.slice(0, idx);
      const pass = idx === -1 ? "" : decoded.slice(idx + 1);
      if (
        timingSafeEqual(user, expectedUser) &&
        timingSafeEqual(pass, expectedPass)
      ) {
        return NextResponse.next();
      }
    } catch {}
  }

  return unauthorized();
}

export const config = {
  matcher: [
    "/((?!api/track|api/click|demo|_next/static|_next/image|favicon.ico).*)",
  ],
};
