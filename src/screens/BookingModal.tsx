import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TextInput,
  Pressable,
  Modal,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchMinimumWage, MinimumWageData } from '../api/bookingApi';

const logoSource = require('../../assets/serbisure-logo.png');

interface BookingModalProps {
  visible: boolean;
  onClose: () => void;
  contactName?: string;
  contactRole?: string;
  contactAvatar?: string;
  readOnly?: boolean;
  isConfirmed?: boolean;
  userRole?: 'homeowner' | 'kasambahay';
  token?: string | null;
  bookingType?: 'long_term' | 'short_term';
  initialDetails?: {
    startDate?: string;
    endDate?: string;
    workHours?: string;
    location?: string;
    days?: string[];
    salary?: string;
    scope?: Record<string, boolean> | string[];
  } | null;
  onConfirm?: (bookingDetails: {
    startDate: string;
    endDate: string;
    workHours: string;
    location: string;
    days: string[];
    salary: string;
    scope: string[];
  }) => void;
  onKasambahayConfirm?: () => void;
}

const ALL_DAYS = ['M', 'T', 'W', 'Th', 'F', 'S', 'Su'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const WEEKDAY_HEADER = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function BookingModal({
  visible,
  onClose,
  contactName = 'Vicente Ganda',
  contactRole = 'Cleaner',
  contactAvatar = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
  readOnly = false,
  isConfirmed = false,
  userRole = 'homeowner',
  token,
  bookingType = 'long_term',
  initialDetails = null,
  onConfirm,
  onKasambahayConfirm,
}: BookingModalProps) {
  const insets = useSafeAreaInsets();

  const [startDate, setStartDate] = useState('04/27/2026');
  const [endDate, setEndDate] = useState('05/27/2026');
  const [workHours, setWorkHours] = useState('08:00 AM - 05:00 PM');
  const [location, setLocation] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>(['M', 'T', 'W', 'Th', 'F']);
  const [salary, setSalary] = useState('5000');
  const [minWageInfo, setMinWageInfo] = useState<MinimumWageData | null>(null);
  const [scope, setScope] = useState<Record<string, boolean>>({
    cooking: true,
    laundry: true,
    cleaning: false,
    childCare: false,
    caregiver: true,
    allAround: false,
  });

  useEffect(() => {
    if (visible && initialDetails) {
      if (initialDetails.startDate) setStartDate(initialDetails.startDate);
      if (initialDetails.endDate) setEndDate(initialDetails.endDate);
      if (initialDetails.workHours) setWorkHours(initialDetails.workHours);
      if (initialDetails.location !== undefined) {
        setLocation(initialDetails.location || 'Lower Tambo Macasandig, Blk 5');
      }
      if (initialDetails.days) setSelectedDays(initialDetails.days);
      if (initialDetails.salary) setSalary(initialDetails.salary.replace(/[^0-9]/g, ''));
      if (initialDetails.scope) {
        if (Array.isArray(initialDetails.scope)) {
          const map: Record<string, boolean> = {
            cooking: false, laundry: false, cleaning: false, childCare: false, caregiver: false, allAround: false
          };
          initialDetails.scope.forEach((k) => { map[k] = true; });
          setScope(map);
        } else {
          setScope(initialDetails.scope);
        }
      }
    } else if (visible && !readOnly) {
      setLocation('');
    }
  }, [visible, initialDetails, readOnly]);

  useEffect(() => {
    if (visible && bookingType === 'long_term') {
      fetchMinimumWage(token || undefined, 'long_term', location)
        .then((data) => {
          if (data) setMinWageInfo(data);
        })
        .catch(() => {});
    }
  }, [visible, bookingType, location, token]);

  // Date Picker Modal State
  const [datePickerTarget, setDatePickerTarget] = useState<'start' | 'end' | null>(null);
  const [calendarYear, setCalendarYear] = useState(2026);
  const [calendarMonth, setCalendarMonth] = useState(3); // 0-indexed: 3 = April

  // Time Picker Modal State
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [startHour, setStartHour] = useState('08');
  const [startMin, setStartMin] = useState('00');
  const [startAmpm, setStartAmpm] = useState('AM');
  const [endHour, setEndHour] = useState('05');
  const [endMin, setEndMin] = useState('00');
  const [endAmpm, setEndAmpm] = useState('PM');

  const toggleDay = (day: string) => {
    if (readOnly) return;
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const toggleScope = (key: string) => {
    if (readOnly) return;
    setScope((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConfirm = () => {
    if (!location.trim()) {
      Alert.alert('Location Required', 'Please enter a work location to confirm booking.');
      return;
    }

    if (bookingType === 'long_term' && isBelowMinWage) {
      Alert.alert(
        'Below Minimum Wage',
        `The monthly salary must be at least ₱${effectiveMinMonthly.toLocaleString()} (approx. ₱${effectiveMinDaily.toFixed(2)}/day) as mandated by ${minWageInfo?.wage_order || 'Batas Kasambahay (RA 10361)'}.`,
        [{ text: 'OK' }]
      );
      return;
    }

    const selectedScopeKeys = Object.keys(scope).filter((k) => scope[k]);
    onConfirm?.({
      startDate,
      endDate,
      workHours,
      location,
      days: selectedDays,
      salary: `P ${salary}`,
      scope: selectedScopeKeys,
    });
    Alert.alert(
      'Booking Request Sent',
      `Your booking request for ${contactName} has been submitted!`,
      [{ text: 'OK', onPress: onClose }]
    );
  };

  // Calendar Date Picker Helpers
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();

  const handleSelectDate = (dayNum: number) => {
    const formattedMonth = (calendarMonth + 1).toString().padStart(2, '0');
    const formattedDay = dayNum.toString().padStart(2, '0');
    const dateStr = `${formattedMonth}/${formattedDay}/${calendarYear}`;

    if (datePickerTarget === 'start') {
      setStartDate(dateStr);
    } else if (datePickerTarget === 'end') {
      setEndDate(dateStr);
    }
    setDatePickerTarget(null);
  };

  const handleConfirmTime = () => {
    const formattedWorkHours = `${startHour}:${startMin} ${startAmpm} - ${endHour}:${endMin} ${endAmpm}`;
    setWorkHours(formattedWorkHours);
    setShowTimePicker(false);
  };

  const salaryNum = parseInt(salary, 10) || 0;
  const effectiveMinDaily = minWageInfo?.min_daily_rate ? parseFloat(minWageInfo.min_daily_rate) : 250;
  const effectiveMinMonthly = minWageInfo?.min_monthly_rate ? parseFloat(minWageInfo.min_monthly_rate) : 6500;
  const isBelowMinWage = bookingType === 'long_term' && salaryNum > 0 && salaryNum < effectiveMinMonthly;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 12) }]}>
        {/* Global Aligned Header */}
        <View style={styles.header}>
          <View style={styles.headerSide}>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="arrow-back" size={26} color="#2A2925" />
            </Pressable>
          </View>

          <Text style={styles.headerTitle}>{readOnly ? 'Booking Details' : 'Booking'}</Text>

          <View style={[styles.headerSide, styles.headerSideRight]}>
            <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          </View>
        </View>

        {/* Content Container - Compact & Non-Scrolling */}
        <View style={styles.contentBody}>
          {/* Worker Info Summary */}
          <View style={styles.workerCard}>
            <Image source={{ uri: contactAvatar }} style={styles.workerAvatar} />
            <View style={styles.workerTextCol}>
              <View style={styles.workerNameRow}>
                <Text style={styles.workerName}>{contactName}</Text>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" style={{ marginLeft: 4 }} />
                <View style={styles.longTermTag}>
                  <Text style={styles.longTermText}>Long-Term</Text>
                </View>
              </View>

              <View style={styles.workerSubRow}>
                <Text style={styles.kasambahayText}>Kasambahay</Text>
                <View style={styles.cleanerTag}>
                  <Text style={styles.cleanerTagText}>{contactRole}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Form Fields */}
          <View style={styles.formSection}>
            {/* START DATE */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>START DATE</Text>
              <Pressable
                style={styles.inputBox}
                onPress={() => !readOnly && setDatePickerTarget('start')}
                disabled={readOnly}
              >
                <TextInput
                  style={styles.inputText}
                  value={startDate}
                  onChangeText={setStartDate}
                  editable={!readOnly}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor="#999"
                />
                <Ionicons name="calendar" size={18} color="#FFB43B" />
              </Pressable>
            </View>

            {/* END DATE */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>END DATE</Text>
              <Pressable
                style={styles.inputBox}
                onPress={() => !readOnly && setDatePickerTarget('end')}
                disabled={readOnly}
              >
                <TextInput
                  style={styles.inputText}
                  value={endDate}
                  onChangeText={setEndDate}
                  editable={!readOnly}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor="#999"
                />
                <Ionicons name="calendar" size={18} color="#FFB43B" />
              </Pressable>
            </View>

            {/* WORK HOURS */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>WORK HOURS</Text>
              <Pressable
                style={styles.inputBox}
                onPress={() => !readOnly && setShowTimePicker(true)}
                disabled={readOnly}
              >
                <TextInput
                  style={styles.inputText}
                  value={workHours}
                  onChangeText={setWorkHours}
                  editable={!readOnly}
                  placeholder="e.g. 08:00 AM - 05:00 PM"
                  placeholderTextColor="#999"
                />
                <Ionicons name="time" size={18} color="#FFB43B" />
              </Pressable>
            </View>

            {/* LOCATION */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>LOCATION</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.inputText}
                  value={location}
                  onChangeText={setLocation}
                  editable={!readOnly}
                  placeholder="Enter location..."
                  placeholderTextColor="#999"
                />
                <Ionicons name="location" size={18} color="#FFB43B" />
              </View>
            </View>

            {/* WORK SCHEDULE */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>WORK SCHEDULE</Text>
              <View style={styles.daysRow}>
                {ALL_DAYS.map((day) => {
                  const isSelected = selectedDays.includes(day);
                  return (
                    <Pressable
                      key={day}
                      disabled={readOnly}
                      style={[styles.dayPill, isSelected ? styles.dayPillSelected : styles.dayPillUnselected]}
                      onPress={() => toggleDay(day)}
                    >
                      <Text style={[styles.dayText, isSelected ? styles.dayTextSelected : styles.dayTextUnselected]}>
                        {day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* MONTH SALARY */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>MONTH SALARY</Text>
              <View style={styles.inputBox}>
                <Text style={styles.currencyPrefix}>P </Text>
                <TextInput
                  style={[styles.inputText, { flex: 1 }]}
                  value={salary}
                  onChangeText={setSalary}
                  editable={!readOnly}
                  keyboardType="numeric"
                  placeholder="5000"
                  placeholderTextColor="#999"
                />
              </View>
              {isBelowMinWage && (
                <Text style={styles.warningText}>
                  {minWageInfo?.description || `Salary is below statutory minimum wage of ₱${effectiveMinMonthly.toLocaleString()}/month under Batas Kasambahay (RA 10361).`}
                </Text>
              )}
            </View>

            {/* SCOPE OF WORK */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>SCOPE OF WORK</Text>
              <View style={styles.scopeGrid}>
                {/* Column 1 */}
                <View style={styles.scopeCol}>
                  <Pressable style={styles.checkboxRow} disabled={readOnly} onPress={() => toggleScope('cooking')}>
                    <Ionicons
                      name={scope.cooking ? 'checkbox' : 'square-outline'}
                      size={18}
                      color={scope.cooking ? '#FFB43B' : '#555'}
                    />
                    <Text style={styles.checkboxLabel}>Cooking</Text>
                  </Pressable>

                  <Pressable style={styles.checkboxRow} disabled={readOnly} onPress={() => toggleScope('cleaning')}>
                    <Ionicons
                      name={scope.cleaning ? 'checkbox' : 'square-outline'}
                      size={18}
                      color={scope.cleaning ? '#FFB43B' : '#555'}
                    />
                    <Text style={styles.checkboxLabel}>Cleaning</Text>
                  </Pressable>

                  <Pressable style={styles.checkboxRow} disabled={readOnly} onPress={() => toggleScope('caregiver')}>
                    <Ionicons
                      name={scope.caregiver ? 'checkbox' : 'square-outline'}
                      size={18}
                      color={scope.caregiver ? '#FFB43B' : '#555'}
                    />
                    <Text style={styles.checkboxLabel}>Caregiver</Text>
                  </Pressable>
                </View>

                {/* Column 2 */}
                <View style={styles.scopeCol}>
                  <Pressable style={styles.checkboxRow} disabled={readOnly} onPress={() => toggleScope('laundry')}>
                    <Ionicons
                      name={scope.laundry ? 'checkbox' : 'square-outline'}
                      size={18}
                      color={scope.laundry ? '#FFB43B' : '#555'}
                    />
                    <Text style={styles.checkboxLabel}>Laundry</Text>
                  </Pressable>

                  <Pressable style={styles.checkboxRow} disabled={readOnly} onPress={() => toggleScope('childCare')}>
                    <Ionicons
                      name={scope.childCare ? 'checkbox' : 'square-outline'}
                      size={18}
                      color={scope.childCare ? '#FFB43B' : '#555'}
                    />
                    <Text style={styles.checkboxLabel}>Child Care</Text>
                  </Pressable>

                  <Pressable style={styles.checkboxRow} disabled={readOnly} onPress={() => toggleScope('allAround')}>
                    <Ionicons
                      name={scope.allAround ? 'checkbox' : 'square-outline'}
                      size={18}
                      color={scope.allAround ? '#FFB43B' : '#555'}
                    />
                    <Text style={styles.checkboxLabel}>All Around</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          {readOnly ? (
            userRole === 'kasambahay' && !isConfirmed ? (
              <Pressable
                style={({ pressed }) => [styles.confirmBtn, pressed && styles.pressedBtn]}
                onPress={() => {
                  onKasambahayConfirm?.();
                  onClose();
                }}
              >
                <Text style={styles.confirmBtnText}>Confirm Booking ➔</Text>
              </Pressable>
            ) : isConfirmed ? (
              <View style={styles.confirmedBanner}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" style={{ marginRight: 6 }} />
                <Text style={styles.confirmedBannerText}>Booking Confirmed & Active</Text>
              </View>
            ) : (
              <View style={styles.pendingBanner}>
                <Ionicons name="time-outline" size={18} color="#D97706" style={{ marginRight: 6 }} />
                <Text style={styles.pendingBannerText}>Waiting for Kasambahay Confirmation...</Text>
              </View>
            )
          ) : (
            <Pressable
              style={({ pressed }) => [styles.confirmBtn, pressed && styles.pressedBtn]}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmBtnText}>Confirm</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Interactive Calendar Month Date Picker Modal */}
      {!readOnly && (
        <Modal visible={datePickerTarget !== null} transparent animationType="fade" onRequestClose={() => setDatePickerTarget(null)}>
          <Pressable style={styles.modalOverlay} onPress={() => setDatePickerTarget(null)}>
            <Pressable style={styles.calendarCard} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.calendarHeaderTitle}>
                Select {datePickerTarget === 'start' ? 'Start Date' : 'End Date'}
              </Text>

              <View style={styles.monthNavRow}>
                <Pressable
                  onPress={() => {
                    if (calendarMonth === 0) {
                      setCalendarMonth(11);
                      setCalendarYear((y) => y - 1);
                    } else {
                      setCalendarMonth((m) => m - 1);
                    }
                  }}
                  hitSlop={10}
                >
                  <Ionicons name="chevron-back" size={20} color="#1A1A1A" />
                </Pressable>

                <Text style={styles.monthNavText}>
                  {MONTH_NAMES[calendarMonth]} {calendarYear}
                </Text>

                <Pressable
                  onPress={() => {
                    if (calendarMonth === 11) {
                      setCalendarMonth(0);
                      setCalendarYear((y) => y + 1);
                    } else {
                      setCalendarMonth((m) => m + 1);
                    }
                  }}
                  hitSlop={10}
                >
                  <Ionicons name="chevron-forward" size={20} color="#1A1A1A" />
                </Pressable>
              </View>

              <View style={styles.weekdayRow}>
                {WEEKDAY_HEADER.map((w) => (
                  <Text key={w} style={styles.weekdayLabel}>{w}</Text>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {Array.from({ length: firstDayIndex }).map((_, idx) => (
                  <View key={`empty-${idx}`} style={styles.calendarDaySlot} />
                ))}

                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  return (
                    <Pressable
                      key={`day-${dayNum}`}
                      style={styles.calendarDaySlot}
                      onPress={() => handleSelectDate(dayNum)}
                    >
                      <View style={styles.calendarDayCircle}>
                        <Text style={styles.calendarDayText}>{dayNum}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable style={styles.closePickerBtn} onPress={() => setDatePickerTarget(null)}>
                <Text style={styles.closePickerText}>Cancel</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Interactive Time Picker Selector Modal */}
      {!readOnly && (
        <Modal visible={showTimePicker} transparent animationType="fade" onRequestClose={() => setShowTimePicker(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowTimePicker(false)}>
            <Pressable style={styles.timeCard} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.pickerTitle}>Set Work Hours</Text>

              <Text style={styles.timeSectionLabel}>START TIME</Text>
              <View style={styles.timeSelectorRow}>
                <View style={styles.timeGroup}>
                  <Text style={styles.timeSubLabel}>Hour</Text>
                  <View style={styles.timePillsScroll}>
                    {['07', '08', '09', '10', '11', '12'].map((h) => (
                      <Pressable
                        key={h}
                        style={[styles.timeChip, startHour === h && styles.timeChipActive]}
                        onPress={() => setStartHour(h)}
                      >
                        <Text style={[styles.timeChipText, startHour === h && styles.timeChipTextActive]}>{h}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.timeGroup}>
                  <Text style={styles.timeSubLabel}>AM/PM</Text>
                  <View style={styles.timePillsScroll}>
                    {['AM', 'PM'].map((ap) => (
                      <Pressable
                        key={ap}
                        style={[styles.timeChip, startAmpm === ap && styles.timeChipActive]}
                        onPress={() => setStartAmpm(ap)}
                      >
                        <Text style={[styles.timeChipText, startAmpm === ap && styles.timeChipTextActive]}>{ap}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>

              <Text style={[styles.timeSectionLabel, { marginTop: 12 }]}>END TIME</Text>
              <View style={styles.timeSelectorRow}>
                <View style={styles.timeGroup}>
                  <Text style={styles.timeSubLabel}>Hour</Text>
                  <View style={styles.timePillsScroll}>
                    {['04', '05', '06', '07', '08'].map((h) => (
                      <Pressable
                        key={h}
                        style={[styles.timeChip, endHour === h && styles.timeChipActive]}
                        onPress={() => setEndHour(h)}
                      >
                        <Text style={[styles.timeChipText, endHour === h && styles.timeChipTextActive]}>{h}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.timeGroup}>
                  <Text style={styles.timeSubLabel}>AM/PM</Text>
                  <View style={styles.timePillsScroll}>
                    {['PM', 'AM'].map((ap) => (
                      <Pressable
                        key={ap}
                        style={[styles.timeChip, endAmpm === ap && styles.timeChipActive]}
                        onPress={() => setEndAmpm(ap)}
                      >
                        <Text style={[styles.timeChipText, endAmpm === ap && styles.timeChipTextActive]}>{ap}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.timeActionRow}>
                <Pressable style={styles.cancelTimeBtn} onPress={() => setShowTimePicker(false)}>
                  <Text style={styles.cancelTimeText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.saveTimeBtn} onPress={handleConfirmTime}>
                  <Text style={styles.saveTimeText}>Set Time</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F5F2',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    width: '100%',
    marginBottom: 6,
  },
  headerSide: {
    width: 44,
    justifyContent: 'center',
  },
  headerSideRight: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000000',
    flex: 1,
    marginLeft: 8,
  },
  logo: {
    height: 44,
    width: 44,
  },
  contentBody: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  workerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 4,
  },
  workerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  workerTextCol: {
    flex: 1,
  },
  workerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  workerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  longTermTag: {
    marginLeft: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  longTermText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFA51F',
  },
  workerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  kasambahayText: {
    fontSize: 12,
    color: '#888888',
    marginRight: 8,
  },
  cleanerTag: {
    backgroundColor: '#9353FF',
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 12,
  },
  cleanerTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  formSection: {
    flex: 1,
    justifyContent: 'space-evenly',
  },
  formGroup: {
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#444444',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    height: 28,
  },
  inputText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1A1A1A',
    padding: 0,
    flex: 1,
  },
  currencyPrefix: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  warningText: {
    fontSize: 8.5,
    color: '#FFA51F',
    marginTop: 2,
    lineHeight: 11,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 1,
  },
  dayPill: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillSelected: {
    backgroundColor: '#FFB43B',
  },
  dayPillUnselected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  dayText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dayTextSelected: {
    color: '#FFFFFF',
  },
  dayTextUnselected: {
    color: '#555555',
  },
  scopeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  scopeCol: {
    flex: 1,
    gap: 4,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkboxLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  confirmBtn: {
    backgroundColor: '#FFB43B',
    borderRadius: 8,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  pressedBtn: {
    opacity: 0.85,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  confirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    height: 42,
    marginTop: 4,
  },
  confirmedBannerText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '800',
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5E5',
    borderRadius: 8,
    height: 42,
    marginTop: 4,
  },
  pendingBannerText: {
    color: '#D97706',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '92%',
    elevation: 6,
  },
  calendarHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 12,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  monthNavText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingBottom: 6,
  },
  weekdayLabel: {
    width: 32,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  calendarDaySlot: {
    width: '14.28%',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F6F5F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  timeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    elevation: 6,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 14,
  },
  timeSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#444',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  timeSelectorRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  timeGroup: {
    flex: 1,
  },
  timeSubLabel: {
    fontSize: 10,
    color: '#777',
    marginBottom: 4,
  },
  timePillsScroll: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  timeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F6F5F2',
  },
  timeChipActive: {
    backgroundColor: '#FFB43B',
  },
  timeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
  },
  timeChipTextActive: {
    color: '#FFFFFF',
  },
  timeActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  cancelTimeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelTimeText: {
    color: '#777',
    fontWeight: '700',
    fontSize: 13,
  },
  saveTimeBtn: {
    backgroundColor: '#FFB43B',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  saveTimeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  closePickerBtn: {
    marginTop: 14,
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  closePickerText: {
    color: '#888',
    fontWeight: '700',
    fontSize: 13,
  },
});
