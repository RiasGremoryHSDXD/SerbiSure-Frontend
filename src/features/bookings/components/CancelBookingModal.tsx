import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useUser } from '../../auth/session/UserContext';
import { cancelBooking, fetchCancellationPreview, type CancellationPreview, type CancellationResult } from '../api/bookingApi';

export function CancelBookingModal({ bookingId, token, onClose, onCancelled }: {
  bookingId: string;
  token: string;
  onClose: () => void;
  onCancelled: (safety?: boolean) => void;
}) {
  const { updateUser } = useUser();
  const [preview, setPreview] = useState<CancellationPreview | null>(null);
  const [reason, setReason] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CancellationResult | null>(null);
  const pending = useRef(false);
  const active = useRef(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchCancellationPreview(token, bookingId);
      if (active.current) { setPreview(data); updateUser({ penaltyPoints: data.penalty_points, isRestricted: data.is_restricted }); }
    } catch {
      if (active.current) setError('Could not load cancellation details. Try again.');
    } finally { if (active.current) setLoading(false); }
  };
  useEffect(() => { active.current = true; void load(); return () => { active.current = false; }; }, [bookingId, token]);

  const submit = async () => {
    if (pending.current || !preview || !reason) return;
    pending.current = true; setBusy(true); setError(null);
    try {
      const response = await cancelBooking(token, bookingId, { reason, expected_points: preview.points_to_add });
      if (!active.current) return;
      if (!response.success) { setError(response.error || 'Could not cancel booking. Try again.'); await load(); return; }
      if (response.penalty) updateUser({ penaltyPoints: response.penalty.penalty_points, isRestricted: response.penalty.is_restricted });
      if (response.safety_advisory) setResult(response);
      else onCancelled(false);
    } finally {
      pending.current = false;
      if (active.current) setBusy(false);
    }
  };

  const points = preview?.points_to_add ?? 0;
  return <Modal visible transparent animationType="fade" onRequestClose={() => { if (!pending.current) result ? onCancelled(true) : onClose(); }}>
    <View style={styles.backdrop}>
      <ScrollView style={styles.card} contentContainerStyle={{ padding: 24 }} accessibilityViewIsModal keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={styles.title}>{result ? 'Safety & Incident Advisory' : 'Cancel booking?'}</Text>
        {result ? <>
          <Text style={styles.body}>We take safety and inappropriate behavior seriously.</Text>
          <Text style={styles.body}>{result.penalty?.points_added ? `${result.penalty.points_added} penalty point(s) were added because of the cancellation timing. ` : 'No penalty points were added. '}If you experienced harassment, misconduct, or felt unsafe, contact your assigned Barangay Officer or SerbiSure Support at the top of Messages. You may also visit your nearest Barangay Hall to file a report.</Text>
          <Text style={styles.body}>After your report is verified, ask the Barangay or Admin to review and adjust any points from this incident.</Text>
          <Pressable accessibilityRole="button" onPress={() => onCancelled(true)} style={styles.primary}><Text style={styles.primaryText}>Understood</Text></Pressable>
        </> : <>
          {loading ? <ActivityIndicator style={styles.loading} color="#0D0D11" /> : preview ? <>
            <Text style={styles.body}>{points === 0
              ? 'You are cancelling with early notice or before an offer is accepted. No penalty points will be added.'
              : `Cancelling ${points === 2 ? 'at or after the scheduled start' : 'with less than 24 hours’ notice'} adds ${points} penalty point${points === 1 ? '' : 's'} this month.`}</Text>
            <Text style={styles.body}>Current: {preview.penalty_points}/3 points. At 3 points, booking and posting are restricted until the 1st of next month.</Text>
            <Text style={styles.label}>Reason for cancellation</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Choose cancellation reason" disabled={busy} onPress={() => setExpanded(value => !value)} style={styles.select}>
              <Text style={styles.selectText}>{reason || 'Choose a reason'}</Text><Text>⌄</Text>
            </Pressable>
            {expanded && <ScrollView style={styles.options} nestedScrollEnabled>{preview.reasons.map(option => <Pressable key={option} accessibilityRole="button" onPress={() => { setReason(option); setExpanded(false); }} style={styles.option}>
              <Text style={styles.selectText}>{option}</Text>
            </Pressable>)}</ScrollView>}
          </> : null}
          {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          {!preview && !loading && <Pressable onPress={() => { setError(null); void load(); }}><Text style={styles.label}>Retry</Text></Pressable>}
          <View style={styles.buttons}>
            <Pressable disabled={busy} accessibilityRole="button" onPress={onClose} style={styles.secondary}><Text style={styles.selectText}>Keep booking</Text></Pressable>
            <Pressable disabled={busy || loading || !reason || !preview} accessibilityRole="button" accessibilityLabel="Confirm booking cancellation" onPress={() => void submit()} style={[styles.primary, styles.confirm, (busy || loading || !reason || !preview) && styles.disabled]}>
              <Text style={styles.primaryText}>{busy ? 'Cancelling…' : 'Cancel booking'}</Text>
            </Pressable>
          </View>
        </>}
      </ScrollView>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.3)' },
  card: { width: '100%', maxWidth: 460, alignSelf: 'center', maxHeight: '90%', borderRadius: 20, flexGrow: 0, backgroundColor: '#FFFFFF' },
  title: { fontSize: 20, fontWeight: '700', color: '#0D0D11' },
  body: { fontSize: 14, lineHeight: 21, color: '#52525B', marginTop: 14 },
  label: { fontSize: 14, fontWeight: '600', color: '#18181B', marginTop: 20, marginBottom: 10 },
  loading: { marginVertical: 24 },
  select: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, borderWidth: 1, borderColor: '#D4D4D8', borderRadius: 12, padding: 14 },
  selectText: { fontSize: 14, color: '#18181B', flexShrink: 1 },
  options: { maxHeight: 180, marginTop: 6, borderWidth: 1, borderColor: '#E4E4E7', borderRadius: 12 },
  option: { padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E4E4E7' },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 22 },
  primary: { marginTop: 22, paddingHorizontal: 18, paddingVertical: 13, borderRadius: 24, backgroundColor: '#0D0D11', alignItems: 'center' },
  confirm: { marginTop: 0, flexShrink: 1 },
  primaryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  secondary: { paddingVertical: 13, paddingHorizontal: 8, flexShrink: 1 },
  error: { color: '#DC2626', fontSize: 13, lineHeight: 19, marginTop: 12 },
  disabled: { opacity: 0.4 },
});
