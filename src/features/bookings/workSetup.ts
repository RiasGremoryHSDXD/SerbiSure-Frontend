export type WorkSetup = 'stay_in' | 'stay_out';

export function workSetupLabel(value?: WorkSetup | null): string {
  if (value === 'stay_in') return 'Stay-in';
  if (value === 'stay_out') return 'Stay-out';
  return 'Not specified';
}
