import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

const logo = require('../../../assets/serbisure_new_clean.png');

export function AppHeader({ right }: { right?: React.ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={styles.side} />
      <Image source={logo} style={styles.logo} resizeMode="contain" />
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  side: { width: 44 }, right: { alignItems: 'flex-end' }, logo: { width: 44, height: 44 },
});
