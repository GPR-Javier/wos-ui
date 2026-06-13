"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTheme } from "next-themes"
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  Panel,
  Handle,
  Position,
  NodeResizer,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type NodeChange,
  type Connection,
  type NodeProps,
  type OnNodeDrag,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import dagre from "dagre"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
} from "@/components/ui/context-menu"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  Building03Icon,
  UserShield01Icon,
  UserAdd01Icon,
  DragDropIcon,
  CursorMove01Icon,
  Cancel01Icon,
  PencilEdit01Icon,
  Add01Icon,
  FloppyDiskIcon,
} from "@hugeicons/core-free-icons"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/store/auth-store"
import { useToastStore } from "@/store/toast-store"
import {
  useDepartments,
  useCreateDepartment,
} from "@/hooks/use-employee-profile"
import { useCreateUserRole } from "@/hooks/use-admin-roles"
import { RoleFormModal } from "@/components/dashboard/admin/roles"
import { DepartmentFormModal } from "@/components/dashboard/admin/departments"
import { CreateUserModal } from "@/components/dashboard/admin/users"
import type { Department } from "@/lib/employee-profile-api"
import {
  useOrgGraph,
  useOrgLayout,
  useSetManager,
  useSetDepartment,
  useSaveLayout,
} from "@/hooks/use-org-chart"
import type { OrgNode, OrgLayout } from "@/lib/org-chart-api"

const EDIT_AUTHORITY = "CONFIGURATION:EDIT_COMPANY_DETAILS"

// ── Model ───────────────────────────────────────────────────────────────────────
// Node ids are String(userId); managerId is String(manager userId) | null.

type Person = {
  id: string
  userId: number
  name: string
  title: string
  departmentId: number | null
  deptName: string
  managerId: string | null
}

type DeptInfo = { id: number; name: string }

// Deterministic colour per department id (Tailwind needs static class strings, so a fixed palette).
const PALETTE = [
  {
    chip: "bg-rose-500/15 text-rose-600 ring-rose-500/30 dark:text-rose-400",
    rgb: "244 63 94",
  },
  {
    chip: "bg-violet-500/15 text-violet-600 ring-violet-500/30 dark:text-violet-400",
    rgb: "139 92 246",
  },
  {
    chip: "bg-blue-500/15 text-blue-600 ring-blue-500/30 dark:text-blue-400",
    rgb: "59 130 246",
  },
  {
    chip: "bg-amber-500/15 text-amber-600 ring-amber-500/30 dark:text-amber-400",
    rgb: "245 158 11",
  },
  {
    chip: "bg-emerald-500/15 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400",
    rgb: "16 185 129",
  },
  {
    chip: "bg-cyan-500/15 text-cyan-600 ring-cyan-500/30 dark:text-cyan-400",
    rgb: "6 182 212",
  },
  {
    chip: "bg-fuchsia-500/15 text-fuchsia-600 ring-fuchsia-500/30 dark:text-fuchsia-400",
    rgb: "217 70 239",
  },
  {
    chip: "bg-indigo-500/15 text-indigo-600 ring-indigo-500/30 dark:text-indigo-400",
    rgb: "99 102 241",
  },
]
const NEUTRAL = {
  chip: "bg-muted text-muted-foreground ring-border",
  rgb: "127 127 140",
}
const colorFor = (id: number | null | undefined) =>
  id == null
    ? NEUTRAL
    : PALETTE[((id % PALETTE.length) + PALETTE.length) % PALETTE.length]

const NODE_W = 190
const NODE_H = 108
const PAD = 26

const initials = (n: string) =>
  n
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

function descendantsOf(people: Person[], id: string): Set<string> {
  const out = new Set<string>()
  const stack = [id]
  while (stack.length) {
    const cur = stack.pop()!
    for (const c of people.filter((p) => p.managerId === cur)) {
      out.add(c.id)
      stack.push(c.id)
    }
  }
  return out
}

/** Sets reportId's manager to managerId, unless it would create a cycle. */
function reparentPeople(
  people: Person[],
  managerId: string,
  reportId: string
): Person[] {
  if (managerId === reportId || descendantsOf(people, reportId).has(managerId))
    return people
  return people.map((p) => (p.id === reportId ? { ...p, managerId } : p))
}

/** Does a node's rectangle contain the point (cx, cy)? Used for center-of-card hit-testing. */
function nodeContains(n: Node, cx: number, cy: number): boolean {
  const styleW = typeof n.style?.width === "number" ? n.style.width : NODE_W
  const styleH = typeof n.style?.height === "number" ? n.style.height : NODE_H
  const w = n.measured?.width ?? styleW
  const h = n.measured?.height ?? styleH
  return (
    cx >= n.position.x &&
    cx <= n.position.x + w &&
    cy >= n.position.y &&
    cy <= n.position.y + h
  )
}

type DropTarget =
  | { mode: "report"; id: string; label: string }
  | { mode: "dept"; departmentId: number; label: string }
  | null

function resolveTarget(
  people: Person[],
  nodes: Node[],
  draggedId: string,
  pos: { x: number; y: number }
): DropTarget {
  const me = people.find((p) => p.id === draggedId)
  if (!me) return null
  const cx = pos.x + NODE_W / 2
  const cy = pos.y + NODE_H / 2

  const personHit = nodes.find(
    (n) => n.type === "person" && n.id !== draggedId && nodeContains(n, cx, cy)
  )
  if (
    personHit &&
    me.managerId !== personHit.id &&
    !descendantsOf(people, draggedId).has(personHit.id)
  ) {
    return {
      mode: "report",
      id: personHit.id,
      label: people.find((p) => p.id === personHit.id)?.name ?? "",
    }
  }
  const boxHit = nodes.find(
    (n) => n.type === "deptbox" && nodeContains(n, cx, cy)
  )
  if (boxHit) {
    const departmentId = Number(String(boxHit.id).slice(4))
    if (departmentId !== me.departmentId) {
      return {
        mode: "dept",
        departmentId,
        label: (boxHit.data as BoxData).label,
      }
    }
  }
  return null
}

// ── Layout (dagre top-down) + department bounding boxes ─────────────────────────

type PersonData = { person: Person; chip: string; isTarget?: boolean }
type BoxData = {
  departmentId: number
  label: string
  rgb: string
  chip: string
  onOpen: (id: number) => void
  isTarget?: boolean
}
type Rect = { x: number; y: number; w: number; h: number }

type SavedPos = Map<string, { x: number; y: number }>
type SavedBox = Map<number, Rect>

/** A point-in-time snapshot for undo: structure (people) + canvas (nodes) + grouped mode. */
type Snapshot = { people: Person[]; nodes: Node[]; grouped: boolean }

const edgesFromPeople = (people: Person[]): Edge[] =>
  people
    .filter((p) => p.managerId)
    .map((p) => ({
      id: `e-${p.managerId}-${p.id}`,
      source: p.managerId!,
      target: p.id,
      type: "smoothstep",
    }))

function makeBoxNode(
  dept: DeptInfo,
  r: Rect,
  onDeptOpen: (id: number) => void
): Node {
  const c = colorFor(dept.id)
  return {
    id: `box:${dept.id}`,
    type: "deptbox",
    position: { x: r.x, y: r.y },
    data: {
      departmentId: dept.id,
      label: dept.name,
      rgb: c.rgb,
      chip: c.chip,
      onOpen: onDeptOpen,
    } satisfies BoxData,
    draggable: true,
    selectable: true,
    zIndex: 0,
    style: { width: r.w, height: r.h },
  }
}

/** A department box that wraps the given member rectangles (in current/free positions), with padding. */
function boxAround(
  dept: DeptInfo,
  rects: Rect[],
  onDeptOpen: (id: number) => void,
  saved?: Rect
): Node[] {
  if (saved) return [makeBoxNode(dept, saved, onDeptOpen)]
  if (!rects.length) return []
  const minX = Math.min(...rects.map((r) => r.x)) - PAD
  const maxX = Math.max(...rects.map((r) => r.x + r.w)) + PAD
  const minY = Math.min(...rects.map((r) => r.y)) - PAD
  const maxY = Math.max(...rects.map((r) => r.y + r.h)) + PAD
  return [
    makeBoxNode(
      dept,
      { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
      onDeptOpen
    ),
  ]
}

/** Department boxes computed from the live (free-dragged) person-node positions — no re-layout. */
function deptBoxesFromNodes(
  persons: Node[],
  people: Person[],
  depts: DeptInfo[],
  onDeptOpen: (id: number) => void
): Node[] {
  return depts.flatMap((dept) => {
    const rects = persons
      .filter(
        (n) => people.find((p) => p.id === n.id)?.departmentId === dept.id
      )
      .map((n) => ({
        x: n.position.x,
        y: n.position.y,
        w: n.measured?.width ?? NODE_W,
        h: n.measured?.height ?? NODE_H,
      }))
    return boxAround(dept, rects, onDeptOpen)
  })
}

/** Full dagre layout, with optional saved-position overlay. Used on first load, Reset and Tidy. */
function buildFlow(
  people: Person[],
  depts: DeptInfo[],
  onDeptOpen: (id: number) => void,
  grouped: boolean,
  savedPos?: SavedPos,
  savedBox?: SavedBox
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph()
  g.setGraph({
    rankdir: "TB",
    nodesep: 55,
    ranksep: 90,
    marginx: 30,
    marginy: 30,
  })
  g.setDefaultEdgeLabel(() => ({}))
  people.forEach((p) => g.setNode(p.id, { width: NODE_W, height: NODE_H }))
  people.forEach((p) => p.managerId && g.setEdge(p.managerId, p.id))
  dagre.layout(g)

  // Saved position wins; otherwise the auto-computed one (so new hires still land sensibly).
  const at = (id: string) => {
    const saved = savedPos?.get(id)
    if (saved) return saved
    const n = g.node(id)
    return { x: n.x - NODE_W / 2, y: n.y - NODE_H / 2 }
  }

  const personNodes: Node[] = people.map((p) => ({
    id: p.id,
    type: "person",
    position: at(p.id),
    data: {
      person: p,
      chip: colorFor(p.departmentId).chip,
    } satisfies PersonData,
    zIndex: 1,
  }))

  const boxNodes = grouped
    ? depts.flatMap((dept) =>
        boxAround(
          dept,
          people
            .filter((p) => p.departmentId === dept.id)
            .map((p) => ({ ...at(p.id), w: NODE_W, h: NODE_H })),
          onDeptOpen,
          savedBox?.get(dept.id)
        )
      )
    : []

  return {
    nodes: [...boxNodes, ...personNodes],
    edges: edgesFromPeople(people),
  }
}

// ── Nodes ───────────────────────────────────────────────────────────────────────

function PersonNode({ data }: NodeProps) {
  const { person, chip, isTarget } = data as PersonData
  return (
    <div
      className={cn(
        "group w-47.5 cursor-grab rounded-xl border border-border bg-card px-3 py-2.5 text-center shadow-sm transition hover:border-primary/40 hover:shadow-md hover:ring-2 hover:ring-primary/25 active:cursor-grabbing",
        isTarget &&
          "border-primary shadow-lg ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="size-1.5! border-0! bg-muted-foreground/40!"
      />
      <span
        className={cn(
          "mx-auto flex size-10 items-center justify-center rounded-full text-[13px] font-bold ring-2",
          chip
        )}
      >
        {initials(person.name)}
      </span>
      <p className="mt-1.5 truncate text-[13px] font-semibold text-foreground">
        {person.name}
      </p>
      <p className="truncate text-[11px] text-muted-foreground">
        {person.title || "—"}
      </p>
      <span
        className={cn(
          "mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
          chip
        )}
      >
        {person.deptName || "Unassigned"}
      </span>
      <Handle
        type="source"
        position={Position.Bottom}
        className="size-1.5! border-0! bg-muted-foreground/40!"
      />
    </div>
  )
}

function DeptBoxNode({ data, selected }: NodeProps) {
  const { label, rgb, chip, onOpen, departmentId, isTarget } = data as BoxData
  const active = isTarget || selected
  return (
    <div
      className={cn(
        "relative size-full cursor-move rounded-2xl border-[1.5px]",
        active ? "border-solid" : "border-dashed"
      )}
      style={{
        borderColor: `rgb(${rgb} / ${active ? 0.95 : 0.5})`,
        background: `rgb(${rgb} / ${isTarget ? 0.14 : 0.05})`,
      }}
    >
      <NodeResizer
        color={`rgb(${rgb})`}
        isVisible={selected}
        minWidth={150}
        minHeight={100}
        handleClassName="size-2.5! rounded-sm!"
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onOpen(departmentId)
        }}
        className={cn(
          "absolute -top-2.5 left-3 cursor-pointer rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 transition hover:brightness-110",
          chip
        )}
      >
        {label}
      </button>
    </div>
  )
}

const nodeTypes = { person: PersonNode, deptbox: DeptBoxNode }

// ── Flow ─────────────────────────────────────────────────────────────────────────

type FlowProps = {
  initialPeople: Person[]
  depts: DeptInfo[]
  initialLayout: OrgLayout
  editable: boolean
  onSetManager: (userId: number, managerId: number | null) => void
  onSetDepartment: (userId: number, departmentId: number | null) => void
  onSaveLayout: (layout: OrgLayout) => void
  saving: boolean
}

function Flow({
  initialPeople,
  depts,
  initialLayout,
  editable,
  onSetManager,
  onSetDepartment,
  onSaveLayout,
  saving,
}: FlowProps) {
  const { resolvedTheme } = useTheme()
  const { getNodes } = useReactFlow()
  const pushToast = useToastStore((s) => s.push)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges] = useEdgesState<Edge>([])
  const peopleRef = useRef<Person[]>(initialPeople)
  const deptsRef = useRef<DeptInfo[]>(depts)
  deptsRef.current = depts

  const savedPos = useRef<SavedPos>(
    new Map(
      initialLayout.nodes.map((p) => [String(p.userId), { x: p.x, y: p.y }])
    )
  )
  const savedBox = useRef<SavedBox>(
    new Map(
      initialLayout.boxes.map((b) => [
        b.departmentId,
        { x: b.x, y: b.y, w: b.w, h: b.h },
      ])
    )
  )

  const [personModal, setPersonModal] = useState<string | null>(null)
  const [deptModal, setDeptModal] = useState<number | null>(null)
  const [removeConfirm, setRemoveConfirm] = useState<{
    id: string
    name: string
    dept: string
  } | null>(null)
  const [moveConfirm, setMoveConfirm] = useState<{
    id: string
    userId: number
    name: string
    departmentId: number
    toName: string
    fromName: string
  } | null>(null)
  const [hint, setHint] = useState<DropTarget>(null)
  const [grouped, setGrouped] = useState(initialLayout.grouped)
  // Tracks unsaved layout changes — both Save and Reset only appear when there's something to act on.
  const [dirty, setDirty] = useState(false)
  const lastTargetId = useRef<string | null>(null)
  const groupedRef = useRef(grouped)
  groupedRef.current = grouped

  const onDeptOpen = useCallback((id: number) => setDeptModal(id), [])

  // Full dagre layout. useSaved=true overlays persisted positions (initial load); false = pure tidy.
  const apply = useCallback(
    (people: Person[], useSaved: boolean) => {
      peopleRef.current = people
      const { nodes: n, edges: e } = buildFlow(
        people,
        deptsRef.current,
        onDeptOpen,
        groupedRef.current,
        useSaved ? savedPos.current : undefined,
        useSaved ? savedBox.current : undefined
      )
      setNodes(n)
      setEdges(e)
    },
    [onDeptOpen, setNodes, setEdges]
  )

  // Position-preserving update — keeps cards where they are; only edges/badges/boxes recompute.
  const commit = useCallback(
    (people: Person[]) => {
      peopleRef.current = people
      setNodes((prev) => {
        const persons = prev
          .filter((n) => n.type === "person")
          .map((n) => {
            const p = people.find((x) => x.id === n.id)
            return p
              ? {
                  ...n,
                  data: {
                    person: p,
                    chip: colorFor(p.departmentId).chip,
                  } satisfies PersonData,
                }
              : n
          })
        const boxes = groupedRef.current
          ? prev.filter((n) => n.type === "deptbox")
          : []
        return [...boxes, ...persons]
      })
      setEdges(edgesFromPeople(people))
    },
    [setNodes, setEdges]
  )

  // ── Undo (Ctrl/⌘-Z) ──────────────────────────────────────────────────────
  const history = useRef<Snapshot[]>([])

  // Capture the current state BEFORE a mutating action, so it can be restored.
  const pushHistory = useCallback(() => {
    history.current.push({
      people: peopleRef.current,
      nodes: getNodes().map((n) => ({ ...n, position: { ...n.position } })),
      grouped: groupedRef.current,
    })
    if (history.current.length > 50) history.current.shift()
  }, [getNodes])

  const undo = useCallback(() => {
    const prev = history.current.pop()
    if (!prev) return
    // Re-persist any structural reverts (manager/department) to the backend.
    const cur = peopleRef.current
    prev.people.forEach((p) => {
      const c = cur.find((x) => x.id === p.id)
      if (!c) return
      if (c.managerId !== p.managerId)
        onSetManager(p.userId, p.managerId ? Number(p.managerId) : null)
      if (c.departmentId !== p.departmentId)
        onSetDepartment(p.userId, p.departmentId)
    })
    peopleRef.current = prev.people
    groupedRef.current = prev.grouped
    setGrouped(prev.grouped)
    setNodes(prev.nodes)
    setEdges(edgesFromPeople(prev.people))
    setDirty(true)
    pushToast("Undid last change.", "info")
  }, [onSetManager, onSetDepartment, setNodes, setEdges, pushToast])

  useEffect(() => {
    if (!editable) return
    const onKey = (e: KeyboardEvent) => {
      if (
        !(e.ctrlKey || e.metaKey) ||
        e.shiftKey ||
        e.key.toLowerCase() !== "z"
      )
        return
      const t = e.target as HTMLElement | null
      // Don't hijack undo while typing in a field.
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      )
        return
      e.preventDefault()
      undo()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [editable, undo])

  const toggleGrouped = useCallback(() => {
    pushHistory()
    const next = !groupedRef.current
    groupedRef.current = next
    setGrouped(next)
    setDirty(true)
    setNodes((prev) => {
      const persons = prev.filter((n) => n.type === "person")
      return next
        ? [
            ...deptBoxesFromNodes(
              persons,
              peopleRef.current,
              deptsRef.current,
              onDeptOpen
            ),
            ...persons,
          ]
        : persons
    })
  }, [onDeptOpen, setNodes, pushHistory])

  // Initialise once from props.
  useEffect(() => {
    apply(initialPeople, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Collect the current canvas arrangement into a layout payload.
  const collectLayout = useCallback((): OrgLayout => {
    const all = getNodes()
    const positions = all
      .filter((n) => n.type === "person")
      .map((n) => ({ userId: Number(n.id), x: n.position.x, y: n.position.y }))
    const boxes = all
      .filter((n) => n.type === "deptbox")
      .map((n) => {
        const styleW =
          typeof n.style?.width === "number" ? n.style.width : NODE_W
        const styleH =
          typeof n.style?.height === "number" ? n.style.height : NODE_H
        return {
          departmentId: Number(String(n.id).slice(4)),
          x: n.position.x,
          y: n.position.y,
          w: n.measured?.width ?? styleW,
          h: n.measured?.height ?? styleH,
        }
      })
    return { grouped: groupedRef.current, nodes: positions, boxes }
  }, [getNodes])

  const handleSave = useCallback(() => {
    const layout = collectLayout()
    savedPos.current = new Map(
      layout.nodes.map((p) => [String(p.userId), { x: p.x, y: p.y }])
    )
    savedBox.current = new Map(
      layout.boxes.map((b) => [
        b.departmentId,
        { x: b.x, y: b.y, w: b.w, h: b.h },
      ])
    )
    onSaveLayout(layout)
    setDirty(false)
  }, [collectLayout, onSaveLayout])

  // Discard unsaved moves and snap back to the saved/default arrangement (positions are an overlay;
  // structural edits are committed separately and stay). Re-applies the saved overlay, no server call.
  const handleReset = useCallback(() => {
    apply(peopleRef.current, true)
    setDirty(false)
    pushToast("Unsaved changes discarded.", "info")
  }, [apply, pushToast])

  // A drag or resize that has settled marks the layout dirty (so Save appears). Programmatic
  // re-layouts (mount, Tidy, commit) emit other change types and don't trip this.
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes)
      const settled = changes.some(
        (c) =>
          (c.type === "position" && c.dragging === false) ||
          (c.type === "dimensions" && c.resizing === false)
      )
      if (settled && editable) setDirty(true)
    },
    [onNodesChange, editable]
  )

  // Carry a department box's members when it's dragged.
  const boxDrag = useRef<{ id: string | null; last: { x: number; y: number } }>(
    { id: null, last: { x: 0, y: 0 } }
  )

  const onNodeDrag: OnNodeDrag = useCallback(
    (_, node) => {
      if (node.type === "deptbox") {
        const departmentId = Number(node.id.slice(4))
        const ref = boxDrag.current
        if (ref.id !== node.id) {
          boxDrag.current = {
            id: node.id,
            last: { x: node.position.x, y: node.position.y },
          }
          return
        }
        const dx = node.position.x - ref.last.x
        const dy = node.position.y - ref.last.y
        ref.last = { x: node.position.x, y: node.position.y }
        if (dx || dy) {
          setNodes((prev) =>
            prev.map((n) =>
              n.type === "person" &&
              (n.data as PersonData).person.departmentId === departmentId
                ? {
                    ...n,
                    position: { x: n.position.x + dx, y: n.position.y + dy },
                  }
                : n
            )
          )
        }
        return
      }
      if (node.type !== "person") return
      const target = resolveTarget(
        peopleRef.current,
        getNodes(),
        node.id,
        node.position
      )
      const tid = target?.mode === "report" ? target.id : null
      if (tid !== lastTargetId.current) {
        lastTargetId.current = tid
        setNodes((prev) =>
          prev.map((n) => ({
            ...n,
            data: { ...n.data, isTarget: n.id === tid },
          }))
        )
      }
      setHint(target)
    },
    [getNodes, setNodes]
  )

  const clearHint = useCallback(() => {
    lastTargetId.current = null
    setHint(null)
    setNodes((prev) =>
      prev.map((n) =>
        n.data?.isTarget ? { ...n, data: { ...n.data, isTarget: false } } : n
      )
    )
  }, [setNodes])

  // Capture state at the start of any node drag, so Ctrl/⌘-Z can revert the whole gesture.
  const onNodeDragStart: OnNodeDrag = useCallback(() => {
    pushHistory()
  }, [pushHistory])

  // Edge reconnection: drag a reporting line's end onto empty space to detach, or onto a card to re-manage.
  const reconnectOk = useRef(true)
  const onReconnectStart = useCallback(() => {
    reconnectOk.current = false
    pushHistory()
  }, [pushHistory])
  const onReconnect = useCallback(
    (_oldEdge: Edge, conn: Connection) => {
      reconnectOk.current = true
      if (conn.source && conn.target) {
        commit(reparentPeople(peopleRef.current, conn.source, conn.target))
        onSetManager(Number(conn.target), Number(conn.source))
      }
    },
    [commit, onSetManager]
  )
  const onReconnectEnd = useCallback(
    (_: unknown, edge: Edge) => {
      if (!reconnectOk.current) {
        commit(
          peopleRef.current.map((p) =>
            p.id === edge.target ? { ...p, managerId: null } : p
          )
        )
        onSetManager(Number(edge.target), null)
      }
      reconnectOk.current = true
    },
    [commit, onSetManager]
  )
  const onConnect = useCallback(
    (conn: Connection) => {
      if (conn.source && conn.target) {
        pushHistory()
        commit(reparentPeople(peopleRef.current, conn.source, conn.target))
        onSetManager(Number(conn.target), Number(conn.source))
      }
    },
    [commit, onSetManager, pushHistory]
  )

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      if (!editable || !(event.ctrlKey || event.metaKey)) return
      event.stopPropagation()
      pushHistory()
      commit(
        peopleRef.current.map((p) =>
          p.id === edge.target ? { ...p, managerId: null } : p
        )
      )
      onSetManager(Number(edge.target), null)
    },
    [commit, onSetManager, editable, pushHistory]
  )

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_, node) => {
      if (node.type === "deptbox") {
        boxDrag.current = { id: null, last: { x: 0, y: 0 } }
        return
      }
      clearHint()
      if (node.type !== "person") return
      const people = peopleRef.current
      const me = people.find((p) => p.id === node.id)
      if (!me) return
      const target = resolveTarget(people, getNodes(), node.id, node.position)
      if (target?.mode === "report") {
        commit(
          people.map((p) =>
            p.id === node.id ? { ...p, managerId: target.id } : p
          )
        )
        onSetManager(me.userId, Number(target.id))
        return
      }
      if (target?.mode === "dept") {
        // Confirm before moving into a department (mirrors the remove-from-department confirm).
        setMoveConfirm({
          id: me.id,
          userId: me.userId,
          name: me.name,
          departmentId: target.departmentId,
          toName: target.label,
          fromName: me.deptName,
        })
        return // keep the card where it was dropped; await confirmation
      }
      // Dragged out of every department zone (while grouped) → confirm removing from the department.
      if (groupedRef.current && me.departmentId != null) {
        const cx = node.position.x + NODE_W / 2
        const cy = node.position.y + NODE_H / 2
        const insideAnyBox = getNodes().some(
          (n) => n.type === "deptbox" && nodeContains(n, cx, cy)
        )
        if (!insideAnyBox) {
          setRemoveConfirm({ id: me.id, name: me.name, dept: me.deptName })
          return
        }
      }
      commit(people)
    },
    [commit, getNodes, clearHint, onSetManager, onSetDepartment]
  )

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onNodeDragStart={editable ? onNodeDragStart : undefined}
        onNodeDrag={editable ? onNodeDrag : undefined}
        onNodeDragStop={editable ? onNodeDragStop : undefined}
        onNodeClick={(_, node) =>
          node.type === "person" && setPersonModal(node.id)
        }
        onConnect={editable ? onConnect : undefined}
        onEdgeClick={onEdgeClick}
        onReconnectStart={editable ? onReconnectStart : undefined}
        onReconnect={editable ? onReconnect : undefined}
        onReconnectEnd={editable ? onReconnectEnd : undefined}
        nodeTypes={nodeTypes}
        nodesDraggable={editable}
        nodesConnectable={editable}
        colorMode={resolvedTheme === "dark" ? "dark" : "light"}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.3}
        panOnDrag={[1]}
        selectionOnDrag={false}
        elevateNodesOnSelect={false}
      >
        <Background gap={18} className="opacity-60" />
        <Controls showInteractive={false} />
        <Panel position="top-left">
          <button
            type="button"
            onClick={toggleGrouped}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-[12px] font-medium shadow-sm transition-colors",
              grouped
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {grouped ? "Grouped by department" : "Group by department"}
          </button>
        </Panel>
        <Panel position="top-right" className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              apply(peopleRef.current, false)
              if (editable) setDirty(true)
              pushToast("Layout tidied — Save to keep it.", "success")
            }}
          >
            Tidy
          </Button>
          {editable && (dirty || saving) && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
                disabled={saving}
              >
                Reset
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save layout"}
              </Button>
            </>
          )}
        </Panel>
        {hint && (
          <Panel position="top-center">
            <div
              className={cn(
                "rounded-full px-3 py-1 text-[12px] font-semibold shadow-md ring-1",
                hint.mode === "report"
                  ? "bg-primary text-primary-foreground ring-primary/30"
                  : colorFor(hint.departmentId).chip
              )}
            >
              {hint.mode === "report"
                ? `↳ Reports to ${hint.label}`
                : `⊕ Move to ${hint.label}`}
            </div>
          </Panel>
        )}
      </ReactFlow>

      {personModal && (
        <PersonModal
          key={personModal}
          personId={personModal}
          people={peopleRef.current}
          depts={depts}
          editable={editable}
          onSave={(managerId, departmentId, deptName) => {
            const me = peopleRef.current.find((p) => p.id === personModal)!
            const prevManager = me.managerId ? Number(me.managerId) : null
            const prevDept = me.departmentId
            if (managerId !== prevManager || departmentId !== prevDept)
              pushHistory()
            commit(
              peopleRef.current.map((p) =>
                p.id === personModal
                  ? {
                      ...p,
                      managerId: managerId != null ? String(managerId) : null,
                      departmentId,
                      deptName,
                    }
                  : p
              )
            )
            if (managerId !== prevManager) onSetManager(me.userId, managerId)
            if (departmentId !== prevDept)
              onSetDepartment(me.userId, departmentId)
            setPersonModal(null)
          }}
          onClose={() => setPersonModal(null)}
        />
      )}
      {deptModal != null && (
        <DeptModal
          key={deptModal}
          departmentId={deptModal}
          people={peopleRef.current}
          depts={depts}
          onClose={() => setDeptModal(null)}
        />
      )}
      {removeConfirm && (
        <Dialog
          open
          onOpenChange={(o) => {
            if (!o) {
              commit(peopleRef.current)
              setRemoveConfirm(null)
            }
          }}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Remove from department?</DialogTitle>
            </DialogHeader>
            <p className="text-[13px] text-muted-foreground">
              Remove{" "}
              <span className="font-medium text-foreground">
                {removeConfirm.name}
              </span>{" "}
              from{" "}
              <span className="font-medium text-foreground">
                {removeConfirm.dept}
              </span>
              ? They&apos;ll be left unassigned (no department).
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  commit(peopleRef.current)
                  setRemoveConfirm(null)
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  const r = removeConfirm
                  const me = peopleRef.current.find((p) => p.id === r.id)
                  commit(
                    peopleRef.current.map((p) =>
                      p.id === r.id
                        ? { ...p, departmentId: null, deptName: "" }
                        : p
                    )
                  )
                  if (me) onSetDepartment(me.userId, null)
                  setRemoveConfirm(null)
                }}
              >
                Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {moveConfirm && (
        <Dialog
          open
          onOpenChange={(o) => {
            if (!o) {
              commit(peopleRef.current) // cancel → keep current department, settle position
              setMoveConfirm(null)
            }
          }}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Move to department?</DialogTitle>
            </DialogHeader>
            <p className="text-[13px] text-muted-foreground">
              Move{" "}
              <span className="font-medium text-foreground">
                {moveConfirm.name}
              </span>{" "}
              {moveConfirm.fromName ? (
                <>
                  from{" "}
                  <span className="font-medium text-foreground">
                    {moveConfirm.fromName}
                  </span>{" "}
                </>
              ) : (
                <>(currently unassigned) </>
              )}
              to{" "}
              <span className="font-medium text-foreground">
                {moveConfirm.toName}
              </span>
              ?
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  commit(peopleRef.current)
                  setMoveConfirm(null)
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const m = moveConfirm
                  commit(
                    peopleRef.current.map((p) =>
                      p.id === m.id
                        ? {
                            ...p,
                            departmentId: m.departmentId,
                            deptName: m.toName,
                          }
                        : p
                    )
                  )
                  onSetDepartment(m.userId, m.departmentId)
                  setMoveConfirm(null)
                }}
              >
                Move
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

// ── Modals ───────────────────────────────────────────────────────────────────────

function PersonModal({
  personId,
  people,
  depts,
  editable,
  onSave,
  onClose,
}: {
  personId: string
  people: Person[]
  depts: DeptInfo[]
  editable: boolean
  onSave: (
    managerId: number | null,
    departmentId: number | null,
    deptName: string
  ) => void
  onClose: () => void
}) {
  const person = people.find((p) => p.id === personId)!
  const [departmentId, setDepartmentId] = useState<number | null>(
    person.departmentId
  )
  const [managerId, setManagerId] = useState<string | null>(person.managerId)

  const blocked = descendantsOf(people, personId)
  const managerOptions = people.filter(
    (p) => p.id !== personId && !blocked.has(p.id)
  )

  function save() {
    const deptName = depts.find((d) => d.id === departmentId)?.name ?? ""
    onSave(managerId ? Number(managerId) : null, departmentId, deptName)
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{person.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-[13px] font-medium text-foreground">
              {person.name}
            </p>
            <p className="text-[12px] text-muted-foreground">
              {person.title || "No title"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Department">
              <NativeSelect
                value={departmentId != null ? String(departmentId) : ""}
                onChange={(v) => setDepartmentId(v ? Number(v) : null)}
                disabled={!editable}
              >
                <option value="">Unassigned</option>
                {depts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Reports to">
              <NativeSelect
                value={managerId ?? ""}
                onChange={(v) => setManagerId(v || null)}
                disabled={!editable}
              >
                <option value="">— None (top level) —</option>
                {managerOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            {editable ? "Cancel" : "Close"}
          </Button>
          {editable && (
            <Button size="sm" onClick={save}>
              Save
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeptModal({
  departmentId,
  people,
  depts,
  onClose,
}: {
  departmentId: number
  people: Person[]
  depts: DeptInfo[]
  onClose: () => void
}) {
  const dept = depts.find((d) => d.id === departmentId)
  const members = people.filter((p) => p.departmentId === departmentId)
  const c = colorFor(departmentId)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className="size-2.5 rounded-full"
              style={{ background: `rgb(${c.rgb})` }}
            />
            {dept?.name ?? "Department"}
          </DialogTitle>
        </DialogHeader>
        <p className="text-[12px] text-muted-foreground">
          {members.length} {members.length === 1 ? "person" : "people"} in this
          department.
        </p>
        <div className="mt-2 max-h-72 space-y-2 overflow-y-auto">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-lg border border-border p-2.5"
            >
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-[11px] font-bold ring-2",
                  c.chip
                )}
              >
                {initials(m.name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-foreground">
                  {m.name}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {m.title || "—"}
                </p>
              </div>
            </div>
          ))}
          {members.length === 0 && (
            <p className="rounded-lg border border-dashed border-border py-6 text-center text-[12px] text-muted-foreground">
              No one in this department.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12.5px]">{label}</Label>
      {children}
    </div>
  )
}

function NativeSelect({
  value,
  onChange,
  disabled,
  children,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-[13px] text-foreground focus:ring-2 focus:ring-ring/40 focus:outline-none disabled:opacity-60"
    >
      {children}
    </select>
  )
}

// ── Quick-create wrappers (right-click menu) — reuse the admin forms ───────────────

function QuickDepartmentCreate({ onClose }: { onClose: () => void }) {
  const createDept = useCreateDepartment()
  return (
    <DepartmentFormModal
      isPending={createDept.isPending}
      onClose={onClose}
      onSubmit={(payload) => createDept.mutate(payload, { onSuccess: onClose })}
    />
  )
}

/**
 * Picker for the scoped dept tree: move an existing member from another department
 * (or unassigned) into this one. Stays open so several can be added in a row; the
 * list refetches as each is moved, so people who join drop off the candidate list.
 */
function AddExistingMemberModal({
  candidates,
  departmentName,
  isPending,
  onAdd,
  onClose,
}: {
  candidates: Person[]
  departmentName: string
  isPending: boolean
  onAdd: (userId: number) => void
  onClose: () => void
}) {
  const [q, setQ] = useState("")
  const query = q.trim().toLowerCase()
  const filtered = query
    ? candidates.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          (c.deptName ?? "").toLowerCase().includes(query)
      )
    : candidates

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add existing member to {departmentName}</DialogTitle>
        </DialogHeader>
        <p className="text-[12px] text-muted-foreground">
          Move a member from another department (or unassigned) into this one.
          Their reporting line is kept.
        </p>
        <Input
          autoFocus
          placeholder="Search people…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-9 text-[13px]"
        />
        <div className="mt-1 max-h-72 space-y-1.5 overflow-y-auto">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={isPending}
              onClick={() => onAdd(c.userId)}
              className="flex w-full items-center gap-3 rounded-lg border border-border p-2.5 text-left transition-colors hover:bg-muted/40 disabled:opacity-50"
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ring-2",
                  colorFor(c.departmentId).chip
                )}
              >
                {initials(c.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-foreground">
                  {c.name}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {(c.title || "—") + " · " + (c.deptName || "Unassigned")}
                </p>
              </div>
              <HugeiconsIcon
                icon={UserAdd01Icon}
                size={15}
                strokeWidth={1.8}
                className="shrink-0 text-muted-foreground"
              />
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="rounded-lg border border-dashed border-border py-6 text-center text-[12px] text-muted-foreground">
              {candidates.length === 0
                ? "Everyone already belongs to this department."
                : "No matches."}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function QuickRoleCreate({ onClose }: { onClose: () => void }) {
  const createRole = useCreateUserRole()
  return (
    <RoleFormModal
      isPending={createRole.isPending}
      onCancel={onClose}
      onSave={(name, description, color, roleType) =>
        createRole.mutate(
          { name, description, color, roleType },
          { onSuccess: onClose }
        )
      }
    />
  )
}

// ── Public ───────────────────────────────────────────────────────────────────────

/** A single control hint: an icon with a tooltip describing the gesture. */
function Hint({ icon, label }: { icon: IconSvgElement; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex size-7 cursor-default items-center justify-center rounded-lg border border-border bg-background/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <HugeiconsIcon icon={icon} size={14} strokeWidth={1.8} />
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * Merge a scoped (single-department) layout into the full saved layout: the backend
 * PUT replaces all positions, so a partial save would wipe other departments. We
 * overlay the department's node positions and its box onto the global layout by id,
 * keeping everyone else untouched, and preserve the company-wide `grouped` flag.
 */
function mergeLayout(global: OrgLayout, partial: OrgLayout): OrgLayout {
  const nodes = new Map(global.nodes.map((n) => [n.userId, n]))
  for (const n of partial.nodes) nodes.set(n.userId, n)
  const boxes = new Map(global.boxes.map((b) => [b.departmentId, b]))
  for (const b of partial.boxes) boxes.set(b.departmentId, b)
  return {
    grouped: global.grouped,
    nodes: [...nodes.values()],
    boxes: [...boxes.values()],
  }
}

function toPeople(graph: OrgNode[]): Person[] {
  return graph.map((n) => ({
    id: String(n.id),
    userId: n.id,
    name: n.name,
    title: n.title,
    departmentId: n.departmentId,
    deptName: n.department ?? "",
    managerId: n.managerId != null ? String(n.managerId) : null,
  }))
}

/**
 * Org chart. With no props it renders the whole company (editable for admins).
 * Pass `departmentId` to scope it to a single department's members — used by the
 * department "Dept tree" tab. The scoped view is read-only so it can't overwrite
 * the global saved layout (which is keyed by userId across all departments).
 */
export function CompanyOrgChart({
  departmentId,
}: {
  departmentId?: number
} = {}) {
  const scoped = departmentId != null
  // Admins can edit structure (re-parent, move, remove, add) and save layout in
  // both the full and the scoped department view. A scoped save is merged into the
  // global layout (see mergeLayout) so it also shows in the company tree without
  // clobbering other departments' saved positions.
  const canEdit = useAuthStore((s) => s.authorities.includes(EDIT_AUTHORITY))
  const pushToast = useToastStore((s) => s.push)
  const { data: graph, isLoading: graphLoading } = useOrgGraph()
  const { data: departments } = useDepartments()
  const { data: layout, isLoading: layoutLoading } = useOrgLayout()

  const setManager = useSetManager()
  const setDepartment = useSetDepartment()
  const saveLayout = useSaveLayout()
  const qc = useQueryClient()

  const [quickCreate, setQuickCreate] = useState<
    "role" | "department" | "user" | null
  >(null)
  // Scoped-only: the "add existing member from another department" picker.
  const [addExisting, setAddExisting] = useState(false)

  const depts: DeptInfo[] = useMemo(() => {
    const active = (departments ?? [])
      .filter((d: Department) => d.active)
      .map((d: Department) => ({ id: d.id, name: d.name }))
    return departmentId == null
      ? active
      : active.filter((d) => d.id === departmentId)
  }, [departments, departmentId])

  const allPeople = useMemo(() => (graph ? toPeople(graph) : []), [graph])

  const people = useMemo(() => {
    if (departmentId == null) return allPeople
    const inDept = allPeople.filter((p) => p.departmentId === departmentId)
    const ids = new Set(inDept.map((p) => p.id))
    // A member whose manager sits outside this department becomes a local root,
    // so the subtree shown is exactly "everyone under this department".
    return inDept.map((p) =>
      p.managerId && ids.has(p.managerId) ? p : { ...p, managerId: null }
    )
  }, [allPeople, departmentId])

  // Candidates for "add existing member": everyone not already in this department.
  const addCandidates = useMemo(
    () =>
      scoped ? allPeople.filter((p) => p.departmentId !== departmentId) : [],
    [allPeople, departmentId, scoped]
  )
  const scopedDeptName = scoped
    ? (depts.find((d) => d.id === departmentId)?.name ?? "this department")
    : ""

  const ready = !graphLoading && !layoutLoading && graph && layout
  // Re-mount Flow when the source data identity changes so it re-initialises cleanly.
  const flowKey = ready
    ? `${departmentId ?? "all"}:${people.length}:${depts.length}`
    : "loading"

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <TooltipProvider delayDuration={150}>
          <div className="flex items-center gap-1.5">
            {canEdit ? (
              <>
                <Hint
                  icon={DragDropIcon}
                  label="Drag a card onto another to re-parent"
                />
                <Hint icon={PencilEdit01Icon} label="Click a card to edit" />
                <Hint
                  icon={Cancel01Icon}
                  label="Ctrl / ⌘-click a line to detach"
                />
                <Hint
                  icon={CursorMove01Icon}
                  label="Middle-mouse drag to pan · scroll to zoom"
                />
                <Hint
                  icon={Add01Icon}
                  label="Right-click the canvas to create"
                />
                {scoped && (
                  <Hint
                    icon={UserAdd01Icon}
                    label="Right-click to add an existing member"
                  />
                )}
                <Hint
                  icon={FloppyDiskIcon}
                  label={
                    scoped
                      ? "Save layout — also updates the company tree"
                      : "Save layout to keep your arrangement"
                  }
                />
              </>
            ) : (
              <>
                <Hint
                  icon={CursorMove01Icon}
                  label="Middle-mouse drag to pan · scroll to zoom"
                />
                <span className="text-[11px] text-muted-foreground">
                  Read-only — managed by an administrator
                </span>
              </>
            )}
          </div>
        </TooltipProvider>
      </div>
      <ContextMenu>
        <ContextMenuTrigger asChild disabled={!canEdit}>
          <div className="h-150 w-full overflow-hidden rounded-xl border border-border bg-muted/10">
            {!ready ? (
              <div className="flex h-full items-center justify-center text-[13px] text-muted-foreground">
                {graphLoading || layoutLoading
                  ? "Loading org chart…"
                  : "No employees to display yet."}
              </div>
            ) : people.length === 0 ? (
              <div className="flex h-full items-center justify-center text-[13px] text-muted-foreground">
                {scoped
                  ? "No one in this department yet."
                  : "No employees to display yet."}
              </div>
            ) : (
              <ReactFlowProvider>
                <Flow
                  key={flowKey}
                  initialPeople={people}
                  depts={depts}
                  initialLayout={layout!}
                  editable={canEdit}
                  onSetManager={(userId, managerId) =>
                    setManager.mutate({ userId, managerId })
                  }
                  onSetDepartment={(userId, departmentId) =>
                    setDepartment.mutate({ userId, departmentId })
                  }
                  onSaveLayout={(l) =>
                    saveLayout.mutate(scoped ? mergeLayout(layout!, l) : l, {
                      onSuccess: () => pushToast("Layout saved.", "success"),
                    })
                  }
                  saving={saveLayout.isPending}
                />
              </ReactFlowProvider>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {scoped && (
            <>
              <ContextMenuLabel>{scopedDeptName}</ContextMenuLabel>
              <ContextMenuItem onSelect={() => setAddExisting(true)}>
                <HugeiconsIcon
                  icon={UserAdd01Icon}
                  size={15}
                  strokeWidth={1.8}
                />
                Add existing member
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          <ContextMenuLabel>Quick create</ContextMenuLabel>
          <ContextMenuItem onSelect={() => setQuickCreate("user")}>
            <HugeiconsIcon icon={UserAdd01Icon} size={15} strokeWidth={1.8} />
            New user
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => setQuickCreate("department")}>
            <HugeiconsIcon icon={Building03Icon} size={15} strokeWidth={1.8} />
            New department
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => setQuickCreate("role")}>
            <HugeiconsIcon
              icon={UserShield01Icon}
              size={15}
              strokeWidth={1.8}
            />
            New role
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuLabel className="py-1 text-[10px] normal-case">
            Tip: right-click the canvas anytime
          </ContextMenuLabel>
        </ContextMenuContent>
      </ContextMenu>

      {quickCreate === "user" && (
        <CreateUserModal
          onClose={() => {
            setQuickCreate(null)
            // A new employee should show up on the chart — refetch the graph.
            qc.invalidateQueries({ queryKey: ["org-chart", "graph"] })
          }}
        />
      )}
      {quickCreate === "department" && (
        <QuickDepartmentCreate onClose={() => setQuickCreate(null)} />
      )}
      {quickCreate === "role" && (
        <QuickRoleCreate onClose={() => setQuickCreate(null)} />
      )}
      {addExisting && departmentId != null && (
        <AddExistingMemberModal
          candidates={addCandidates}
          departmentName={scopedDeptName}
          isPending={setDepartment.isPending}
          onAdd={(userId) =>
            setDepartment.mutate(
              { userId, departmentId },
              {
                onSuccess: () =>
                  pushToast("Member added to department.", "success"),
                onError: () =>
                  pushToast("Couldn’t add member.", "error"),
              }
            )
          }
          onClose={() => setAddExisting(false)}
        />
      )}
    </div>
  )
}
