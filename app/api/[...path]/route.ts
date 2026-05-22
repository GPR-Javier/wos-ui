import { NextRequest } from "next/server"

// Per-service backend URLs (overridable via env vars).
const AUTH_BACKEND = process.env.AUTH_API_URL ?? "http://localhost:8081/api"
const HR_BACKEND = process.env.HR_API_URL ?? "http://localhost:8083/api"
const PAYROLL_BACKEND =
  process.env.PAYROLL_API_URL ?? "http://localhost:8082/api"

// Path-prefix → service routing table. First segment after /api/ decides.
const SERVICE_ROUTES: Record<string, string> = {
  teachers: HR_BACKEND,
  schedules: HR_BACKEND,
  "schedule-policies": HR_BACKEND,
  "schedule-change-requests": HR_BACKEND,
  attendance: HR_BACKEND,
  leave: HR_BACKEND,
  "leave-requests": HR_BACKEND,
  recruitment: HR_BACKEND,
  payroll: PAYROLL_BACKEND,
  rewards: PAYROLL_BACKEND,
}

function resolveBackend(path: string[]): string {
  const first = path[0] ?? ""
  return SERVICE_ROUTES[first] ?? AUTH_BACKEND
}

function buildTargetUrl(path: string[], requestUrl: string) {
  const backend = resolveBackend(path)
  const base = backend.endsWith("/") ? backend.slice(0, -1) : backend
  const pathname = path.join("/")
  const incoming = new URL(requestUrl)
  return `${base}/${pathname}${incoming.search}`
}

function buildForwardHeaders(request: NextRequest) {
  const headers = new Headers(request.headers)

  headers.delete("host")
  headers.delete("content-length")

  if (!headers.get("authorization")) {
    const accessToken = request.cookies.get("access_token")?.value
    if (accessToken) headers.set("authorization", `Bearer ${accessToken}`)
  }

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
