export type Point2D = {
  x: number;
  y: number;
  z?: number;
};

export type FaceLandmarks = {
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  points: Point2D[];
  timestamp: number;
  signals?: {
    leftEyeOpenProbability?: number;
    mirrored?: boolean;
    rightEyeOpenProbability?: number;
    yawAngle?: number;
    // Nose offset along the eye axis (33 -> 263), in inter-eye units.
    // Positive = applicant turned to their own left. Rotation/mirror invariant.
    yawOffset?: number;
    pitchAngle?: number;
    rollAngle?: number;
  };
};

export type LandmarkFrame = {
  face: FaceLandmarks | null;
  frameWidth: number;
  frameHeight: number;
  timestamp: number;
};

export type FaceAlignment = {
  centered: boolean;
  visible: boolean;
  faceCenterX: number;
  faceCenterY: number;
  faceSizeRatio: number;
};

export type HeadPoseDirection = 'left' | 'right' | 'center' | 'unknown';
