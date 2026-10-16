import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchWorkerCv, fetchWorkerDetails, saveWorkerDetails, workerCvExportUrl, type WorkerCv } from '../api/workerCvApi';
import { workerDraft, emptyWorkerDraft, validateWorkerPage } from './workerCv';
import { WorkerCvForm } from './WorkerCvForm';
import { requestResponse } from '../../../shared/api/httpClient';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { viewWorkerCvPdf } from './viewWorkerCvPdf';
import { WorkerCvPreview } from './WorkerCvPreview';
import { downloadWorkerCv } from './downloadWorkerCv';

interface Props { visible: boolean; onClose: () => void; userId: string; token: string; editable?: boolean; onSaved?: () => void }
export function WorkerCvModal({ visible, onClose, userId, token, editable = false, onSaved }: Props) {
  const { tr: uiText } = useUiLanguage();
  const insets = useSafeAreaInsets();
  const [cv, setCv] = useState<WorkerCv | null>(null);
  const [draft, setDraft] = useState(emptyWorkerDraft);
  const [editing, setEditing] = useState(false);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  const action = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const refresh = async (current: number) => {
    const result = await fetchWorkerCv(token, userId);
    if (current === generation.current) setCv(result);
  };
  useEffect(() => {
    const current = ++generation.current;
    setEditing(false); setPage(0); setError(''); setCv(null); setBusy(false); action.current = false;
    if (visible && token && userId) {
      setLoading(true);
      refresh(current).catch(() => { if (current === generation.current) setError('Could not load your CV. Check your connection and try again.'); }).finally(() => { if (current === generation.current) setLoading(false); });
    }
    return () => { generation.current++; };
  }, [visible, token, userId]);
  const edit = async () => {
    if (action.current) return;
    action.current = true; setBusy(true); setError('');
    const current = generation.current;
    try {
      const result = await fetchWorkerDetails(token);
      if (current !== generation.current) return;
      setDraft(workerDraft(result, cv?.details.service_categories || [], cv?.languages || ''));
      setPage(0); setEditing(true);
    } catch { if (current === generation.current) setError('Could not load profile details. Please try again.'); }
    finally { if (current === generation.current) { setBusy(false); action.current = false; } }
  };
  const next = async () => {
    if (action.current) return;
    const message = validateWorkerPage(draft, page);
    if (message) { setError(message); return; }
    if (page < 3) { setPage(page + 1); setError(''); scroll.current?.scrollTo({ y: 0, animated: true }); return; }
    action.current = true; setBusy(true); setError('');
    const current = generation.current;
    try {
      await saveWorkerDetails(token, draft);
      if (current !== generation.current) return;
      setEditing(false);
      await refresh(current);
      if (current === generation.current) onSaved?.();
    } catch (err) { if (current === generation.current) setError(err instanceof Error ? err.message : 'Could not save your details. Please try again.'); }
    finally { if (current === generation.current) { action.current = false; setBusy(false); } }
  };
  const viewPdf = async () => {
    if (action.current) return;
    action.current = true; setBusy(true); setError('');
    const current = generation.current;
    // Open synchronously on web to avoid popup blockers after an awaited request.
    const browser = Platform.OS === 'web' ? window.open('', '_blank') : null;
    try {
      const url = workerCvExportUrl(userId, 'pdf');
      if (Platform.OS === 'web') {
        if (!browser) throw new Error('Allow popups for SerbiSure to view your PDF.');
        browser.document.title = 'Preparing your SerbiSure CV';
        browser.document.body.textContent = 'Preparing your CV…';
        const response = await requestResponse(url, { token });
        if (!response.ok) throw new Error('Could not generate your PDF. Please try again.');
        const blob = await response.blob();
        if (current !== generation.current) { browser.close(); return; }
        const local = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        browser.location.replace(local);
        setTimeout(() => URL.revokeObjectURL(local), 60000);
      } else {
        const fs: typeof import('expo-file-system') = require('expo-file-system');
        let openPdf: ((path: string) => Promise<unknown>) | null = null;
        if (Platform.OS === 'android' && requireOptionalNativeModule('ExpoIntentLauncher')) {
          const viewer: typeof import('expo-intent-launcher') = require('expo-intent-launcher');
          openPdf = async path => viewer.startActivityAsync('android.intent.action.VIEW', {
            data: await fs.getContentUriAsync(path), type: 'application/pdf', flags: 1,
          });
        } else if (Platform.OS === 'ios' && requireOptionalNativeModule('ExpoSharing')) {
          const sharing: typeof import('expo-sharing') = require('expo-sharing');
          if (await sharing.isAvailableAsync()) openPdf = path => sharing.shareAsync(path, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'View your SerbiSure CV' });
        }
        await viewWorkerCvPdf({ fs, url, token, isCurrent: () => current === generation.current, openPdf });
      }
    } catch (err) {
      browser?.close();
      if (current === generation.current) {
        const message = err instanceof Error && /^(Could not generate|Your session expired|Please install|PDF viewing is unavailable|Allow popups)/.test(err.message)
          ? err.message : 'Could not open your PDF. Check your connection and make sure a PDF viewer is installed, then try again.';
        setError(message); Alert.alert('Cannot view PDF', message);
        scroll.current?.scrollTo({ y: 0, animated: true });
      }
    } finally { if (current === generation.current) { action.current = false; setBusy(false); } }
  };
  const downloadPdf = async () => {
    if (action.current) return;
    action.current = true; setBusy(true); setError('');
    const current = generation.current;
    try {
      const url = workerCvExportUrl(userId, 'pdf');
      if (Platform.OS === 'web') {
        const response = await requestResponse(url, { token });
        if (!response.ok) throw new Error('Could not generate your PDF. Please try again.');
        const blob = await response.blob();
        if (current !== generation.current) return;
        const local = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        try {
          const link = document.createElement('a');
          link.href = local; link.download = 'SerbiSure_CV.pdf';
          document.body.appendChild(link); link.click(); link.remove();
        } finally { setTimeout(() => URL.revokeObjectURL(local), 10000); }
      } else {
        const fs: typeof import('expo-file-system') = require('expo-file-system');
        const result = await downloadWorkerCv({ platform: Platform.OS, url, token, format: 'pdf', fs,
          isCurrent: () => current === generation.current,
          getSharing: () => requireOptionalNativeModule('ExpoSharing') ? require('expo-sharing') : null,
        });
        if (result === 'saved' && current === generation.current) {
          Alert.alert('PDF saved', 'Your CV is saved in the folder you selected.');
        }
      }
    } catch (err) {
      if (current === generation.current) {
        const message = err instanceof Error && /^(Could not generate|Your session expired|File downloads are unavailable|File sharing is unavailable)/.test(err.message)
          ? err.message : 'Could not save your PDF. Check your connection and choose a writable folder, then try again.';
        setError(message); Alert.alert('Cannot download PDF', message);
        scroll.current?.scrollTo({ y: 0, animated: true });
      }
    } finally { if (current === generation.current) { action.current = false; setBusy(false); } }
  };
  return <Modal visible={visible} animationType="slide" onRequestClose={() => { if (!action.current) onClose(); }}>
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}><Pressable disabled={busy} onPress={onClose}><Text style={styles.label}>{uiText("Close")}</Text></Pressable><Text style={styles.title}>{editing ? 'Edit CV Details' : uiText("SerbiSure CV")}</Text><View style={{ width: 35 }} /></View>
      <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {loading && <ActivityIndicator color="#B45309" />}
        {error !== '' && <View accessibilityLiveRegion="polite" style={styles.error}><Text>{error}</Text></View>}
        {!loading && !cv && <Pressable style={styles.button} onPress={() => { setLoading(true); setError(''); const current = generation.current; refresh(current).catch(() => { if (current === generation.current) setError('Could not load CV. Please try again.'); }).finally(() => { if (current === generation.current) setLoading(false); }); }}><Text>{uiText("Try Again")}</Text></Pressable>}
        {editing ? <WorkerCvForm value={draft} onChange={setDraft} page={page} disabled={busy} /> : cv && <WorkerCvPreview cv={cv} />}
      </ScrollView>
      {busy && <View style={styles.busy} accessibilityLiveRegion="polite"><ActivityIndicator color="#B45309" /><Text>{uiText("Preparing your CV…")}</Text></View>}
      {!loading && cv && <View style={[styles.footer, !editing && styles.previewFooter]}>
        {editing ? <><Pressable disabled={busy} style={styles.secondary} onPress={() => { if (page) setPage(page - 1); else setEditing(false); setError(''); scroll.current?.scrollTo({ y: 0 }); }}><Text>{uiText("Back")}</Text></Pressable><Pressable disabled={busy} style={styles.button} onPress={next}><Text>{page === 3 ? 'Save Details' : uiText("Next")}</Text></Pressable></> : <>
          {editable && <Pressable accessibilityRole="button" disabled={busy} style={[styles.editAction, busy && styles.disabled]} onPress={edit}><Text style={styles.secondaryText}>{uiText("Edit Details")}</Text></Pressable>}
          <View style={styles.pdfActions}>
            <Pressable accessibilityRole="button" accessibilityHint="Open a temporary PDF in your PDF viewer" disabled={busy} style={[styles.button, busy && styles.disabled]} onPress={viewPdf}><Text style={styles.buttonText}>{uiText("View PDF")}</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityHint="Save a copy of the PDF to your device" disabled={busy} style={[styles.downloadButton, busy && styles.disabled]} onPress={downloadPdf}><Text style={styles.downloadText}>{uiText("Download PDF")}</Text></Pressable>
          </View>
        </>}
      </View>}
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5' },
  header: { padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E7E5E4' },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' }, label: { fontWeight: '600', color: '#4B5563', fontSize: 14 },
  content: { padding: 16, paddingBottom: 30 }, footer: { flexDirection: 'row', gap: 10, padding: 16, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#E7E5E4' },
  previewFooter: { flexDirection: 'column', gap: 6 },
  editAction: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#F9FAFB' },
  pdfActions: { flexDirection: 'row', gap: 10 },
  downloadButton: { flex: 1, minHeight: 50, justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#D6A080', backgroundColor: '#FFF7ED' },
  downloadText: { color: '#9A3412', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  disabled: { opacity: .5 },
  button: { flex: 1, minHeight: 50, justifyContent: 'center', backgroundColor: '#FFB380', padding: 14, borderRadius: 16, alignItems: 'center' },
  buttonText: { color: '#431407', fontSize: 15, fontWeight: '700' },
  secondary: { padding: 14, minHeight: 50, justifyContent: 'center', borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center' }, secondaryText: { color: '#374151', fontSize: 14, fontWeight: '600' },
  error: { padding: 14, backgroundColor: '#FFF0DF', borderRadius: 14, marginBottom: 14 }, busy: { flexDirection: 'row', gap: 10, justifyContent: 'center', padding: 12 },
});
