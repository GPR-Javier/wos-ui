"use client"

/**
 * Shared lazy loader for face-api and its weights. Both the Face ID enrollment screen and the
 * punch-time verification modal need the same three nets, and the ~7 MB of weights should be
 * fetched at most once per page load — hence the module-level memo.
 */

export type FaceApi = typeof import("@vladmandic/face-api")

const MODEL_URL = "/models"

/**
 * Identifies the nets + weights descriptors were produced with, so a future model upgrade can
 * prompt a re-enroll. Bumped when the bundled model set changes.
 */
export const MODEL_VERSION =
  "vladmandic-face-api@1.7.15/tiny+landmark68+recognition"

let faceApiPromise: Promise<FaceApi> | null = null

/** Dynamically imports face-api and loads the 3 nets from /public/models — memoized across mounts. */
export function loadFaceApi(): Promise<FaceApi> {
  if (!faceApiPromise) {
    faceApiPromise = (async () => {
      const faceapi = await import("@vladmandic/face-api")
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ])
      return faceapi
    })().catch((e) => {
      // Reset so a later retry can attempt the load again.
      faceApiPromise = null
      throw e
    })
  }
  return faceApiPromise
}
