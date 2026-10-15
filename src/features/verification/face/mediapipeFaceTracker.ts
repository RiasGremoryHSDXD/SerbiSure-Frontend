import type { Face as MlKitFace } from 'react-native-vision-camera-face-detector';
import type { Frame } from 'react-native-vision-camera';
import type { FaceLandmarkDetectionResultBundle, Landmark } from 'react-native-mediapipe';

import { FACE_LANDMARKS } from './landmarkIndexes';
import type { LandmarkFrame, Point2D } from './types';

type NativeMediaPipeFaceLandmarker = {
  detect(frame: Frame): LandmarkFrame | null;
};

declare global {
  // A real MediaPipe Face Landmarker JSI frame-processor can expose this object
  // later. Until then, the app uses the maintained native ML Kit face detector
  // package as a working Face Mesh alternative for this capstone prototype.
  // eslint-disable-next-line no-var
  var __mediapipeFaceLandmarker: NativeMediaPipeFaceLandmarker | undefined;
}

function safePoint(points: Point2D[] | undefined, index: number, fallback: Point2D): Point2D {
  return points?.[index] ?? fallback;
}

function centerOf(points: Point2D[] | undefined, fallback: Point2D): Point2D {
  if (!points || points.length === 0) {
    return fallback;
  }

  let x = 0;
  let y = 0;
  for (let index = 0; index < points.length; index += 1) {
    x += points[index]?.x ?? 0;
    y += points[index]?.y ?? 0;
  }

  return {
    x: x / points.length,
    y: y / points.length,
  };
}

function createMediaPipeLikePoints(face: MlKitFace): Point2D[] {
  const points: Point2D[] = [];
  const boundsCenter = {
    x: face.bounds.x + face.bounds.width / 2,
    y: face.bounds.y + face.bounds.height / 2,
  };
  const contours = face.contours;
  const leftEye = contours?.LEFT_EYE ?? [];
  const rightEye = contours?.RIGHT_EYE ?? [];
  const noseBridge = contours?.NOSE_BRIDGE ?? [];
  const noseBottom = contours?.NOSE_BOTTOM ?? [];
  const faceContour = contours?.FACE ?? [];

  points[FACE_LANDMARKS.leftEye.outer] = safePoint(leftEye, 0, boundsCenter);
  points[FACE_LANDMARKS.leftEye.inner] = safePoint(leftEye, Math.max(leftEye.length - 1, 0), boundsCenter);
  points[FACE_LANDMARKS.leftEye.upper] = safePoint(leftEye, 2, centerOf(leftEye, boundsCenter));
  points[FACE_LANDMARKS.leftEye.lower] = safePoint(leftEye, 6, centerOf(leftEye, boundsCenter));

  points[FACE_LANDMARKS.rightEye.outer] = safePoint(rightEye, Math.max(rightEye.length - 1, 0), boundsCenter);
  points[FACE_LANDMARKS.rightEye.inner] = safePoint(rightEye, 0, boundsCenter);
  points[FACE_LANDMARKS.rightEye.upper] = safePoint(rightEye, 2, centerOf(rightEye, boundsCenter));
  points[FACE_LANDMARKS.rightEye.lower] = safePoint(rightEye, 6, centerOf(rightEye, boundsCenter));

  points[FACE_LANDMARKS.noseTip] = centerOf(noseBottom.length > 0 ? noseBottom : noseBridge, boundsCenter);
  points[FACE_LANDMARKS.leftCheek] = centerOf(contours?.LEFT_CHEEK, safePoint(faceContour, 8, boundsCenter));
  points[FACE_LANDMARKS.rightCheek] = centerOf(contours?.RIGHT_CHEEK, safePoint(faceContour, 28, boundsCenter));

  const contourGroups = [
    faceContour,
    leftEye,
    rightEye,
    noseBridge,
    noseBottom,
    contours?.LEFT_EYEBROW_TOP,
    contours?.RIGHT_EYEBROW_TOP,
    contours?.UPPER_LIP_TOP,
    contours?.LOWER_LIP_BOTTOM,
  ];

  let writeIndex = 0;
  for (let groupIndex = 0; groupIndex < contourGroups.length; groupIndex += 1) {
    const group = contourGroups[groupIndex] ?? [];
    for (let pointIndex = 0; pointIndex < group.length; pointIndex += 1) {
      while (points[writeIndex]) {
        writeIndex += 1;
      }
      points[writeIndex] = group[pointIndex]!;
      writeIndex += 1;
    }
  }

  return points;
}

export function faceDetectorToLandmarkFrame(
  face: MlKitFace,
  frameWidth: number,
  frameHeight: number,
): LandmarkFrame {
  const timestamp = Date.now();

  return {
    face: {
      bounds: face.bounds,
      points: createMediaPipeLikePoints(face),
      signals: {
        leftEyeOpenProbability: face.leftEyeOpenProbability,
        rightEyeOpenProbability: face.rightEyeOpenProbability,
        yawAngle: face.yawAngle,
        pitchAngle: face.pitchAngle,
        rollAngle: face.rollAngle,
      },
      timestamp,
    },
    frameHeight,
    frameWidth,
    timestamp,
  };
}

function mediaPipeLandmarkToPoint(landmark: Landmark, frameWidth: number, frameHeight: number, mirrored: boolean): Point2D {
  const x = mirrored ? 1 - landmark.x : landmark.x;

  return {
    x: x * frameWidth,
    y: landmark.y * frameHeight,
    z: landmark.z * frameWidth,
  };
}

function boundsFromPoints(points: Point2D[]) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (!point) {
      continue;
    }

    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  if (
    minX === Number.POSITIVE_INFINITY ||
    minY === Number.POSITIVE_INFINITY ||
    maxX === Number.NEGATIVE_INFINITY ||
    maxY === Number.NEGATIVE_INFINITY
  ) {
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function faceLandmarkerResultToLandmarkFrame(
  resultBundle: FaceLandmarkDetectionResultBundle,
  frameWidth: number,
  frameHeight: number,
  mirrored: boolean,
): LandmarkFrame {
  const timestamp = Date.now();
  const faceLandmarks = resultBundle.results[0]?.faceLandmarks[0];

  if (!faceLandmarks || faceLandmarks.length === 0) {
    return {
      face: null,
      frameHeight,
      frameWidth,
      timestamp,
    };
  }

  const points = faceLandmarks.map((landmark) => mediaPipeLandmarkToPoint(landmark, frameWidth, frameHeight, mirrored));

  return {
    face: {
      bounds: boundsFromPoints(points),
      points,
      signals: {
        mirrored,
      },
      timestamp,
    },
    frameHeight,
    frameWidth,
    timestamp,
  };
}

export function detectFaceLandmarks(frame: Frame): LandmarkFrame | null {
  'worklet';

  return global.__mediapipeFaceLandmarker?.detect(frame) ?? null;
}
