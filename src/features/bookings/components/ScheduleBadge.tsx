import React from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { useLanguage } from '../../../shared/localization/LanguageContext';
import { isScheduleExpired, type PostState } from '../postAvailability';
import THEME from '../../../shared/theme/theme';

export interface ScheduleBadgeProps {
  readonly post: PostState;
  readonly now?: number;
  readonly prefix?: string;
  readonly style?: StyleProp<TextStyle>;
}

export function ScheduleBadge({
  post,
  now,
  prefix,
  style,
}: Readonly<ScheduleBadgeProps>): React.JSX.Element | null {
  const { tr } = useLanguage();
  if (!isScheduleExpired(post, now)) return null;
  return (
    <Text style={[styles.expiredText, style]}>
      {prefix ? `${prefix} ` : ''}{tr('Expired Schedule')}
    </Text>
  );
}

const styles = StyleSheet.create({
  expiredText: {
    color: '#C2410C',
    fontSize: 11.5,
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
  },
});
