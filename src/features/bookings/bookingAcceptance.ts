import { Alert } from 'react-native';

export function confirmBookingAcceptance(bookingType: 'short_term' | 'long_term', tr: (source: string) => string, onAccept: () => void) {
  const longTerm = bookingType === 'long_term';
  Alert.alert(
    tr(longTerm ? 'Confirm Contract Agreement' : 'Accept booking?'),
    tr(longTerm
      ? 'Accept this long-term booking? Sign the contract and register it at the Barangay separately.'
      : 'Accept this short-term booking with the dates, hours, and pay shown?'),
    [
      { text: tr('Review Details'), style: 'cancel' },
      { text: tr('Agree & Accept'), onPress: onAccept },
    ],
  );
}

export function bookingResponseMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.trim() : '';
  return /network|failed to fetch|fetch failed|timed out|timeout/i.test(message)
    ? 'Could not connect. Check your connection and try again.'
    : message || 'Please try again.';
}
