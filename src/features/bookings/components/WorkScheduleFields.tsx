import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { bookingSchedule, earliestLongTermEnd, LONG_TERM_MINIMUM_MESSAGE, WORK_DAYS, WORK_SHIFTS, type WorkShift } from '../engagementForm';

interface Props {
  bookingType: 'short_term' | 'long_term';
  startDate: string; endDate: string; workHours: string; days: string[]; shift: WorkShift | null;
  onStartDate: (value: string) => void; onEndDate: (value: string) => void;
  onWorkHours: (value: string) => void; onDays: (value: string[]) => void;
  onShift: (value: WorkShift) => void;
  ongoing?: boolean; onOngoing?: (value: boolean) => void;
  readOnly?: boolean; disabled?: boolean;
}

export function WorkScheduleFields(props: Props) {
  const { tr: uiText, formatDate } = useUiLanguage();
  const { bookingType, startDate, endDate, workHours, days, shift, readOnly = false, disabled = false } = props;
  const short = bookingType === 'short_term';
  const locked = readOnly || disabled;
  const ongoing = !short && !!props.ongoing;
  const earliestEnd = startDate ? earliestLongTermEnd(startDate) : '';
  const earliestEndStamp = earliestEnd ? bookingSchedule(earliestEnd, '12:00 PM').iso : '';
  const [target, setTarget] = useState<'start' | 'end' | null>(null);
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [showTime, setShowTime] = useState(false);
  const [startClock, setStartClock] = useState('08:00');
  const [endClock, setEndClock] = useState('05:00');
  const [startPeriod, setStartPeriod] = useState('AM');
  const [endPeriod, setEndPeriod] = useState('PM');
  const [timeError, setTimeError] = useState('');
  useEffect(() => { if (locked) { setTarget(null); setShowTime(false); } }, [locked]);

  const openDate = (field: 'start' | 'end') => {
    if (locked) return;
    const selected = field === 'start' ? startDate : endDate || earliestEnd || startDate;
    const todayPH = new Date(Date.now() + 8 * 3600000);
    const match = /^(\d{2})\/\d{2}\/(\d{4})$/.exec(selected);
    setMonth(match ? Number(match[1]) - 1 : todayPH.getUTCMonth());
    setYear(match ? Number(match[2]) : todayPH.getUTCFullYear());
    setTarget(field);
  };
  const navigate = (direction: number) => {
    const next = new Date(Date.UTC(year, month + direction, 1));
    setYear(next.getUTCFullYear()); setMonth(next.getUTCMonth());
  };
  const openTime = () => {
    const match = /^(\d{1,2}:\d{2}) (AM|PM) - (\d{1,2}:\d{2}) (AM|PM)$/i.exec(workHours);
    setStartClock(match?.[1] || '08:00'); setStartPeriod(match?.[2]?.toUpperCase() || 'AM');
    setEndClock(match?.[3] || '05:00'); setEndPeriod(match?.[4]?.toUpperCase() || 'PM');
    setTimeError(''); setShowTime(true);
  };
  const saveTime = () => {
    try {
      const a = bookingSchedule('01/01/2030', `${startClock} ${startPeriod}`);
      const b = bookingSchedule('01/01/2030', `${endClock} ${endPeriod}`);
      if (a.clock >= b.clock) throw new Error('End time must be after start time.');
      props.onWorkHours(`${startClock.padStart(5, '0')} ${startPeriod} - ${endClock.padStart(5, '0')} ${endPeriod}`);
      if (short) props.onShift('custom');
      setShowTime(false);
    } catch (error) { setTimeError(error instanceof Error ? error.message : 'Enter valid times.'); }
  };
  const today = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
  const dayCount = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const offset = new Date(Date.UTC(year, month, 1)).getUTCDay();

  return <View style={styles.container}>
    {!short && props.onOngoing && <>
      <Text style={styles.label}>{uiText('How long will the work continue?')}</Text>
      <View style={styles.durationRow}>{[false, true].map(value => <Pressable key={String(value)} accessibilityRole="button"
        accessibilityState={{ selected: ongoing === value, disabled: locked }} disabled={locked}
        style={[styles.shift, styles.durationOption, ongoing === value && styles.selected]}
        onPress={() => { if (value !== ongoing) { props.onOngoing?.(value); props.onEndDate(''); } }}>
        <Text style={styles.value}>{uiText(value ? 'No end date' : 'With an end date')}</Text>
      </Pressable>)}</View>
      <Text style={[styles.hint, styles.durationHint]}>{uiText(ongoing ? 'The work continues without a planned end date.' : 'Choose dates at least 30 days apart. This is a SerbiSure posting rule.')}</Text>
    </>}
    <Text style={styles.label}>{uiText(short ? 'AVAILABILITY DATE' : ongoing ? 'Start date' : 'START DATE TO END DATE')}</Text>
    <Text style={styles.hint}>{uiText("Dates and working times use Philippine time (UTC+8).")}</Text>
    <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel={uiText(short ? 'Service date' : 'Start date')} disabled={locked} onPress={() => openDate('start')} style={styles.field}>
        <Text style={styles.small}>{uiText(short ? 'SERVICE DATE' : 'START')}</Text>
        <Text style={styles.value}><Ionicons name="calendar-outline" size={16} /> {startDate || 'MM/DD/YYYY'}</Text>
      </Pressable>
      {((!short && !ongoing) || (readOnly && endDate && endDate !== startDate)) && <Pressable accessibilityRole="button" accessibilityLabel={uiText('End date')} disabled={locked || (!short && !startDate)} onPress={() => openDate('end')} style={styles.field}>
        <Text style={styles.small}>{uiText("END")}</Text><Text style={styles.value}>{endDate || 'MM/DD/YYYY'}</Text>
      </Pressable>}
    </View>
    {!short && !ongoing && !!earliestEndStamp && <Text style={styles.hint}>{uiText('Earliest end date: {date}', { date: formatDate(earliestEndStamp, 'full') })}</Text>}
    {short && !readOnly ? <>
      <Text style={styles.label}>{uiText("WHAT TIME WORKS BEST?")}</Text>
      <View style={styles.row}>{WORK_SHIFTS.map(item => <Pressable key={item.value} accessibilityRole="button"
        accessibilityState={{ selected: shift === item.value, disabled: locked }} disabled={locked}
        onPress={() => props.onShift(item.value)} style={[styles.shift, shift === item.value && styles.selected]}>
        <Text style={styles.value}>{uiText(item.label)}</Text><Text style={styles.small}>{item.hours.replace(/:00/g, '')}</Text>
      </Pressable>)}</View>
      <Pressable accessibilityRole="button" disabled={locked} accessibilityState={{ selected: shift === 'custom', disabled: locked }}
        onPress={openTime} style={[styles.custom, shift === 'custom' && styles.selected]}>
        <Text style={styles.value}>{uiText('Set my own time')}</Text>
        {shift === 'custom' && !!workHours && <Text style={styles.value}>{workHours}</Text>}
      </Pressable>
    </> : <>
      <Text style={styles.label}>{uiText("WORK HOURS")}</Text>
      <Pressable accessibilityRole="button" disabled={locked} onPress={openTime} style={styles.field}>
        <Text style={styles.value}>{workHours || uiText('Select daily working hours')}</Text>
      </Pressable>
    </>}
    {!short && <>
      <Text style={styles.label}>{uiText("WORK SCHEDULE (DAYS)")}</Text>
      <View style={styles.days}>{WORK_DAYS.map(day => <Pressable key={day.value} accessibilityRole="button" disabled={locked}
        accessibilityState={{ selected: days.includes(day.value), disabled: locked }}
        onPress={() => props.onDays(WORK_DAYS.filter(item => item.value === day.value ? !days.includes(item.value) : days.includes(item.value)).map(item => item.value))}
        style={[styles.day, days.includes(day.value) && styles.selected]}><Text>{uiText(day.label)}</Text></Pressable>)}</View>
      <Text style={styles.hint}>{uiText("Choose the agreed working days. The start date must be one of them.")}</Text>
    </>}
    <Modal visible={target !== null} transparent animationType="fade" onRequestClose={() => setTarget(null)}>
      <Pressable style={styles.overlay} onPress={() => setTarget(null)}>
        <Pressable style={styles.picker} onPress={event => event.stopPropagation()}>
          <Text style={styles.title}>{uiText(target === 'end' ? 'End date' : short ? 'Service date' : 'Start date')}</Text>
          {target === 'end' && !short && <Text style={styles.hint}>{uiText(LONG_TERM_MINIMUM_MESSAGE)}</Text>}
          <View style={styles.navigation}>
            <Pressable accessibilityLabel={uiText('Previous month')} hitSlop={12} onPress={() => navigate(-1)}><Ionicons name="chevron-back" size={24} /></Pressable>
            <Text style={styles.value}>{formatDate(new Date(Date.UTC(year, month, 1, 4)), 'monthYear')}</Text>
            <Pressable accessibilityLabel={uiText('Next month')} hitSlop={12} onPress={() => navigate(1)}><Ionicons name="chevron-forward" size={24} /></Pressable>
          </View>
          <View style={styles.grid}>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <Text key={day} style={styles.weekday}>{uiText(day)}</Text>)}</View>
          <View style={styles.grid}>
            {Array.from({ length: offset }, (_, index) => <View key={`blank-${index}`} style={styles.cell} />)}
            {Array.from({ length: dayCount }, (_, index) => {
              const date = `${String(month + 1).padStart(2, '0')}/${String(index + 1).padStart(2, '0')}/${year}`;
              const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`;
              const past = iso < today;
              const tooEarly = target === 'end' && !short && !!earliestEndStamp && bookingSchedule(date, '12:00 PM').iso < earliestEndStamp;
              const unavailable = past || tooEarly;
              return <Pressable key={date} accessibilityState={{ disabled: unavailable }} disabled={unavailable} style={[styles.cell, (target === 'end' ? endDate : startDate) === date && styles.selected, unavailable && styles.muted]}
                onPress={() => { if (target === 'end') props.onEndDate(date); else {
                  props.onStartDate(date);
                  if (short) props.onEndDate(date);
                  else if (endDate && bookingSchedule(endDate, '12:00 PM').iso < bookingSchedule(earliestLongTermEnd(date), '12:00 PM').iso) props.onEndDate('');
                } setTarget(null); }}>
                <Text>{index + 1}</Text>
              </Pressable>;
            })}
          </View>
          <Pressable style={styles.close} onPress={() => setTarget(null)}><Text>{uiText("Cancel")}</Text></Pressable>
        </Pressable>
      </Pressable>
    </Modal>
    <Modal visible={showTime} transparent animationType="fade" onRequestClose={() => setShowTime(false)}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Pressable style={styles.overlay} onPress={() => setShowTime(false)}>
        <Pressable style={styles.picker} onPress={event => event.stopPropagation()}>
          <Text style={styles.title}>{uiText(short ? 'Working hours' : 'Daily Working Hours')}</Text>
          <Text style={styles.hint}>{uiText("Enter each time as HH:MM in Philippine time.")}</Text>
          {([{ label: 'Start', value: startClock, set: setStartClock, period: startPeriod, setPeriod: setStartPeriod },
            { label: 'End', value: endClock, set: setEndClock, period: endPeriod, setPeriod: setEndPeriod }]).map(item => <View key={item.label}>
            <Text style={styles.label}>{uiText(item.label)}</Text><View style={styles.row}>
              <TextInput accessibilityLabel={uiText(item.label === 'Start' ? 'Start time' : 'End time')} style={styles.field} value={item.value} onChangeText={item.set} placeholder="08:00" maxLength={5} />
              {['AM', 'PM'].map(period => <Pressable key={period} style={[styles.day, item.period === period && styles.selected]} onPress={() => item.setPeriod(period)}><Text>{period}</Text></Pressable>)}
            </View>
          </View>)}
          {!!timeError && <Text accessibilityRole="alert" style={styles.error}>{uiText(timeError)}</Text>}
          <Pressable style={[styles.close, styles.selected]} onPress={saveTime}><Text style={styles.value}>{uiText("Set Working Hours")}</Text></Pressable>
          <Pressable style={styles.close} onPress={() => setShowTime(false)}><Text>{uiText("Cancel")}</Text></Pressable>
        </Pressable>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  container: { marginTop: 16 }, label: { color: '#6B7280', fontWeight: '800', fontSize: 11, marginTop: 12, marginBottom: 8 },
  hint: { color: '#6B7280', fontSize: 12, marginBottom: 8 }, row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  durationRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  field: { flex: 1, borderRadius: 14, padding: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  value: { color: '#0D0D11', fontWeight: '700', fontSize: 13 }, small: { color: '#6B7280', fontSize: 10, marginTop: 4 },
  shift: { flex: 1, padding: 10, borderRadius: 14, backgroundColor: '#FFFFFF' },
  durationOption: { paddingVertical: 14, paddingHorizontal: 12 }, durationHint: { marginTop: 5 },
  selected: { backgroundColor: '#FFB380' },
  custom: { padding: 14, borderRadius: 14, backgroundColor: '#FFFFFF', marginTop: 8, gap: 4 },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, day: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 10, backgroundColor: '#FFFFFF' },
  overlay: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.4)' },
  picker: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 22 }, title: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  navigation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' }, weekday: { width: '14.28%', textAlign: 'center', fontSize: 11, color: '#6B7280', paddingVertical: 8 },
  cell: { width: '14.28%', height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  muted: { opacity: 0.25 }, close: { alignItems: 'center', padding: 14, marginTop: 10, borderRadius: 16 }, error: { color: '#B91C1C', marginTop: 10 },
});
