import { getFaceAlignment, getHeadPoseDirection, getStillnessProgress } from './livenessRules';
import type { FaceLandmarks, LandmarkFrame } from '../face/types';

export type LivenessStep = 'face' | 'turnLeft' | 'turnRight' | 'still' | 'verified';

export type LivenessResult = {
  verified: true;
  completedAt: number;
  selfiePath?: string;
};

export type LivenessState = {
  step: LivenessStep;
  completedSteps: LivenessStep[];
  instruction: string;
  verified: boolean;
  retryMessage: string | null;
  stillnessProgress: number;
  stableSince: number | null;
  stableFace: FaceLandmarks | null;
};

export const initialLivenessState: LivenessState = {
  step: 'face',
  completedSteps: [],
  instruction: 'Position your face inside the frame',
  verified: false,
  retryMessage: null,
  stillnessProgress: 0,
  stableSince: null,
  stableFace: null,
};

const stepInstructions: Record<LivenessStep, string> = {
  face: 'Position your face inside the frame',
  turnLeft: 'Look left',
  turnRight: 'Look right',
  still: 'Face forward and stay still',
  verified: 'Face verification complete',
};

function completeStep(state: LivenessState, completed: LivenessStep, next: LivenessStep): LivenessState {
  return {
    ...state,
    step: next,
    completedSteps: state.completedSteps.includes(completed)
      ? state.completedSteps
      : [...state.completedSteps, completed],
    instruction: stepInstructions[next],
    retryMessage: null,
    stillnessProgress: next === 'still' ? state.stillnessProgress : 0,
  };
}

export function retryCurrentStep(state: LivenessState): LivenessState {
  return {
    ...state,
    retryMessage: null,
    stillnessProgress: 0,
    stableSince: null,
    stableFace: null,
  };
}

export function advanceLiveness(state: LivenessState, frame: LandmarkFrame): LivenessState {
  if (state.verified) {
    return state;
  }

  const alignment = getFaceAlignment(frame);
  const face = frame.face;

  if (!face || !alignment.centered) {
    return {
      ...state,
      instruction: stepInstructions.face,
      retryMessage: face ? 'Move closer to the center of the frame.' : 'No face detected.',
      stillnessProgress: 0,
      stableSince: null,
      stableFace: null,
    };
  }

  if (state.step === 'face') {
    return completeStep(state, 'face', 'turnLeft');
  }

  const headPose = getHeadPoseDirection(face);

  if (state.step === 'turnLeft') {
    return headPose === 'left'
      ? completeStep(state, 'turnLeft', 'turnRight')
      : { ...state, instruction: stepInstructions.turnLeft, retryMessage: null };
  }

  if (state.step === 'turnRight') {
    return headPose === 'right'
      ? completeStep(state, 'turnRight', 'still')
      : { ...state, instruction: stepInstructions.turnRight, retryMessage: null };
  }

  if (state.step === 'still') {
    const stillness = getStillnessProgress(face, state.stableFace, state.stableSince, frame.timestamp);
    if (stillness.isStill) {
      return {
        ...state,
        step: 'verified',
        completedSteps: [...state.completedSteps, 'still'],
        instruction: stepInstructions.verified,
        verified: true,
        retryMessage: null,
        stillnessProgress: 1,
      };
    }

    return {
      ...state,
      instruction: stepInstructions.still,
      retryMessage: null,
      stillnessProgress: stillness.progress,
      stableSince: stillness.stableSince,
      stableFace: stillness.stableFace,
    };
  }

  return state;
}
