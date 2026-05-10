import React, { useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Path } from 'react-native-svg';

import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useBudget } from '@/lib/budget-context';
import { exportStatisticsToExcel } from '@/lib/excel-export';
import { getI18n } from '@/lib/i18n';
import {
  formatAmount,
  formatMonthLabel,
  getCategoryById,
  getCurrentMonth,
} from '@/lib/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_HEIGHT = 160;
const CHART_WIDTH = SCREEN_WIDTH - 40;

function prevMonth(month: string): string {
  const [year, m] = month.split('-').map(Number);
  if (m === 1) return `${year - 1}-12`;
  return `${year}-${String(m - 1).padStart(2, '0')}`;
}

function nextMonth(month: string): string {
  const [year, m] = month.split('-').map(Number);
  if (m === 12) return `${year + 1}-01`;
  return `${year}-${String(m + 1).padStart(2, '0')}`;
}

function getWeeklyData(transactions: any[]) {
  const expense = [0, 0, 0, 0, 0];
  const income = [0, 0, 0, 0, 0];
  for (const transaction of transactions) {
    const day = parseInt(transaction.date.split('-')[2], 10);
    const weekIndex = Math.min(Math.floor((day - 1) / 7), 4);
    if (transaction.type === 'expense') expense[weekIndex] += transaction.amount;
    else income[weekIndex] += transaction.amount;
  }
  return { expense, income };
}

function PieChart({ data, colors }: { data: { value: number; color: string }[]; colors: ReturnType<typeof useColors> }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return null;

  const radius = 70;
  const cx = 90;
  const cy = 90;
  let startAngle = -Math.PI / 2;

  return (
    <Svg width={180} height={180}>
      {data.map((item, index) => {
        const angle = (item.value / total) * 2 * Math.PI;
        const endAngle = startAngle + angle;
        const x1 = cx + radius * Math.cos(startAngle);
        const y1 = cy + radius * Math.sin(startAngle);
        const x2 = cx + radius * Math.cos(endAngle);
        const y2 = cy + radius * Math.sin(endAngle);
        const largeArc = angle > Math.PI ? 1 : 0;
        const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
        startAngle = endAngle;
        return <Path key={index} d={path} fill={item.color} />;
      })}
      <Circle cx={cx} cy={cy} r={40} fill={colors.surface} />
    </Svg>
  );
}

export default function StatisticsScreen() {
  const colors = useColors();
  const { settings, getMonthTransactions, getMonthSummary } = useBudget();
  const i18n = getI18n(settings.locale);
  const [month, setMonth] = useState(getCurrentMonth());

  const transactions = getMonthTransactions(month);
  const summary = getMonthSummary(month);
  const weekly = useMemo(() => getWeeklyData(transactions), [transactions]);

  const categoryBreakdown = useMemo(() => {
    const bucket = new Map<string, number>();
    for (const transaction of transactions.filter((item) => item.type === 'expense')) {
      bucket.set(transaction.categoryId, (bucket.get(transaction.categoryId) ?? 0) + transaction.amount);
    }
    return Array.from(bucket.entries())
      .map(([id, amount]) => {
        const category = getCategoryById(id);
        return {
          id,
          name: category?.name ?? '其他',
          amount,
          color: category?.color ?? '#999',
          icon: category?.icon ?? 'more-horiz',
          percentage: summary.expense > 0 ? amount / summary.expense : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [summary.expense, transactions]);

  const maxBar = Math.max(...weekly.expense, ...weekly.income, 1);
  const weekLabels = settings.locale === 'en' ? ['W1', 'W2', 'W3', 'W4', 'W5'] : ['第1周', '第2周', '第3周', '第4周', '第5周'];

  const handleExportExcel = async () => {
    if (!transactions.length) {
      Alert.alert(i18n.common.warning, i18n.statistics.noData);
      return;
    }
    const success = await exportStatisticsToExcel(
      categoryBreakdown.map((item) => ({
        name: item.name,
        amount: item.amount,
        percentage: item.percentage,
      })),
      formatMonthLabel(month),
      summary.income,
      summary.expense,
    );

    Alert.alert(success ? i18n.common.success : i18n.common.warning, success ? i18n.statistics.exportSuccess : i18n.statistics.exportFailed);
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={[styles.header, { borderBottomColor: colors.border }]}> 
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{i18n.statistics.title}</Text>
        <Pressable onPress={handleExportExcel} style={({ pressed }) => [styles.exportButton, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}> 
          <IconSymbol name="arrow.down.doc" size={18} color="#fff" />
          <Text style={styles.exportButtonText}>Excel</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={[styles.monthRow, { borderBottomColor: colors.border }]}> 
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMonth(prevMonth); }} style={({ pressed }) => [styles.monthBtn, pressed && { opacity: 0.6 }]}> 
            <IconSymbol name="chevron.left" size={20} color={colors.primary} />
          </Pressable>
          <Text style={[styles.monthText, { color: colors.foreground }]}>{formatMonthLabel(month)}</Text>
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMonth(nextMonth); }} style={({ pressed }) => [styles.monthBtn, pressed && { opacity: 0.6 }]}> 
            <IconSymbol name="chevron.right" size={20} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>{i18n.statistics.income}</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>¥{formatAmount(summary.income)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>{i18n.statistics.expense}</Text>
            <Text style={[styles.summaryValue, { color: colors.error }]}>¥{formatAmount(summary.expense)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>{i18n.statistics.balance}</Text>
            <Text style={[styles.summaryValue, { color: summary.balance >= 0 ? colors.success : colors.error }]}>¥{formatAmount(summary.balance)}</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{i18n.statistics.weeklyTrend}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: BAR_HEIGHT + 32, marginTop: 12, width: CHART_WIDTH - 32 }}>
            {weekLabels.map((label, index) => {
              const expenseHeight = (weekly.expense[index] / maxBar) * BAR_HEIGHT;
              const incomeHeight = (weekly.income[index] / maxBar) * BAR_HEIGHT;
              return (
                <View key={label} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: BAR_HEIGHT }}>
                    <View style={{ width: 12, height: Math.max(expenseHeight, 2), backgroundColor: colors.error, borderRadius: 4 }} />
                    <View style={{ width: 12, height: Math.max(incomeHeight, 2), backgroundColor: colors.success, borderRadius: 4 }} />
                  </View>
                  <Text style={{ fontSize: 10, color: colors.muted, marginTop: 6 }}>{label}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
              <Text style={{ fontSize: 12, color: colors.muted }}>{i18n.statistics.expense}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
              <Text style={{ fontSize: 12, color: colors.muted }}>{i18n.statistics.income}</Text>
            </View>
          </View>
        </View>

        {categoryBreakdown.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{i18n.statistics.categoryBreakdown}</Text>
            <View style={styles.breakdownTop}>
              <PieChart data={categoryBreakdown.map((item) => ({ value: item.amount, color: item.color }))} colors={colors} />
              <View style={{ flex: 1, gap: 8, paddingLeft: 12 }}>
                {categoryBreakdown.slice(0, 5).map((item) => (
                  <View key={item.id} style={styles.breakdownLegendRow}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={{ fontSize: 12, color: colors.muted, flex: 1 }} numberOfLines={1}>{item.name}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.foreground }}>{Math.round(item.percentage * 100)}%</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={{ marginTop: 16, gap: 10 }}>
              {categoryBreakdown.map((item) => (
                <View key={item.id}>
                  <View style={styles.categoryRow}>
                    <View style={styles.categoryLeft}>
                      <IconSymbol name={item.icon as any} size={16} color={item.color} />
                      <Text style={{ fontSize: 14, color: colors.foreground }}>{item.name}</Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.error }}>¥{formatAmount(item.amount)}</Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3 }}>
                    <View
                      style={{
                        height: 6,
                        width: `${item.percentage * 100}%`,
                        backgroundColor: item.color,
                        borderRadius: 3,
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {transactions.length === 0 && (
          <View style={styles.emptyBox}>
            <IconSymbol name="chart.bar.fill" size={48} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>{i18n.statistics.noData}</Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  exportButton: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exportButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  monthBtn: {
    padding: 8,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  breakdownTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  breakdownLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '500',
    marginTop: 8,
  },
});
