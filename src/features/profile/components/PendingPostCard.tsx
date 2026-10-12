import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatBookingAddress, type BookingItem } from '../../bookings/api/bookingApi';
import { profileStyles as styles } from '../styles';

export function PendingPostCard({ post, note, children }: Readonly<{ post: BookingItem; note: string; children?: React.ReactNode }>) {
  const startDate = post.start_time ? new Date(post.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Flexible';
  return <View style={styles.pendingPostCard}>
    <View style={styles.pendingPostTopRow}>
      <View style={styles.categoryChipsWrap}>{post.service_category.map((category, index) =>
        <View key={`${category}-${index}`} style={styles.categoryChip}><Text style={styles.categoryChipText}>{category.replace(/_/g, ' ')}</Text></View>
      )}</View>
      <View style={styles.pendingStatusBadge}><Ionicons name="time" size={11} color="#B45309" style={{ marginRight: 3 }} /><Text style={styles.pendingStatusBadgeText}>Pending</Text></View>
    </View>
    <View style={styles.pendingPostRateRow}>
      <Text style={styles.pendingPostRate}>₱{Number(post.daily_rate || 0).toLocaleString()}</Text>
      <Text style={styles.pendingPostRateUnit}> / day · {post.booking_type === 'long_term' ? 'Stay-In' : 'Part-time'}</Text>
    </View>
    <View style={styles.pendingPostDetails}>
      <View style={styles.pendingPostDetailItem}><Ionicons name="location-outline" size={13} color="#6B7280" style={{ marginRight: 4 }} /><Text style={styles.pendingPostDetailText} numberOfLines={2}>{formatBookingAddress(post)}</Text></View>
      <View style={styles.pendingPostDetailItem}><Ionicons name="calendar-outline" size={13} color="#6B7280" style={{ marginRight: 4 }} /><Text style={styles.pendingPostDetailText}>Starts: {startDate}</Text></View>
    </View>
    {post.special_instruction ? <View style={styles.pendingPostInstructionBox}><Text style={styles.pendingPostInstructionText}>{post.special_instruction}</Text></View> : null}
    <View style={styles.pendingPostProposalsRow}><Ionicons name="people-outline" size={13} color="#D97706" style={{ marginRight: 5 }} /><Text style={styles.pendingPostProposalsText}>{note}</Text></View>
    {children ? <View style={styles.pendingPostActionsRow}>{children}</View> : null}
  </View>;
}
