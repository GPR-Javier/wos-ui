"use client"

import { useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  PencilEdit01Icon,
  Tick02Icon,
  Cancel01Icon,
  Add01Icon,
  Delete02Icon,
  EyeIcon,
  BriefcaseIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { StatusBadge } from "@/components/custom/status-badge"
import { PhotoCropModal } from "@/components/custom/photo-crop-modal"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuthStore } from "@/store/auth-store"
import { useToastStore } from "@/store/toast-store"
import {
  useEmployeeProfile,
  useEmployeeEvaluations,
  useEmployeeDocuments,
} from "@/hooks/use-employee"
import type { EmployeeEvaluation, EmployeeDocument } from "@/lib/employee-api"
import {
  useIdentityMe,
  useUpdateIdentityInfo,
  useUpdateIdentityCredentials,
  useEducation,
  useCreateEducation,
  useUpdateEducation,
  useDeleteEducation,
  useWorkExperience,
  useCreateWorkExperience,
  useUpdateWorkExperience,
  useDeleteWorkExperience,
  useCertificates,
  useCreateCertificate,
  useUpdateCertificate,
  useDeleteCertificate,
} from "@/hooks/use-identity-profile"
import type {
  Education,
  EducationPayload,
  WorkExperience,
  WorkExperiencePayload,
  Certificate,
  CertificatePayload,
  UpdateCredentialsPayload,
} from "@/lib/identity-profile-api"
import { cn } from "@/lib/utils"

// Lifecycle stages only (Trainee → Probationary → Regular). Rank labels like
// Senior / Lead / Manager are a SEPARATE axis (JobPosition.level), not steps.
const EMPLOYMENT_STAGES = [
  { key: "trainee", label: "Trainee" },
  { key: "probationary", label: "Probationary" },
  { key: "regular", label: "Regular" },
] as const

type EmploymentStageKey =
  | (typeof EMPLOYMENT_STAGES)[number]["key"]
  | "resigned"
  | "terminated"

const TERMINAL_STAGES: Record<string, { label: string; className: string }> = {
  resigned: {
    label: "Resigned",
    className:
      "border-gray-300 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400",
  },
  terminated: {
    label: "Terminated",
    className:
      "border-red-300 bg-red-100 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300",
  },
}

/** "2014 – 2018", "2014 – Present", or "" when no dates set. */
function yearRange(start: string | null, end: string | null): string {
  const s = start ? new Date(start).getFullYear() : null
  const e = end ? new Date(end).getFullYear() : null
  if (s && e) return `${s} – ${e}`
  if (s) return `${s} – Present`
  return ""
}

const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
  "Freelance",
]

/** A certificate is "expired" only if it has an expiry date in the past. */
function certActive(expiryDate: string | null): boolean {
  if (!expiryDate) return true
  return new Date(expiryDate) >= new Date(new Date().toDateString())
}

/** Format an ISO date as "Mon YYYY", or "" when null. */
function monthYear(d: string | null): string {
  if (!d) return ""
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  })
}

// ── Shared list helpers ───────────────────────────────────────────────────────

type ViewerData = { title: string; rows: { label: string; value: string }[] }

/** Read-only detail dialog opened by the "View" action on a list row. */
function DetailDialog({
  data,
  onClose,
}: {
  data: ViewerData | null
  onClose: () => void
}) {
  return (
    <Dialog
      open={!!data}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{data?.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {data?.rows.map((r) => (
            <div
              key={r.label}
              className="flex items-start justify-between gap-4 text-[13px]"
            >
              <span className="shrink-0 text-muted-foreground">{r.label}</span>
              <span className="text-right font-medium">{r.value || "—"}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Dashed inline add/edit form shell with Cancel + Add/Save footer. */
function InlineForm({
  children,
  onSave,
  onCancel,
  canSave,
  isNew,
}: {
  children: React.ReactNode
  onSave: () => void
  onCancel: () => void
  canSave: boolean
  isNew: boolean
}) {
  return (
    <div className="mb-2.5 space-y-2 rounded-lg border border-dashed border-border bg-muted/20 p-3">
      <div className="grid grid-cols-2 gap-2">{children}</div>
      <div className="flex justify-end gap-1.5">
        <Button size="xs" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="xs" onClick={onSave} disabled={!canSave}>
          {isNew ? "Add" : "Save"}
        </Button>
      </div>
    </div>
  )
}

/** View / Edit / Delete actions shown on row hover. */
function RowActions({
  onView,
  onEdit,
  onDelete,
}: {
  onView: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const base =
    "flex size-6 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
  return (
    <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
      <button onClick={onView} aria-label="View" title="View" className={base}>
        <HugeiconsIcon icon={EyeIcon} size={13} strokeWidth={2} />
      </button>
      <button onClick={onEdit} aria-label="Edit" title="Edit" className={base}>
        <HugeiconsIcon icon={PencilEdit01Icon} size={13} strokeWidth={2} />
      </button>
      <button
        onClick={onDelete}
        aria-label="Delete"
        title="Delete"
        className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
      >
        <HugeiconsIcon icon={Delete02Icon} size={13} strokeWidth={2} />
      </button>
    </div>
  )
}

export function GeneralSection() {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoTouched, setPhotoTouched] = useState(false)
  const [photoError, setPhotoError] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const { user } = useAuthStore()
  // Employment info (company-level, wos-hr) — Phase 1B; may be empty until built.
  const profileQ = useEmployeeProfile()
  const profile = profileQ.data
  // Company-level lists (wos-hr) — backend returns empty for now (Phase 2).
  const { data: evaluations = [] } = useEmployeeEvaluations()
  const { data: documents = [] } = useEmployeeDocuments()

  // Identity-level account + canonical info (gpr-auth /auth/me).
  const { data: me } = useIdentityMe()
  const updateInfo = useUpdateIdentityInfo()
  const updateCreds = useUpdateIdentityCredentials()
  const identityBusy = updateInfo.isPending || updateCreds.isPending
  const pushToast = useToastStore((s) => s.push)

  const fullName = me ? `${me.firstName ?? ""} ${me.lastName ?? ""}`.trim() : ""
  const initials = me
    ? `${me.firstName?.[0] ?? ""}${me.lastName?.[0] ?? ""}`.toUpperCase()
    : "—"
  const avatarSrc = photoTouched ? photoUrl : (me?.profilePhoto ?? null)
  // Only treat data-URLs / http(s) URLs as displayable; bad/truncated values fall back to initials.
  const showPhoto =
    !!avatarSrc && !photoError && /^(data:image\/|https?:\/\/)/.test(avatarSrc)

  // ── Account (display name / username / bio) — identity, gpr-auth ──────────
  const [editingAccount, setEditingAccount] = useState(false)
  const [accountDraft, setAccountDraft] = useState({
    displayName: "",
    username: "",
    bio: "",
  })
  const accountView = {
    displayName: me?.displayName || fullName,
    username: me?.username ?? "",
    bio: me?.bio ?? "",
  }
  const startEditAccount = () => {
    setAccountDraft({
      displayName: me?.displayName ?? fullName,
      username: me?.username ?? "",
      bio: me?.bio ?? "",
    })
    setEditingAccount(true)
  }
  const saveAccount = async () => {
    try {
      await updateInfo.mutateAsync({
        displayName: accountDraft.displayName.trim() || null,
        bio: accountDraft.bio.trim() || null,
        ...(photoTouched ? { profilePhoto: photoUrl ?? "" } : {}),
      })
      const username = accountDraft.username.trim()
      if (username && username !== me?.username) {
        await updateCreds.mutateAsync({ username })
      }
      pushToast("Account updated", "success")
      setPhotoTouched(false)
      setEditingAccount(false)
    } catch {
      // error already surfaced as a toast by the API interceptor
    }
  }

  // ── Personal information — identity, gpr-auth (/auth/me/info + credentials) ─
  type PersonalKey =
    | "fullName"
    | "workEmail"
    | "phone"
    | "birthday"
    | "gender"
    | "address"
  const [editingPersonal, setEditingPersonal] = useState(false)
  const BLANK_PERSONAL: Record<PersonalKey, string> = {
    fullName: "",
    workEmail: "",
    phone: "",
    birthday: "",
    gender: "",
    address: "",
  }
  const [draft, setDraft] =
    useState<Record<PersonalKey, string>>(BLANK_PERSONAL)

  const personal: Record<PersonalKey, string> = {
    fullName,
    workEmail: me?.email ?? "",
    phone: me?.phone ?? "",
    birthday: me?.birthday ?? "",
    gender: me?.gender ?? "",
    address: me?.address ?? "",
  }

  const PERSONAL_FIELDS: { key: PersonalKey; label: string; type?: string }[] =
    [
      { key: "fullName", label: "Full name" },
      { key: "workEmail", label: "Work email" },
      { key: "phone", label: "Phone" },
      { key: "birthday", label: "Date of birth", type: "date" },
      { key: "gender", label: "Gender" },
      { key: "address", label: "Address" },
    ]

  const startEditPersonal = () => {
    setDraft({
      fullName: personal.fullName,
      workEmail: personal.workEmail,
      phone: personal.phone,
      birthday: personal.birthday,
      gender: personal.gender,
      address: personal.address,
    })
    setEditingPersonal(true)
  }

  const savePersonal = async () => {
    const parts = draft.fullName.trim().split(/\s+/).filter(Boolean)
    const firstName = parts.shift() ?? ""
    const lastName = parts.join(" ")
    const creds: UpdateCredentialsPayload = {}
    const email = draft.workEmail.trim()
    if (email && email !== me?.email) creds.email = email
    if (draft.phone.trim() !== (me?.phone ?? "")) {
      creds.phone = draft.phone.trim() || null
    }
    try {
      await updateInfo.mutateAsync({
        firstName: firstName || null,
        lastName: lastName || null,
        birthday: draft.birthday || null,
        gender: draft.gender.trim() || null,
        address: draft.address.trim() || null,
      })
      if (Object.keys(creds).length > 0) await updateCreds.mutateAsync(creds)
      pushToast("Personal information updated", "success")
      setEditingPersonal(false)
    } catch {
      // error already surfaced as a toast by the API interceptor
    }
  }

  // Admin-managed, read-only here. Placeholder until the backend `employmentStage`
  // field lands (see plan).
  const employmentStage: EmploymentStageKey =
    (profile as { employmentStage?: EmploymentStageKey } | undefined)
      ?.employmentStage ?? "probationary"
  const terminal = TERMINAL_STAGES[employmentStage]
  const stageIdx = EMPLOYMENT_STAGES.findIndex((s) => s.key === employmentStage)

  // Shared read-only detail viewer (the "View" action)
  const [viewer, setViewer] = useState<ViewerData | null>(null)

  // ── Education (identity-level: persisted via gpr-auth /auth/me/education) ──
  const { data: education = [] } = useEducation()
  const createEdu = useCreateEducation()
  const updateEdu = useUpdateEducation()
  const deleteEdu = useDeleteEducation()
  const eduBusy = createEdu.isPending || updateEdu.isPending
  const BLANK_EDU = {
    school: "",
    degree: "",
    fieldOfStudy: "",
    startDate: "",
    endDate: "",
    honor: "",
    description: "",
  }
  // null = closed, "new" = adding, otherwise the numeric id being edited.
  const [eduFormId, setEduFormId] = useState<number | "new" | null>(null)
  const [eduForm, setEduForm] = useState(BLANK_EDU)
  const openAddEdu = () => {
    setEduForm(BLANK_EDU)
    setEduFormId("new")
  }
  const openEditEdu = (e: Education) => {
    setEduForm({
      school: e.school,
      degree: e.degree,
      fieldOfStudy: e.fieldOfStudy ?? "",
      startDate: e.startDate ?? "",
      endDate: e.endDate ?? "",
      honor: e.honor ?? "",
      description: e.description ?? "",
    })
    setEduFormId(e.id)
  }
  const saveEdu = () => {
    if (!eduForm.school.trim() || !eduForm.degree.trim()) return
    const payload: EducationPayload = {
      school: eduForm.school.trim(),
      degree: eduForm.degree.trim(),
      fieldOfStudy: eduForm.fieldOfStudy.trim() || null,
      startDate: eduForm.startDate || null,
      endDate: eduForm.endDate || null,
      honor: eduForm.honor.trim() || null,
      description: eduForm.description.trim() || null,
    }
    const adding = eduFormId === "new"
    const onSuccess = () => {
      setEduFormId(null)
      pushToast(adding ? "Education added" : "Education updated", "success")
    }
    if (adding) {
      createEdu.mutate(payload, { onSuccess })
    } else if (typeof eduFormId === "number") {
      updateEdu.mutate({ id: eduFormId, payload }, { onSuccess })
    }
  }
  const removeEducation = (id: number) =>
    deleteEdu.mutate(id, {
      onSuccess: () => pushToast("Education removed", "success"),
    })
  const viewEdu = (e: Education) =>
    setViewer({
      title: e.degree,
      rows: [
        { label: "School", value: e.school },
        { label: "Field of study", value: e.fieldOfStudy ?? "—" },
        { label: "Period", value: yearRange(e.startDate, e.endDate) },
        { label: "Honor", value: e.honor ?? "—" },
        { label: "Description", value: e.description ?? "—" },
      ],
    })

  // ── Work experience (identity-level: gpr-auth /auth/me/work-experience) ───
  const { data: work = [] } = useWorkExperience()
  const createWork = useCreateWorkExperience()
  const updateWork = useUpdateWorkExperience()
  const deleteWork = useDeleteWorkExperience()
  const workBusy = createWork.isPending || updateWork.isPending
  const BLANK_WORK = {
    title: "",
    company: "",
    employmentType: "",
    location: "",
    startDate: "",
    endDate: "",
    description: "",
  }
  const [workFormId, setWorkFormId] = useState<number | "new" | null>(null)
  const [workForm, setWorkForm] = useState(BLANK_WORK)
  const openAddWork = () => {
    setWorkForm(BLANK_WORK)
    setWorkFormId("new")
  }
  const openEditWork = (w: WorkExperience) => {
    setWorkForm({
      title: w.title,
      company: w.company,
      employmentType: w.employmentType ?? "",
      location: w.location ?? "",
      startDate: w.startDate ?? "",
      endDate: w.endDate ?? "",
      description: w.description ?? "",
    })
    setWorkFormId(w.id)
  }
  const saveWork = () => {
    if (!workForm.title.trim() || !workForm.company.trim()) return
    const payload: WorkExperiencePayload = {
      title: workForm.title.trim(),
      company: workForm.company.trim(),
      employmentType: workForm.employmentType || null,
      location: workForm.location.trim() || null,
      startDate: workForm.startDate || null,
      endDate: workForm.endDate || null,
      description: workForm.description.trim() || null,
    }
    const adding = workFormId === "new"
    const onSuccess = () => {
      setWorkFormId(null)
      pushToast(
        adding ? "Work experience added" : "Work experience updated",
        "success"
      )
    }
    if (adding) {
      createWork.mutate(payload, { onSuccess })
    } else if (typeof workFormId === "number") {
      updateWork.mutate({ id: workFormId, payload }, { onSuccess })
    }
  }
  const removeWork = (id: number) =>
    deleteWork.mutate(id, {
      onSuccess: () => pushToast("Work experience removed", "success"),
    })
  const viewWork = (w: WorkExperience) =>
    setViewer({
      title: w.title,
      rows: [
        { label: "Company", value: w.company },
        { label: "Employment type", value: w.employmentType ?? "—" },
        { label: "Location", value: w.location ?? "—" },
        { label: "Period", value: yearRange(w.startDate, w.endDate) },
        { label: "Description", value: w.description ?? "—" },
      ],
    })

  // ── Certificates (identity-level: gpr-auth /auth/me/certificates) ─────────
  const { data: certificates = [] } = useCertificates()
  const createCert = useCreateCertificate()
  const updateCert = useUpdateCertificate()
  const deleteCert = useDeleteCertificate()
  const certBusy = createCert.isPending || updateCert.isPending
  const BLANK_CERT = {
    name: "",
    issuer: "",
    issuedDate: "",
    expiryDate: "",
    credentialId: "",
    credentialUrl: "",
  }
  const [certFormId, setCertFormId] = useState<number | "new" | null>(null)
  const [certForm, setCertForm] = useState(BLANK_CERT)
  const openAddCert = () => {
    setCertForm(BLANK_CERT)
    setCertFormId("new")
  }
  const openEditCert = (c: Certificate) => {
    setCertForm({
      name: c.name,
      issuer: c.issuer,
      issuedDate: c.issuedDate ?? "",
      expiryDate: c.expiryDate ?? "",
      credentialId: c.credentialId ?? "",
      credentialUrl: c.credentialUrl ?? "",
    })
    setCertFormId(c.id)
  }
  const saveCert = () => {
    if (!certForm.name.trim() || !certForm.issuer.trim()) return
    const payload: CertificatePayload = {
      name: certForm.name.trim(),
      issuer: certForm.issuer.trim(),
      issuedDate: certForm.issuedDate || null,
      expiryDate: certForm.expiryDate || null,
      credentialId: certForm.credentialId.trim() || null,
      credentialUrl: certForm.credentialUrl.trim() || null,
    }
    const adding = certFormId === "new"
    const onSuccess = () => {
      setCertFormId(null)
      pushToast(adding ? "Certificate added" : "Certificate updated", "success")
    }
    if (adding) {
      createCert.mutate(payload, { onSuccess })
    } else if (typeof certFormId === "number") {
      updateCert.mutate({ id: certFormId, payload }, { onSuccess })
    }
  }
  const removeCertificate = (id: number) =>
    deleteCert.mutate(id, {
      onSuccess: () => pushToast("Certificate removed", "success"),
    })
  const viewCert = (c: Certificate) =>
    setViewer({
      title: c.name,
      rows: [
        { label: "Issuer", value: c.issuer },
        { label: "Issued", value: monthYear(c.issuedDate) },
        { label: "Expires", value: monthYear(c.expiryDate) || "—" },
        {
          label: "Status",
          value: certActive(c.expiryDate) ? "Active" : "Expired",
        },
        { label: "Credential ID", value: c.credentialId ?? "—" },
        { label: "Credential URL", value: c.credentialUrl ?? "—" },
      ],
    })

  // ── Evaluations (HR-managed: view only) ───────────────────────────────────
  const viewEval = (ev: EmployeeEvaluation) =>
    setViewer({
      title: ev.period,
      rows: [
        { label: "Reviewer", value: ev.reviewer },
        { label: "Date", value: ev.date },
        {
          label: "Rating",
          value: ev.rating != null ? `${ev.rating.toFixed(1)} / 5` : "—",
        },
        { label: "Status", value: ev.completed ? "Completed" : "Upcoming" },
      ],
    })

  const EMPLOYMENT_FIELDS = [
    { label: "Employee ID", value: user?.employeeId ?? "—" },
    { label: "Position", value: profile?.position ?? "—" },
    { label: "Department", value: profile?.department ?? "—" },
    { label: "Team", value: profile?.team ?? "—" },
    { label: "Reports to", value: profile?.manager ?? "—" },
    { label: "Start date", value: profile?.startDate ?? "—" },
  ]

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCropSrc(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  return (
    <>
      <PhotoCropModal
        imageSrc={cropSrc}
        onDone={(url) => {
          setPhotoUrl(url)
          setPhotoTouched(true)
          setPhotoError(false)
          setCropSrc(null)
        }}
        onCancel={() => setCropSrc(null)}
      />
      <DetailDialog data={viewer} onClose={() => setViewer(null)} />
      <div className="mx-auto max-w-2xl space-y-8">
        {/* ── Account ── */}
        <div>
          <h3 className="text-[15px] font-semibold">General</h3>
          <p className="text-[13px] text-muted-foreground">
            Manage your account and employment information
          </p>
        </div>
        <Separator />

        {/* ── Account card — employee-editable (toggle) ── */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h4 className="text-[13px] font-semibold">Account</h4>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Your public profile · visible to your team
              </p>
            </div>
            {editingAccount ? (
              <div className="flex items-center gap-1.5">
                <Button
                  size="icon-xs"
                  onClick={saveAccount}
                  disabled={identityBusy}
                  aria-label="Save"
                  title="Save"
                >
                  <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} />
                </Button>
                <Button
                  size="icon-xs"
                  variant="outline"
                  onClick={() => setEditingAccount(false)}
                  aria-label="Cancel"
                  title="Cancel"
                >
                  <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
                </Button>
              </div>
            ) : (
              <button
                onClick={startEditAccount}
                aria-label="Edit account"
                className="flex size-7 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <HugeiconsIcon
                  icon={PencilEdit01Icon}
                  size={13}
                  strokeWidth={2}
                />
              </button>
            )}
          </div>

          {/* Avatar */}
          <div className="flex items-center gap-5">
            {showPhoto ? (
              <img
                src={avatarSrc!}
                alt="Profile photo"
                onError={() => setPhotoError(true)}
                className="size-16 shrink-0 rounded-full object-cover ring-2 ring-border"
              />
            ) : (
              <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                {initials}
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png, image/jpeg"
              className="hidden"
              onChange={handleFileChange}
            />
            {editingAccount ? (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                >
                  Upload photo
                </Button>
                {avatarSrc && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 text-destructive hover:text-destructive"
                    onClick={() => {
                      setPhotoUrl(null)
                      setPhotoTouched(true)
                      setPhotoError(false)
                    }}
                  >
                    Remove
                  </Button>
                )}
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  JPG or PNG · max 2 MB · recommended 256×256
                </p>
              </div>
            ) : (
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold">
                  {accountView.displayName || "—"}
                </p>
                <p className="truncate text-[12px] text-muted-foreground">
                  @{accountView.username || "—"}
                </p>
              </div>
            )}
          </div>

          {/* Display name / username / bio */}
          {editingAccount ? (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Display name</Label>
                  <Input
                    value={accountDraft.displayName}
                    onChange={(e) =>
                      setAccountDraft((d) => ({
                        ...d,
                        displayName: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Username</Label>
                  <Input
                    value={accountDraft.username}
                    onChange={(e) =>
                      setAccountDraft((d) => ({
                        ...d,
                        username: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>
                  Bio{" "}
                  <span className="text-[11px] font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <textarea
                  className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-[13px] placeholder:text-muted-foreground focus:ring-1 focus:ring-ring focus:outline-none"
                  rows={3}
                  placeholder="A short bio visible to your team..."
                  value={accountDraft.bio}
                  onChange={(e) =>
                    setAccountDraft((d) => ({ ...d, bio: e.target.value }))
                  }
                />
              </div>
            </div>
          ) : (
            <div className="mt-5 space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Bio</Label>
              <p
                className={
                  accountView.bio
                    ? "text-[13px]"
                    : "text-[13px] text-muted-foreground"
                }
              >
                {accountView.bio || "No bio yet."}
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* ── Employment record ── */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-[13px] font-semibold">Employment record</h4>
            <p className="text-[12px] text-muted-foreground">
              Managed by HR · contact your manager to request changes
            </p>
          </div>
          <StatusBadge variant="green">Active</StatusBadge>
        </div>

        {/* Employment stage pipeline — read-only (admin-managed) */}
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="mb-4 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            Employment status
          </p>
          {terminal ? (
            <div
              className={cn(
                "rounded-lg border px-4 py-3 text-[13px] font-medium",
                terminal.className
              )}
            >
              This employee is marked as <strong>{terminal.label}</strong>.
            </div>
          ) : (
            <div className="flex items-center">
              {EMPLOYMENT_STAGES.map((s, i) => {
                const isPast = i < stageIdx
                const isCurrent = i === stageIdx
                const isLast = i === EMPLOYMENT_STAGES.length - 1
                return (
                  <div
                    key={s.key}
                    className={cn("flex items-center", !isLast && "flex-1")}
                  >
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className={cn(
                          "flex size-8 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-all",
                          isCurrent
                            ? "border-primary bg-primary/10 text-primary"
                            : isPast
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-muted-foreground"
                        )}
                      >
                        {isPast ? (
                          <svg viewBox="0 0 10 10" className="size-3">
                            <path
                              d="M1.5 5l2.5 2.5 4.5-4.5"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : (
                          i + 1
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-[11px] font-medium",
                          isCurrent
                            ? "text-foreground"
                            : isPast
                              ? "text-primary"
                              : "text-muted-foreground"
                        )}
                      >
                        {s.label}
                      </span>
                    </div>
                    {!isLast && (
                      <div
                        className={cn(
                          "mx-2 mb-5 h-0.5 flex-1",
                          i < stageIdx ? "bg-primary" : "bg-border"
                        )}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Personal information — employee-editable (toggle) */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                Personal information
              </p>
              {editingPersonal ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    size="icon-xs"
                    onClick={savePersonal}
                    disabled={identityBusy}
                    aria-label="Save"
                    title="Save"
                  >
                    <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} />
                  </Button>
                  <Button
                    size="icon-xs"
                    variant="outline"
                    onClick={() => setEditingPersonal(false)}
                    aria-label="Cancel"
                    title="Cancel"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
                  </Button>
                </div>
              ) : (
                <button
                  onClick={startEditPersonal}
                  aria-label="Edit personal information"
                  className="flex size-7 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <HugeiconsIcon
                    icon={PencilEdit01Icon}
                    size={13}
                    strokeWidth={2}
                  />
                </button>
              )}
            </div>

            {editingPersonal ? (
              <div className="space-y-2.5">
                {PERSONAL_FIELDS.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      {f.label}
                    </Label>
                    <Input
                      type={f.type ?? "text"}
                      className="h-8 text-[13px]"
                      value={draft[f.key]}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, [f.key]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2.5">
                {PERSONAL_FIELDS.map((f) => (
                  <div
                    key={f.key}
                    className="flex items-start justify-between gap-4 text-[13px]"
                  >
                    <span className="shrink-0 text-muted-foreground">
                      {f.label}
                    </span>
                    <span className="text-right font-medium">
                      {personal[f.key] || "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Employment information — admin-managed, read-only (no edit button) */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-3 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              Employment information
            </p>
            <div className="space-y-2.5">
              {EMPLOYMENT_FIELDS.map((f) => (
                <div
                  key={f.label}
                  className="flex items-start justify-between gap-4 text-[13px]"
                >
                  <span className="shrink-0 text-muted-foreground">
                    {f.label}
                  </span>
                  <span className="text-right font-medium">{f.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Education background */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              Education background
            </p>
            {eduFormId === null && (
              <button
                onClick={openAddEdu}
                className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <HugeiconsIcon icon={Add01Icon} size={11} strokeWidth={2} />
                Add
              </button>
            )}
          </div>

          {eduFormId !== null && (
            <InlineForm
              isNew={eduFormId === "new"}
              canSave={
                !!eduForm.school.trim() && !!eduForm.degree.trim() && !eduBusy
              }
              onCancel={() => setEduFormId(null)}
              onSave={saveEdu}
            >
              <Input
                className="h-8 text-[13px]"
                placeholder="Degree / Program"
                value={eduForm.degree}
                onChange={(e) =>
                  setEduForm((f) => ({ ...f, degree: e.target.value }))
                }
              />
              <Input
                className="h-8 text-[13px]"
                placeholder="School"
                value={eduForm.school}
                onChange={(e) =>
                  setEduForm((f) => ({ ...f, school: e.target.value }))
                }
              />
              <Input
                className="h-8 text-[13px]"
                placeholder="Field of study (optional)"
                value={eduForm.fieldOfStudy}
                onChange={(e) =>
                  setEduForm((f) => ({ ...f, fieldOfStudy: e.target.value }))
                }
              />
              <Input
                className="h-8 text-[13px]"
                placeholder="Honor (optional)"
                value={eduForm.honor}
                onChange={(e) =>
                  setEduForm((f) => ({ ...f, honor: e.target.value }))
                }
              />
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Start date
                </Label>
                <Input
                  type="date"
                  className="h-8 text-[13px]"
                  value={eduForm.startDate}
                  onChange={(e) =>
                    setEduForm((f) => ({ ...f, startDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  End date (blank = ongoing)
                </Label>
                <Input
                  type="date"
                  className="h-8 text-[13px]"
                  value={eduForm.endDate}
                  onChange={(e) =>
                    setEduForm((f) => ({ ...f, endDate: e.target.value }))
                  }
                />
              </div>
              <Input
                className="col-span-2 h-8 text-[13px]"
                placeholder="Description (optional)"
                value={eduForm.description}
                onChange={(e) =>
                  setEduForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </InlineForm>
          )}

          {education.length === 0 && eduFormId === null ? (
            <p className="py-3 text-center text-[13px] text-muted-foreground">
              No education added yet.
            </p>
          ) : (
            <div className="space-y-2.5">
              {education
                .filter((e) => e.id !== eduFormId)
                .map((e) => (
                  <div
                    key={e.id}
                    className="group rounded-lg border border-border px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium">{e.degree}</p>
                        <p className="text-[12px] text-muted-foreground">
                          {e.school}
                          {e.fieldOfStudy ? ` · ${e.fieldOfStudy}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {yearRange(e.startDate, e.endDate)}
                        </span>
                        <RowActions
                          onView={() => viewEdu(e)}
                          onEdit={() => openEditEdu(e)}
                          onDelete={() => removeEducation(e.id)}
                        />
                      </div>
                    </div>
                    {e.honor && (
                      <p className="mt-1 text-[11px] font-medium text-primary">
                        {e.honor}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Work experience */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              <HugeiconsIcon icon={BriefcaseIcon} size={13} strokeWidth={1.8} />
              Work experience
            </p>
            {workFormId === null && (
              <button
                onClick={openAddWork}
                className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <HugeiconsIcon icon={Add01Icon} size={11} strokeWidth={2} />
                Add
              </button>
            )}
          </div>

          {workFormId !== null && (
            <InlineForm
              isNew={workFormId === "new"}
              canSave={
                !!workForm.title.trim() &&
                !!workForm.company.trim() &&
                !workBusy
              }
              onCancel={() => setWorkFormId(null)}
              onSave={saveWork}
            >
              <Input
                className="h-8 text-[13px]"
                placeholder="Job title"
                value={workForm.title}
                onChange={(e) =>
                  setWorkForm((f) => ({ ...f, title: e.target.value }))
                }
              />
              <Input
                className="h-8 text-[13px]"
                placeholder="Company"
                value={workForm.company}
                onChange={(e) =>
                  setWorkForm((f) => ({ ...f, company: e.target.value }))
                }
              />
              <select
                value={workForm.employmentType}
                onChange={(e) =>
                  setWorkForm((f) => ({ ...f, employmentType: e.target.value }))
                }
                className="h-8 rounded-md border border-input bg-transparent px-2 text-[13px] focus:ring-1 focus:ring-ring focus:outline-none"
              >
                <option value="">Employment type…</option>
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <Input
                className="h-8 text-[13px]"
                placeholder="Location (optional)"
                value={workForm.location}
                onChange={(e) =>
                  setWorkForm((f) => ({ ...f, location: e.target.value }))
                }
              />
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Start date
                </Label>
                <Input
                  type="date"
                  className="h-8 text-[13px]"
                  value={workForm.startDate}
                  onChange={(e) =>
                    setWorkForm((f) => ({ ...f, startDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  End date (blank = current)
                </Label>
                <Input
                  type="date"
                  className="h-8 text-[13px]"
                  value={workForm.endDate}
                  onChange={(e) =>
                    setWorkForm((f) => ({ ...f, endDate: e.target.value }))
                  }
                />
              </div>
              <Input
                className="col-span-2 h-8 text-[13px]"
                placeholder="Description (optional)"
                value={workForm.description}
                onChange={(e) =>
                  setWorkForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </InlineForm>
          )}

          {work.length === 0 && workFormId === null ? (
            <p className="py-3 text-center text-[13px] text-muted-foreground">
              No work experience added yet.
            </p>
          ) : (
            <div className="space-y-2.5">
              {work
                .filter((w) => w.id !== workFormId)
                .map((w) => (
                  <div
                    key={w.id}
                    className="group rounded-lg border border-border px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium">{w.title}</p>
                        <p className="text-[12px] text-muted-foreground">
                          {w.company}
                          {w.employmentType ? ` · ${w.employmentType}` : ""}
                          {w.location ? ` · ${w.location}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {yearRange(w.startDate, w.endDate)}
                        </span>
                        <RowActions
                          onView={() => viewWork(w)}
                          onEdit={() => openEditWork(w)}
                          onDelete={() => removeWork(w.id)}
                        />
                      </div>
                    </div>
                    {w.description && (
                      <p className="mt-1 text-[12px] text-muted-foreground">
                        {w.description}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Certificates */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              Certificates
            </p>
            {certFormId === null && (
              <button
                onClick={openAddCert}
                className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <HugeiconsIcon icon={Add01Icon} size={11} strokeWidth={2} />
                Add
              </button>
            )}
          </div>

          {certFormId !== null && (
            <InlineForm
              isNew={certFormId === "new"}
              canSave={
                !!certForm.name.trim() && !!certForm.issuer.trim() && !certBusy
              }
              onCancel={() => setCertFormId(null)}
              onSave={saveCert}
            >
              <Input
                className="h-8 text-[13px]"
                placeholder="Certificate name"
                value={certForm.name}
                onChange={(e) =>
                  setCertForm((f) => ({ ...f, name: e.target.value }))
                }
              />
              <Input
                className="h-8 text-[13px]"
                placeholder="Issuer"
                value={certForm.issuer}
                onChange={(e) =>
                  setCertForm((f) => ({ ...f, issuer: e.target.value }))
                }
              />
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Issued date
                </Label>
                <Input
                  type="date"
                  className="h-8 text-[13px]"
                  value={certForm.issuedDate}
                  onChange={(e) =>
                    setCertForm((f) => ({ ...f, issuedDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Expiry date (blank = no expiry)
                </Label>
                <Input
                  type="date"
                  className="h-8 text-[13px]"
                  value={certForm.expiryDate}
                  onChange={(e) =>
                    setCertForm((f) => ({ ...f, expiryDate: e.target.value }))
                  }
                />
              </div>
              <Input
                className="h-8 text-[13px]"
                placeholder="Credential ID (optional)"
                value={certForm.credentialId}
                onChange={(e) =>
                  setCertForm((f) => ({ ...f, credentialId: e.target.value }))
                }
              />
              <Input
                className="h-8 text-[13px]"
                placeholder="Credential URL (optional)"
                value={certForm.credentialUrl}
                onChange={(e) =>
                  setCertForm((f) => ({ ...f, credentialUrl: e.target.value }))
                }
              />
            </InlineForm>
          )}

          {certificates.length === 0 && certFormId === null ? (
            <p className="py-3 text-center text-[13px] text-muted-foreground">
              No certificates added yet.
            </p>
          ) : (
            <div className="space-y-2.5">
              {certificates
                .filter((c) => c.id !== certFormId)
                .map((c) => {
                  const active = certActive(c.expiryDate)
                  return (
                    <div
                      key={c.id}
                      className="group flex items-start justify-between gap-3 rounded-lg border border-border px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium">{c.name}</p>
                        <p className="text-[12px] text-muted-foreground">
                          {c.issuer}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {c.issuedDate
                            ? `Issued ${monthYear(c.issuedDate)}`
                            : ""}
                          {c.expiryDate
                            ? ` · Expires ${monthYear(c.expiryDate)}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge variant={active ? "green" : "gray"}>
                          {active ? "Active" : "Expired"}
                        </StatusBadge>
                        <RowActions
                          onView={() => viewCert(c)}
                          onEdit={() => openEditCert(c)}
                          onDelete={() => removeCertificate(c.id)}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        {/* Evaluations */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            Evaluations
          </p>
          {evaluations.length === 0 ? (
            <p className="py-3 text-center text-[13px] text-muted-foreground">
              No evaluations yet.
            </p>
          ) : (
            <div className="space-y-2.5">
              {evaluations.map((ev) => (
                <div
                  key={ev.period}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium">{ev.period}</p>
                    <p className="text-[12px] text-muted-foreground">
                      Reviewer: {ev.reviewer} · {ev.date}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5">
                    {ev.rating != null && (
                      <span className="text-[13px] font-semibold tabular-nums">
                        {ev.rating.toFixed(1)}
                        <span className="font-normal text-muted-foreground">
                          /5
                        </span>
                      </span>
                    )}
                    <StatusBadge variant={ev.completed ? "green" : "amber"}>
                      {ev.completed ? "Completed" : "Upcoming"}
                    </StatusBadge>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => viewEval(ev)}
                    >
                      <HugeiconsIcon icon={EyeIcon} strokeWidth={2} />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Documents */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            Documents on file
          </p>
          {documents.length === 0 ? (
            <p className="py-3 text-center text-[13px] text-muted-foreground">
              No documents on file yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 rounded-lg border border-border px-4 py-3"
                >
                  <span className="text-base">📄</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">
                      {doc.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {doc.uploadedAt}
                    </p>
                  </div>
                  <button className="shrink-0 text-[12px] text-primary hover:underline">
                    View
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
