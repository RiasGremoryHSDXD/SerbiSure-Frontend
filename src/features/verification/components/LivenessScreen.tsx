import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Canvas, Circle, Path, Skia } from '@shopify/react-native-skia';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FaceCamera, type FaceCameraHandle } from '../camera/FaceCamera';
import type { LandmarkFrame } from '../face/types';
import { advanceLiveness, initialLivenessState, retryCurrentStep, type LivenessResult, type LivenessState } from '../liveness/livenessMachine';

import THEME from '../../../shared/theme/theme';
import { RegistrationStepper } from '../../auth/components/RegistrationStepper';

const logoSource = require('../../../../assets/serbisure_new_clean.png');
const faceSource = require('../../../../assets/face-placeholder.png');

type LivenessScreenProps = {
  role?: 'homeowner' | 'kasambahay';
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

export function LivenessScreen({ role = 'homeowner', onVerified, onBack }: LivenessScreenProps) {
  const { tr: uiText } = useUiLanguage();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<FaceCameraHandle | null>(null);
  const captureStartedRef = useRef(false);
  const [started, setStarted] = useState(false);
  const [state, setState] = useState(initialLivenessState);
  const stateRef = useRef(initialLivenessState);
  const lastLandmarkAt = useRef<number | null>(null);
  const startedAt = useRef(0);
  const mounted = useRef(true);
  const verifiedCallback = useRef(onVerified);
  verifiedCallback.current = onVerified;
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [captureAttempt, setCaptureAttempt] = useState(0);
  const [showTrackerNotice, setShowTrackerNotice] = useState(false);
  const [showCenterCheck, setShowCenterCheck] = useState(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!started) {
      return undefined;
    }

    const timer = setTimeout(() => {
      if (lastLandmarkAt.current === null) {
        setShowTrackerNotice(true);
      }
    }, 2600);

    return () => clearTimeout(timer);
  }, [started]);

  useEffect(() => {
    if (!state.completedSteps.length) return;
    setShowCenterCheck(true);
    const timer = setTimeout(() => setShowCenterCheck(false), 650);
    return () => clearTimeout(timer);
  }, [state.completedSteps.length]);

  const handleLandmarks = useCallback((frame: LandmarkFrame) => {
    if (captureStartedRef.current || !mounted.current) return;
    const now = Date.now();
    // FaceCamera already limits landmark mapping/UI callbacks to ten per second.
    if (lastLandmarkAt.current === null) {
      console.info('[Liveness timing]', { stage: 'first_landmarks', durationMs: now - startedAt.current });
    }
    lastLandmarkAt.current = now;
    setShowTrackerNotice(false);
    const next = advanceLiveness(stateRef.current, frame);
    if (next.step !== stateRef.current.step) {
      console.info('[Liveness timing]', { stage: next.step, durationMs: now - startedAt.current });
    }
    stateRef.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    if (!started || !state.verified || captureStartedRef.current) {
      return;
    }

    captureStartedRef.current = true;
    setShowCenterCheck(true);

    const captureStartedAt = Date.now();
    void (async () => {
      try {
        const selfiePath = await cameraRef.current?.captureSelfie();
        if (!selfiePath) throw new Error('The camera could not capture your selfie. Please retry.');
        if (!mounted.current) return;
        console.info('[Liveness timing]', {
          stage: 'documents_ready', captureMs: Date.now() - captureStartedAt,
          durationMs: Date.now() - startedAt.current,
        });
        // Registration owns the upload; document selection starts immediately.
        verifiedCallback.current?.({ verified: true, completedAt: Date.now(), selfiePath });
      } catch (error) {
        const code = error && typeof error === 'object' && 'code' in error ? error.code : 'capture-failed';
        console.warn('[Liveness] Selfie capture failed', { code });
        if (mounted.current) setCaptureError('We couldn’t take your selfie.');
      }
    })();
  }, [started, state.verified, captureAttempt]);

  const countdownValue = useMemo(() => {
    if (state.step !== 'still' || state.verified) {
      return null;
    }

    return Math.max(1, Math.ceil(3 - state.stillnessProgress * 3));
  }, [state.step, state.stillnessProgress, state.verified]);

  const instruction = state.verified ? 'Face check passed. Capturing selfie…' : started
    ? getInstruction(state, showTrackerNotice, countdownValue)
    : 'Make sure your selfie is within the frame and you\'re in a well lit area. Remove anything on your face like a face mask or sunglasses.';
  const ringProgress = started ? getRingProgress(state) : 0;
  const showFaceIcon = !started;

  const handleContinue = useCallback(() => {
    setStarted(true);
    startedAt.current = Date.now();
    stateRef.current = initialLivenessState;
    setState(initialLivenessState);
    setShowTrackerNotice(false);
    setShowCenterCheck(false);
    lastLandmarkAt.current = null;
    setCaptureError(null);
    captureStartedRef.current = false;
  }, []);

  const handleRetry = useCallback(() => {
    stateRef.current = retryCurrentStep(stateRef.current);
    setState(stateRef.current);
    setShowCenterCheck(false);
    setCaptureError(null);
    captureStartedRef.current = false;
    setCaptureAttempt(value => value + 1);
  }, []);

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
        <Text style={styles.title}>{uiText("Verify Your Identity")}</Text>
        <Text style={styles.subtitle}>{uiText("Take a selfie to verify your identity")}</Text>
      </View>

      <View style={styles.card}>
        <RegistrationStepper
          currentStep={role === 'kasambahay' ? 4 : 3}
          totalSteps={role === 'kasambahay' ? 5 : 4}
          title={role === 'kasambahay' ? uiText("Step 4: Face Verification") : uiText("Step 3: Face Verification")}
          help={uiText('Position your face within the circle in a well-lit area.')}
        />

        <View style={styles.cardContent}>
          <View>
            <View style={styles.verificationFrame}>
              {started ? (
                <View style={styles.cameraCircle}>
                  <FaceCamera ref={cameraRef} onLandmarks={handleLandmarks} detecting={!state.verified} />
                </View>
              ) : null}
              <LivenessRing progress={ringProgress} showFaceIcon={showFaceIcon} showCheck={started && showCenterCheck} />
              {started && countdownValue !== null ? (
                <View style={styles.countdownBadge}>
                  <Text style={styles.countdownText}>{countdownValue}</Text>
                </View>
              ) : null}
            </View>

            {captureError ? (
              <View style={styles.captureErrorCard} accessibilityRole="alert" accessibilityLiveRegion="polite">
                <Ionicons name="camera-outline" size={21} color="#9A5B18" />
                <View style={styles.captureErrorCopy}>
                  <Text style={styles.captureErrorTitle}>{uiText(captureError)}</Text>
                  <Text style={styles.captureErrorBody}>{uiText("Your face check is complete. Keep facing the camera and tap Retry to take the photo again.")}</Text>
                </View>
              </View>
            ) : (
              <Text style={[styles.instruction, !started && styles.helperInstruction]}>
                {uiText(instruction)}
              </Text>
            )}
          </View>

          <View>
            <View style={styles.divider} />
            <View style={styles.buttonRow}>
              {!started ? (
                <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]} onPress={handleContinue}>
                  <Text style={styles.primaryButtonText}>{uiText("Continue")}</Text>
                </Pressable>
              ) : state.retryMessage || captureError ? (
                <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]} onPress={handleRetry}>
                  <Text style={styles.primaryButtonText}>{uiText("Retry")}</Text>
                </Pressable>
              ) : (
                <View style={[styles.primaryButton, { opacity: 0.6 }]}>
                  <Text style={styles.primaryButtonText}>{state.verified ? uiText('Capturing…') : uiText("Scanning…")}</Text>
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
  captureErrorCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 18,
    backgroundColor: THEME.colors.brandLight,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  captureErrorCopy: { flex: 1 },
  captureErrorTitle: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 14,
    lineHeight: 20,
    color: THEME.colors.ink,
  },
  captureErrorBody: {
    marginTop: 4,
    fontFamily: THEME.typography.fontFamily.body,
    fontSize: 12,
    lineHeight: 18,
    color: THEME.colors.textSecondary,
  },
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
