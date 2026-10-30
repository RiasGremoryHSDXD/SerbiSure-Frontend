import React from 'react';
import { Text } from 'react-native';
import { useLanguage } from '../../../shared/localization/LanguageContext';
import { isScheduleExpired, type PostState } from '../postAvailability';

export function ScheduleBadge({ post, now }: { post: PostState; now?: number }) {
  const { tr } = useLanguage();
  if (!isScheduleExpired(post, now)) return null;
  return <Text style={{ alignSelf: 'flex-start', color: '#92400E', backgroundColor: '#FEF3C7',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, fontSize: 12, marginVertical: 6 }}>
    {tr('Expired Schedule')}
  </Text>;
}
