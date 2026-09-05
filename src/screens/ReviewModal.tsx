import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { submitReview, SentimentType } from '../api/reviewApi';

export interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  bookingId: string;
  revieweeName?: string;
  token?: string | null;
  onSuccess?: () => void;
}

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'];

export function ReviewModal({
  visible,
  onClose,
  bookingId,
  revieweeName = 'Service Partner',
  token,
  onSuccess,
}: ReviewModalProps) {
  const insets = useSafeAreaInsets();

  const [rating, setRating] = useState<number>(5);
  const [feedback, setFeedback] = useState<string>('');
  const [sentiment, setSentiment] = useState<SentimentType>('Positive');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStarPress = (score: number) => {
    setRating(score);
    if (score >= 4) {
      setSentiment('Positive');
    } else if (score === 3) {
      setSentiment('Neutral');
    } else {
      setSentiment('Negative');
    }
  };

  const handleSubmit = async () => {
    if (!token) {
      Alert.alert('Session Expired', 'Please log in again to submit a review.');
      return;
    }

    const trimmed = feedback.trim();
    if (trimmed.length < 10) {
      setErrorMsg('Feedback must be at least 10 characters long.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      await submitReview(token, {
        booking_id: bookingId,
        rating,
        unstructured_feedback: trimmed,
        nlp_sentiment: sentiment,
      });

      setIsSubmitting(false);
      Alert.alert('Review Submitted', 'Thank you for your valuable feedback!', [
        {
          text: 'OK',
          onPress: () => {
            setFeedback('');
            setRating(5);
            setSentiment('Positive');
            onClose();
            onSuccess?.();
          },
        },
      ]);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Failed to submit review. Please try again.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <Pressable onPress={onClose} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="close" size={24} color="#1A1A1A" />
          </Pressable>
          <Text style={styles.headerTitle}>Write a Review</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Card Hero */}
          <View style={styles.card}>
            <Text style={styles.revieweeText}>How was your experience with</Text>
            <Text style={styles.revieweeName}>{revieweeName}?</Text>

            {/* Stars Picker */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Pressable
                  key={s}
                  onPress={() => handleStarPress(s)}
                  hitSlop={8}
                  style={styles.starTouch}
                >
                  <Ionicons
                    name={s <= rating ? 'star' : 'star-outline'}
                    size={38}
                    color="#FFB43B"
                  />
                </Pressable>
              ))}
            </View>
            <Text style={styles.ratingScoreText}>{rating}.0 — {RATING_LABELS[rating]}</Text>

            {/* Sentiment Pills */}
            <View style={styles.sentimentRow}>
              {(['Positive', 'Neutral', 'Negative'] as SentimentType[]).map((sent) => {
                const isSelected = sentiment === sent;
                return (
                  <Pressable
                    key={sent}
                    onPress={() => setSentiment(sent)}
                    style={[
                      styles.sentimentPill,
                      isSelected && styles.sentimentPillSelected,
                    ]}
                  >
                    <Ionicons
                      name={
                        sent === 'Positive'
                          ? 'happy-outline'
                          : sent === 'Neutral'
                          ? 'remove-circle-outline'
                          : 'sad-outline'
                      }
                      size={14}
                      color={isSelected ? '#FFFFFF' : '#6B7280'}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.sentimentPillText,
                        isSelected && styles.sentimentPillTextSelected,
                      ]}
                    >
                      {sent}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Feedback Form */}
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>FEEDBACK DETAILS</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Tell others about the quality of work, punctuality, and overall satisfaction (minimum 10 characters)..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              value={feedback}
              onChangeText={(text) => {
                setFeedback(text);
                if (errorMsg) setErrorMsg(null);
              }}
              maxLength={1000}
            />
            <View style={styles.charCountRow}>
              <Text
                style={[
                  styles.charCountText,
                  feedback.trim().length > 0 && feedback.trim().length < 10
                    ? { color: '#EF4444' }
                    : null,
                ]}
              >
                {feedback.trim().length} / 1000 characters (min 10)
              </Text>
            </View>
          </View>

          {/* Error Banner */}
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#EF4444" style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Submit Button */}
          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              isSubmitting && { opacity: 0.7 },
              pressed && { opacity: 0.9 },
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Review</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  revieweeText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  revieweeName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 16,
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  starTouch: {
    padding: 4,
  },
  ratingScoreText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 16,
  },
  sentimentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sentimentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  sentimentPillSelected: {
    backgroundColor: '#FFB43B',
  },
  sentimentPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  sentimentPillTextSelected: {
    color: '#FFFFFF',
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  textArea: {
    minHeight: 120,
    fontSize: 14,
    lineHeight: 20,
    color: '#1A1A1A',
    padding: 0,
  },
  charCountRow: {
    alignItems: 'flex-end',
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F3F4F6',
    paddingTop: 6,
  },
  charCountText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#B91C1C',
    flex: 1,
  },
  submitBtn: {
    backgroundColor: '#FFB43B',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFB43B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
