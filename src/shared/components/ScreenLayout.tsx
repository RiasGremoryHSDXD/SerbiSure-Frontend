import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import THEME from '../theme/theme';

export function ScreenLayout({ header, children, refreshing = false, onRefresh }: {
  header?: React.ReactNode;
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      {header ? (
        <>
          <View style={{ height: insets.top, backgroundColor: THEME.colors.canvas }} />
          {header}
        </>
      ) : null}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.colors.brandDark]} tintColor={THEME.colors.brandDark} progressViewOffset={header ? 52 : 0} /> : undefined}
      >{children}</ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.canvas },
  content: { paddingTop: 8, paddingBottom: 134 },
});
