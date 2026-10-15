import { FACE_LANDMARKS } from '../face/landmarkIndexes';
import { distance, landmark } from '../face/geometry';
import type { FaceAlignment, FaceLandmarks, HeadPoseDirection, LandmarkFrame } from '../face/types';

const CENTER_TOLERANCE = 0.16;
const MIN_FACE_SIZE = 0.2;
const MAX_FACE_SIZE = 0.72;
const BLINK_EAR_THRESHOLD = 0.2;
const HEAD_TURN_THRESHOLD = 0.055;
const STILLNESS_DURATION_MS = 3000;

export function getFaceAlignment(frame: LandmarkFrame): FaceAlignment {
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
    Math.abs(faceCenterX - 0.5) <= CENTER_TOLERANCE &&
    Math.abs(faceCenterY - 0.5) <= CENTER_TOLERANCE &&
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

function eyeAspectRatio(face: FaceLandmarks, side: 'leftEye' | 'rightEye') {
  const eye = FACE_LANDMARKS[side];
  const outer = landmark(face, eye.outer);
  const inner = landmark(face, eye.inner);
  const upper = landmark(face, eye.upper);
  const lower = landmark(face, eye.lower);

  if (!outer || !inner || !upper || !lower) {
    return null;
  }

  return distance(upper, lower) / Math.max(distance(outer, inner), 1);
}

export function getAverageEyeAspectRatio(face: FaceLandmarks) {
  const left = eyeAspectRatio(face, 'leftEye');
  const right = eyeAspectRatio(face, 'rightEye');

  if (left === null || right === null) {
    return null;
  }

  return (left + right) / 2;
}

export function isBlinking(face: FaceLandmarks) {
  const leftEyeOpen = face.signals?.leftEyeOpenProbability;
  const rightEyeOpen = face.signals?.rightEyeOpenProbability;

  if (typeof leftEyeOpen === 'number' && typeof rightEyeOpen === 'number') {
    return leftEyeOpen < 0.35 && rightEyeOpen < 0.35;
  }

  const ear = getAverageEyeAspectRatio(face);
  return ear !== null && ear < BLINK_EAR_THRESHOLD;
}

export function getHeadPoseDirection(face: FaceLandmarks): HeadPoseDirection {
  const yawAngle = face.signals?.yawAngle;

  if (typeof yawAngle === 'number') {
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

  const faceMidline = (leftCheek.x + rightCheek.x) / 2;
  const faceWidth = Math.max(Math.abs(rightCheek.x - leftCheek.x), 1);
  const rawOffset = (nose.x - faceMidline) / faceWidth;

  if (rawOffset > HEAD_TURN_THRESHOLD) {
    return 'left';
  }

  if (rawOffset < -HEAD_TURN_THRESHOLD) {
    return 'right';
  }

  return 'center';
}

export function getStillnessProgress(
  current: FaceLandmarks,
  previousStableFace: FaceLandmarks | null,
  stableSince: number | null,
  now: number,
) {
  if (!previousStableFace || stableSince === null) {
    return {
      isStill: false,
      progress: 0,
      stableSince: now,
      stableFace: current,
    };
  }

  const elapsed = now - stableSince;

  return {
    isStill: elapsed >= STILLNESS_DURATION_MS,
    progress: Math.min(elapsed / STILLNESS_DURATION_MS, 1),
    stableSince,
    stableFace: current,
  };
}
