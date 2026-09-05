import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecommendationItem, fetchRecommendations } from '../api/bookingApi';

export interface RecommendationsSectionProps {
  token?: string | null;
  accountType?: string;
  onSelectWorker?: (worker: { id: string; name: string; avatar?: string; role: string }) => void;
  onSelectJob?: (job: { id: string; title: string; rate: string }) => void;
}

export function RecommendationsSection({
  token,
  accountType = 'Homeowner',
  onSelectWorker,
  onSelectJob,
}: RecommendationsSectionProps) {
  const [items, setItems] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    setLoading(true);

    fetchRecommendations(token)
      .then((data) => {
        if (isMounted) setItems(data);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  if (!loading && items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Ionicons name="sparkles" size={17} color="#FFB43B" style={{ marginRight: 6 }} />
          <Text style={styles.title}>
            {accountType === 'Homeowner' ? 'Top Matched Workers' : 'Recommended Jobs'}
          </Text>
        </View>
        <Text style={styles.subtext}>AI-Powered Matches</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#FFB43B" style={{ marginVertical: 20 }} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {items.map((item, idx) => {
            const isWorker = accountType === 'Homeowner';
            const nameOrTitle = isWorker ? item.name || 'Kasambahay' : item.title || 'Job';
            const avatarUri =
              (isWorker ? item.avatar : item.poster_avatar) ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(nameOrTitle)}&background=FFB43B&color=fff`;

            return (
              <Pressable
                key={item.id || item.booking_id || idx}
                style={styles.card}
                onPress={() => {
                  if (isWorker && item.id) {
                    onSelectWorker?.({
                      id: item.id,
                      name: nameOrTitle,
                      avatar: avatarUri,
                      role: item.role || 'Kasambahay',
                    });
                  } else if (!isWorker && item.booking_id) {
                    onSelectJob?.({
                      id: item.booking_id,
                      title: nameOrTitle,
                      rate: item.daily_rate || '0',
                    });
                  }
                }}
              >
                {/* Match Score Badge */}
                <View style={styles.matchBadge}>
                  <Text style={styles.matchBadgeText}>{item.match_score}% Match</Text>
                </View>

                {/* Avatar / Icon */}
                <Image source={{ uri: avatarUri }} style={styles.cardAvatar} />

                <Text style={styles.cardName} numberOfLines={1}>
                  {nameOrTitle}
                </Text>

                <Text style={styles.cardLocation} numberOfLines={1}>
                  {item.location}
                </Text>

                {isWorker ? (
                  <View style={styles.metaRow}>
                    <Ionicons name="star" size={12} color="#FFB43B" />
                    <Text style={styles.metaText}>{item.rating || '5.0'}</Text>
                  </View>
                ) : (
                  <View style={styles.metaRow}>
                    <Text style={styles.rateText}>₱{item.daily_rate}/day</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  subtext: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFB43B',
    backgroundColor: '#FFF8EC',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  card: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  matchBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  matchBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },
  cardAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginTop: 10,
    marginBottom: 8,
    backgroundColor: '#F3F4F6',
  },
  cardName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 2,
  },
  cardLocation: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  rateText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
});
