import { getFaceAlignment, getHeadPoseDirection, getHeadPoseSample, getPhotoReadiness, getStillnessProgress, type HeadPoseSample } from './livenessRules';
import { LIVENESS } from './livenessConfig';
import type { FaceLandmarks, LandmarkFrame } from '../face/types';

export type LivenessStep = 'face' | 'turnLeft' | 'turnRight' | 'still' | 'verified';

export type LivenessResult = {
  verified: true;
  completedAt: number;
  selfiePath: string;
};

export type LivenessState = {
  step: LivenessStep;
  completedSteps: LivenessStep[];
  instruction: string;
  verified: boolean;
  retryMessage: string | null;
  stillnessProgress: number;
  stillnessPausedAt: number | null;
  stableFace: FaceLandmarks | null;
  stepStartedAt: number | null;
  actionSince: number | null;
  lastFrameAt: number | null;
  neutralPose: HeadPoseSample | null;
  neutralSamples: number[];
  actionFrames: number;
  actionProgressMs: number;
  actionPausedAt: number | null;
};

export const initialLivenessState: LivenessState = {
  step: 'face',
  completedSteps: [],
  instruction: 'Look at the camera for a moment',
  verified: false,
  retryMessage: null,
  stillnessProgress: 0,
  stillnessPausedAt: null,
  stableFace: null,
  stepStartedAt: null,
  actionSince: null,
  lastFrameAt: null,
  neutralPose: null,
  neutralSamples: [],
  actionFrames: 0,
  actionProgressMs: 0,
  actionPausedAt: null,
};

const stepInstructions: Record<LivenessStep, string> = {
  face: 'Look at the camera for a moment',
  turnRight: 'Slowly turn your head a little to your right',
  turnLeft: 'Great! Now turn a little to your left',
  still: 'Well done! Look at the camera for your photo',
  verified: 'Face verification complete',
};

function completeStep(state: LivenessState, completed: LivenessStep, next: LivenessStep, now: number): LivenessState {
  return {
    ...state,
    step: next,
    completedSteps: state.completedSteps.includes(completed)
      ? state.completedSteps
      : [...state.completedSteps, completed],
    instruction: stepInstructions[next],
    retryMessage: null,
    stillnessProgress: 0,
    stillnessPausedAt: null,
    stableFace: null,
    actionSince: null,
    actionFrames: 0,
    actionProgressMs: 0,
    actionPausedAt: null,
    stepStartedAt: now,
  };
}

export function retryCurrentStep(state: LivenessState): LivenessState {
  return {
    ...state,
    retryMessage: null,
    stillnessProgress: 0,
    stillnessPausedAt: null,
    stableFace: null,
    actionSince: null,
    actionFrames: 0,
    actionProgressMs: 0,
    actionPausedAt: null,
    neutralPose: state.step === 'face' ? null : state.neutralPose,
    neutralSamples: state.step === 'face' ? [] : state.neutralSamples,
    stepStartedAt: null,
    lastFrameAt: null,
  };
}

function resetTurn(state: LivenessState): LivenessState {
  return { ...state, actionSince: null, actionFrames: 0, actionProgressMs: 0, actionPausedAt: null };
}

function pauseTurn(state: LivenessState, now: number, previousAt: number | null): LivenessState {
  if (state.actionSince === null) return state;
  const pausedAt = state.actionPausedAt ?? previousAt ?? now;
  return now - pausedAt > LIVENESS.interruptionGraceMs
    ? resetTurn(state) : { ...state, actionPausedAt: pausedAt };
}

export function prepareSelfieRetake(state: LivenessState): LivenessState {
  if (!state.verified) return state;
  return {
    ...retryCurrentStep(state),
    verified: false,
    step: 'still',
    instruction: stepInstructions.still,
    completedSteps: state.completedSteps.filter(step => step !== 'still'),
  };
}

export function advanceLiveness(state: LivenessState, frame: LandmarkFrame): LivenessState {
  if (state.verified) {
    return state;
  }

  // Stale/out-of-order frames cannot complete a challenge. A paused detector
  // must observe the current action again instead of counting the pause.
  if (state.lastFrameAt !== null && frame.timestamp <= state.lastFrameAt) return state;
  const previousFrameAt = state.lastFrameAt;
  if (state.step !== 'still' && previousFrameAt !== null && frame.timestamp - previousFrameAt > LIVENESS.maxFrameGapMs) {
    state = resetTurn(state);
    if (state.step === 'face') state = { ...state, neutralPose: null, neutralSamples: [], stepStartedAt: null };
  }
  state = { ...state, lastFrameAt: frame.timestamp, stepStartedAt: state.stepStartedAt ?? frame.timestamp };
  const isTurningStep = state.step === 'turnRight' || state.step === 'turnLeft';
  const alignment = getFaceAlignment(frame, isTurningStep);
  const face = frame.face;

  if (state.step === 'still') {
    const { ready, instruction } = getPhotoReadiness(frame, state.neutralPose);
    const stillness = getStillnessProgress(ready ? face : null, {
      stableFace: state.stableFace,
      progress: state.stillnessProgress,
      pausedAt: state.stillnessPausedAt,
    }, frame.timestamp, previousFrameAt);
    return {
      ...state,
      step: stillness.isStill ? 'verified' : 'still',
      completedSteps: stillness.isStill ? [...state.completedSteps, 'still'] : state.completedSteps,
      instruction: stillness.isStill ? stepInstructions.verified : instruction,
      verified: stillness.isStill,
      retryMessage: null,
      stillnessProgress: stillness.isStill ? 1 : stillness.progress,
      stillnessPausedAt: stillness.pausedAt,
      stableFace: stillness.stableFace,
    };
  }

  if (!face || !alignment.centered) {
    state = pauseTurn(state, frame.timestamp, previousFrameAt);
    return {
      ...state,
      instruction: face ? 'Gently move your face into the circle' : 'Bring your face back into the circle when you are ready',
      retryMessage: null,
      stillnessProgress: 0,
      stillnessPausedAt: null,
      stableFace: null,
      ...(state.step === 'face' ? { neutralPose: null, neutralSamples: [], stepStartedAt: frame.timestamp } : {}),
    };
  }

  if (state.step === 'face') {
    const pose = getHeadPoseSample(face);
    if (!pose) return { ...state, neutralPose: null, neutralSamples: [], stepStartedAt: frame.timestamp };
    const samples = [...state.neutralSamples, pose.offset].slice(-5);
    if (state.neutralPose && (state.neutralPose.source !== pose.source || Math.max(...samples) - Math.min(...samples) > pose.threshold * 2)) {
      return { ...state, neutralPose: pose, neutralSamples: [pose.offset], stepStartedAt: frame.timestamp };
    }
    const sorted = [...samples].sort((a, b) => a - b);
    state = { ...state, neutralSamples: samples, neutralPose: { ...pose, offset: sorted[Math.floor(sorted.length / 2)]! }, instruction: stepInstructions.face };
    if (samples.length < LIVENESS.calibrationFrames || frame.timestamp - state.stepStartedAt! < LIVENESS.calibrationMs) return state;
    return completeStep(state, 'face', 'turnRight', frame.timestamp);
  }

  const headPose = getHeadPoseDirection(face, state.neutralPose);

  if (state.step === 'turnRight' || state.step === 'turnLeft') {
    const expected = state.step === 'turnRight' ? 'right' : 'left';
    if (headPose !== expected) {
      state = headPose === 'center' || headPose === 'unknown'
        ? pauseTurn(state, frame.timestamp, previousFrameAt) : resetTurn(state);
      return { ...state, instruction: stepInstructions[state.step], retryMessage: null };
    }
    if (state.actionPausedAt !== null && frame.timestamp - state.actionPausedAt > LIVENESS.interruptionGraceMs) state = resetTurn(state);
    const observedInterval = state.actionSince !== null && state.actionPausedAt === null && previousFrameAt !== null
      ? Math.min(frame.timestamp - previousFrameAt, LIVENESS.maxObservedIntervalMs) : 0;
    const actionSince = state.actionSince ?? frame.timestamp;
    const actionFrames = state.actionFrames + 1;
    const actionProgressMs = state.actionProgressMs + observedInterval;
    if (actionFrames >= LIVENESS.turnFrames && actionProgressMs >= LIVENESS.turnHoldMs) {
      return completeStep(state, state.step, state.step === 'turnRight' ? 'turnLeft' : 'still', frame.timestamp);
    }
    return { ...state, actionSince, actionFrames, actionProgressMs, actionPausedAt: null, instruction: stepInstructions[state.step], retryMessage: null };
  }

  return state;
}
