import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchablePickerModal } from '../../../shared/ui/SearchablePickerModal';
import type { WorkLocationForm } from '../workLocation';

export function WorkLocationFields({
  form,
  disabled = false,
  regionOnly = false,
  hideDetailedAddress = false,
  errors = {},
}: {
  form: WorkLocationForm;
  disabled?: boolean;
  regionOnly?: boolean;
  hideDetailedAddress?: boolean;
  errors?: Record<string, boolean>;
}) {
  const { tr: uiText } = useUiLanguage();
  const pickers = [
    { key: 'region' as const, label: 'Region', selected: form.selectedRegion, list: form.regionsList, enabled: true, open: form.handleOpenRegionPicker, select: form.handleSelectRegion },
    { key: 'province' as const, label: 'Province', selected: form.selectedProvince, list: form.provincesList, enabled: !!form.selectedRegion, open: form.handleOpenProvincePicker, select: form.handleSelectProvince },
    { key: 'city' as const, label: 'City / Municipality', selected: form.selectedCity, list: form.citiesList, enabled: !!form.selectedProvince, open: form.handleOpenCityPicker, select: form.handleSelectCity },
    { key: 'barangay' as const, label: 'Barangay', selected: form.selectedBarangay, list: form.barangaysList, enabled: !!form.selectedCity, open: form.handleOpenBarangayPicker, select: form.handleSelectBarangay },
  ];
  return (
    <View style={styles.container}>
      {pickers.filter(picker => !regionOnly || picker.key === 'region').map(picker => (
        <View key={picker.key} style={styles.fieldWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Select work ${picker.label}`}
            style={[
              styles.field,
              (!picker.enabled || disabled) && styles.disabled,
              errors[picker.key] && styles.fieldError,
            ]}
            disabled={!picker.enabled || disabled}
            onPress={picker.open}
          >
            <Text style={[styles.text, !picker.selected && styles.placeholderText]}>
              {picker.selected?.displayName || picker.selected?.name || `Select ${picker.label}`}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
          </Pressable>
          <SearchablePickerModal
            visible={form.activePicker === picker.key && !disabled}
            title={`Select ${picker.label}`}
            items={picker.list}
            selectedCode={picker.selected?.code}
            loading={form.loadingLocations}
            onSelect={picker.select}
            onClose={() => form.setActivePicker(null)}
          />
        </View>
      ))}
      {!regionOnly && !hideDetailedAddress && (
        <>
          <View style={styles.fieldWrap}>
            <TextInput
              accessibilityLabel="Work street address"
              style={[styles.field, errors.street && styles.fieldError]}
              value={form.streetAddress}
              onChangeText={form.setStreetAddress}
              placeholder="House No. / Street / Zone / Subdivision"
              placeholderTextColor="#9CA3AF"
              editable={!disabled}
              maxLength={100}
            />
          </View>
          <View style={styles.row}>
            <TextInput
              accessibilityLabel="Floor or unit (optional)"
              style={[styles.field, styles.flex]}
              value={form.floorUnit}
              onChangeText={form.setFloorUnit}
              placeholder="Floor / Unit (optional)"
              placeholderTextColor="#9CA3AF"
              editable={!disabled}
              maxLength={30}
            />
            <TextInput
              accessibilityLabel="Work ZIP code"
              style={[styles.field, styles.flex, errors.zipcode && styles.fieldError]}
              value={form.zipcode}
              onChangeText={value => form.setZipcode(value.replace(/\D/g, '').slice(0, 4))}
              placeholder="ZIP Code"
              placeholderTextColor="#9CA3AF"
              editable={!disabled}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  fieldWrap: {
    marginBottom: 0,
  },
  field: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  fieldError: {
    borderColor: '#EF4444',
  },
  text: {
    color: '#1A1A1A',
    fontSize: 13.5,
    fontWeight: '600',
    flex: 1,
  },
  placeholderText: {
    color: '#9CA3AF',
    fontWeight: '400',
  },
  disabled: {
    opacity: 0.5,
    backgroundColor: '#F9F9F9',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  flex: {
    flex: 1,
  },
});
