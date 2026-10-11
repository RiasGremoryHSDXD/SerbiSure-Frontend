import React from 'react';
import { Text, View, Pressable, TextInput } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import THEME from '../../../shared/theme/theme';

import { postingStyles as styles } from '../styles';
import type { PostFormController } from '../hooks/usePostForm';

export function PostStep3({ form }: { form: PostFormController }) {
  const {
    mode,
    config,
    user,
    step,
    engagementType,
    selectedRegion,
    selectedProvince,
    selectedCity,
    selectedBarangay,
    streetAddress,
    setStreetAddress,
    floorUnit,
    setFloorUnit,
    zipcode,
    setZipcode,
    instructions,
    setInstructions,
    offerAmount,
    setOfferAmount,
    applyUserProfileAddress,
    handleOpenRegionPicker,
    handleOpenProvincePicker,
    handleOpenCityPicker,
    handleOpenBarangayPicker,
    getSelectedRoleLabel,
  } = form;
  return (<>
    {/* STEP 3: DETAILS, INSTRUCTIONS & RATE */}
    {step === 3 && (
      <View style={styles.step3Container}>
        {/* Location Header & Profile Address Quick Use */}
        <View style={styles.locationHeaderRow}>
          <Text style={styles.inputGroupLabel}>{config.addressLabel}</Text>
          {user && (user.barangay || user.city) ? (
            <Pressable style={styles.useProfileAddressBtn} onPress={applyUserProfileAddress}>
              <Ionicons name="location" size={13} color="#EA580C" />
              <Text style={styles.useProfileAddressText}>Use Profile Address</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Region Dropdown Button */}
        <Pressable style={styles.locationSelectButton} onPress={handleOpenRegionPicker}>
          <Ionicons name="map-outline" size={18} color="#0D0D11" style={styles.locationIcon} />
          <Text
            style={[styles.locationSelectText, !selectedRegion && styles.locationPlaceholderText]}
            numberOfLines={1}
          >
            {selectedRegion ? selectedRegion.displayName || selectedRegion.name : 'Select Region'}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
        </Pressable>

        {/* Province Dropdown Button */}
        <Pressable
          style={[styles.locationSelectButton, !selectedRegion && styles.locationSelectButtonDisabled]}
          onPress={handleOpenProvincePicker}
          disabled={!selectedRegion}
        >
          <Ionicons name="business-outline" size={18} color="#0D0D11" style={styles.locationIcon} />
          <Text
            style={[styles.locationSelectText, !selectedProvince && styles.locationPlaceholderText]}
            numberOfLines={1}
          >
            {selectedProvince ? selectedProvince.displayName || selectedProvince.name : 'Select Province'}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
        </Pressable>

        {/* City / Municipality Dropdown Button */}
        <Pressable
          style={[styles.locationSelectButton, !selectedProvince && styles.locationSelectButtonDisabled]}
          onPress={handleOpenCityPicker}
          disabled={!selectedProvince}
        >
          <Ionicons name="location-outline" size={18} color="#0D0D11" style={styles.locationIcon} />
          <Text
            style={[styles.locationSelectText, !selectedCity && styles.locationPlaceholderText]}
            numberOfLines={1}
          >
            {selectedCity ? selectedCity.displayName || selectedCity.name : 'Select City / Municipality'}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
        </Pressable>

        {/* Barangay Dropdown Button */}
        <Pressable
          style={[styles.locationSelectButton, !selectedCity && styles.locationSelectButtonDisabled]}
          onPress={handleOpenBarangayPicker}
          disabled={!selectedCity}
        >
          <Ionicons name="home-outline" size={18} color="#0D0D11" style={styles.locationIcon} />
          <Text
            style={[styles.locationSelectText, !selectedBarangay && styles.locationPlaceholderText]}
            numberOfLines={1}
          >
            {selectedBarangay ? selectedBarangay.displayName || selectedBarangay.name : 'Select Barangay'}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
        </Pressable>

        {/* House No. / Street / Zone Input */}
        <View style={styles.locationInputContainer}>
          <Ionicons name="navigate-outline" size={18} color="#0D0D11" style={styles.locationIcon} />
          <TextInput
            style={styles.locationInput}
            placeholder="House No. / Street / Zone / Subdivision"
            placeholderTextColor="#9CA3AF"
            value={streetAddress}
            onChangeText={setStreetAddress}
            maxLength={100}
          />
        </View>

        {/* Floor / Unit (Optional) & Zip Code in a row */}
        <View style={styles.addressSubRow}>
          <View style={[styles.locationInputContainer, { flex: 1.2, marginRight: 8 }]}>
            <Ionicons name="layers-outline" size={18} color="#0D0D11" style={styles.locationIcon} />
            <TextInput
              style={styles.locationInput}
              placeholder="Floor / Unit (Opt)"
              placeholderTextColor="#9CA3AF"
              value={floorUnit}
              onChangeText={setFloorUnit}
              maxLength={30}
            />
          </View>

          <View style={[styles.locationInputContainer, { flex: 1 }]}>
            <Ionicons name="mail-outline" size={18} color="#0D0D11" style={styles.locationIcon} />
            <TextInput
              style={styles.locationInput}
              placeholder="Zip Code"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={4}
              value={zipcode}
              onChangeText={(t) => setZipcode(t.replace(/\D/g, '').slice(0, 4))}
            />
          </View>
        </View>

        <Text style={styles.inputGroupLabel}>{config.instructionsLabel}</Text>
        <TextInput
          style={styles.multilineInput}
          multiline
          numberOfLines={4}
          placeholder={config.instructionsPlaceholder}
          placeholderTextColor="#9CA3AF"
          value={instructions}
          onChangeText={setInstructions}
        />

        <Text style={styles.inputGroupLabel}>
          {engagementType === 'short' ? 'OFFER AMOUNT (PER DAY)' : 'MONTHLY SALARY OFFER'}
        </Text>
        {(() => {
          const num = Number(offerAmount.replace(/[^0-9.]/g, ''));
          const isBelowMin = offerAmount.trim().length > 0 && (engagementType === 'short' ? num < 600 : num < 6500);
          return (
            <>
              <View style={[styles.offerInputWrapper, isBelowMin && styles.offerInputWrapperInvalid]}>
                <Text style={[styles.currencyPrefix, isBelowMin && { color: '#DC2626' }]}>₱</Text>
                <TextInput
                  style={[styles.offerInput, isBelowMin && { color: '#DC2626' }]}
                  value={offerAmount}
                  onChangeText={setOfferAmount}
                  keyboardType="numeric"
                  placeholder={engagementType === 'short' ? '600' : '6500'}
                  placeholderTextColor={isBelowMin ? '#FCA5A5' : '#9CA3AF'}
                />
                <Text style={[styles.rateUnitSuffix, isBelowMin && { color: '#DC2626' }]}>
                  {engagementType === 'short' ? '/day' : '/month'}
                </Text>
              </View>
              {isBelowMin ? (
                <Text style={styles.invalidRateHint}>
                  {engagementType === 'short'
                    ? (mode === 'service' ? 'Minimum daily rate is ₱600/day.' : 'Minimum rate is ₱600 / day')
                    : (mode === 'service' ? 'Minimum monthly salary is ₱6,500/month (RA 10361).' : 'Minimum salary is ₱6,500 / month')}
                </Text>
              ) : null}
            </>
          );
        })()}

        <View style={styles.recommendBox}>
          <Text style={styles.recommendTitle}>
            {engagementType === 'short'
              ? `Suggested rate for ${getSelectedRoleLabel()}: `
              : `Standard monthly rate for ${getSelectedRoleLabel()}: `}
            <Text style={{ fontFamily: THEME.typography.fontFamily.mainExtraBold, fontWeight: '800', color: '#0D0D11' }}>
              {engagementType === 'short' ? '₱600 - ₱1,500 / day' : '₱6,500 - ₱15,000 / month'}
            </Text>
          </Text>
          <Text style={styles.recommendSub}>
            {engagementType === 'short'
              ? 'Fair compensation based on daily task difficulty and hours (minimum ₱600/day).'
              : 'Complies with RTWPB Batas Kasambahay statutory regional wage standards (minimum ₱6,500/month).'}
          </Text>
        </View>
      </View>
    )}
  </>);
}
