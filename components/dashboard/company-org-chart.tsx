"use client"

import { useCallback, useEffect, useRef, useState } from "react"
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
  type Connection,
  type NodeProps,
  type OnNodeDrag,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import dagre from "dagre"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// ── Mock org (UI-only prototype — no backend, all local state) ──────────────────

type Person = { id: string; name: string; title: string; department: string; managerId: string | null }

const DEPARTMENTS = ["Executive", "Marketing", "Engineering", "Sales", "Design"] as const

const DEPT_CHIP: Record<string, string> = {
  Executive: "bg-rose-500/15 text-rose-600 ring-rose-500/30 dark:text-rose-400",
  Marketing: "bg-violet-500/15 text-violet-600 ring-violet-500/30 dark:text-violet-400",
  Engineering: "bg-blue-500/15 text-blue-600 ring-blue-500/30 dark:text-blue-400",
  Sales: "bg-amber-500/15 text-amber-600 ring-amber-500/30 dark:text-amber-400",
  Design: "bg-emerald-500/15 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400",
}
const DEPT_RGB: Record<string, string> = {
  Executive: "244 63 94",
  Marketing: "139 92 246",
  Engineering: "59 130 246",
  Sales: "245 158 11",
  Design: "16 185 129",
}
const chip = (d: string) => DEPT_CHIP[d] ?? "bg-muted text-muted-foreground ring-border"

const INITIAL: Person[] = [
  { id: "amy", name: "Amy Elsner", title: "CEO", department: "Executive", managerId: null },
  { id: "anna", name: "Anna Fali", title: "CMO", department: "Marketing", managerId: "amy" },
  { id: "stephen", name: "Stephen Shaw", title: "CTO", department: "Engineering", managerId: "amy" },
  { id: "maria", name: "Maria Lopez", title: "Sales Lead", department: "Sales", managerId: "anna" },
  { id: "kevin", name: "Kevin Cruz", title: "Brand Manager", department: "Marketing", managerId: "anna" },
  { id: "diego", name: "Diego Reyes", title: "Eng. Manager", department: "Engineering", managerId: "stephen" },
  { id: "lia", name: "Lia Tan", title: "Design Lead", department: "Design", managerId: "stephen" },
  { id: "sam", name: "Sam Ortiz", title: "Frontend Dev", department: "Engineering", managerId: "diego" },
]

const NODE_W = 190
const NODE_H = 108
const PAD = 26

const initials = (n: string) => n.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()

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
function reparentPeople(people: Person[], managerId: string, reportId: string): Person[] {
  if (managerId === reportId || descendantsOf(people, reportId).has(managerId)) return people
  return people.map((p) => (p.id === reportId ? { ...p, managerId } : p))
}

/** Does a node's rectangle contain the point (cx, cy)? Used for center-of-card hit-testing. */
function nodeContains(n: Node, cx: number, cy: number): boolean {
  const styleW = typeof n.style?.width === "number" ? n.style.width : NODE_W
  const styleH = typeof n.style?.height === "number" ? n.style.height : NODE_H
  const w = n.measured?.width ?? styleW
  const h = n.measured?.height ?? styleH
  return cx >= n.position.x && cx <= n.position.x + w && cy >= n.position.y && cy <= n.position.y + h
}

type DropTarget =
  | { mode: "report"; id: string; label: string }
  | { mode: "dept"; id: string; label: string }
  | null

function resolveTarget(people: Person[], nodes: Node[], draggedId: string, pos: { x: number; y: number }): DropTarget {
  const me = people.find((p) => p.id === draggedId)
  if (!me) return null
  const cx = pos.x + NODE_W / 2
  const cy = pos.y + NODE_H / 2

  const personHit = nodes.find((n) => n.type === "person" && n.id !== draggedId && nodeContains(n, cx, cy))
  if (personHit && me.managerId !== personHit.id && !descendantsOf(people, draggedId).has(personHit.id)) {
    return { mode: "report", id: personHit.id, label: people.find((p) => p.id === personHit.id)?.name ?? "" }
  }
  const boxHit = nodes.find((n) => n.type === "deptbox" && nodeContains(n, cx, cy))
  if (boxHit) {
    const dept = String(boxHit.id).slice(4)
    if (dept !== me.department) return { mode: "dept", id: boxHit.id, label: dept }
  }
  return null
}

// ── Layout (dagre top-down) + department bounding boxes ─────────────────────────

type PersonData = { person: Person; isTarget?: boolean }
type BoxData = { label: string; onOpen: (dept: string) => void; isTarget?: boolean }
type Rect = { x: number; y: number; w: number; h: number }

const edgesFromPeople = (people: Person[]): Edge[] =>
  people
    .filter((p) => p.managerId)
    .map((p) => ({ id: `e-${p.managerId}-${p.id}`, source: p.managerId!, target: p.id, type: "smoothstep" }))

function makeBoxNode(dept: string, r: Rect, onDeptOpen: (dept: string) => void): Node {
  return {
    id: `box:${dept}`,
    type: "deptbox",
    position: { x: r.x, y: r.y },
    data: { label: dept, onOpen: onDeptOpen } satisfies BoxData,
    draggable: true,
    selectable: true,
    zIndex: 0,
    style: { width: r.w, height: r.h },
  }
}

/** A department box that wraps the given member rectangles (in current/free positions), with padding. */
function boxAround(dept: string, rects: Rect[], onDeptOpen: (dept: string) => void): Node[] {
  if (!rects.length) return []
  const minX = Math.min(...rects.map((r) => r.x)) - PAD
  const maxX = Math.max(...rects.map((r) => r.x + r.w)) + PAD
  const minY = Math.min(...rects.map((r) => r.y)) - PAD
  const maxY = Math.max(...rects.map((r) => r.y + r.h)) + PAD
  return [makeBoxNode(dept, { x: minX, y: minY, w: maxX - minX, h: maxY - minY }, onDeptOpen)]
}

/** Department boxes computed from the live (free-dragged) person-node positions — no re-layout. */
function deptBoxesFromNodes(persons: Node[], people: Person[], onDeptOpen: (dept: string) => void): Node[] {
  return DEPARTMENTS.flatMap((dept) => {
    const rects = persons
      .filter((n) => people.find((p) => p.id === n.id)?.department === dept)
      .map((n) => ({ x: n.position.x, y: n.position.y, w: n.measured?.width ?? NODE_W, h: n.measured?.height ?? NODE_H }))
    return boxAround(dept, rects, onDeptOpen)
  })
}

/** Full dagre layout — used only on first load, Reset and Tidy (NOT on every interaction). */
function buildFlow(
  people: Person[],
  onDeptOpen: (dept: string) => void,
  grouped: boolean
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: "TB", nodesep: 55, ranksep: 90, marginx: 30, marginy: 30 })
  g.setDefaultEdgeLabel(() => ({}))
  people.forEach((p) => g.setNode(p.id, { width: NODE_W, height: NODE_H }))
  people.forEach((p) => p.managerId && g.setEdge(p.managerId, p.id))
  dagre.layout(g)

  const at = (id: string) => {
    const n = g.node(id)
    return { x: n.x - NODE_W / 2, y: n.y - NODE_H / 2 }
  }

  const personNodes: Node[] = people.map((p) => ({
    id: p.id,
    type: "person",
    position: at(p.id),
    data: { person: p } satisfies PersonData,
    zIndex: 1,
  }))

  const boxNodes = grouped
    ? DEPARTMENTS.flatMap((dept) =>
        boxAround(
          dept,
          people.filter((p) => p.department === dept).map((p) => ({ ...at(p.id), w: NODE_W, h: NODE_H })),
          onDeptOpen
        )
      )
    : []

  return { nodes: [...boxNodes, ...personNodes], edges: edgesFromPeople(people) }
}

// ── Nodes ───────────────────────────────────────────────────────────────────────

function PersonNode({ data }: NodeProps) {
  const { person, isTarget } = data as PersonData
  return (
    <div
      className={cn(
        "group w-47.5 cursor-grab rounded-xl border border-border bg-card px-3 py-2.5 text-center shadow-sm transition active:cursor-grabbing hover:border-primary/40 hover:shadow-md hover:ring-2 hover:ring-primary/25",
        isTarget && "border-primary shadow-lg ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      <Handle type="target" position={Position.Top} className="size-1.5! border-0! bg-muted-foreground/40!" />
      <span className={cn("mx-auto flex size-10 items-center justify-center rounded-full text-[13px] font-bold ring-2", chip(person.department))}>
        {initials(person.name)}
      </span>
      <p className="mt-1.5 truncate text-[13px] font-semibold text-foreground">{person.name}</p>
      <p className="truncate text-[11px] text-muted-foreground">{person.title}</p>
      <span className={cn("mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1", chip(person.department))}>
        {person.department || "Unassigned"}
      </span>
      <Handle type="source" position={Position.Bottom} className="size-1.5! border-0! bg-muted-foreground/40!" />
    </div>
  )
}

function DeptBoxNode({ data, selected }: NodeProps) {
  const { label, onOpen, isTarget } = data as BoxData
  const rgb = DEPT_RGB[label] ?? "127 127 140"
  const active = isTarget || selected
  return (
    // The box is a movable/resizable zone — drag it to reposition; resize via the corner handles.
    <div
      className={cn("relative size-full cursor-move rounded-2xl border-[1.5px]", active ? "border-solid" : "border-dashed")}
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
          onOpen(label)
        }}
        className={cn(
          "absolute -top-2.5 left-3 cursor-pointer rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 transition hover:brightness-110",
          chip(label)
        )}
      >
        {label}
      </button>
    </div>
  )
}

const nodeTypes = { person: PersonNode, deptbox: DeptBoxNode }

// ── Flow ─────────────────────────────────────────────────────────────────────────

function Flow() {
  const { resolvedTheme } = useTheme()
  const { getNodes } = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges] = useEdgesState<Edge>([])
  const peopleRef = useRef<Person[]>(INITIAL)

  const [personModal, setPersonModal] = useState<string | null>(null)
  const [deptModal, setDeptModal] = useState<string | null>(null)
  const [removeConfirm, setRemoveConfirm] = useState<{ id: string; name: string; dept: string } | null>(null)
  const [hint, setHint] = useState<DropTarget>(null)
  const [grouped, setGrouped] = useState(false) // ungrouped by default
  const lastTargetId = useRef<string | null>(null)
  const groupedRef = useRef(grouped)
  groupedRef.current = grouped

  const onDeptOpen = useCallback((dept: string) => setDeptModal(dept), [])

  // Full dagre layout — only for first load / Reset / Tidy.
  const apply = useCallback(
    (people: Person[]) => {
      peopleRef.current = people
      const { nodes: n, edges: e } = buildFlow(people, onDeptOpen, groupedRef.current)
      setNodes(n)
      setEdges(e)
    },
    [onDeptOpen, setNodes, setEdges]
  )

  // Position-preserving update — for every interaction. Keeps cards where they are; only edges,
  // department badges and (grouped) boxes are recomputed. No re-layout, so nothing jumps.
  const commit = useCallback(
    (people: Person[]) => {
      peopleRef.current = people
      setNodes((prev) => {
        const persons = prev
          .filter((n) => n.type === "person")
          .map((n) => {
            const p = people.find((x) => x.id === n.id)
            return p ? { ...n, data: { person: p } satisfies PersonData } : n
          })
        // Keep the user's moved/resized boxes as-is (don't auto-recompute their position/size).
        const boxes = groupedRef.current ? prev.filter((n) => n.type === "deptbox") : []
        return [...boxes, ...persons]
      })
      setEdges(edgesFromPeople(people))
    },
    [onDeptOpen, setNodes, setEdges]
  )

  const toggleGrouped = useCallback(() => {
    const next = !groupedRef.current
    groupedRef.current = next
    setGrouped(next)
    setNodes((prev) => {
      const persons = prev.filter((n) => n.type === "person")
      // Turning on: create fresh boxes auto-fitted to members (then they're movable/resizable).
      return next ? [...deptBoxesFromNodes(persons, peopleRef.current, onDeptOpen), ...persons] : persons
    })
  }, [onDeptOpen, setNodes])

  useEffect(() => {
    apply(INITIAL)
  }, [apply])

  // Tracks an in-progress department-box drag so we can carry its members by the same delta.
  const boxDrag = useRef<{ id: string | null; last: { x: number; y: number } }>({ id: null, last: { x: 0, y: 0 } })

  const onNodeDrag: OnNodeDrag = useCallback(
    (_, node) => {
      // Dragging a department box moves its members (children) with it.
      if (node.type === "deptbox") {
        const dept = node.id.slice(4)
        const ref = boxDrag.current
        if (ref.id !== node.id) {
          boxDrag.current = { id: node.id, last: { x: node.position.x, y: node.position.y } }
          return
        }
        const dx = node.position.x - ref.last.x
        const dy = node.position.y - ref.last.y
        ref.last = { x: node.position.x, y: node.position.y }
        if (dx || dy) {
          setNodes((prev) =>
            prev.map((n) =>
              n.type === "person" && (n.data as PersonData).person.department === dept
                ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } }
                : n
            )
          )
        }
        return
      }
      // Live drop indicator while dragging a card: highlight the target + show what the drop will do.
      if (node.type !== "person") return
      const target = resolveTarget(peopleRef.current, getNodes(), node.id, node.position)
      const tid = target?.id ?? null
      if (tid !== lastTargetId.current) {
        lastTargetId.current = tid
        setNodes((prev) => prev.map((n) => ({ ...n, data: { ...n.data, isTarget: n.id === tid } })))
        setHint(target)
      }
    },
    [getNodes, setNodes]
  )

  const clearHint = useCallback(() => {
    lastTargetId.current = null
    setHint(null)
  }, [])

  // Edge reconnection ("delete edge on drop"): drag a reporting line's end onto empty space to
  // detach (manager → null), or onto another card to re-manage.
  const reconnectOk = useRef(true)
  const onReconnectStart = useCallback(() => {
    reconnectOk.current = false
  }, [])
  const onReconnect = useCallback(
    (_oldEdge: Edge, conn: Connection) => {
      reconnectOk.current = true
      if (conn.source && conn.target) commit(reparentPeople(peopleRef.current, conn.source, conn.target))
    },
    [commit]
  )
  const onReconnectEnd = useCallback(
    (_: unknown, edge: Edge) => {
      // Drop a line's end on empty space → detach in place (commit keeps positions, rebuilds edges).
      if (!reconnectOk.current) {
        commit(peopleRef.current.map((p) => (p.id === edge.target ? { ...p, managerId: null } : p)))
      }
      reconnectOk.current = true
    },
    [commit]
  )
  const onConnect = useCallback(
    (conn: Connection) => {
      if (conn.source && conn.target) commit(reparentPeople(peopleRef.current, conn.source, conn.target))
    },
    [commit]
  )

  // Quick delete: Ctrl/⌘-click a connector removes it (detaches the report, in place).
  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      if (!(event.ctrlKey || event.metaKey)) return
      event.stopPropagation()
      commit(peopleRef.current.map((p) => (p.id === edge.target ? { ...p, managerId: null } : p)))
    },
    [commit]
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
        commit(people.map((p) => (p.id === node.id ? { ...p, managerId: target.id } : p)))
        return
      }
      if (target?.mode === "dept") {
        commit(people.map((p) => (p.id === node.id ? { ...p, department: target.label } : p)))
        return
      }
      // Dragged out of every department zone (while grouped) → confirm removing from the department.
      if (groupedRef.current && me.department) {
        const cx = node.position.x + NODE_W / 2
        const cy = node.position.y + NODE_H / 2
        const insideAnyBox = getNodes().some((n) => n.type === "deptbox" && nodeContains(n, cx, cy))
        if (!insideAnyBox) {
          setRemoveConfirm({ id: me.id, name: me.name, dept: me.department })
          return // keep the card where it was dropped; await confirmation
        }
      }
      commit(people) // dropped inside its own box / ungrouped → keep position
    },
    [commit, getNodes, clearHint]
  )

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={(_, node) => node.type === "person" && setPersonModal(node.id)}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        onReconnectStart={onReconnectStart}
        onReconnect={onReconnect}
        onReconnectEnd={onReconnectEnd}
        nodeTypes={nodeTypes}
        colorMode={resolvedTheme === "dark" ? "dark" : "light"}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.3}
        panOnDrag
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
          <Button size="sm" variant="outline" onClick={() => apply(peopleRef.current)}>
            Tidy
          </Button>
          <Button size="sm" variant="outline" onClick={() => apply(INITIAL)}>
            Reset
          </Button>
        </Panel>
        {hint && (
          <Panel position="top-center">
            <div
              className={cn(
                "rounded-full px-3 py-1 text-[12px] font-semibold shadow-md ring-1",
                hint.mode === "report"
                  ? "bg-primary text-primary-foreground ring-primary/30"
                  : chip(hint.label)
              )}
            >
              {hint.mode === "report" ? `↳ Reports to ${hint.label}` : `⊕ Move to ${hint.label}`}
            </div>
          </Panel>
        )}
      </ReactFlow>

      {personModal && (
        <PersonModal
          key={personModal}
          personId={personModal}
          people={peopleRef.current}
          onSave={(people) => {
            commit(people)
            setPersonModal(null)
          }}
          onClose={() => setPersonModal(null)}
        />
      )}
      {deptModal && (
        <DeptModal
          key={deptModal}
          dept={deptModal}
          people={peopleRef.current}
          onClose={() => setDeptModal(null)}
        />
      )}
      {removeConfirm && (
        <Dialog
          open
          onOpenChange={(o) => {
            if (!o) {
              commit(peopleRef.current) // cancel → keep department, settle position
              setRemoveConfirm(null)
            }
          }}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Remove from department?</DialogTitle>
            </DialogHeader>
            <p className="text-[13px] text-muted-foreground">
              Remove <span className="font-medium text-foreground">{removeConfirm.name}</span> from{" "}
              <span className="font-medium text-foreground">{removeConfirm.dept}</span>? They&apos;ll be left
              unassigned (no department).
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
                  commit(peopleRef.current.map((p) => (p.id === removeConfirm.id ? { ...p, department: "" } : p)))
                  setRemoveConfirm(null)
                }}
              >
                Remove
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
  onSave,
  onClose,
}: {
  personId: string
  people: Person[]
  onSave: (people: Person[]) => void
  onClose: () => void
}) {
  const person = people.find((p) => p.id === personId)!
  const [name, setName] = useState(person.name)
  const [title, setTitle] = useState(person.title)
  const [department, setDepartment] = useState(person.department)
  const [managerId, setManagerId] = useState<string | null>(person.managerId)

  const blocked = descendantsOf(people, personId)
  const managerOptions = people.filter((p) => p.id !== personId && !blocked.has(p.id))

  function save() {
    onSave(
      people.map((p) =>
        p.id === personId ? { ...p, name: name.trim() || p.name, title, department, managerId } : p
      )
    )
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit person</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Department">
              <NativeSelect value={department} onChange={setDepartment}>
                <option value="">Unassigned</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Reports to">
              <NativeSelect value={managerId ?? ""} onChange={(v) => setManagerId(v || null)}>
                <option value="">— None (top level) —</option>
                {managerOptions.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </NativeSelect>
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeptModal({ dept, people, onClose }: { dept: string; people: Person[]; onClose: () => void }) {
  const members = people.filter((p) => p.department === dept)
  const rgb = DEPT_RGB[dept] ?? "127 127 140"
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: `rgb(${rgb})` }} />
            {dept}
          </DialogTitle>
        </DialogHeader>
        <p className="text-[12px] text-muted-foreground">
          {members.length} {members.length === 1 ? "person" : "people"} in this department.
        </p>
        <div className="mt-2 max-h-72 space-y-2 overflow-y-auto">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
              <span className={cn("flex size-8 items-center justify-center rounded-full text-[11px] font-bold ring-2", chip(dept))}>
                {initials(m.name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-foreground">{m.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{m.title}</p>
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
          <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
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
  children,
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-[13px] text-foreground focus:ring-2 focus:ring-ring/40 focus:outline-none"
    >
      {children}
    </select>
  )
}

// ── Public ───────────────────────────────────────────────────────────────────────

export function CompanyOrgChart() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-muted-foreground">
          <span className="font-medium text-foreground">Drag</span> cards freely (they stay put) — onto another to
          re-parent · <span className="font-medium text-foreground">click</span> to edit ·{" "}
          <span className="font-medium text-foreground">Ctrl/⌘-click a line</span> to detach ·{" "}
          <span className="font-medium text-foreground">Tidy</span> to auto-arrange. When grouped, department boxes are
          movable &amp; resizable and carry their people.
        </p>
      </div>
      <div className="h-150 w-full overflow-hidden rounded-xl border border-border bg-muted/10">
        <ReactFlowProvider>
          <Flow />
        </ReactFlowProvider>
      </div>
    </div>
  )
}
