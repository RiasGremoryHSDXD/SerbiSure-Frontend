import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import THEME from '../config/theme';

export type RegistrationStepNumber = 1 | 2 | 3 | 4;

interface RegistrationStepperProps {
  currentStep: RegistrationStepNumber;
  title: string;
  help?: string;
}

export function RegistrationStepper({ currentStep, title, help }: RegistrationStepperProps) {
  const steps: RegistrationStepNumber[] = [1, 2, 3, 4];

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
                  isActive && styles.stepCircleActive,
                  isDone && styles.stepCircleDone,
                ]}
              >
                {isDone ? (
                  <Ionicons name="checkmark" size={14} color={THEME.colors.white} />
                ) : (
                  <Text
                    style={[
                      styles.stepNumber,
                      isActive && styles.stepNumberActive,
                    ]}
                  >
                    {step}
                  </Text>
                )}
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
    marginBottom: 14,
    paddingTop: 4,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  stepItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepConnector: {
    width: 28,
    height: 2.5,
    backgroundColor: '#EBEBE6',
    marginHorizontal: 4,
    borderRadius: 2,
  },
  stepConnectorActive: {
    backgroundColor: THEME.colors.ink,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F0F0EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: THEME.colors.ink,
  },
  stepCircleDone: {
    backgroundColor: THEME.colors.ink,
  },
  stepNumber: {
    fontSize: 12,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.textMuted,
  },
  stepNumberActive: {
    color: THEME.colors.white,
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
