/**
 * Head-pose estimation and the guided capture targets used by Face ID enrollment.
 *
 * Pure and React-free so the geometry can be unit-tested directly with synthetic landmark
 * arrays — the thresholds here decide whether real people can enroll, so they are worth
 * pinning down in tests rather than eyeballing through a webcam.
 */

// ── Head pose ───────────────────────────────────────────────────────────────────

export type Point = { x: number; y: number }
/** Both components are normalised to roughly -1..1, where 0 is facing the camera. */
export type Pose = { yaw: number; pitch: number }

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

function centroid(points: Point[]): Point {
  const n = points.length || 1
  return {
    x: points.reduce((s, p) => s + p.x, 0) / n,
    y: points.reduce((s, p) => s + p.y, 0) / n,
  }
}

/** Nose tip sits ~36% of the way down the eye-line→chin span on a level head. */
const NEUTRAL_NOSE_DROP = 0.36
const PITCH_SCALE = 0.22

/**
 * Estimates head yaw/pitch from the 68-point landmark mesh.
 *
 * Yaw compares nose-tip distance to each jaw edge — turning the head shortens one side and
 * lengthens the other. Pitch places the nose tip along the eye-line→chin span, which
 * foreshortens as the head tilts. Both are normalised by face size so they hold at any
 * distance. This is a cheap 2D approximation, not a real 3D pose solve — accurate enough to
 * gate a guided capture, which is why the target zones below are deliberately generous.
 */
export function estimatePose(
  positions: Point[],
  leftEye: Point[],
  rightEye: Point[]
): Pose {
  const jawLeft = positions[0] // image-left edge = the subject's right cheek
  const jawRight = positions[16]
  const chin = positions[8]
  const noseTip = positions[30]
  const eyeMid = centroid([centroid(leftEye), centroid(rightEye)])

  const toLeft = dist(noseTip, jawLeft)
  const toRight = dist(noseTip, jawRight)
  // > 0 when the subject turns toward their own left.
  const yaw = (toLeft - toRight) / (toLeft + toRight || 1)

  const span = chin.y - eyeMid.y || 1
  // > 0 when looking down, < 0 when looking up.
  const pitch =
    ((noseTip.y - eyeMid.y) / span - NEUTRAL_NOSE_DROP) / PITCH_SCALE

  return { yaw, pitch: Math.max(-2, Math.min(2, pitch)) }
}

// ── Guided pose targets ─────────────────────────────────────────────────────────

export type PoseKey = "center" | "right" | "down" | "left" | "up"

export type PoseTarget = {
  key: PoseKey
  label: string
  hint: string
  /** Degrees around the ring (0 = 3 o'clock, clockwise). null = the centre pose, which owns no arc. */
  arc: number | null
  inZone: (p: Pose) => boolean
}

const YAW_TURN = 0.16
const PITCH_TILT = 0.5
/** A turned head is allowed to drift off-centre; only the straight-on pose is held tight. */
const YAW_LEVEL = 0.34

// Ordered as a clockwise sweep so the head movement feels continuous, like iPhone's Face ID.
export const POSE_TARGETS: PoseTarget[] = [
  {
    key: "center",
    label: "Look straight ahead",
    hint: "Fill the oval with your face",
    arc: null,
    inZone: (p) => Math.abs(p.yaw) < 0.1 && Math.abs(p.pitch) < 0.35,
  },
  {
    key: "right",
    label: "Slowly turn your head right",
    hint: "Keep your eyes on the screen",
    arc: 0,
    inZone: (p) => p.yaw <= -YAW_TURN && Math.abs(p.pitch) < 0.7,
  },
  {
    key: "down",
    label: "Slowly tilt your chin down",
    hint: "A small nod is enough",
    arc: 90,
    inZone: (p) => p.pitch >= PITCH_TILT && Math.abs(p.yaw) < YAW_LEVEL,
  },
  {
    key: "left",
    label: "Slowly turn your head left",
    hint: "Keep your eyes on the screen",
    arc: 180,
    inZone: (p) => p.yaw >= YAW_TURN && Math.abs(p.pitch) < 0.7,
  },
  {
    key: "up",
    label: "Slowly tilt your chin up",
    hint: "A small lift is enough",
    arc: 270,
    inZone: (p) => p.pitch <= -PITCH_TILT && Math.abs(p.yaw) < YAW_LEVEL,
  },
]

/** Consecutive in-zone detections required before a pose is captured (~0.5s at 250ms/tick). */
export const HOLD_TICKS = 2

export const RING_TICKS = 16
export const TICK_STEP = 360 / RING_TICKS

function angleGap(a: number, b: number) {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

/**
 * Ticks sit half a step off the axes, so none lands exactly on the boundary between two targets'
 * arcs. Placing them on the boundary makes the nearest-arc test a tie, which breaks toward
 * whichever target is declared first and leaves the ring visibly lopsided (5 ticks for "right",
 * 3 for "up"). Offsetting splits the ring evenly, 4 per direction.
 */
export const tickAngle = (i: number) => i * TICK_STEP + TICK_STEP / 2

/** Which pose target each ring tick belongs to — the ring fills as poses are captured. */
export const TICK_OWNER: PoseKey[] = Array.from(
  { length: RING_TICKS },
  (_, i) => {
    const angle = tickAngle(i)
    const arced = POSE_TARGETS.filter((t) => t.arc !== null)
    let owner = arced[0]
    for (const t of arced) {
      if (angleGap(angle, t.arc!) < angleGap(angle, owner.arc!)) owner = t
    }
    return owner.key
  }
)
