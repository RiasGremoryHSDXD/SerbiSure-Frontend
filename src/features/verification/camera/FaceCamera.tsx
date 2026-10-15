import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Camera as VisionCamera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { Delegate, RunningMode, useFaceLandmarkDetection, type DetectionError, type Dims, type FaceLandmarkDetectionResultBundle } from 'react-native-mediapipe';

import { faceLandmarkerResultToLandmarkFrame } from '../face/mediapipeFaceTracker';
import type { LandmarkFrame } from '../face/types';

type FaceCameraProps = {
  onLandmarks: (frame: LandmarkFrame) => void;
};

export type FaceCameraHandle = {
  captureSelfie: () => Promise<string | null>;
};

export const FaceCamera = forwardRef<FaceCameraHandle, FaceCameraProps>(function FaceCamera({ onLandmarks }, ref) {
  const cameraRef = useRef<VisionCamera | null>(null);
  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();
  const [detectorError, setDetectorError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasPermission) {
      void requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const handleResults = useCallback(
    (resultBundle: FaceLandmarkDetectionResultBundle, viewSize: Dims, mirrored: boolean) => {
      setDetectorError(null);
      onLandmarks(
        faceLandmarkerResultToLandmarkFrame(
          resultBundle,
          Math.max(viewSize.width, 1),
          Math.max(viewSize.height, 1),
          mirrored,
        ),
      );
    },
    [onLandmarks],
  );

  const handleError = useCallback((error: DetectionError) => {
    setDetectorError(error.message);
  }, []);

  const faceLandmarkDetection = useFaceLandmarkDetection(
    handleResults,
    handleError,
    RunningMode.LIVE_STREAM,
    'face_landmarker.task',
    {
      delegate: Delegate.CPU,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      mirrorMode: 'mirror-front-only',
      numFaces: 1,
    },
  );

  useEffect(() => {
    faceLandmarkDetection.cameraDeviceChangeHandler(device);
  }, [device, faceLandmarkDetection]);

  useImperativeHandle(
    ref,
    () => ({
      async captureSelfie() {
        if (!cameraRef.current) {
          return null;
        }

        const photo = await cameraRef.current.takePhoto({
          flash: 'off',
        });

        return photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`;
      },
    }),
    [],
  );

  if (!hasPermission) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackTitle}>Camera permission is required</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackTitle}>Front camera unavailable</Text>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <VisionCamera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        pixelFormat="rgb"
        photo
        frameProcessor={faceLandmarkDetection.frameProcessor}
        onLayout={faceLandmarkDetection.cameraViewLayoutChangeHandler}
        onOutputOrientationChanged={faceLandmarkDetection.cameraOrientationChangedHandler}
      />
      {detectorError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{detectorError}</Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: '#F7F5F1',
    justifyContent: 'center',
    padding: 24,
  },
  fallbackTitle: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: 'rgba(17, 17, 17, 0.78)',
    borderRadius: 6,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: 'absolute',
    right: 16,
    top: 48,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
