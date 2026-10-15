import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { profileStyles as styles } from '../styles';

export function SettingsRow({
  icon,
  title,
  iconColor = '#FFB380',
  rightComponent,
  onPress,
  zIndex,
}: {
  icon: any;
  title: string;
  iconColor?: string;
  rightComponent?: React.ReactNode;
  onPress?: () => void;
  zIndex?: number;
}) {
  return (
    <Pressable
      style={[styles.settingsRow, zIndex ? { zIndex, elevation: zIndex } : undefined]}
      onPress={onPress}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={styles.rowTitle}>{title}</Text>
      {rightComponent ? rightComponent : <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />}
    </Pressable>
  );
}

