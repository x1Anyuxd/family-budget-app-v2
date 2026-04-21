import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Transaction, getCategoryById, formatAmount, formatDate } from './types';

/**
 * 生成 Excel 文件并分享
 */
export async function exportTransactionsToExcel(
  transactions: Transaction[],
  monthLabel: string
): Promise<boolean> {
  try {
    if (transactions.length === 0) {
      console.warn('No transactions to export');
      return false;
    }

    // 准备数据
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

    // 创建工作簿
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '记账');

    // 设置列宽
    const colWidths = [
      { wch: 12 }, // 日期
      { wch: 12 }, // 分类
      { wch: 10 }, // 类型
      { wch: 12 }, // 金额
      { wch: 20 }, // 备注
    ];
    ws['!cols'] = colWidths;

    // 生成 Excel 文件
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    const fileName = `记账_${monthLabel}.xlsx`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;

    // 写入文件
    await FileSystem.writeAsStringAsync(filePath, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // 分享文件
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: `分享记账表格 - ${monthLabel}`,
      });
      return true;
    }

    console.warn('Sharing not available');
    return false;
  } catch (error) {
    console.error('Excel export error:', error);
    return false;
  }
}

/**
 * 生成统计汇总表
 */
export async function exportStatisticsToExcel(
  categoryStats: Array<{ name: string; amount: number; percentage: number }>,
  monthLabel: string,
  totalIncome: number,
  totalExpense: number
): Promise<boolean> {
  try {
    // 创建工作簿
    const wb = XLSX.utils.book_new();

    // 汇总表
    const summaryData = [
      { 项目: '总收入', 金额: formatAmount(totalIncome) },
      { 项目: '总支出', 金额: formatAmount(totalExpense) },
      { 项目: '结余', 金额: formatAmount(totalIncome - totalExpense) },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, '汇总');

    // 分类统计表
    const categoryData = categoryStats.map((stat) => ({
      分类: stat.name,
      金额: formatAmount(stat.amount),
      占比: `${(stat.percentage * 100).toFixed(1)}%`,
    }));
    const wsCategory = XLSX.utils.json_to_sheet(categoryData);
    XLSX.utils.book_append_sheet(wb, wsCategory, '分类统计');

    // 生成文件
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    const fileName = `统计_${monthLabel}.xlsx`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(filePath, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: `分享统计表格 - ${monthLabel}`,
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error('Statistics export error:', error);
    return false;
  }
}
