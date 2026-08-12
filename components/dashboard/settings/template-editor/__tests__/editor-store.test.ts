import { describe, it, expect, beforeEach } from "vitest"
import { useEditorStore, createBlock } from "../editor-store"
import {
  LOCKED_BLOCK_TYPES,
  PALETTE_BY_KIND,
  type EmailBlock,
  type EmailLayout,
  type ResolvedTemplate,
  type TemplateKind,
} from "@/lib/template-types"

/**
 * The payslip contract: a company may restyle and reorder the figure blocks, but a payslip that
 * ships without its earnings, deductions, or net pay is a broken document. The UI hides the delete
 * and duplicate controls on those blocks; these tests cover the store, which is the single choke
 * point every edit path funnels through.
 */

function block(
  id: string,
  type: EmailBlock["type"],
  locked = false
): EmailBlock {
  return { id, type, locked, content: {}, style: {} }
}

function layout(blocks: EmailBlock[]): EmailLayout {
  return {
    blocks,
    background: "#ffffff",
    contentBackground: "#ffffff",
    width: 720,
  }
}

function resolved(kind: TemplateKind, blocks: EmailBlock[]): ResolvedTemplate {
  return {
    template: {
      key: "PAYSLIP",
      kind,
      category: "PAYROLL",
      name: "Payslip format",
      description: "",
      isMarketing: false,
      defaultSubject: null,
      defaultLayout: layout(blocks),
      variables: [],
    },
    config: {
      templateKey: "PAYSLIP",
      enabled: true,
      subject: null,
      layout: null,
      updatedAt: null,
    },
    customized: false,
  }
}

// Mirrors the seeded default: the locked blocks track the Payroll setup screen's section groups.
const PAYSLIP_BLOCKS = [
  block("free_1", "heading"),
  block("hdr", "payslipHeader", true),
  block("comp", "compensation", true),
  block("ot", "overtimeTable", true),
  block("allow", "allowancesTable", true),
  block("gross", "grossPay", true),
  block("ded", "deductionsTable", true),
  block("net", "netPay", true),
  block("free_2", "text"),
]

const ids = () => useEditorStore.getState().layout!.blocks.map((b) => b.id)

describe("editor store — locked blocks", () => {
  beforeEach(() => {
    useEditorStore.getState().load(resolved("PAYSLIP", PAYSLIP_BLOCKS))
  })

  it("refuses to remove any locked block", () => {
    for (const id of ["hdr", "comp", "ot", "allow", "gross", "ded", "net"]) {
      useEditorStore.getState().removeBlock(id)
      expect(ids()).toContain(id)
    }
  })

  it("leaves the layout untouched when a locked delete is attempted", () => {
    const before = ids()
    useEditorStore.getState().removeBlock("net")
    expect(ids()).toEqual(before)
  })

  it("refuses to duplicate a locked block", () => {
    // Two deductions tables would render the figures twice.
    useEditorStore.getState().duplicateBlock("ded")
    expect(ids().filter((id) => id === "ded")).toHaveLength(1)
    expect(ids()).toHaveLength(PAYSLIP_BLOCKS.length)
  })

  it("still removes and duplicates unlocked blocks", () => {
    useEditorStore.getState().removeBlock("free_1")
    expect(ids()).not.toContain("free_1")

    useEditorStore.getState().duplicateBlock("free_2")
    expect(
      useEditorStore.getState().layout!.blocks.filter((b) => b.type === "text")
    ).toHaveLength(2)
  })

  it("allows locked blocks to be reordered", () => {
    // Reordering is the one structural edit a company IS allowed on these — e.g. showing
    // allowances above overtime.
    useEditorStore.getState().moveBlock(3, 4) // overtime <-> allowances
    expect(ids().slice(0, 6)).toEqual([
      "free_1",
      "hdr",
      "comp",
      "allow",
      "ot",
      "gross",
    ])
  })

  it("allows locked blocks to be restyled", () => {
    useEditorStore.getState().updateStyle("net", { fontSize: 22 })
    const net = useEditorStore
      .getState()
      .layout!.blocks.find((b) => b.id === "net")
    expect(net!.style.fontSize).toBe(22)
  })
})

describe("editor store — subject", () => {
  it("falls back to an empty string when a kind has no subject", () => {
    useEditorStore.getState().load(resolved("PAYSLIP", PAYSLIP_BLOCKS))
    expect(useEditorStore.getState().subject).toBe("")
  })
})

describe("palette", () => {
  it("never offers a locked block type for any kind", () => {
    // Locked blocks are seeded into the default layout, never added by hand — otherwise a company
    // could add a second earnings table and sidestep the duplicate guard.
    for (const kind of Object.keys(PALETTE_BY_KIND) as TemplateKind[]) {
      for (const type of PALETTE_BY_KIND[kind]) {
        expect(LOCKED_BLOCK_TYPES).not.toContain(type)
      }
    }
  })

  it("keeps buttons and social rows out of legal documents", () => {
    expect(PALETTE_BY_KIND.DOCUMENT).not.toContain("button")
    expect(PALETTE_BY_KIND.DOCUMENT).not.toContain("social")
  })

  it("marks every structural payslip block locked when created", () => {
    for (const type of LOCKED_BLOCK_TYPES) {
      expect(createBlock(type).locked).toBe(true)
    }
  })
})
