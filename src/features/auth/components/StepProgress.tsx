import { StyleSheet, View } from 'react-native';

import type { LivenessStep } from '../../verification/liveness/livenessMachine';

const visibleSteps: LivenessStep[] = ['face', 'turnLeft', 'turnRight'];

type StepProgressProps = {
  currentStep: LivenessStep;
  completedSteps: LivenessStep[];
};

export function StepProgress({ currentStep, completedSteps }: StepProgressProps) {
  return (
    <View style={styles.container}>
      {visibleSteps.map((step) => {
        const completed = completedSteps.includes(step) || currentStep === 'verified';
        const active = currentStep === step;

        return <View key={step} style={[styles.bar, (active || completed) && styles.barActive]} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: '#F0D9B2',
    borderRadius: 1,
    height: 2,
    width: 16,
  },
  barActive: {
    backgroundColor: '#FFB43B',
  },
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 12,
  },
});
