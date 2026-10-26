import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import THEME from '../../../shared/theme/theme';

export type RegistrationStepNumber = 1 | 2 | 3 | 4 | 5;

interface RegistrationStepperProps {
  currentStep: RegistrationStepNumber;
  title: string;
  help?: string;
  totalSteps?: number;
}

export function RegistrationStepper({ currentStep, title, help, totalSteps = 4 }: RegistrationStepperProps) {
  const steps: RegistrationStepNumber[] = Array.from(
    { length: totalSteps },
    (_, idx) => (idx + 1) as RegistrationStepNumber
  );

  return (
    <View style={styles.container}>
      <View style={styles.stepperRow}>
        {steps.map((step, idx) => {
          const isDone = currentStep > step;
          const isActive = currentStep === step;

          return (
            <View key={step} style={styles.stepItemWrapper}>
              {idx > 0 && (
                <View
                  style={[
                    styles.stepConnector,
                    currentStep >= step && styles.stepConnectorActive,
                  ]}
                />
              )}
              <View
                style={[
                  styles.stepCircle,
                  (isActive || isDone) && styles.stepCircleActive,
                ]}
              >
                <Text
                  style={[
                    styles.stepNumber,
                    (isActive || isDone) && styles.stepNumberActive,
                  ]}
                >
                  {step}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <Text style={styles.stepTitle}>{title}</Text>
      {help ? <Text style={styles.stepHelp}>{help}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 10,
    paddingTop: 2,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  stepItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepConnector: {
    width: 28,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 4,
    borderRadius: 2,
  },
  stepConnectorActive: {
    backgroundColor: THEME.colors.brand,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: THEME.colors.brand,
  },
  stepCircleDone: {
    backgroundColor: THEME.colors.brand,
  },
  stepNumber: {
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily.display,
    color: '#1F2937',
    fontWeight: '700',
  },
  stepNumberActive: {
    color: THEME.colors.white,
    fontWeight: '700',
  },
  stepTitle: {
    fontSize: 15,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.ink,
    textAlign: 'center',
    letterSpacing: THEME.typography.tracking.tight,
  },
  stepHelp: {
    fontSize: 12,
    fontFamily: THEME.typography.fontFamily.body,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 3,
    paddingHorizontal: 12,
    lineHeight: 16,
  },
});
