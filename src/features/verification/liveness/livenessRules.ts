import { FACE_LANDMARKS } from '../face/landmarkIndexes';
import { landmark } from '../face/geometry';
import type { FaceAlignment, FaceLandmarks, HeadPoseDirection, LandmarkFrame } from '../face/types';

const CENTER_TOLERANCE = 0.16;
const TURNING_CENTER_TOLERANCE = 0.28;
const MIN_FACE_SIZE = 0.2;
const MAX_FACE_SIZE = 0.72;
const HEAD_TURN_THRESHOLD = 0.10;
const STILLNESS_DURATION_MS = 1000;
const MOVEMENT_TOLERANCE = 0.15;
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
    if (yawAngle > 10) {
      return 'right';
    }

    if (yawAngle < -10) {
      return 'left';
    }

    return 'center';
  }

  const nose = landmark(face, FACE_LANDMARKS.noseTip);
  const leftCheek = landmark(face, FACE_LANDMARKS.leftCheek);
  const rightCheek = landmark(face, FACE_LANDMARKS.rightCheek);

  if (!nose || !leftCheek || !rightCheek) {
    return 'unknown';
  }

  const dx = rightCheek.x - leftCheek.x;
  const dy = rightCheek.y - leftCheek.y;
  const isRotatedSensor = Math.abs(dy) > Math.abs(dx);

  const faceMidline = isRotatedSensor
    ? (leftCheek.y + rightCheek.y) / 2
    : (leftCheek.x + rightCheek.x) / 2;

  const faceWidth = Math.max(isRotatedSensor ? Math.abs(dy) : Math.abs(dx), 1);
  const rawDelta = isRotatedSensor ? (nose.y - faceMidline) : (nose.x - faceMidline);
  const span = isRotatedSensor ? dy : dx;
  const rawOffset = (rawDelta / faceWidth) * (span > 0 ? 1 : -1);

  if (!Number.isFinite(rawOffset)) return 'unknown';

  if (rawOffset > HEAD_TURN_THRESHOLD) {
    return 'right';
  }

  if (rawOffset < -HEAD_TURN_THRESHOLD) {
    return 'left';
  }

  return 'center';
}

export function getHeadPoseDetails(face: FaceLandmarks | null): {
  direction: HeadPoseDirection;
  offset: number;
} {
  if (!face) return { direction: 'unknown', offset: 0 };
  if (typeof face.signals?.yawAngle === 'number' && Number.isFinite(face.signals.yawAngle)) {
    return {
      direction: getHeadPoseDirection(face),
      offset: face.signals.yawAngle,
    };
  }
  const nose = landmark(face, FACE_LANDMARKS.noseTip);
  const leftCheek = landmark(face, FACE_LANDMARKS.leftCheek);
  const rightCheek = landmark(face, FACE_LANDMARKS.rightCheek);
  if (!nose || !leftCheek || !rightCheek) return { direction: 'unknown', offset: 0 };

  const dx = rightCheek.x - leftCheek.x;
  const dy = rightCheek.y - leftCheek.y;
  const isRotatedSensor = Math.abs(dy) > Math.abs(dx);
  const faceMidline = isRotatedSensor
    ? (leftCheek.y + rightCheek.y) / 2
    : (leftCheek.x + rightCheek.x) / 2;
  const faceWidth = Math.max(isRotatedSensor ? Math.abs(dy) : Math.abs(dx), 1);
  const rawDelta = isRotatedSensor ? (nose.y - faceMidline) : (nose.x - faceMidline);
  const span = isRotatedSensor ? dy : dx;
  const rawOffset = (rawDelta / faceWidth) * (span > 0 ? 1 : -1);

  if (!Number.isFinite(rawOffset)) return { direction: 'unknown', offset: 0 };

  return {
    direction: getHeadPoseDirection(face),
    offset: rawOffset,
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
