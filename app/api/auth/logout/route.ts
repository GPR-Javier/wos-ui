import { NextRequest, NextResponse } from "next/server"

const AUTH_BACKEND = process.env.AUTH_API_URL ?? "http://localhost:8081"

export async function POST(request: NextRequest) {
  // Best-effort backend call to revoke the refresh token in the DB.
  // We ignore failures — the important thing is that the browser cookies are
  // always cleared, even if the backend is down or returns an error.
  try {
    await fetch(`${AUTH_BACKEND}/api/auth/logout`, {
      method: "POST",
      headers: { cookie: request.headers.get("cookie") ?? "" },
    })
  } catch {
    // ignored
  }

  const response = NextResponse.json({}, { status: 200 })
  response.cookies.set("access_token", "", {
    maxAge: 0,
    path: "/",
    httpOnly: true,
  })
  response.cookies.set("refresh_token", "", {
    maxAge: 0,
    path: "/",
    httpOnly: true,
  })
  return response
}
