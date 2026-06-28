"use client"

import { useMemo, useState } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import listPlugin from "@fullcalendar/list"
import interactionPlugin from "@fullcalendar/interaction"
import type { DateClickArg } from "@fullcalendar/interaction"
import type {
  EventClickArg,
  EventContentArg,
  EventInput,
} from "@fullcalendar/core"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Delete02Icon,
  FloppyDiskIcon,
  RefreshIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  useHolidays,
  useCreateHoliday,
  useUpdateHoliday,
  useDeleteHoliday,
} from "@/hooks/use-holidays"
import {
  HOLIDAY_TYPE_LABEL,
  HOLIDAY_TYPE_MULTIPLIER,
  type Holiday,
  type HolidayType,
} from "@/lib/holiday-api"

type HolidayForm = {
  date: string
  name: string
  holidayType: HolidayType
  recurring: boolean
}

const EMPTY_FORM: HolidayForm = {
  date: "",
  name: "",
  holidayType: "REGULAR",
  recurring: false,
}

const TYPE_OPTIONS: HolidayType[] = ["REGULAR", "SPECIAL_NON_WORKING"]

function fmtDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

// ── Modal ────────────────────────────────────────────────────────────────────

function HolidayModal({
  editing,
  form,
  error,
  busy,
  onClose,
  onSubmit,
  onDelete,
  setForm,
}: {
  editing: boolean
  form: HolidayForm
  error: string | null
  busy: boolean
  onClose: () => void
  onSubmit: () => void
  onDelete?: () => void
  setForm: (v: HolidayForm) => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md animate-in rounded-2xl border border-border bg-card p-6 shadow-xl duration-200 zoom-in-95 fade-in">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">
            {editing ? "Edit Holiday" : "New Holiday"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-[12px] text-muted-foreground">Name *</label>
            <Input
              autoFocus
              className="h-9 text-[13px]"
              placeholder="e.g. Independence Day"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            />
          </div>

          {/* Date + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[12px] text-muted-foreground">
                Date *
              </label>
              <Input
                type="date"
                className="h-9 text-[13px]"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] text-muted-foreground">
                Type *
              </label>
              <select
                value={form.holidayType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    holidayType: e.target.value as HolidayType,
                  })
                }
                className="h-9 w-full rounded-lg border bg-background px-3 text-[13px] text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {HOLIDAY_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Rate hint */}
          <div className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-[12px] text-purple-700 dark:border-purple-800/40 dark:bg-purple-900/10 dark:text-purple-300">
            Worked-day pay:{" "}
            <span className="font-bold">
              ×{HOLIDAY_TYPE_MULTIPLIER[form.holidayType].toFixed(2)}
            </span>{" "}
            (×1.30 again when it lands on a rest day)
          </div>

          {/* Recurring */}
          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 py-2.5">
            <input
              type="checkbox"
              checked={form.recurring}
              onChange={(e) =>
                setForm({ ...form, recurring: e.target.checked })
              }
              className="size-4 accent-primary"
            />
            <div>
              <p className="text-[13px] font-medium">Repeats every year</p>
              <p className="text-[11px] text-muted-foreground">
                For fixed-date holidays like Christmas — matches the same
                month/day each year.
              </p>
            </div>
          </label>

          {error && (
            <p className="text-[12px] font-medium text-destructive">{error}</p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          {editing && onDelete ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              disabled={busy}
              className="border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/20"
            >
              <HugeiconsIcon
                icon={Delete02Icon}
                size={13}
                strokeWidth={2}
                className="mr-1.5"
              />
              Delete
            </Button>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              * Required fields
            </p>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={onSubmit} disabled={busy}>
              <HugeiconsIcon
                icon={FloppyDiskIcon}
                size={13}
                strokeWidth={2}
                className="mr-1.5"
              />
              {busy ? "Saving…" : editing ? "Update" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Event rendering ──────────────────────────────────────────────────────────

function renderEventContent(arg: EventContentArg) {
  const recurring = arg.event.extendedProps.recurring as boolean
  return (
    <div className="flex items-center gap-1 overflow-hidden px-0.5">
      {recurring && (
        <HugeiconsIcon
          icon={RefreshIcon}
          size={10}
          strokeWidth={2}
          className="shrink-0"
        />
      )}
      <span className="truncate">{arg.event.title}</span>
    </div>
  )
}

// ── Section ──────────────────────────────────────────────────────────────────

export function HolidaysConfigSection() {
  const { data: holidays = [] } = useHolidays()
  const createMut = useCreateHoliday()
  const updateMut = useUpdateHoliday()
  const deleteMut = useDeleteHoliday()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<HolidayForm>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{
    msg: string
    type: "success" | "error"
  } | null>(null)

  const busy = createMut.isPending || updateMut.isPending || deleteMut.isPending

  // Calendar events. A recurring (fixed-date) holiday is expanded across a window of years so it
  // shows on every year the admin can navigate to; one-off holidays use their stored date.
  const events = useMemo<EventInput[]>(() => {
    const baseYear = new Date().getFullYear()
    const out: EventInput[] = []
    const toEvent = (h: Holiday, dateStr: string): EventInput => ({
      id: `${h.id}-${dateStr}`,
      title: h.name,
      start: dateStr,
      allDay: true,
      classNames: [h.holidayType === "REGULAR" ? "hol-regular" : "hol-special"],
      extendedProps: { holiday: h, recurring: h.recurring },
    })
    for (const h of holidays) {
      if (!h.active) continue
      if (h.recurring) {
        const md = h.date.slice(5) // "MM-DD"
        for (let y = baseYear - 2; y <= baseYear + 5; y++) {
          out.push(toEvent(h, `${y}-${md}`))
        }
      } else {
        out.push(toEvent(h, h.date))
      }
    }
    return out
  }, [holidays])

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function openCreate(dateStr?: string) {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, date: dateStr ?? "" })
    setError(null)
    setShowForm(true)
  }

  function openEdit(h: Holiday) {
    setEditingId(h.id)
    setForm({
      date: h.date,
      name: h.name,
      holidayType: h.holidayType,
      recurring: h.recurring,
    })
    setError(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError(null)
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      setError("Name is required.")
      return
    }
    if (!form.date) {
      setError("Date is required.")
      return
    }
    setError(null)

    const onError = (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Something went wrong. Please try again."
      setError(msg)
    }
    const body = {
      date: form.date,
      name: form.name.trim(),
      holidayType: form.holidayType,
      recurring: form.recurring,
    }

    if (editingId) {
      updateMut.mutate(
        { id: editingId, body },
        {
          onSuccess: () => {
            closeForm()
            showToast("Holiday updated.", "success")
          },
          onError,
        }
      )
    } else {
      createMut.mutate(body, {
        onSuccess: () => {
          closeForm()
          showToast("Holiday added.", "success")
        },
        onError,
      })
    }
  }

  function handleDelete() {
    if (!editingId) return
    const h = holidays.find((x) => x.id === editingId)
    if (!h) return
    if (!confirm(`Delete "${h.name}" (${fmtDate(h.date)})?`)) return
    deleteMut.mutate(h.id, {
      onSuccess: () => {
        closeForm()
        showToast("Holiday deleted.", "success")
      },
      onError: () => showToast("Failed to delete.", "error"),
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-semibold">Holiday Calendar</p>
          <p className="mt-0.5 max-w-xl text-[12px] text-muted-foreground">
            Declared holidays drive premium pay when worked: a filed
            overtime/duty claim is auto-classified (regular ×2.00, special
            ×1.30, and ×1.30 again on a rest day) and the day is flagged on
            employee timesheets. Click a day to add, or a holiday to edit.
          </p>
        </div>
        <Button size="sm" onClick={() => openCreate()}>
          <HugeiconsIcon
            icon={Add01Icon}
            size={13}
            strokeWidth={2}
            className="mr-1.5"
          />
          New Holiday
        </Button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="flex justify-end">
          <div
            className={
              "flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-medium shadow-md " +
              (toast.type === "success"
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white")
            }
          >
            <HugeiconsIcon
              icon={
                toast.type === "success" ? CheckmarkCircle01Icon : Cancel01Icon
              }
              size={14}
              strokeWidth={2}
            />
            {toast.msg}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-pbg ring-1 ring-pt ring-inset" />
          Regular Holiday · ×2.00
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-blue-light ring-1 ring-blue-border ring-inset" />
          Special Non-Working · ×1.30
        </div>
        <div className="flex items-center gap-1.5">
          <HugeiconsIcon icon={RefreshIcon} size={11} strokeWidth={2} />
          Repeats yearly
        </div>
      </div>

      {/* Calendar */}
      <div className="fc-holiday rounded-xl border border-border bg-card p-3 shadow-sm">
        <FullCalendar
          plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,dayGridWeek,listYear",
          }}
          buttonText={{ today: "Today" }}
          views={{
            dayGridMonth: { buttonText: "Month" },
            dayGridWeek: { buttonText: "Week" },
            listYear: {
              buttonText: "List",
              listDayFormat: {
                weekday: "long",
                month: "short",
                day: "numeric",
              },
            },
          }}
          firstDay={0}
          height="auto"
          fixedWeekCount={false}
          displayEventTime={false}
          dayMaxEvents={3}
          events={events}
          eventContent={renderEventContent}
          dateClick={(arg: DateClickArg) => openCreate(arg.dateStr)}
          eventClick={(arg: EventClickArg) =>
            openEdit(arg.event.extendedProps.holiday as Holiday)
          }
          noEventsContent="No holidays in this period — click a day to add one."
        />
      </div>

      {showForm && (
        <HolidayModal
          editing={!!editingId}
          form={form}
          error={error}
          busy={busy}
          onClose={closeForm}
          onSubmit={handleSubmit}
          onDelete={editingId ? handleDelete : undefined}
          setForm={setForm}
        />
      )}
    </div>
  )
}
