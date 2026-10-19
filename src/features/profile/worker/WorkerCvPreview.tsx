import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { WorkerCv } from '../api/workerCvApi';

/** Uses the same server-formatted, privacy-filtered content as the PDF. */
export function WorkerCvPreview({ cv }: { cv: WorkerCv }) {
  const { tr: uiText } = useUiLanguage();
  const model = cv.presentation;
  if (!model) return <Text style={styles.body}>{uiText("Update the backend and reopen this CV to see the latest preview.")}</Text>;
  return <>
    <View style={styles.hero}>
      <Text style={styles.eyebrow}>{uiText("SERBISURE WORKER CV")}</Text>
      <View style={styles.identity}>
        <View style={styles.identityText}>
          <Text style={styles.name}>{model.name}</Text>
          {!!model.services && <Text style={styles.services}>{model.services}</Text>}
          {!!model.location && <Text style={styles.meta}>{model.location}</Text>}
          {!!model.phone && <Text style={styles.meta}>{model.phone}</Text>}
          {model.verified && <Text style={styles.badge}>{uiText("✓ Verified")}</Text>}
        </View>
        {!!cv.profile_image_url && <Image accessibilityLabel="Worker profile photo" source={{ uri: cv.profile_image_url }} style={styles.photo} />}
      </View>
      {!!model.facts.length && <View style={styles.facts}>{model.facts.map(item => <View style={styles.fact} key={item.label}>
        <Text style={styles.label}>{uiText(item.label)}</Text><Text style={styles.factValue}>{item.value}</Text>
      </View>)}</View>}
    </View>
    {model.sections.map(section => <View style={styles.card} key={section.title}>
      <Text style={styles.heading}>{section.title}</Text>
      {section.kind === 'chips' ? <View style={styles.chips}>{section.items.map((item: string) => <View style={styles.chip} key={item}><Text style={styles.chipText}>{item}</Text></View>)}</View>
        : section.kind === 'pairs' ? <View style={styles.pairs}>{section.items.map((item: { label: string; value: string }) => <View style={styles.pair} key={item.label}>
          <Text style={styles.label}>{uiText(item.label)}</Text><Text style={styles.body}>{item.value}</Text>
        </View>)}</View>
          : section.items.map((item: string, index: number) => <Text style={styles.body} key={index}>{item}</Text>)}
    </View>)}
    <View style={styles.trust}>
      {model.trust.map(item => <Text style={styles.trustLine} key={item}>{item}</Text>)}
      <Text style={styles.notice}>{model.notice}</Text>
      <Text style={styles.notice}>{uiText("Based on your latest saved profile ·")} {model.generated_date}</Text>
    </View>
  </>;
}

const styles = StyleSheet.create({
  hero: { backgroundColor: 'white', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#E7E5E4' },
  eyebrow: { color: '#9A3412', fontSize: 11, fontWeight: '700', letterSpacing: 1.3, marginBottom: 16 },
  identity: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 }, identityText: { flex: 1, minWidth: 0 },
  name: { color: '#111827', fontSize: 24, lineHeight: 30, fontWeight: '800' },
  services: { color: '#9A3412', fontSize: 15, lineHeight: 22, fontWeight: '600', marginTop: 6 },
  meta: { color: '#4B5563', fontSize: 13, lineHeight: 19, marginTop: 5 },
  photo: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F5F5F4' },
  badge: { color: '#166534', fontSize: 12, fontWeight: '700', marginTop: 8 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 20, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#E7E5E4' },
  fact: { width: '50%', paddingTop: 12, paddingRight: 8 },
  label: { fontSize: 11, color: '#6B7280', fontWeight: '600', marginBottom: 4 },
  factValue: { fontSize: 14, lineHeight: 21, color: '#111827', fontWeight: '700' },
  card: { backgroundColor: 'white', padding: 18, marginTop: 14, borderRadius: 20, borderWidth: 1, borderColor: '#E7E5E4' },
  heading: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  body: { color: '#374151', fontSize: 14, lineHeight: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#FFF7ED', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { color: '#9A3412', fontSize: 12, lineHeight: 17, fontWeight: '600' },
  pairs: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 }, pair: { width: '50%', paddingRight: 10 },
  trust: { paddingHorizontal: 5, paddingTop: 20 }, trustLine: { fontSize: 12, lineHeight: 19, color: '#4B5563', marginBottom: 4 },
  notice: { fontSize: 11, lineHeight: 17, color: '#6B7280', marginTop: 8 },
});
