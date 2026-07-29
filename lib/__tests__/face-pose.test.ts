import { describe, it, expect } from "vitest"
import {
  estimatePose,
  POSE_TARGETS,
  TICK_OWNER,
  RING_TICKS,
  type Point,
  type PoseKey,
} from "@/lib/face-pose"

/**
 * Synthetic 68-point landmark mesh. Only the indices estimatePose actually reads are meaningful:
 * 0 = image-left jaw, 8 = chin, 16 = image-right jaw, 30 = nose tip.
 *
 * The reference face puts the eye line at y=100 and the chin at y=200, so the eye->chin span is
 * 100px. A level head sits the nose tip 36% down that span (y=136), which is the neutral the
 * pitch formula is calibrated against.
 */
const EYE_Y = 100
const CHIN_Y = 200
const NEUTRAL_NOSE_Y = 136

function mesh(nose: Point): Point[] {
  const positions: Point[] = Array.from({ length: 68 }, () => ({ x: 0, y: 0 }))
  positions[0] = { x: 50, y: 150 } // image-left jaw  = subject's right cheek
  positions[8] = { x: 100, y: CHIN_Y } // chin
  positions[16] = { x: 150, y: 150 } // image-right jaw = subject's left cheek
  positions[30] = nose
  return positions
}

const LEFT_EYE: Point[] = [{ x: 80, y: EYE_Y }]
const RIGHT_EYE: Point[] = [{ x: 120, y: EYE_Y }]

/** Pose for a nose tip at (x, y) on the reference face. */
function poseFor(x: number, y: number) {
  return estimatePose(mesh({ x, y }), LEFT_EYE, RIGHT_EYE)
}

const target = (key: PoseKey) => POSE_TARGETS.find((t) => t.key === key)!

describe("estimatePose", () => {
  it("reads a level, forward-facing head as neutral", () => {
    const pose = poseFor(100, NEUTRAL_NOSE_Y)
    expect(pose.yaw).toBeCloseTo(0, 5)
    expect(pose.pitch).toBeCloseTo(0, 5)
  })

  it("yaws positive when the head turns to the subject's own left", () => {
    // Turning left moves the nose toward the image's right edge (the subject's left cheek).
    expect(poseFor(130, NEUTRAL_NOSE_Y).yaw).toBeGreaterThan(0)
  })

  it("yaws negative when the head turns to the subject's own right", () => {
    expect(poseFor(70, NEUTRAL_NOSE_Y).yaw).toBeLessThan(0)
  })

  it("pitches positive looking down and negative looking up", () => {
    expect(poseFor(100, 170).pitch).toBeGreaterThan(0)
    expect(poseFor(100, 110).pitch).toBeLessThan(0)
  })

  it("is scale-invariant — the same pose at twice the distance reads the same", () => {
    const near = poseFor(130, 150)
    const far = estimatePose(
      // Every point halved toward the origin: same geometry, smaller face.
      mesh({ x: 130, y: 150 }).map((p) => ({ x: p.x / 2, y: p.y / 2 })),
      [{ x: 40, y: EYE_Y / 2 }],
      [{ x: 60, y: EYE_Y / 2 }]
    )
    expect(far.yaw).toBeCloseTo(near.yaw, 5)
    expect(far.pitch).toBeCloseTo(near.pitch, 5)
  })

  it("clamps pitch so a degenerate mesh can't produce a wild value", () => {
    expect(poseFor(100, 5000).pitch).toBe(2)
    expect(poseFor(100, -5000).pitch).toBe(-2)
  })

  it("survives a zero-height face without dividing by zero", () => {
    const flat = estimatePose(
      // Chin on the eye line -> span 0, guarded by the `|| 1` fallback.
      mesh({ x: 100, y: 100 }).map((p) => ({ ...p, y: 100 })),
      LEFT_EYE,
      RIGHT_EYE
    )
    expect(Number.isFinite(flat.yaw)).toBe(true)
    expect(Number.isFinite(flat.pitch)).toBe(true)
  })
})

describe("POSE_TARGETS", () => {
  it("accepts a neutral head only for the centre target", () => {
    const pose = poseFor(100, NEUTRAL_NOSE_Y)
    expect(target("center").inZone(pose)).toBe(true)
    for (const key of ["left", "right", "up", "down"] as PoseKey[]) {
      expect(target(key).inZone(pose)).toBe(false)
    }
  })

  it("accepts a clear turn to the left, and rejects it as centre", () => {
    const pose = poseFor(130, NEUTRAL_NOSE_Y)
    expect(target("left").inZone(pose)).toBe(true)
    expect(target("right").inZone(pose)).toBe(false)
    expect(target("center").inZone(pose)).toBe(false)
  })

  it("accepts a clear turn to the right", () => {
    const pose = poseFor(70, NEUTRAL_NOSE_Y)
    expect(target("right").inZone(pose)).toBe(true)
    expect(target("left").inZone(pose)).toBe(false)
  })

  it("accepts a clear chin-down and chin-up tilt", () => {
    expect(target("down").inZone(poseFor(100, 160))).toBe(true)
    expect(target("up").inZone(poseFor(100, 110))).toBe(true)
  })

  it("rejects a tilt that is also badly yawed, so poses stay distinguishable", () => {
    // Chin down far enough, but the head is also turned well past the level tolerance.
    const skewed = poseFor(200, 160)
    expect(skewed.pitch).toBeGreaterThan(0.5)
    expect(Math.abs(skewed.yaw)).toBeGreaterThan(0.34)
    expect(target("down").inZone(skewed)).toBe(false)
  })

  it("starts at centre so enrollment always banks a straight-on template first", () => {
    expect(POSE_TARGETS[0].key).toBe("center")
  })

  it("gives every non-centre target an arc, and centre none", () => {
    for (const t of POSE_TARGETS) {
      if (t.key === "center") expect(t.arc).toBeNull()
      else expect(typeof t.arc).toBe("number")
    }
  })
})

describe("TICK_OWNER", () => {
  it("assigns every ring tick to a target", () => {
    expect(TICK_OWNER).toHaveLength(RING_TICKS)
    expect(TICK_OWNER.every(Boolean)).toBe(true)
  })

  it("never assigns a tick to the centre target, which owns no arc", () => {
    expect(TICK_OWNER).not.toContain("center")
  })

  it("spreads ticks evenly across the four directional targets", () => {
    const counts = TICK_OWNER.reduce<Record<string, number>>((acc, k) => {
      acc[k] = (acc[k] ?? 0) + 1
      return acc
    }, {})
    expect(Object.keys(counts).sort()).toEqual(["down", "left", "right", "up"])
    // 16 ticks over 4 arcs — an uneven split would leave part of the ring unfillable.
    expect(Object.values(counts).every((n) => n === RING_TICKS / 4)).toBe(true)
  })

  it("puts the first tick, just past 3 o'clock, on the target whose arc is 0deg", () => {
    expect(TICK_OWNER[0]).toBe("right")
  })

  it("keeps each target's ticks contiguous, so an arc fills as one block", () => {
    // Walk the ring from the first tick of each run; a target must not reappear later.
    const seen: string[] = []
    for (const key of TICK_OWNER) {
      if (seen[seen.length - 1] !== key) seen.push(key)
    }
    // The ring wraps, so the first and last runs may be the same target.
    const runs = seen[0] === seen[seen.length - 1] ? seen.slice(0, -1) : seen
    expect(new Set(runs).size).toBe(runs.length)
  })
})
