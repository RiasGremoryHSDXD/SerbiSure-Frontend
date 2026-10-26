import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../../../shared/localization/LanguageContext';
import { Camera as VisionCamera, useCameraDevice, useCameraFormat, useCameraPermission } from 'react-native-vision-camera';
import { Delegate, RunningMode, useFaceLandmarkDetection, type DetectionError, type Dims, type FaceLandmarkDetectionResultBundle } from 'react-native-mediapipe';

import { faceLandmarkerResultToLandmarkFrame } from '../face/mediapipeFaceTracker';
import type { LandmarkFrame } from '../face/types';

type FaceCameraProps = {
  onLandmarks: (frame: LandmarkFrame) => void;
  detecting?: boolean;
};

export type FaceCameraHandle = {
  captureSelfie: () => Promise<string | null>;
};

export const FaceCamera = forwardRef<FaceCameraHandle, FaceCameraProps>(function FaceCamera({ onLandmarks, detecting = true }, ref) {
  const { tr } = useLanguage();
  const cameraRef = useRef<VisionCamera | null>(null);
  const lastResultAt = useRef(0);
  const device = useCameraDevice('front');
  // Avoid the default highest-resolution buffers and multi-megapixel selfie.
  // Keep enough photo detail for the official's manual identity review.
  const format = useCameraFormat(device, [
    { photoResolution: { width: 1280, height: 960 } },
    { videoResolution: { width: 640, height: 480 } },
    { fps: 30 },
  ]);
  const { hasPermission, requestPermission } = useCameraPermission();
  const [detectorError, setDetectorError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasPermission) {
      void requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const handleResults = useCallback(
    (resultBundle: FaceLandmarkDetectionResultBundle, viewSize: Dims, mirrored: boolean) => {
      if (!detecting) return;
      const now = Date.now();
      // Allow responsive tracking at ~25 FPS without dropping head turns.
      if (now - lastResultAt.current < 40) return;
      lastResultAt.current = now;
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
    [onLandmarks, detecting],
  );

  const handleError = useCallback((error: DetectionError) => {
    console.warn('[Liveness] Face tracking failed', { code: error.code });
    setDetectorError('Face tracking paused. Face the camera in good light and try again.');
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

        console.info('[Liveness timing]', { stage: 'selfie_dimensions', width: photo.width, height: photo.height });

        return photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`;
      },
    }),
    [],
  );

  if (!hasPermission) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackTitle}>{tr('Camera permission is required')}</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackTitle}>{tr('Front camera unavailable')}</Text>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <VisionCamera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        format={format}
        fps={format ? Math.max(format.minFps, Math.min(30, format.maxFps)) : undefined}
        photoQualityBalance="speed"
        isActive
        pixelFormat="rgb"
        photo
        // Keep outputs bound until capture finishes. Removing the processor
        // here rebuilds Android's ImageCapture and can race with takePhoto().
        // `detecting` pauses result handling; unmount releases the camera.
        frameProcessor={faceLandmarkDetection.frameProcessor}
        onLayout={faceLandmarkDetection.cameraViewLayoutChangeHandler}
        onOutputOrientationChanged={faceLandmarkDetection.cameraOrientationChangedHandler}
      />
      {detecting && detectorError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{tr(detectorError)}</Text>
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
