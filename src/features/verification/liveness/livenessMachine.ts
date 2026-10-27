import { getFaceAlignment, getHeadPoseDirection, getStillnessProgress } from './livenessRules';
import type { FaceLandmarks, LandmarkFrame } from '../face/types';

export type LivenessStep = 'face' | 'turnLeft' | 'turnRight' | 'still' | 'verified';

const PROMPT_DURATION_MS = 600;
const TURN_HOLD_MS = 400;
const MAX_FRAME_GAP_MS = 500;

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
};

export const initialLivenessState: LivenessState = {
  step: 'face',
  completedSteps: [],
  instruction: 'Position your face inside the frame',
  verified: false,
  retryMessage: null,
  stillnessProgress: 0,
  stillnessPausedAt: null,
  stableFace: null,
  stepStartedAt: null,
  actionSince: null,
  lastFrameAt: null,
};

const stepInstructions: Record<LivenessStep, string> = {
  face: 'Position your face inside the frame',
  turnRight: 'Look Right',
  turnLeft: 'Look Left',
  still: 'Face forward and hold for a moment',
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
    stepStartedAt: null,
    lastFrameAt: null,
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
  if (state.step !== 'still' && state.lastFrameAt !== null && frame.timestamp - state.lastFrameAt > MAX_FRAME_GAP_MS) {
    state = retryCurrentStep(state);
  }
  state = { ...state, lastFrameAt: frame.timestamp, stepStartedAt: state.stepStartedAt ?? frame.timestamp };
  const isTurningStep = state.step === 'turnRight' || state.step === 'turnLeft';
  const alignment = getFaceAlignment(frame, isTurningStep);
  const face = frame.face;

  if (state.step === 'still') {
    const isMock = !face?.points || face.points.length === 0;
    const isMockTurn = isMock && typeof face?.signals?.yawAngle === 'number' && Math.abs(face.signals.yawAngle) >= 15;
    const ready = Boolean(face && alignment.centered && !isMockTurn);
    const stillness = getStillnessProgress(ready ? face : null, {
      stableFace: state.stableFace,
      progress: state.stillnessProgress,
      pausedAt: state.stillnessPausedAt,
    }, frame.timestamp, previousFrameAt);
    return {
      ...state,
      step: stillness.isStill ? 'verified' : 'still',
      completedSteps: stillness.isStill ? [...state.completedSteps, 'still'] : state.completedSteps,
      instruction: stillness.isStill ? stepInstructions.verified : ready ? stepInstructions.still : 'Face the camera to continue',
      verified: stillness.isStill,
      retryMessage: null,
      stillnessProgress: stillness.isStill ? 1 : stillness.progress,
      stillnessPausedAt: stillness.pausedAt,
      stableFace: stillness.stableFace,
    };
  }

  if (!face || !alignment.centered) {
    return {
      ...state,
      instruction: stepInstructions.face,
      retryMessage: face ? 'Move closer to the center of the frame.' : 'No face detected.',
      stillnessProgress: 0,
      stillnessPausedAt: null,
      stableFace: null,
      actionSince: null,
      stepStartedAt: frame.timestamp,
    };
  }

  if (state.step === 'face') {
    return completeStep(state, 'face', 'turnRight', frame.timestamp);
  }

  const headPose = getHeadPoseDirection(face);

  if (state.step === 'turnRight' || state.step === 'turnLeft') {
    const expected = state.step === 'turnRight' ? 'right' : 'left';
    const prompted = frame.timestamp - state.stepStartedAt! >= PROMPT_DURATION_MS;
    const isMatching = prompted && headPose === expected;
    let actionSince = state.actionSince;
    if (isMatching) {
      actionSince = state.actionSince ?? frame.timestamp;
    } else if (state.actionSince !== null && (!face || headPose === 'unknown') && previousFrameAt !== null && frame.timestamp - previousFrameAt <= 300) {
      actionSince = state.actionSince;
    } else {
      actionSince = null;
    }
    if (actionSince !== null && frame.timestamp - actionSince >= TURN_HOLD_MS) {
      return completeStep(state, state.step, state.step === 'turnRight' ? 'turnLeft' : 'still', frame.timestamp);
    }
    return { ...state, actionSince, instruction: stepInstructions[state.step], retryMessage: null };
  }

  return state;
}
