import React from 'react';
import { Text, View, Pressable } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { postingStyles as styles } from '../styles';
import type { PostFormController } from '../hooks/usePostForm';

export function PostStep1({ form }: { form: PostFormController }) {
  const {
    step,
    selectedServices,
    services,
    handleToggleService,
  } = form;
  return (<>
    {/* STEP 1: SERVICE CATEGORY CARDS */}
    {step === 1 && (
      <View style={styles.serviceGrid}>
        {services.map((item) => {
          const isSelected = selectedServices.includes(item.id);

          return (
            <Pressable
              key={item.id}
              style={[styles.serviceCard, isSelected && styles.serviceCardActive]}
              onPress={() => handleToggleService(item.id)}
            >
              <Ionicons
                name={item.icon as any}
                size={32}
                color={isSelected ? '#0D0D11' : '#FFB380'}
                style={styles.serviceIcon}
              />
              <Text style={[styles.serviceLabel, isSelected && styles.serviceLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    )}
  </>);
}
