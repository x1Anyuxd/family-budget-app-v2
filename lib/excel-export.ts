import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

import { Transaction, formatAmount, formatDate, getCategoryById } from './types';

function downloadBase64FileOnWeb(base64: string, fileName: string, mimeType: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Web download failed:', error);
    return false;
  }
}

async function saveOrShareExcel(base64: string, fileName: string, dialogTitle: string): Promise<boolean> {
  const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  if (Platform.OS === 'web') {
    return downloadBase64FileOnWeb(base64, fileName, mimeType);
  }

  const filePath = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(filePath, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(filePath, {
      mimeType,
      dialogTitle,
    });
    return true;
  }

  return false;
}

export async function exportTransactionsToExcel(transactions: Transaction[], monthLabel: string): Promise<boolean> {
  try {
    if (transactions.length === 0) return false;

    const data = transactions.map((tx) => {
      const category = getCategoryById(tx.categoryId);
      return {
        日期: formatDate(tx.date),
        分类: category?.name || '未知',
        类型: tx.type === 'income' ? '收入' : '支出',
        金额: formatAmount(tx.amount),
        备注: tx.note || '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '记账');
    ws['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 20 }];

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    return saveOrShareExcel(wbout, `记账_${monthLabel}.xlsx`, `分享记账表格 - ${monthLabel}`);
  } catch (error) {
    console.error('Excel export error:', error);
    return false;
  }
}

export async function exportStatisticsToExcel(
  categoryStats: Array<{ name: string; amount: number; percentage: number }>,
  monthLabel: string,
  totalIncome: number,
  totalExpense: number,
): Promise<boolean> {
  try {
    const wb = XLSX.utils.book_new();

    const summaryData = [
      { 项目: '总收入', 金额: formatAmount(totalIncome) },
      { 项目: '总支出', 金额: formatAmount(totalExpense) },
      { 项目: '结余', 金额: formatAmount(totalIncome - totalExpense) },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, '汇总');

    const categoryData = categoryStats.map((stat) => ({
      分类: stat.name,
      金额: formatAmount(stat.amount),
      占比: `${(stat.percentage * 100).toFixed(1)}%`,
    }));
    const wsCategory = XLSX.utils.json_to_sheet(categoryData);
    XLSX.utils.book_append_sheet(wb, wsCategory, '分类统计');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    return saveOrShareExcel(wbout, `统计_${monthLabel}.xlsx`, `分享统计表格 - ${monthLabel}`);
  } catch (error) {
    console.error('Statistics export error:', error);
    return false;
  }
}
