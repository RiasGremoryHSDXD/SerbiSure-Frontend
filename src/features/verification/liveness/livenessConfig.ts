// Product thresholds for a lightweight challenge followed by manual review.
// They are not a certified presentation-attack detection policy.
export const LIVENESS = {
  landmarkTurn: 0.025,
  yawTurnDegrees: 4,
  calibrationMs: 200,
  calibrationFrames: 3,
  turnHoldMs: 400,
  turnFrames: 3,
  maxFrameGapMs: 1000,
  interruptionGraceMs: 600,
  maxObservedIntervalMs: 250,
  stillnessMs: 1000,
  movementTolerance: 0.22,
  inferenceFps: 8,
  // Photo framing is independent of the deliberately sensitive turn checks.
  photoCenterTolerance: 0.30,
  photoMaxFaceSize: 0.96,
  photoLandmarkTolerance: 0.08,
  photoYawToleranceDegrees: 12,
  // At least three observations still span the 1 s photo hold at low FPS.
  photoMaxObservedIntervalMs: 500,
} as const;
