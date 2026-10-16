import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View, Modal } from 'react-native';
import { SERVICE_CHOICES, toggleService, WORK_DAYS, WORK_SHIFTS } from '../../bookings/engagementForm';
import { CV_PAGES, PRACTICAL_SKILLS, type WorkerDraft } from './workerCv';

interface Props { value: WorkerDraft; onChange: (value: WorkerDraft) => void; page: number; disabled?: boolean }
export function WorkerCvForm({ value, onChange, page, disabled = false }: Props) {
  const { tr: uiText, formatDate } = useUiLanguage();
  const [calendar, setCalendar] = useState(false);
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [year, setYear] = useState(() => new Date().getFullYear());
  const set = <K extends keyof WorkerDraft>(key: K, next: WorkerDraft[K]) => onChange({ ...value, [key]: next });
  const options = (label: string, choices: readonly { id: string; label: string }[], selected: string | string[], change: (id: string) => void) => <View style={styles.block}>
    <Text style={styles.label}>{uiText(label)}</Text><View style={styles.wrap}>{choices.map(choice => {
      const checked = Array.isArray(selected) ? selected.includes(choice.id) : selected === choice.id;
      return <Pressable key={choice.id} disabled={disabled} accessibilityRole={Array.isArray(selected) ? 'checkbox' : 'radio'} accessibilityState={{ checked }} onPress={() => change(choice.id)} style={[styles.chip, checked && styles.selected]}><Text style={styles.chipText}>{uiText(choice.label)}</Text></Pressable>;
    })}</View>
  </View>;
  const input = (label: string, key: 'desired_monthly_rate' | 'desired_daily_rate' | 'number_of_children' | 'experience_summary' | 'preferred_work_areas' | 'education', placeholder: string, numeric = false, maxLength = 100) => <View style={styles.block}>
    <Text style={styles.label}>{uiText(label)}</Text><TextInput accessibilityLabel={uiText(label)} editable={!disabled} value={value[key]} onChangeText={text => set(key, text)} placeholder={uiText(placeholder)} placeholderTextColor="#9CA3AF" keyboardType={numeric ? 'decimal-pad' : 'default'} maxLength={maxLength} multiline={key === 'experience_summary'} style={styles.input} />
  </View>;
  const toggle = (label: string, key: 'references_available' | 'share_family_details' | 'share_contact_details', hint: string) => <View style={styles.toggle}><View style={{ flex: 1 }}><Text style={styles.label}>{uiText(label)}</Text><Text style={styles.hint}>{uiText(hint)}</Text></View><Switch accessibilityLabel={uiText(label)} disabled={disabled} value={value[key]} onValueChange={next => set(key, next)} trackColor={{ true: '#FFB380' }} /></View>;
  const multi = (key: 'practical_skills' | 'languages' | 'available_days' | 'preferred_shifts', id: string) => set(key, value[key].includes(id) ? value[key].filter(item => item !== id) : [...value[key], id]);
  const today = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
  return <View>
    <Text style={styles.progress}>{uiText("Profile details")} {page + 1} {uiText("of 4")}</Text><Text style={styles.title}>{uiText(CV_PAGES[page] || '')}</Text>
    {page === 0 && <>
      {options('Services you offer', SERVICE_CHOICES.map(item => ({ ...item, label: item.id === 'Child_care' ? 'Childcare' : item.label })), value.service_categories, id => set('service_categories', toggleService(value.service_categories, id)))}
      <Text style={styles.hint}>{uiText("All-around covers all five services.")}</Text>
      {options('Work you are looking for', [{ id: 'short_term', label: 'Short-term' }, { id: 'long_term', label: 'Long-term' }, { id: 'both', label: 'Both' }], value.engagement_preference, id => set('engagement_preference', id))}
      {options('Work setup', [{ id: 'stay_in', label: 'Stay-in' }, { id: 'stay_out', label: 'Stay-out' }, { id: 'either', label: 'Either' }], value.work_setup, id => set('work_setup', id))}
      {value.engagement_preference !== 'short_term' && input('Expected monthly salary (PHP / month)', 'desired_monthly_rate', 'e.g. 8000', true, 9)}
      {value.engagement_preference !== 'long_term' && input('Expected daily rate (PHP / day)', 'desired_daily_rate', 'e.g. 800', true, 9)}
      <Text style={styles.hint}>{uiText("These are your preferences. Job offers are validated separately against the applicable wage policy.")}</Text>
      {options('Spoken languages', ['Bisaya', 'Tagalog', 'English'].map(id => ({ id, label: id })), value.languages, id => multi('languages', id))}
    </>}
    {page === 1 && <>
      {options('Have you done household work before?', [{ id: 'new', label: 'First-time worker' }, { id: 'household', label: 'In my own household' }, { id: 'paid', label: 'Previous paid work' }], value.experience_level, id => onChange({ ...value, experience_level: id, experience_duration: id === 'new' ? '' : value.experience_duration }))}
      {value.experience_level && value.experience_level !== 'new' && options('Approximate experience', [{ id: 'under_1', label: 'Less than 1 year' }, { id: '1_to_3', label: '1–3 years' }, { id: 'over_3', label: 'More than 3 years' }], value.experience_duration, id => set('experience_duration', id))}
      {options('Practical skills (optional)', PRACTICAL_SKILLS.map(id => ({ id, label: id })), value.practical_skills, id => multi('practical_skills', id))}
      {input('Experience summary (optional)', 'experience_summary', 'Tell us about tasks you have done. Household experience counts.', false, 300)}
      {options('Civil status', ['Single', 'Married', 'Widowed', 'Separated'].map(id => ({ id, label: id })), value.civil_status, id => set('civil_status', id))}
      {input('Number of children', 'number_of_children', 'Enter 0 if you have no children', true, 2)}
      <Text style={styles.hint}>{uiText("You can choose whether family details appear on your CV on the sharing page.")}</Text>
    </>}
    {page === 2 && <>
      <View style={styles.block}><Text style={styles.label}>{uiText("When can you start?")}</Text><View style={styles.wrap}><Pressable disabled={disabled} style={styles.chip} onPress={() => set('available_from', today)}><Text>{uiText("Available now")}</Text></Pressable><Pressable disabled={disabled} style={styles.chip} onPress={() => setCalendar(true)}><Text>{uiText("Choose date")}</Text></Pressable></View><Text style={styles.hint}>{value.available_from || uiText("Date not provided (optional)")}</Text></View>
      {options('Available days', WORK_DAYS.map(item => ({ id: item.value, label: item.label })), value.available_days, id => multi('available_days', id))}
      {value.engagement_preference !== 'long_term' && options('Preferred shifts', WORK_SHIFTS.map(item => ({ id: item.value, label: `${item.label} · ${item.hours}` })), value.preferred_shifts, id => multi('preferred_shifts', id))}
      {input('Preferred work areas (optional)', 'preferred_work_areas', 'e.g. Cagayan de Oro, Opol', false, 500)}
      <Text style={styles.hint}>{uiText("Separate up to five cities or municipalities with commas. This can differ from your home address.")}</Text>
    </>}
    {page === 3 && <>
      {input('Education (optional)', 'education', 'Highest level attended, or leave blank')}
      <Text style={styles.label}>{uiText("Training (optional, self-reported)")}</Text>
      {value.training.map((item, index) => <View key={index} style={styles.training}>
        {(['name', 'provider', 'year'] as const).map(key => <TextInput key={key} editable={!disabled} accessibilityLabel={`Training ${index + 1} ${key}`} style={styles.input} placeholder={key === 'name' ? uiText("Training name") : key === 'provider' ? uiText("Training provider (optional)") : uiText("Completion year (optional)")} maxLength={key === 'year' ? 4 : 100} keyboardType={key === 'year' ? 'number-pad' : 'default'} value={item[key]} onChangeText={text => set('training', value.training.map((row, i) => i === index ? { ...row, [key]: text } : row))} />)}
        <Pressable disabled={disabled} onPress={() => set('training', value.training.filter((_, i) => i !== index))}><Text style={styles.hint}>{uiText("Remove training")}</Text></Pressable>
      </View>)}
      {value.training.length < 3 && <Pressable disabled={disabled} style={styles.chip} onPress={() => set('training', [...value.training, { name: '', provider: '', year: '' }])}><Text>{uiText("+ Add training")}</Text></Pressable>}
      {toggle('I can provide a work reference if asked.', 'references_available', 'No reference names or phone numbers are published.')}
      {toggle('Include family details on my CV', 'share_family_details', 'Share my civil status and number of children with viewers of my CV.')}
      {toggle('Include my phone number on my CV', 'share_contact_details', 'Otherwise viewers contact you through SerbiSure. Downloaded copies can be kept by their recipients.')}
      <Text style={styles.hint}>{uiText("Your full address, birth date and clearance documents will not be included.")}</Text>
    </>}
    <Modal visible={calendar} transparent animationType="fade" onRequestClose={() => setCalendar(false)}><View style={styles.overlay}><View style={styles.calendar}>
      <View style={styles.wrap}><Pressable onPress={() => { const next = new Date(year, month - 1); setMonth(next.getMonth()); setYear(next.getFullYear()); }}><Text>{uiText("‹ Previous")}</Text></Pressable><Text style={styles.label}>{formatDate(new Date(year, month, 1), 'monthYear')}</Text><Pressable onPress={() => { const next = new Date(year, month + 1); setMonth(next.getMonth()); setYear(next.getFullYear()); }}><Text>{uiText("Next ›")}</Text></Pressable></View>
      <View style={styles.wrap}>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <Text key={day} style={[styles.day, { backgroundColor: 'white', fontSize: 10 }]}>{uiText(day)}</Text>)}</View>
      <View style={styles.wrap}>{Array.from({ length: new Date(year, month, 1).getDay() }, (_, index) => <View key={`offset-${index}`} style={styles.day} />)}{Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, index) => { const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`; return <Pressable key={date} disabled={date < today} style={[styles.day, date < today && { opacity: .25 }]} onPress={() => { set('available_from', date); setCalendar(false); }}><Text>{index + 1}</Text></Pressable>; })}</View><Pressable style={styles.chip} onPress={() => setCalendar(false)}><Text>{uiText("Close")}</Text></Pressable>
    </View></View></Modal>
  </View>;
}
const styles = StyleSheet.create({
  progress: { color: '#9A3412', fontSize: 12, fontWeight: '700', marginBottom: 6 }, title: { color: '#111827', fontSize: 21, fontWeight: '800', marginBottom: 12 },
  block: { marginBottom: 16 }, label: { color: '#111827', fontWeight: '700', fontSize: 13, marginBottom: 7 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { backgroundColor: '#F3F4F6', padding: 11, borderRadius: 12, marginBottom: 3 }, selected: { backgroundColor: '#FFB380' }, chipText: { color: '#111827', fontSize: 13 },
  hint: { color: '#6B7280', fontSize: 12, lineHeight: 18, marginBottom: 12 }, input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, color: '#111827', marginBottom: 7 },
  toggle: { flexDirection: 'row', gap: 10, marginTop: 18 }, training: { backgroundColor: '#FFF7ED', padding: 12, borderRadius: 12, marginVertical: 10 },
  overlay: { flex: 1, backgroundColor: '#0007', alignItems: 'center', justifyContent: 'center', padding: 20 }, calendar: { backgroundColor: 'white', padding: 18, borderRadius: 20, width: '100%', maxWidth: 420 }, day: { width: '12%', paddingVertical: 13, alignItems: 'center', backgroundColor: '#FFF7ED', borderRadius: 8 },
});
