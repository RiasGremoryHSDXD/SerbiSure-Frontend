import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Canvas, Circle, Path, Skia } from '@shopify/react-native-skia';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE_URL, fetchWithTimeout } from '../config/api';

import { FaceCamera, type FaceCameraHandle } from '../camera/FaceCamera';
import type { LandmarkFrame } from '../face/types';
import {
  advanceLiveness,
  initialLivenessState,
  retryCurrentStep,
  type LivenessResult,
  type LivenessState,
} from '../liveness/livenessMachine';
import { getFaceAlignment } from '../liveness/livenessRules';

import THEME from '../config/theme';
import { RegistrationStepper } from '../components/RegistrationStepper';

const logoSource = require('../../assets/serbisure_new_clean.png');
const faceSource = require('../../assets/face-placeholder.png');

type LivenessScreenProps = {
  token?: string | null;
  onVerified?: (result: LivenessResult) => void;
  onBack?: () => void;
  onCancel?: () => void;
  onSkip?: () => void;
};

type LivenessRingProps = {
  progress: number;
  showFaceIcon: boolean;
  showCheck: boolean;
};

function LivenessRing({ progress, showFaceIcon, showCheck }: LivenessRingProps) {
  const size = 226;
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const arcPath = useMemo(() => {
    const path = Skia.Path.Make();
    path.addArc(
      {
        x: strokeWidth / 2,
        y: strokeWidth / 2,
        width: size - strokeWidth,
        height: size - strokeWidth,
      },
      -128,
      Math.min(Math.max(progress, 0), 1) * 360,
    );
    return path;
  }, [progress]);

  return (
    <View style={styles.ringBox}>
      <Canvas style={styles.ringCanvas}>
        <Circle cx={size / 2} cy={size / 2} r={(size - 2) / 2} color="#FFB43B" style="stroke" strokeWidth={2} />
        <Path path={arcPath} color="#0AA018" style="stroke" strokeWidth={strokeWidth} strokeCap="round" />
      </Canvas>
      {showFaceIcon ? <Image source={faceSource} style={styles.faceIcon} resizeMode="contain" /> : null}
      {showCheck ? (
        <View style={styles.checkCircle}>
          <View style={styles.checkShort} />
          <View style={styles.checkLong} />
        </View>
      ) : null}
    </View>
  );
}

function getRingProgress(state: LivenessState) {
  if (state.verified) {
    return 1;
  }

  if (state.step === 'still') {
    return 0.75 + state.stillnessProgress * 0.25;
  }

  if (state.step === 'turnRight') {
    return 0.5;
  }

  if (state.step === 'turnLeft') {
    return 0.25;
  }

  return state.completedSteps.includes('face') ? 0.25 : 0;
}

function getInstruction(state: LivenessState, showTrackerNotice: boolean, countdownValue: number | null) {
  if (state.verified) {
    return 'Verification Complete!';
  }

  if (showTrackerNotice) {
    return 'Position your face\ninside the frame';
  }

  if (state.step === 'face') {
    return 'Position your face\ninside the frame';
  }

  if (state.step === 'turnLeft') {
    return 'Look Left';
  }

  if (state.step === 'turnRight') {
    return 'Look Right';
  }

  if (state.step === 'still' && countdownValue !== null) {
    return countdownValue > 0 ? `Face forward and stay still` : 'Face forward and stay still';
  }

  return 'Face forward and stay still';
}

export function LivenessScreen({ token, onVerified, onBack, onCancel, onSkip }: LivenessScreenProps) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<FaceCameraHandle | null>(null);
  const captureStartedRef = useRef(false);
  const [started, setStarted] = useState(false);
  const [state, setState] = useState(initialLivenessState);
  const [faceCentered, setFaceCentered] = useState(false);
  const [lastLandmarkAt, setLastLandmarkAt] = useState<number | null>(null);
  const [showTrackerNotice, setShowTrackerNotice] = useState(false);
  const [showCenterCheck, setShowCenterCheck] = useState(false);
  const [capturedSelfiePath, setCapturedSelfiePath] = useState<string | null>(null);

  useEffect(() => {
    if (!started) {
      return undefined;
    }

    const timer = setTimeout(() => {
      if (lastLandmarkAt === null) {
        setShowTrackerNotice(true);
      }
    }, 2600);

    return () => clearTimeout(timer);
  }, [lastLandmarkAt, started]);

  const handleLandmarks = useCallback((frame: LandmarkFrame) => {
    setLastLandmarkAt(Date.now());
    setShowTrackerNotice(false);
    setFaceCentered(getFaceAlignment(frame).centered);
    setState((current) => {
      const next = advanceLiveness(current, frame);
      if (next.completedSteps.length > current.completedSteps.length) {
        setShowCenterCheck(true);
        setTimeout(() => setShowCenterCheck(false), 650);
      }

      if (!current.verified && next.verified) {
        setShowCenterCheck(true);
      }

      return next;
    });
  }, []);

  useEffect(() => {
    if (!started || !state.verified || captureStartedRef.current) {
      return;
    }

    captureStartedRef.current = true;
    setShowCenterCheck(true);

    void cameraRef.current?.captureSelfie().then(async (selfiePath) => {
      if (selfiePath) {
        setCapturedSelfiePath(selfiePath);
        
        try {
          const uri = selfiePath.startsWith('file:') ? selfiePath : `file://${selfiePath}`;
          const filename = uri.split('/').pop() || 'profile.jpg';
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : `image/jpeg`;

          const formData = new FormData();
          formData.append('profile_image', {
            uri,
            name: filename,
            type
          } as any);

          await fetchWithTimeout(`${API_BASE_URL}/api/v1/accounts/profile-image/`, {
            method: "PUT",
            headers: {
              'Content-Type': 'multipart/form-data',
              "Authorization": token ? `Bearer ${token}` : "",
            },
            body: formData,
          }, 60000); // 60 seconds — image uploads to Cloudinary take longer than the default 15s
        } catch (e) {
          console.error("Failed to upload profile image", e);
        }
      }
      setTimeout(() => {
        onVerified?.({
          verified: true,
          completedAt: Date.now(),
          selfiePath: selfiePath ?? undefined,
        });
      }, 500); // reduced timeout slightly to compensate for upload time
    });
  }, [onVerified, started, state.verified, token]);

  const countdownValue = useMemo(() => {
    if (state.step !== 'still' || state.verified) {
      return null;
    }

    return Math.max(1, Math.ceil(3 - state.stillnessProgress * 3));
  }, [state.step, state.stillnessProgress, state.verified]);

  const instruction = started
    ? getInstruction(state, showTrackerNotice, countdownValue)
    : 'Make sure your selfie is within the frame and you\'re in a well lit area. Remove anything on your face like a face mask or sunglasses.';
  const ringProgress = started ? getRingProgress(state) : 0;
  const showFaceIcon = !started;

  const handleContinue = useCallback(() => {
    setStarted(true);
    setState(initialLivenessState);
    setFaceCentered(false);
    setShowTrackerNotice(false);
    setShowCenterCheck(false);
    setLastLandmarkAt(null);
    setCapturedSelfiePath(null);
    captureStartedRef.current = false;
  }, []);

  const handleRetry = useCallback(() => {
    setState((current) => retryCurrentStep(current));
    setFaceCentered(false);
    setShowCenterCheck(false);
    setCapturedSelfiePath(null);
    captureStartedRef.current = false;
  }, []);

  const handleCancel = useCallback(() => {
    setState(initialLivenessState);
    setStarted(false);
    setFaceCentered(false);
    setShowTrackerNotice(false);
    setShowCenterCheck(false);
    setCapturedSelfiePath(null);
    captureStartedRef.current = false;
    onCancel?.();
  }, [onCancel]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 14) }]}>
      <View style={styles.header}>
        <View style={styles.headerSide}>
          <Pressable onPress={onBack}>
            <Ionicons name="arrow-back" size={26} color="#2A2925" />
          </Pressable>
        </View>
        <Image source={logoSource} style={styles.logo} resizeMode="contain" />
        <View style={[styles.headerSide, styles.headerSideRight]} />
      </View>

      <View style={styles.titleBlock}>
        <Text style={styles.title}>Verify Your Identity</Text>
        <Text style={styles.subtitle}>Take a selfie to verify your identity</Text>
      </View>

      <View style={styles.card}>
        <RegistrationStepper
          currentStep={3}
          title="Step 3: Face Verification"
          help="Position your face within the circle in a well-lit area."
        />

        <View style={styles.cardContent}>
          <View>
            <View style={styles.verificationFrame}>
              {capturedSelfiePath ? (
                <Image
                  source={{
                    uri: capturedSelfiePath.startsWith('file://') || capturedSelfiePath.startsWith('data:')
                      ? capturedSelfiePath
                      : `file://${capturedSelfiePath}`,
                  }}
                  style={styles.capturedSelfie}
                  resizeMode="cover"
                />
              ) : started ? (
                <View style={styles.cameraCircle}>
                  <FaceCamera ref={cameraRef} onLandmarks={handleLandmarks} />
                </View>
              ) : null}
              <LivenessRing progress={ringProgress} showFaceIcon={showFaceIcon} showCheck={started && showCenterCheck} />
              {started && countdownValue !== null ? (
                <View style={styles.countdownBadge}>
                  <Text style={styles.countdownText}>{countdownValue}</Text>
                </View>
              ) : null}
            </View>

            <Text style={[styles.instruction, !started && styles.helperInstruction]}>
              {instruction}
            </Text>
          </View>

          <View>
            <View style={styles.divider} />
            <View style={styles.buttonRow}>
              <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]} onPress={handleCancel}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              {!started ? (
                <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]} onPress={handleContinue}>
                  <Text style={styles.primaryButtonText}>Continue</Text>
                </Pressable>
              ) : state.retryMessage ? (
                <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]} onPress={handleRetry}>
                  <Text style={styles.primaryButtonText}>Retry</Text>
                </Pressable>
              ) : (
                <View style={[styles.primaryButton, { opacity: 0.6 }]}>
                  <Text style={styles.primaryButtonText}>Scanning...</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonPressed: {
    opacity: 0.78,
  },
  card: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.roundness.card,
    flex: 1,
    marginTop: 10,
    paddingBottom: 14,
    paddingHorizontal: 18,
    paddingTop: 12,
    width: '92%',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cameraCircle: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 113,
    overflow: 'hidden',
  },
  capturedSelfie: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 113,
    height: '100%',
    width: '100%',
  },
  checkCircle: {
    alignItems: 'center',
    backgroundColor: '#14A11C',
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    position: 'absolute',
    width: 50,
  },
  checkLong: {
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    height: 26,
    left: 27,
    position: 'absolute',
    top: 11,
    transform: [{ rotate: '42deg' }],
    width: 5,
  },
  checkShort: {
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    height: 14,
    left: 17,
    position: 'absolute',
    top: 22,
    transform: [{ rotate: '-45deg' }],
    width: 5,
  },
  countdownText: {
    color: '#FFFFFF',
    fontSize: 46,
    fontWeight: '900',
    lineHeight: 52,
    textAlign: 'center',
  },
  countdownBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.44)',
    borderRadius: 44,
    height: 88,
    justifyContent: 'center',
    position: 'absolute',
    width: 88,
  },
  faceIcon: {
    height: 128,
    width: 128,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    width: '100%',
  },
  headerSide: {
    width: 44,
    justifyContent: 'center',
  },
  headerSideRight: {
    alignItems: 'flex-end',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.divider,
    marginTop: 6,
    marginBottom: 10,
    width: '100%',
  },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: THEME.colors.ink,
    height: 48,
    borderRadius: THEME.roundness.pill,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: THEME.colors.white,
    fontSize: 15,
    fontFamily: THEME.typography.fontFamily.display,
    letterSpacing: THEME.typography.tracking.tight,
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: THEME.colors.canvas,
    borderRadius: THEME.roundness.pill,
    height: 48,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: THEME.colors.ink,
    fontSize: 14,
    fontFamily: THEME.typography.fontFamily.display,
  },
  instruction: {
    color: THEME.colors.ink,
    fontSize: 14,
    fontFamily: THEME.typography.fontFamily.bodyMedium,
    lineHeight: 20,
    marginTop: 16,
    minHeight: 40,
    textAlign: 'center',
  },
  helperInstruction: {
    color: THEME.colors.textSecondary,
    fontFamily: THEME.typography.fontFamily.body,
  },
  logo: {
    height: 44,
    width: 44,
  },
  ringBox: {
    alignItems: 'center',
    alignSelf: 'center',
    height: 226,
    justifyContent: 'center',
    width: 226,
  },
  ringCanvas: {
    ...StyleSheet.absoluteFillObject,
  },
  root: {
    backgroundColor: THEME.colors.canvas,
    flex: 1,
  },
  skipText: {
    color: THEME.colors.brandDark,
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily.bodyBold,
  },
  titleBlock: {
    marginTop: 8,
    paddingHorizontal: 24,
    minHeight: 58,
  },
  title: {
    color: THEME.colors.ink,
    fontSize: 24,
    fontFamily: THEME.typography.fontFamily.display,
    lineHeight: 28,
    marginBottom: 4,
  },
  subtitle: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily.body,
    lineHeight: 18,
  },
  verificationFrame: {
    alignItems: 'center',
    alignSelf: 'center',
    height: 226,
    justifyContent: 'center',
    marginTop: 12,
    width: 226,
  },
});
