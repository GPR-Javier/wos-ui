import { describe, it, expect, beforeEach, vi } from "vitest"
import React from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// Mock the whole reporting-role API surface — each fn resolves so mutations settle
// and queries run their queryFn. The hooks are the unit under test.
vi.mock("@/lib/reporting-role-api", () => ({
  reportingRoleApi: {
    list: vi.fn(() =>
      Promise.resolve([{ id: 1, label: "Direct manager", active: true }])
    ),
    create: vi.fn(() =>
      Promise.resolve({ id: 2, label: "Dotted-line", active: true })
    ),
    update: vi.fn(() =>
      Promise.resolve({ id: 1, label: "Direct manager", active: false })
    ),
    remove: vi.fn(() => Promise.resolve(undefined)),
  },
}))

import { reportingRoleApi } from "@/lib/reporting-role-api"
import {
  useReportingRoles,
  useCreateReportingRole,
  useUpdateReportingRole,
  useDeleteReportingRole,
} from "@/hooks/use-reporting-roles"

const mockApi = reportingRoleApi as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>
const KEY = { queryKey: ["reporting-roles"] }

function setup() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const invalidateSpy = vi.spyOn(qc, "invalidateQueries")
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
  return { qc, invalidateSpy, wrapper }
}

describe("use-reporting-roles query hook", () => {
  beforeEach(() => vi.clearAllMocks())

  it("useReportingRoles forwards params to reportingRoleApi.list", async () => {
    const { wrapper } = setup()
    renderHook(() => useReportingRoles({ includeInactive: true }), { wrapper })
    await waitFor(() =>
      expect(mockApi.list).toHaveBeenCalledWith({ includeInactive: true })
    )
  })

  it("useReportingRoles defaults to empty params", async () => {
    const { wrapper } = setup()
    renderHook(() => useReportingRoles(), { wrapper })
    await waitFor(() => expect(mockApi.list).toHaveBeenCalledWith({}))
  })

  it("useReportingRoles does not fetch when disabled", () => {
    const { wrapper } = setup()
    renderHook(() => useReportingRoles({}, false), { wrapper })
    expect(mockApi.list).not.toHaveBeenCalled()
  })
})

describe("use-reporting-roles mutation hooks (call + invalidate)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("useCreateReportingRole creates and invalidates reporting-roles", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useCreateReportingRole(), { wrapper })
    await result.current.mutateAsync({ label: "Dotted-line" })
    expect(mockApi.create).toHaveBeenCalledWith({ label: "Dotted-line" })
    expect(invalidateSpy).toHaveBeenCalledWith(KEY)
  })

  it("useUpdateReportingRole updates (id, body) and invalidates", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useUpdateReportingRole(), { wrapper })
    await result.current.mutateAsync({ id: 1, body: { active: false } })
    expect(mockApi.update).toHaveBeenCalledWith(1, { active: false })
    expect(invalidateSpy).toHaveBeenCalledWith(KEY)
  })

  it("useDeleteReportingRole removes by id and invalidates", async () => {
    const { wrapper, invalidateSpy } = setup()
    const { result } = renderHook(() => useDeleteReportingRole(), { wrapper })
    await result.current.mutateAsync(5)
    expect(mockApi.remove).toHaveBeenCalledWith(5)
    expect(invalidateSpy).toHaveBeenCalledWith(KEY)
  })
})
