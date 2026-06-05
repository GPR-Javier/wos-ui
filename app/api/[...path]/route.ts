import { NextRequest } from "next/server"

// Per-service backend URLs (overridable via env vars).
// Each service's context-path matches the prefix used here:
//   wos-auth     → /api/auth/*
//   wos-hr       → /api/hr/*
//   wos-payroll  → /api/payroll/*
//   wos-analytics→ /api/analytics/*
const BACKENDS: Record<string, string> = {
  auth: process.env.AUTH_API_URL ?? "http://localhost:8081",
  hr: process.env.HR_API_URL ?? "http://localhost:8083",
  payroll: process.env.PAYROLL_API_URL ?? "http://localhost:8082",
  analytics: process.env.ANALYTICS_API_URL ?? "http://localhost:8084",
  ai: process.env.AI_API_URL ?? "http://localhost:8085",
}

function resolveBackend(path: string[]): string {
  const service = path[0] ?? ""
  return BACKENDS[service] ?? BACKENDS.auth
}

function buildTargetUrl(path: string[], requestUrl: string) {
  const base = resolveBackend(path).replace(/\/$/, "")
  // path already includes the service name which matches the context-path segment,
  // so /api/hr/employees forwards to http://localhost:8083/api/hr/employees
  const incoming = new URL(requestUrl)
  return `${base}/api/${path.join("/")}${incoming.search}`
}

function buildForwardHeaders(request: NextRequest) {
  const headers = new Headers(request.headers)

  headers.delete("host")
  headers.delete("content-length")

  // The browser's Cookie header (containing access_token) is already forwarded
  // by new Headers(request.headers) above. All backends read the cookie first,
  // so adding a duplicate Authorization: Bearer header is redundant and doubles
  // the header size — the JWT alone is ~7 KB which blows past Tomcat's 8 KB limit.

  return headers
}

function buildResponseHeaders(upstream: Response) {
  const headers = new Headers(upstream.headers)

  headers.delete("connection")
  headers.delete("keep-alive")
  headers.delete("proxy-authenticate")
  headers.delete("proxy-authorization")
  headers.delete("te")
  headers.delete("trailer")
  headers.delete("transfer-encoding")
  headers.delete("upgrade")
  headers.set("x-wos-proxy", "next-api-route")

  return headers
}

function isNullBodyStatus(status: number) {
  return status === 204 || status === 205 || status === 304
}

async function proxy(request: NextRequest, path: string[]) {
  try {
    const targetUrl = buildTargetUrl(path, request.url)
    const method = request.method.toUpperCase()

    const init: RequestInit = {
      method,
      headers: buildForwardHeaders(request),
      redirect: "manual",
      cache: "no-store",
    }

    if (method !== "GET" && method !== "HEAD") {
      const body = await request.arrayBuffer()
      if (body.byteLength > 0) init.body = body
    }

    const upstream = await fetch(targetUrl, init)
    const headers = buildResponseHeaders(upstream)

    if (isNullBodyStatus(upstream.status)) {
      headers.delete("content-length")
      headers.delete("content-type")
      return new Response(null, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers,
      })
    }

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    })
  } catch (error) {
    console.error("API proxy error", {
      path: `/${path.join("/")}`,
      method: request.method,
      error,
    })
    return Response.json({ error: "Proxy forwarding failed" }, { status: 502 })
  }
}

type RouteContext = { params: Promise<{ path: string[] }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params
  return proxy(request, path)
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params
  return proxy(request, path)
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { path } = await context.params
  return proxy(request, path)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path } = await context.params
  return proxy(request, path)
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path } = await context.params
  return proxy(request, path)
}

export async function OPTIONS(request: NextRequest, context: RouteContext) {
  const { path } = await context.params
  return proxy(request, path)
}
