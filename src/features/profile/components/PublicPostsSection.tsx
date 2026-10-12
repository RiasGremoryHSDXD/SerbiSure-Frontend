import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../auth/session/UserContext';
import { submitBookingProposal, type PublicPendingPost } from '../../bookings/api/bookingApi';
import { PendingPostCard } from './PendingPostCard';
import { profileStyles as styles } from '../styles';

export function PublicPostsSection({ posts, loading, error, token, ownerId, ownerRole, onRefresh, onSubmitted }: Readonly<{
  posts: PublicPendingPost[]; loading: boolean; error: string | null; token?: string | null;
  ownerId?: string; ownerRole: string; onRefresh: () => void;
  onSubmitted: (postId: string, proposal: NonNullable<PublicPendingPost['viewer_proposal']>) => void;
}>) {
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<PublicPendingPost | null>(null);
  const [rate, setRate] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const isJob = ownerRole === 'Homeowner';
  const allowedRole = isJob ? 'Kasambahay' : ownerRole === 'Kasambahay' ? 'Homeowner' : null;
  const canRespond = user.id !== ownerId && user.accountType === allowedRole;
  const action = isJob ? 'Apply' : 'Offer to Hire';

  const openProposal = (post: PublicPendingPost) => {
    if (user.verificationStatus !== 'Verified') {
      Alert.alert('Verification Required', 'Verify your account before sending an application or hiring offer.');
      return;
    }
    setRate(post.daily_rate);
    setMessage('');
    setSelected(post);
  };

  const submit = async () => {
    if (!selected || !token || submittingRef.current) return;
    const amount = Number(rate);
    if (!Number.isFinite(amount) || amount < 1 || amount > 999999.99) {
      Alert.alert('Invalid Rate', 'Enter a daily rate between ₱1 and ₱999,999.99.');
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const result = await submitBookingProposal(token, selected.booking_id, amount,
        `${isJob ? 'Job application' : 'Hiring offer'}: ${message.trim() || (isJob ? 'I would like to apply for this job.' : 'I would like to hire you for this service.')}`);
      if (!result.success || !result.proposal) {
        Alert.alert('Unable to Send', result.error || 'Please try again.');
        onRefresh();
        return;
      }
      onSubmitted(selected.booking_id, result.proposal);
      setSelected(null);
      Alert.alert(isJob ? 'Application Sent' : 'Hiring Offer Sent', 'The post owner has been notified. Your proposal is pending until they respond.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return <View style={styles.pendingPostsSection}>
    <View style={styles.tabSectionHeader}>
      <View style={{ flex: 1, marginRight: 8 }}><Text style={styles.tabSectionTitle}>Pending Posts</Text><Text style={styles.tabSectionSubtitle}>{isJob ? 'Open jobs accepting applications' : 'Service posts available for hiring'}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Refresh pending posts" style={styles.refreshIconBtn} onPress={onRefresh} disabled={loading}><Ionicons name="refresh-outline" size={15} color="#EA580C" /></Pressable>
    </View>
    {loading ? <View style={styles.postsLoadingTile}><ActivityIndicator color="#FFB380" /><Text style={styles.postsLoadingText}>Loading pending posts...</Text></View>
      : error ? <View style={styles.postsErrorTile}><Text style={styles.postsErrorTitle}>Unable to load posts</Text><Text style={styles.postsErrorSubtitle}>{error}</Text><Pressable style={styles.postsRetryButton} onPress={onRefresh}><Text style={styles.postsRetryButtonText}>Try Again</Text></Pressable></View>
      : posts.length === 0 ? <View style={styles.emptyPendingPostsCard}><Ionicons name="time-outline" size={26} color="#9CA3AF" /><Text style={styles.emptyPendingPostsTitle}>No Pending Posts</Text><Text style={styles.emptyPendingPostsSubtitle}>{isJob ? 'This homeowner has no open job posts right now.' : 'This kasambahay has no service posts available right now.'}</Text></View>
      : <View style={styles.pendingPostsList}>{posts.map(post => {
        const status = post.viewer_proposal?.status;
        const pending = status === 'Pending' || status === 'Accepted';
        const note = status === 'Pending' ? (isJob ? 'Your application is awaiting a response' : 'Your hiring offer is awaiting a response')
          : status === 'Accepted' ? 'Your proposal was accepted' : isJob ? 'Waiting for worker applications' : 'Available for hiring offers';
        return <PendingPostCard key={post.booking_id} post={post} note={note}>
          {canRespond && token ? <Pressable accessibilityRole="button" style={[styles.pendingPostManageBtn, { backgroundColor: pending ? '#F3F4F6' : '#FFB380', minHeight: 44 }]} disabled={pending} onPress={() => openProposal(post)}><Text style={styles.pendingPostManageBtnText}>{pending ? (status === 'Accepted' ? 'Accepted' : isJob ? 'Application Sent' : 'Offer Sent') : action}</Text></Pressable> : null}
        </PendingPostCard>;
      })}</View>}
    <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => !submitting && setSelected(null)}>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" style={{ flexGrow: 0, maxHeight: '85%', backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24 }} contentContainerStyle={{ padding: 24, paddingBottom: Math.max(insets.bottom, 16) + 16 }}>
          <Text style={styles.tabSectionTitle}>{isJob ? 'Apply for this Job' : 'Send a Hiring Offer'}</Text>
          <Text style={[styles.tabSectionSubtitle, { marginBottom: 16 }]}>The owner will review your proposal before confirming a booking.</Text>
          <Text style={styles.pendingPostManageBtnText}>Proposed daily rate (₱)</Text>
          <TextInput accessibilityLabel="Proposed daily rate" value={rate} onChangeText={setRate} keyboardType="decimal-pad" editable={!submitting} style={[styles.bioTextInput, { minHeight: 48, marginTop: 8, marginBottom: 16 }]} />
          <Text style={styles.pendingPostManageBtnText}>Message (optional)</Text>
          <TextInput accessibilityLabel="Proposal message" value={message} onChangeText={setMessage} multiline maxLength={450} editable={!submitting} placeholder={isJob ? 'Tell the homeowner why you are a good fit...' : 'Describe the work you would like help with...'} style={[styles.bioTextInput, { marginTop: 8, marginBottom: 16 }]} />
          <View style={styles.modalActionButtons}>
            <Pressable style={styles.cancelModalBtn} disabled={submitting} onPress={() => setSelected(null)}><Text style={styles.cancelModalBtnText}>Cancel</Text></Pressable>
            <Pressable style={styles.saveModalBtn} disabled={submitting} onPress={submit}>{submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveModalBtnText}>Send {isJob ? 'Application' : 'Offer'}</Text>}</Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  </View>;
}
