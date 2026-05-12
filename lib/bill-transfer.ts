import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
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

/**
 * 导出交易记录为 Excel 格式（CSV）
 * @param transactions 交易记录数组
 * @param locale 语言设置
 */
export async function exportToExcel(transactions: Transaction[], locale: string = 'zh'): Promise<boolean> {
  try {
    if (!transactions || transactions.length === 0) {
      console.warn('No transactions to export');
      return false;
    }

    // 准备 CSV 数据
    const headers = ['日期', '类目', '类型', '金额', '备注'];
    const rows = transactions.map(transaction => {
      const date = new Date(transaction.date).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US');
      const category = getCategoryName(transaction.categoryId, locale);
      const type = transaction.type === 'income' ? (locale === 'zh' ? '收入' : 'Income') : (locale === 'zh' ? '支出' : 'Expense');
      const amount = transaction.amount;
      const description = (transaction.description || '').replace(/"/g, '""'); // 转义双引号
      
      return [
        `"${date}"`,
        `"${category}"`,
        `"${type}"`,
        amount,
        `"${description}"`,
      ].join(',');
    });

    // 生成 CSV 内容
    const csvContent = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');

    // 导出文件
    if (Platform.OS === 'web') {
      const fileName = buildFileName('csv');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    }

    // 对于 Native 平台
    const docDir = (FileSystem as any).documentDirectory || '';
    const filePath = `${docDir}${buildFileName('csv')}`;
    await FileSystem.writeAsStringAsync(filePath, csvContent);
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
