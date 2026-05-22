"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/custom/status-badge"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Settings02Icon,
  StarIcon,
  GiftIcon,
} from "@hugeicons/core-free-icons"
import {
  useRewardRules,
  useCreateRule,
  useUpdateRule,
  useToggleRule,
} from "@/hooks/use-rewards"
import {
  type RewardRule,
  type RewardRulePayload,
  type RuleType,
  type RewardType,
  type TriggerType,
} from "@/lib/rewards-api"

const EMPTY_FORM: RewardRulePayload = {
  name: "",
  ruleType: "rating",
  ratingMin: null,
  ratingMax: null,
  minSessions: null,
  minAttendanceRate: null,
  rewardType: "monetary",
  monetaryAmount: null,
  materialItem: null,
  triggerType: "per-session",
  active: true,
  effectiveFrom: "",
  effectiveTo: null,
}

function ruleTypeLabel(t: RuleType) {
  return t === "rating"
    ? "Rating-Based"
    : t === "performance"
      ? "Performance-Based"
      : "Material"
}

function triggerLabel(t: TriggerType) {
  return t === "per-session"
    ? "Per session"
    : t === "weekly-bonus"
      ? "Weekly bonus"
      : "Monthly bonus"
}

// ── Rule form dialog ───────────────────────────────────────────────────────

function RuleDialog({
  open,
  onClose,
  editing,
}: {
  open: boolean
  onClose: () => void
  editing: RewardRule | null
}) {
  const [form, setForm] = useState<RewardRulePayload>(
    editing
      ? {
          name: editing.name,
          ruleType: editing.ruleType,
          ratingMin: editing.ratingMin,
          ratingMax: editing.ratingMax,
          minSessions: editing.minSessions,
          minAttendanceRate: editing.minAttendanceRate,
          rewardType: editing.rewardType,
          monetaryAmount: editing.monetaryAmount,
          materialItem: editing.materialItem,
          triggerType: editing.triggerType,
          active: editing.active,
          effectiveFrom: editing.effectiveFrom,
          effectiveTo: editing.effectiveTo,
        }
      : EMPTY_FORM
  )

  const createMutation = useCreateRule()
  const updateMutation = useUpdateRule()

  function set<K extends keyof RewardRulePayload>(
    k: K,
    v: RewardRulePayload[K]
  ) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function handleSave() {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, payload: form })
    } else {
      await createMutation.mutateAsync(form)
    }
    onClose()
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Rule" : "New Reward Rule"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-[13px]">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">Rule name</Label>
            <Input
              placeholder="e.g. 5-Star Session Bonus"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          {/* Rule type */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">Rule type</Label>
            <Select
              value={form.ruleType}
              onValueChange={(v) => set("ruleType", v as RuleType)}
            >
              <SelectTrigger className="text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating" className="text-[12px]">
                  Rating-Based (per star rating)
                </SelectItem>
                <SelectItem value="performance" className="text-[12px]">
                  Performance-Based (sessions / attendance)
                </SelectItem>
                <SelectItem value="material" className="text-[12px]">
                  Material Reward (custom item)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Rating-based conditions */}
          {form.ruleType === "rating" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[12px]">Min rating (★)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  placeholder="e.g. 4"
                  value={form.ratingMin ?? ""}
                  onChange={(e) =>
                    set(
                      "ratingMin",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px]">Max rating (★)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  placeholder="e.g. 5"
                  value={form.ratingMax ?? ""}
                  onChange={(e) =>
                    set(
                      "ratingMax",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                />
              </div>
            </div>
          )}

          {/* Performance conditions */}
          {form.ruleType === "performance" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[12px]">Min sessions</Label>
                <Input
                  type="number"
                  placeholder="e.g. 20"
                  value={form.minSessions ?? ""}
                  onChange={(e) =>
                    set(
                      "minSessions",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px]">Min attendance rate (%)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 100"
                  value={form.minAttendanceRate ?? ""}
                  onChange={(e) =>
                    set(
                      "minAttendanceRate",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                />
              </div>
            </div>
          )}

          {/* Trigger type */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">Trigger</Label>
            <Select
              value={form.triggerType}
              onValueChange={(v) => set("triggerType", v as TriggerType)}
            >
              <SelectTrigger className="text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="per-session" className="text-[12px]">
                  Per session
                </SelectItem>
                <SelectItem value="weekly-bonus" className="text-[12px]">
                  Weekly bonus
                </SelectItem>
                <SelectItem value="monthly-bonus" className="text-[12px]">
                  Monthly bonus
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reward type + value */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">Reward type</Label>
            <Select
              value={form.rewardType}
              onValueChange={(v) => set("rewardType", v as RewardType)}
            >
              <SelectTrigger className="text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monetary" className="text-[12px]">
                  💰 Monetary (₱ amount)
                </SelectItem>
                <SelectItem value="material" className="text-[12px]">
                  📦 Material (item / package)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.rewardType === "monetary" ? (
            <div className="space-y-1.5">
              <Label className="text-[12px]">Amount (₱)</Label>
              <Input
                type="number"
                placeholder="e.g. 10"
                value={form.monetaryAmount ?? ""}
                onChange={(e) =>
                  set(
                    "monetaryAmount",
                    e.target.value ? Number(e.target.value) : null
                  )
                }
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-[12px]">Item name</Label>
              <Input
                placeholder="e.g. Grocery package, Gift card"
                value={form.materialItem ?? ""}
                onChange={(e) => set("materialItem", e.target.value || null)}
              />
            </div>
          )}

          {/* Effective dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Effective from</Label>
              <Input
                type="date"
                value={form.effectiveFrom}
                onChange={(e) => set("effectiveFrom", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">
                Effective to{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                type="date"
                value={form.effectiveTo ?? ""}
                onChange={(e) => set("effectiveTo", e.target.value || null)}
              />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-[13px] font-medium">Active</p>
              <p className="text-[11px] text-muted-foreground">
                Rule will be applied to eligible teachers
              </p>
            </div>
            <Switch
              checked={form.active}
              onCheckedChange={(v) => set("active", v)}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!form.name || !form.effectiveFrom || isPending}
              onClick={handleSave}
            >
              {isPending ? "Saving…" : editing ? "Save changes" : "Create rule"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export function RewardsRules() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<RewardRule | null>(null)

  const { data: rules = [], isLoading, isError } = useRewardRules()
  const toggleMutation = useToggleRule()

  function openNew() {
    setEditing(null)
    setDialogOpen(true)
  }
  function openEdit(rule: RewardRule) {
    setEditing(rule)
    setDialogOpen(true)
  }

  const COLUMNS = [
    "Rule",
    "Type",
    "Condition",
    "Reward",
    "Trigger",
    "Dates",
    "Active",
    "",
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-muted-foreground">
          Define how ratings and performance convert into rewards.
        </p>
        <Button size="sm" onClick={openNew}>
          <HugeiconsIcon
            icon={Add01Icon}
            size={13}
            strokeWidth={2}
            className="mr-1.5"
          />
          New rule
        </Button>
      </div>

      {isError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          Failed to load rules
        </p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((h) => (
              <TableHead key={h} className="text-[11px]">
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell
                colSpan={COLUMNS.length}
                className="py-8 text-center text-[13px] text-muted-foreground"
              >
                Loading…
              </TableCell>
            </TableRow>
          ) : rules.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={COLUMNS.length}
                className="py-8 text-center text-[13px] text-muted-foreground"
              >
                No rules yet — create one to start computing rewards
              </TableCell>
            </TableRow>
          ) : (
            rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="text-[13px] font-medium">
                  {rule.name}
                </TableCell>
                <TableCell>
                  <StatusBadge
                    variant={
                      rule.ruleType === "rating"
                        ? "amber"
                        : rule.ruleType === "performance"
                          ? "blue"
                          : "purple"
                    }
                    dot={false}
                  >
                    {ruleTypeLabel(rule.ruleType)}
                  </StatusBadge>
                </TableCell>
                <TableCell className="text-[12px] text-muted-foreground">
                  {rule.ruleType === "rating" && rule.ratingMin != null && (
                    <span className="flex items-center gap-1">
                      <HugeiconsIcon
                        icon={StarIcon}
                        size={11}
                        strokeWidth={0}
                        className="fill-amber-400 text-amber-400"
                      />
                      {rule.ratingMin}–{rule.ratingMax} stars
                    </span>
                  )}
                  {rule.ruleType === "performance" && (
                    <span>
                      {rule.minSessions != null &&
                        `≥${rule.minSessions} sessions`}
                      {rule.minAttendanceRate != null &&
                        ` / ${rule.minAttendanceRate}% attendance`}
                    </span>
                  )}
                  {rule.ruleType === "material" && rule.materialItem}
                </TableCell>
                <TableCell className="text-[12px]">
                  {rule.rewardType === "monetary" ? (
                    <span className="font-medium text-success">
                      ₱{rule.monetaryAmount?.toLocaleString("en-PH")}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <HugeiconsIcon
                        icon={GiftIcon}
                        size={12}
                        strokeWidth={1.8}
                        className="text-violet-500"
                      />
                      {rule.materialItem}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-[12px] text-muted-foreground">
                  {triggerLabel(rule.triggerType)}
                </TableCell>
                <TableCell className="text-[11px] text-muted-foreground tabular-nums">
                  {rule.effectiveFrom}
                  {rule.effectiveTo ? ` → ${rule.effectiveTo}` : " →"}
                </TableCell>
                <TableCell>
                  <Switch
                    size="sm"
                    checked={rule.active}
                    onCheckedChange={() => toggleMutation.mutate(rule.id)}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => openEdit(rule)}
                  >
                    <HugeiconsIcon
                      icon={Settings02Icon}
                      size={13}
                      strokeWidth={2}
                    />
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <RuleDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setEditing(null)
        }}
        editing={editing}
      />
    </div>
  )
}
