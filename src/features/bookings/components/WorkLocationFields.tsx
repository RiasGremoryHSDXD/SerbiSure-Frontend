import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchablePickerModal } from '../../../shared/ui/SearchablePickerModal';
import type { WorkLocationForm } from '../workLocation';

export function WorkLocationFields({ form, disabled = false, regionOnly = false }: { form: WorkLocationForm; disabled?: boolean; regionOnly?: boolean }) {
  const pickers = [
    { key: 'region' as const, label: 'Region', selected: form.selectedRegion, list: form.regionsList, enabled: true, open: form.handleOpenRegionPicker, select: form.handleSelectRegion },
    { key: 'province' as const, label: 'Province', selected: form.selectedProvince, list: form.provincesList, enabled: !!form.selectedRegion, open: form.handleOpenProvincePicker, select: form.handleSelectProvince },
    { key: 'city' as const, label: 'City / Municipality', selected: form.selectedCity, list: form.citiesList, enabled: !!form.selectedProvince, open: form.handleOpenCityPicker, select: form.handleSelectCity },
    { key: 'barangay' as const, label: 'Barangay', selected: form.selectedBarangay, list: form.barangaysList, enabled: !!form.selectedCity, open: form.handleOpenBarangayPicker, select: form.handleSelectBarangay },
  ];
  return <View>
    <Text style={styles.hint}>Select the actual work address. The region determines the applicable wage policy.</Text>
    {pickers.filter(picker => !regionOnly || picker.key === 'region').map(picker => <View key={picker.key}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Select work ${picker.label}`} style={[styles.field, (!picker.enabled || disabled) && styles.disabled]}
        disabled={!picker.enabled || disabled} onPress={picker.open}>
        <Text style={styles.text}>{picker.selected?.displayName || picker.selected?.name || `Select ${picker.label}`}</Text>
        <Ionicons name="chevron-down" size={18} color="#6B7280" />
      </Pressable>
      <SearchablePickerModal visible={form.activePicker === picker.key && !disabled} title={`Select ${picker.label}`} items={picker.list}
        selectedCode={picker.selected?.code} loading={form.loadingLocations} onSelect={picker.select} onClose={() => form.setActivePicker(null)} />
    </View>)}
    {!regionOnly && <><TextInput accessibilityLabel="Work street address" style={styles.field} value={form.streetAddress} onChangeText={form.setStreetAddress}
      placeholder="House No. / Street / Zone / Subdivision" placeholderTextColor="#6B7280" editable={!disabled} maxLength={100} />
    <View style={styles.row}>
      <TextInput accessibilityLabel="Floor or unit (optional)" style={[styles.field, styles.flex]} value={form.floorUnit} onChangeText={form.setFloorUnit}
        placeholder="Floor / Unit (optional)" placeholderTextColor="#6B7280" editable={!disabled} maxLength={30} />
      <TextInput accessibilityLabel="Work ZIP code" style={[styles.field, styles.flex]} value={form.zipcode} onChangeText={value => form.setZipcode(value.replace(/\D/g, '').slice(0, 4))}
        placeholder="ZIP Code" placeholderTextColor="#6B7280" editable={!disabled} keyboardType="number-pad" maxLength={4} />
    </View></>}
  </View>;
}

const styles = StyleSheet.create({
  hint: { color: '#6B7280', fontSize: 12, marginBottom: 8 },
  field: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  text: { color: '#0D0D11', fontSize: 13, flex: 1 }, disabled: { opacity: 0.4 }, row: { flexDirection: 'row', gap: 8 }, flex: { flex: 1 },
});
