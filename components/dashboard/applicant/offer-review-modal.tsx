"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Cancel01Icon,
  Download01Icon,
  CheckmarkCircle01Icon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { useMyOffer, useAcceptOffer, useDeclineOffer } from "@/hooks/use-applications"
import { useLogout } from "@/hooks/use-auth"
import { EMPLOYMENT_TYPE_LABELS, type EmploymentType } from "@/lib/contract-api"
import { currencySymbol } from "@/lib/employee-profile-api"
import type { OfferView } from "@/lib/application-api"
import { SignaturePad } from "@/components/dashboard/applicant/signature-pad"

const PERIOD_LABEL: Record<string, string> = {
  hourly: "per hour",
  weekly: "per week",
  "semi-monthly": "semi-monthly",
  monthly: "per month",
  "fixed-price": "fixed price",
}

function fmtMoney(o: OfferView) {
  if (o.salaryAmount == null) return o.salaryGradeName ?? "—"
  const sym = currencySymbol(o.salaryCurrency)
  const amount = `${sym}${o.salaryAmount.toLocaleString("en-PH")}`
  const period = o.salaryPeriod ? ` ${PERIOD_LABEL[o.salaryPeriod] ?? o.salaryPeriod}` : ""
  return `${amount}${period}${o.salaryGradeName ? ` · ${o.salaryGradeName}` : ""}`
}

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—"
}

/** Builds a standalone printable HTML doc for the offer and opens the print dialog. */
function printOffer(o: OfferView, signature: string | null) {
  const rows: [string, string][] = [
    ["Role", o.roleName ?? "—"],
    ["Position", o.jobPositionTitle ?? "—"],
    ["Department", o.department ?? "—"],
    ["Employment type", o.employmentType ? (EMPLOYMENT_TYPE_LABELS[o.employmentType as EmploymentType] ?? o.employmentType) : "—"],
    ["Work arrangement", o.workType ? o.workType[0].toUpperCase() + o.workType.slice(1) : "—"],
    ["Compensation", fmtMoney(o)],
    ["Start date", fmtDate(o.startDate)],
    ["Probation until", fmtDate(o.probationEndDate)],
  ]
  const body = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px;color:#64748b;width:200px">${k}</td><td style="padding:6px 12px;font-weight:600">${v}</td></tr>`
    )
    .join("")
  const sig = signature || o.signature
  const win = window.open("", "_blank", "width=820,height=900")
  if (!win) return
  win.document.write(`<!doctype html><html><head><title>${o.contractNumber ?? "Employment Offer"}</title>
    <style>body{font-family:ui-sans-serif,system-ui,Arial;color:#0f172a;padding:48px;max-width:720px;margin:0 auto}
    h1{font-size:20px;margin:0 0 4px} .muted{color:#64748b;font-size:13px}
    table{border-collapse:collapse;width:100%;margin:24px 0;font-size:14px;border:1px solid #e2e8f0;border-radius:8px}
    .notes{font-size:13px;white-space:pre-wrap;border-top:1px solid #e2e8f0;padding-top:16px}
    .sig{margin-top:40px} .sig img{height:80px}</style></head><body>
    <h1>Employment Offer${o.contractNumber ? ` · ${o.contractNumber}` : ""}</h1>
    <div class="muted">${o.jobTitle ?? ""} — prepared for ${o.applicantName ?? ""}</div>
    <table>${body}</table>
    ${o.notes ? `<div class="notes"><strong>Notes</strong><br/>${o.notes}</div>` : ""}
    <div class="sig">${sig ? `<div class="muted">Signed by ${o.applicantName ?? "the candidate"}</div><img src="${sig}"/>` : ""}</div>
    </body></html>`)
  win.document.close()
  win.focus()
  win.print()
}

export function OfferReviewModal({
  applicationId,
  onClose,
}: {
  applicationId: number
  onClose: () => void
}) {
  const { data: offer, isLoading } = useMyOffer(applicationId)
  const acceptMut = useAcceptOffer()
  const declineMut = useDeclineOffer()
  const logout = useLogout()

  const [signature, setSignature] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function accept() {
    if (!signature) {
      setError("Please add your signature to accept the offer.")
      return
    }
    setError(null)
    acceptMut.mutate(
      { id: applicationId, signature },
      {
        onSuccess: () => setAccepted(true),
        onError: () => setError("Couldn't submit your acceptance. Please try again."),
      }
    )
  }

  function decline() {
    if (!confirm("Decline this offer? This cannot be undone.")) return
    declineMut.mutate(applicationId, { onSuccess: onClose })
  }

  // An offer that's already been signed/activated is shown read-only (e.g. when revisiting as Hired).
  const alreadyAccepted =
    !!offer && (offer.contractStatus === "ACTIVE" || !!offer.signature)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={accepted ? undefined : onClose} />
      <div className="relative w-full max-w-2xl animate-in rounded-2xl border border-border bg-card shadow-xl duration-200 zoom-in-95 fade-in">
        {accepted ? (
          <CongratsRelogin
            roleName={offer?.roleName}
            onRelogin={() => logout.mutate()}
          />
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-[15px] font-semibold">Your employment offer</h2>
                <p className="text-[12px] text-muted-foreground">
                  Review the terms below, then sign to accept.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {offer && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => printOffer(offer, signature)}
                  >
                    <HugeiconsIcon icon={Download01Icon} size={13} strokeWidth={2} className="mr-1.5" />
                    Download
                  </Button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              {isLoading || !offer ? (
                <div className="h-64 animate-pulse rounded-xl bg-muted" />
              ) : (
                <>
                  {/* Contract preview */}
                  <div className="rounded-xl border border-border bg-background p-5">
                    <h3 className="text-[16px] font-semibold">
                      Employment Offer
                      {offer.contractNumber ? ` · ${offer.contractNumber}` : ""}
                    </h3>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      {offer.jobTitle ?? "Position"} — prepared for{" "}
                      {offer.applicantName ?? "you"}
                    </p>

                    <dl className="mt-4 divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60 text-[13px]">
                      <Row label="Role" value={offer.roleName} />
                      <Row label="Position" value={offer.jobPositionTitle} />
                      <Row label="Department" value={offer.department} />
                      <Row
                        label="Employment type"
                        value={
                          offer.employmentType
                            ? EMPLOYMENT_TYPE_LABELS[
                                offer.employmentType as EmploymentType
                              ] ?? offer.employmentType
                            : null
                        }
                      />
                      <Row
                        label="Work arrangement"
                        value={
                          offer.workType
                            ? offer.workType[0].toUpperCase() +
                              offer.workType.slice(1)
                            : null
                        }
                      />
                      <Row label="Compensation" value={fmtMoney(offer)} />
                      <Row label="Start date" value={fmtDate(offer.startDate)} />
                      {offer.probationEndDate && (
                        <Row
                          label="Probation until"
                          value={fmtDate(offer.probationEndDate)}
                        />
                      )}
                    </dl>

                    {offer.notes && (
                      <div className="mt-4 border-t border-border/60 pt-3 text-[13px]">
                        <p className="mb-1 font-medium">Notes</p>
                        <p className="whitespace-pre-wrap text-muted-foreground">
                          {offer.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Signature */}
                  <div className="mt-5">
                    {alreadyAccepted ? (
                      <>
                        <p className="mb-1 text-[13px] font-medium text-green-600 dark:text-green-400">
                          Offer accepted
                        </p>
                        {offer.signature && (
                          <img
                            src={offer.signature}
                            alt="Your signature"
                            className="h-20 rounded-lg border border-border bg-white p-2"
                          />
                        )}
                        {offer.signingDate && (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Signed {fmtDate(offer.signingDate)}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="mb-1 text-[13px] font-medium">
                          Sign to accept
                        </p>
                        <p className="mb-2 text-[12px] text-muted-foreground">
                          By signing, you agree to the terms of this offer.
                        </p>
                        <SignaturePad onChange={setSignature} />
                      </>
                    )}
                  </div>

                  {error && (
                    <p className="mt-3 text-[12px] font-medium text-destructive">
                      {error}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
              {alreadyAccepted ? (
                <Button variant="outline" size="sm" onClick={onClose}>
                  Close
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={decline}
                    disabled={acceptMut.isPending || declineMut.isPending}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    Disagree
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={accept}
                    disabled={
                      !signature || acceptMut.isPending || declineMut.isPending
                    }
                  >
                    <HugeiconsIcon
                      icon={CheckmarkCircle01Icon}
                      size={13}
                      strokeWidth={2}
                      className="mr-1.5"
                    />
                    {acceptMut.isPending ? "Submitting…" : "Agree & accept"}
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value || "—"}</dd>
    </div>
  )
}

function CongratsRelogin({
  roleName,
  onRelogin,
}: {
  roleName?: string | null
  onRelogin: () => void
}) {
  const [seconds, setSeconds] = useState(30)

  useEffect(() => {
    if (seconds <= 0) {
      onRelogin()
      return
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [seconds, onRelogin])

  return (
    <div className="flex flex-col items-center px-8 py-12 text-center">
      <div
        className={cn(
          "flex size-14 items-center justify-center rounded-full bg-green-100 text-green-600",
          "dark:bg-green-900/30 dark:text-green-400"
        )}
      >
        <HugeiconsIcon icon={CheckmarkCircle01Icon} size={30} strokeWidth={2} />
      </div>
      <h2 className="mt-4 text-[18px] font-semibold">Congratulations! 🎉</h2>
      <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
        You&apos;ve accepted your offer and are now part of the team
        {roleName ? ` as ${roleName}` : ""}. You&apos;ll be re-logged in to
        activate your new access in{" "}
        <span className="font-semibold text-foreground">{seconds}s</span>.
      </p>
      <Button size="sm" className="mt-6" onClick={onRelogin}>
        Re-login now
      </Button>
    </div>
  )
}
