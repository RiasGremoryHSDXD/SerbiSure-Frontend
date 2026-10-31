import { FACE_LANDMARKS } from '../face/landmarkIndexes';
import { landmark } from '../face/geometry';
import { LIVENESS } from './livenessConfig';
import type { FaceAlignment, FaceLandmarks, HeadPoseDirection, LandmarkFrame } from '../face/types';

const CENTER_TOLERANCE = 0.22;
const TURNING_CENTER_TOLERANCE = 0.32;
const MIN_FACE_SIZE = 0.18;
const MAX_FACE_SIZE = 0.82;

export function getFaceAlignment(frame: LandmarkFrame, isTurning = false): FaceAlignment {
  return getAlignment(frame, isTurning ? TURNING_CENTER_TOLERANCE : CENTER_TOLERANCE, MAX_FACE_SIZE);
}

function getAlignment(frame: LandmarkFrame, tolerance: number, maxFaceSize: number): FaceAlignment {
  if (!frame.face) {
    return {
      centered: false,
      visible: false,
      faceCenterX: 0,
      faceCenterY: 0,
      faceSizeRatio: 0,
    };
  }

  const { bounds } = frame.face;
  const faceCenterX = (bounds.x + bounds.width / 2) / frame.frameWidth;
  const faceCenterY = (bounds.y + bounds.height / 2) / frame.frameHeight;
  const faceSizeRatio = Math.max(bounds.width / frame.frameWidth, bounds.height / frame.frameHeight);
  const centered =
    Math.abs(faceCenterX - 0.5) <= tolerance &&
    Math.abs(faceCenterY - 0.5) <= tolerance &&
    faceSizeRatio >= MIN_FACE_SIZE &&
    faceSizeRatio <= maxFaceSize;

  return {
    centered,
    visible: true,
    faceCenterX,
    faceCenterY,
    faceSizeRatio,
  };
}

export type HeadPoseSample = { source: 'landmarks' | 'yaw'; offset: number; threshold: number };

export function getHeadPoseSample(face: FaceLandmarks): HeadPoseSample | null {
  const nose = landmark(face, FACE_LANDMARKS.noseTip);
  const leftCheek = landmark(face, FACE_LANDMARKS.leftCheek);
  const rightCheek = landmark(face, FACE_LANDMARKS.rightCheek);
  if (face.points.length > 0) {
    if (!nose || !leftCheek || !rightCheek) return null;
    const yScale = face.signals?.landmarkYScale ?? 1;
    if (!Number.isFinite(yScale) || yScale <= 0) return null;
    const dx = rightCheek.x - leftCheek.x;
    const dy = (rightCheek.y - leftCheek.y) * yScale;
    const spanSquared = dx * dx + dy * dy;
    if (!Number.isFinite(spanSquared) || spanSquared < 1) return null;
    // Both vectors follow image rotation/mirroring. Positive means the
    // applicant's right, matching pose-only detectors' yaw convention.
    const offset = -(
      (nose.x - (leftCheek.x + rightCheek.x) / 2) * dx +
      (nose.y - (leftCheek.y + rightCheek.y) / 2) * yScale * dy
    ) / spanSquared;
    return Number.isFinite(offset) ? { source: 'landmarks', offset, threshold: LIVENESS.landmarkTurn } : null;
  }
  const yaw = face.signals?.yawAngle;
  return typeof yaw === 'number' && Number.isFinite(yaw)
    ? { source: 'yaw', offset: yaw, threshold: LIVENESS.yawTurnDegrees } : null;
}

export function getHeadPoseDirection(face: FaceLandmarks, neutral: HeadPoseSample | null = null): HeadPoseDirection {
  const pose = getHeadPoseSample(face);
  if (!pose || (neutral && pose.source !== neutral.source)) return 'unknown';
  const offset = pose.offset - (neutral?.offset ?? 0);
  if (offset > pose.threshold) return 'right';
  if (offset < -pose.threshold) return 'left';
  return 'center';
}

export function getPhotoReadiness(frame: LandmarkFrame, neutral: HeadPoseSample | null) {
  const face = frame.face;
  if (!face) return { ready: false, instruction: 'Look at the camera so we can see your face.' };
  const alignment = getAlignment(frame, LIVENESS.photoCenterTolerance, LIVENESS.photoMaxFaceSize);
  const { bounds } = face;
  const fitsFrame = frame.frameWidth > 0 && frame.frameHeight > 0 &&
    bounds.x >= -frame.frameWidth * 0.05 && bounds.y >= -frame.frameHeight * 0.05 &&
    bounds.x + bounds.width <= frame.frameWidth * 1.05 &&
    bounds.y + bounds.height <= frame.frameHeight * 1.05;
  if (alignment.faceSizeRatio > LIVENESS.photoMaxFaceSize || !fitsFrame) {
    return { ready: false, instruction: 'Move your phone a little farther away so your face fits.' };
  }
  if (!alignment.centered) return { ready: false, instruction: 'Gently bring your face into the circle.' };
  const pose = getHeadPoseSample(face);
  const tolerance = pose?.source === 'yaw' ? LIVENESS.photoYawToleranceDegrees : LIVENESS.photoLandmarkTolerance;
  const facingCamera = pose && (!neutral || pose.source === neutral.source) &&
    Math.abs(pose.offset - (neutral?.offset ?? 0)) <= tolerance;
  return facingCamera
    ? { ready: true, instruction: 'Well done! Look at the camera for your photo' }
    : { ready: false, instruction: 'Look straight at the camera. A relaxed position is fine.' };
}

export function getHeadPoseDetails(face: FaceLandmarks | null): {
  direction: HeadPoseDirection;
  offset: number;
} {
  if (!face) return { direction: 'unknown', offset: 0 };
  return {
    direction: getHeadPoseDirection(face),
    offset: getHeadPoseSample(face)?.offset ?? 0,
  };
}

export function getStillnessProgress(
  current: FaceLandmarks | null,
  previous: { stableFace: FaceLandmarks | null; progress: number; pausedAt: number | null },
  now: number,
  lastFrameAt: number | null,
) {
  const before = previous.stableFace?.bounds;
  const bounds = current?.bounds;
  const scale = bounds ? Math.max(bounds.width, bounds.height, 1) : 1;
  const moved = before && bounds && Math.max(
    Math.abs(bounds.x - before.x), Math.abs(bounds.y - before.y),
    Math.abs(bounds.width - before.width), Math.abs(bounds.height - before.height),
  ) / scale > LIVENESS.movementTolerance;
  const delta = lastFrameAt === null ? 0 : Math.max(0, now - lastFrameAt);
  if (current && delta > LIVENESS.maxFrameGapMs) {
    // A fresh usable frame after startup/tracking loss is the new reference.
    // Do not count the outage, or make it wait an extra frame unlike a retake.
    return { isStill: false, progress: 0, pausedAt: null, stableFace: current };
  }
  if (!current || moved) {
    const pausedAt = previous.pausedAt ?? lastFrameAt ?? now;
    const expired = now - pausedAt > LIVENESS.interruptionGraceMs;
    return {
      isStill: false,
      progress: expired ? 0 : previous.progress,
      pausedAt,
      stableFace: expired ? null : previous.stableFace,
    };
  }

  const expired = previous.pausedAt !== null && now - previous.pausedAt > LIVENESS.interruptionGraceMs;
  // Only observed steady intervals count. Brief interruptions preserve progress
  // without counting missing frames or the time spent moving.
  const increment = previous.stableFace && previous.pausedAt === null
    ? Math.min(delta, LIVENESS.photoMaxObservedIntervalMs) / LIVENESS.stillnessMs : 0;
  const progress = expired ? 0 : Math.min(previous.progress + increment, 1);

  return {
    isStill: progress >= 1 - Number.EPSILON,
    progress,
    pausedAt: null,
    stableFace: current,
  };
}
