import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { BillTransferPayload } from './types';

function buildFileName() {
  const now = new Date();
  const timestamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '-',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
  ].join('');
  return `family-budget-backup-${timestamp}.json`;
}

export async function exportLocalBills(payload: BillTransferPayload): Promise<boolean> {
  try {
    // For web platform, use browser download
    if (Platform.OS === 'web') {
      const jsonString = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = buildFileName();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    }

    // For native platforms
    const docDir = (FileSystem as any).documentDirectory || '';
    const filePath = `${docDir}${buildFileName()}`;
    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(payload, null, 2));
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: '导出本地账单备份',
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to export local bills', error);
    return false;
  }
}

export async function importLocalBills(): Promise<BillTransferPayload | null> {
  try {
    // For web platform, use file input
    if (Platform.OS === 'web') {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0];
          if (!file) {
            resolve(null);
            return;
          }
          try {
            const text = await file.text();
            const parsed = JSON.parse(text) as BillTransferPayload;
            if (!parsed || !Array.isArray(parsed.transactions) || !Array.isArray(parsed.budgets)) {
              throw new Error('Invalid local bill payload');
            }
            resolve(parsed);
          } catch (error) {
            console.error('Failed to parse JSON', error);
            resolve(null);
          }
        };
        input.click();
      });
    }

    // For native platforms
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/json'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.length) {
      return null;
    }
    const fileUri = result.assets[0].uri;
    const raw = await FileSystem.readAsStringAsync(fileUri);
    const parsed = JSON.parse(raw) as BillTransferPayload;
    if (!parsed || !Array.isArray(parsed.transactions) || !Array.isArray(parsed.budgets)) {
      throw new Error('Invalid local bill payload');
    }
    return parsed;
  } catch (error) {
    console.error('Failed to import local bills', error);
    return null;
  }
}
