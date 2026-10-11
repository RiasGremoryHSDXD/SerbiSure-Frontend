// MediaPipe Face Mesh / Face Landmarker canonical landmark indexes.
export const FACE_LANDMARKS = {
  leftEye: {
    outer: 33,
    inner: 133,
    upper: 159,
    lower: 145,
  },
  rightEye: {
    outer: 362,
    inner: 263,
    upper: 386,
    lower: 374,
  },
  noseTip: 1,
  leftCheek: 234,
  rightCheek: 454,
} as const;
