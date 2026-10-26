import React from 'react';
import { View, StyleSheet, Pressable, StyleProp, ViewStyle } from 'react-native';

export interface BottomSheetHandleProps {
  onPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  handleStyle?: StyleProp<ViewStyle>;
}

export const BOTTOM_SHEET_HANDLE_WIDTH = 38;
export const BOTTOM_SHEET_HANDLE_HEIGHT = 4;
export const BOTTOM_SHEET_HANDLE_RADIUS = 2;
export const BOTTOM_SHEET_HANDLE_COLOR = '#CBD5E1';

export function BottomSheetHandle({ onPress, containerStyle, handleStyle }: BottomSheetHandleProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 12, bottom: 12, left: 32, right: 32 }}
      style={[styles.container, containerStyle]}
      accessibilityRole="button"
      accessibilityLabel="Bottom sheet handle"
    >
      <View style={[styles.handle, handleStyle]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 8,
    width: '100%',
  },
  handle: {
    width: BOTTOM_SHEET_HANDLE_WIDTH,
    height: BOTTOM_SHEET_HANDLE_HEIGHT,
    borderRadius: BOTTOM_SHEET_HANDLE_RADIUS,
    backgroundColor: BOTTOM_SHEET_HANDLE_COLOR,
  },
});
