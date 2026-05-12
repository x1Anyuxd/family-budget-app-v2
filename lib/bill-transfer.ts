import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import type { BillTransferPayload, Transaction } from './types';
import { getCategoryName } from './i18n-categories';

function buildFileName(ext = 'json') {
  const now = new Date();
  const timestamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '-',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
  ].join('');
  return `family-budget-backup-${timestamp}.${ext}`;
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

export async function exportToExcel(transactions: Transaction[], locale: string = 'zh'): Promise<boolean> {
  try {
    // 准备 Excel 数据
    const excelData = transactions.map(transaction => ({
      '日期': new Date(transaction.date).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US'),
      '类目': getCategoryName(transaction.categoryId, locale),
      '类型': transaction.type === 'income' ? (locale === 'zh' ? '收入' : 'Income') : (locale === 'zh' ? '支出' : 'Expense'),
      '金额': transaction.amount,
      '备注': transaction.description || '',
    }));

    // 创建工作簿
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

    // 设置列宽
    ws['!cols'] = [
      { wch: 15 }, // 日期
      { wch: 12 }, // 类目
      { wch: 10 }, // 类型
      { wch: 10 }, // 金额
      { wch: 20 }, // 备注
    ];

    // 导出文件
    if (Platform.OS === 'web') {
      const fileName = buildFileName('xlsx');
      XLSX.writeFile(wb, fileName);
      return true;
    }

    // 对于 Native 平台，生成 CSV 作为备选方案
    const csv = XLSX.utils.sheet_to_csv(ws);
    const docDir = (FileSystem as any).documentDirectory || '';
    const filePath = `${docDir}${buildFileName('csv')}`;
    await FileSystem.writeAsStringAsync(filePath, csv);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/csv',
        dialogTitle: locale === 'zh' ? '导出账单数据' : 'Export Bills',
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to export to Excel', error);
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
