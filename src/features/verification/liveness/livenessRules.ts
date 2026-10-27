import { FACE_LANDMARKS } from '../face/landmarkIndexes';
import { landmark } from '../face/geometry';
import type { FaceAlignment, FaceLandmarks, HeadPoseDirection, LandmarkFrame } from '../face/types';

const CENTER_TOLERANCE = 0.26;
const TURNING_CENTER_TOLERANCE = 0.40;
const MIN_FACE_SIZE = 0.15;
const MAX_FACE_SIZE = 0.85;
// About a 20 degree head turn when measured with the eye-axis yawOffset.
const YAW_OFFSET_THRESHOLD = 0.22;
const HEAD_TURN_THRESHOLD = 0.030;
const FORWARD_FACING_THRESHOLD = 0.14;
const STILLNESS_DURATION_MS = 1000;
const MOVEMENT_TOLERANCE = 0.17;
const STILLNESS_GRACE_MS = 600;
const MAX_STILL_FRAME_GAP_MS = 500;

export function getFaceAlignment(frame: LandmarkFrame, isTurning = false): FaceAlignment {
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
  const tolerance = isTurning ? TURNING_CENTER_TOLERANCE : CENTER_TOLERANCE;
  const centered =
    Math.abs(faceCenterX - 0.5) <= tolerance &&
    Math.abs(faceCenterY - 0.5) <= tolerance &&
    faceSizeRatio >= MIN_FACE_SIZE &&
    faceSizeRatio <= MAX_FACE_SIZE;

  return {
    centered,
    visible: true,
    faceCenterX,
    faceCenterY,
    faceSizeRatio,
  };
}

export function getHeadPoseDirection(face: FaceLandmarks): HeadPoseDirection {
  const yawAngle = face.signals?.yawAngle;

  if (typeof yawAngle === 'number' && Number.isFinite(yawAngle)) {
    if (yawAngle > 8) {
      return 'left';
    }

    if (yawAngle < -8) {
      return 'right';
    }

    return 'center';
  }

  
  const yawOffset = face.signals?.yawOffset;
  if (typeof yawOffset === 'number' && Number.isFinite(yawOffset)) {
    if (yawOffset > YAW_OFFSET_THRESHOLD) return 'right';
    if (yawOffset < -YAW_OFFSET_THRESHOLD) return 'left';
    return 'center';
  }
const nose = landmark(face, FACE_LANDMARKS.noseTip);
  const leftCheek = landmark(face, FACE_LANDMARKS.leftCheek);
  const rightCheek = landmark(face, FACE_LANDMARKS.rightCheek);
  if (!nose) return 'unknown';
  let faceMidline: number | null = null;
  let faceWidth: number | null = null;
  if (leftCheek && rightCheek) {
    faceMidline = (leftCheek.x + rightCheek.x) / 2;
    faceWidth = Math.max(Math.abs(rightCheek.x - leftCheek.x), 1);
  } else {
    const leftEye = landmark(face, FACE_LANDMARKS.leftEye.outer);
    const rightEye = landmark(face, FACE_LANDMARKS.rightEye.outer);
    if (leftEye && rightEye) {
      faceMidline = (leftEye.x + rightEye.x) / 2;
      faceWidth = Math.max(Math.abs(rightEye.x - leftEye.x) * 1.5, 1);
    } else if (face.bounds) {
      faceMidline = face.bounds.x + face.bounds.width / 2;
      faceWidth = Math.max(face.bounds.width, 1);
    }
  }
  if (faceMidline === null || faceWidth === null) return 'unknown';
  // Convert mirrored preview coordinates back to the applicant's physical
  // left/right before interpreting the nose offset.
  const rawOffset = (nose.x - faceMidline) / faceWidth * (face.signals?.mirrored ? -1 : 1);
  if (!Number.isFinite(rawOffset)) return 'unknown';

  if (rawOffset > HEAD_TURN_THRESHOLD) {
    return 'right';
  }

  if (rawOffset < -HEAD_TURN_THRESHOLD) {
    return 'left';
  }

  return 'center';
}

export function isFaceForward(face: FaceLandmarks): boolean {
  const yawAngle = face.signals?.yawAngle;

  if (typeof yawAngle === 'number' && Number.isFinite(yawAngle)) {
    return Math.abs(yawAngle) <= 12;
  }

  
  const yawOffset = face.signals?.yawOffset;
  if (typeof yawOffset === 'number' && Number.isFinite(yawOffset)) {
    return Math.abs(yawOffset) <= YAW_OFFSET_THRESHOLD;
  }
const nose = landmark(face, FACE_LANDMARKS.noseTip);
  const leftCheek = landmark(face, FACE_LANDMARKS.leftCheek);
  const rightCheek = landmark(face, FACE_LANDMARKS.rightCheek);
  if (!nose || !leftCheek || !rightCheek) return false;

  const faceMidline = (leftCheek.x + rightCheek.x) / 2;
  const faceWidth = Math.max(Math.abs(rightCheek.x - leftCheek.x), 1);
  const offset = (nose.x - faceMidline) / faceWidth;
  return Number.isFinite(offset) && Math.abs(offset) <= FORWARD_FACING_THRESHOLD;
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
  ) / scale > MOVEMENT_TOLERANCE;
  const delta = lastFrameAt === null ? 0 : Math.max(0, now - lastFrameAt);
  if (!current || moved || delta > MAX_STILL_FRAME_GAP_MS) {
    const pausedAt = previous.pausedAt ?? lastFrameAt ?? now;
    const expired = now - pausedAt > STILLNESS_GRACE_MS;
    return {
      isStill: false,
      progress: expired ? 0 : previous.progress,
      pausedAt,
      stableFace: expired ? null : previous.stableFace,
    };
  }

  const expired = previous.pausedAt !== null && now - previous.pausedAt > STILLNESS_GRACE_MS;
  // Only observed steady intervals count. Brief interruptions preserve progress
  // without counting missing frames or the time spent moving.
  const increment = previous.stableFace && previous.pausedAt === null ? delta / STILLNESS_DURATION_MS : 0;
  const progress = expired ? 0 : Math.min(previous.progress + increment, 1);

  return {
    isStill: progress >= 1 - Number.EPSILON,
    progress,
    pausedAt: null,
    stableFace: current,
  };
}
