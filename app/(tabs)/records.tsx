import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { ScreenContainer } from '@/components/screen-container';
import { SwipeDeleteRow } from '@/components/swipe-delete-row';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useBudget } from '@/lib/budget-context';
import { exportLocalBills, importLocalBills } from '@/lib/bill-transfer';
import { getI18n } from '@/lib/i18n';
import {
  Transaction,
  formatAmount,
  formatMonthLabel,
  getCategoryById,
  getCurrentMonth,
} from '@/lib/types';

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

interface GroupedDay {
  date: string;
  transactions: Transaction[];
  dayIncome: number;
  dayExpense: number;
}

export default function RecordsScreen() {
  const colors = useColors();
  const {
    settings,
    getMonthTransactions,
    deleteTransaction,
    getExportPayload,
    importBills,
  } = useBudget();
  const i18n = getI18n(settings.locale);
  const [month, setMonth] = useState(getCurrentMonth());

  const transactions = getMonthTransactions(month);

  const grouped = useMemo<GroupedDay[]>(() => {
    const bucket = new Map<string, Transaction[]>();
    for (const transaction of transactions) {
      const items = bucket.get(transaction.date) ?? [];
      items.push(transaction);
      bucket.set(transaction.date, items);
    }
    return Array.from(bucket.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, list]) => ({
        date,
        transactions: list,
        dayIncome: list.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0),
        dayExpense: list.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0),
      }));
  }, [transactions]);

  const handleDelete = useCallback((id: string) => {
    Alert.alert(i18n.records.deleteTitle, i18n.records.deleteConfirm, [
      { text: i18n.common.cancel, style: 'cancel' },
      {
        text: i18n.common.delete,
        style: 'destructive',
        onPress: () => {
          deleteTransaction(id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  }, [deleteTransaction, i18n.common.cancel, i18n.common.delete, i18n.records.deleteConfirm, i18n.records.deleteTitle]);

  const handleTransferMenu = useCallback(() => {
    Alert.alert(i18n.records.exportImport, '', [
      {
        text: i18n.records.exportBills,
        onPress: async () => {
          const success = await exportLocalBills(getExportPayload());
          Alert.alert(success ? i18n.common.success : i18n.common.warning, success ? i18n.records.exportSuccess : i18n.records.exportFailed);
        },
      },
      {
        text: i18n.records.importBills,
        onPress: async () => {
          const payload = await importLocalBills();
          if (!payload) {
            Alert.alert(i18n.common.warning, i18n.records.importFailed);
            return;
          }
          await importBills(payload);
          Alert.alert(i18n.common.success, i18n.records.importSuccess);
        },
      },
      { text: i18n.common.cancel, style: 'cancel' },
    ]);
  }, [getExportPayload, i18n.common.cancel, i18n.common.success, i18n.common.warning, i18n.records.exportBills, i18n.records.exportFailed, i18n.records.exportImport, i18n.records.exportSuccess, i18n.records.importBills, i18n.records.importFailed, i18n.records.importSuccess, importBills]);

  const renderGroup = useCallback(({ item }: { item: GroupedDay }) => {
    const [, , day] = item.date.split('-');
    const weekDays = settings.locale === 'en' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['日', '一', '二', '三', '四', '五', '六'];
    const dayName = weekDays[new Date(item.date).getDay()];

    return (
      <View style={{ marginBottom: 12 }}>
        <View style={[styles.dayHeader, { borderBottomColor: colors.border }]}>
          <View style={styles.dayLeft}>
            <Text style={[styles.dayNum, { color: colors.foreground }]}>{parseInt(day, 10)}</Text>
            <Text style={[styles.dayWeek, { color: colors.muted }]}> {settings.locale === 'en' ? dayName : `周${dayName}`}</Text>
          </View>
          <View style={styles.dayRight}>
            {item.dayIncome > 0 && (
              <Text style={[styles.dayAmount, { color: colors.success }]}>+¥{formatAmount(item.dayIncome)}</Text>
            )}
            {item.dayExpense > 0 && (
              <Text style={[styles.dayAmount, { color: colors.error }]}>-¥{formatAmount(item.dayExpense)}</Text>
            )}
          </View>
        </View>
        <View style={[styles.txGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {item.transactions.map((transaction, index) => {
            const category = getCategoryById(transaction.categoryId);
            const isIncome = transaction.type === 'income';
            return (
              <SwipeDeleteRow key={transaction.id} onDelete={() => handleDelete(transaction.id)}>
                <View
                  style={[
                    styles.txRow,
                    { borderBottomColor: colors.border },
                    index === item.transactions.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={[styles.catIcon, { backgroundColor: `${category?.color ?? colors.muted}22` }]}>
                    <IconSymbol name={(category?.icon as any) || 'more-horiz'} size={20} color={category?.color ?? colors.muted} />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={[styles.txCat, { color: colors.foreground }]}>{category?.name ?? '其他'}</Text>
                    {transaction.note ? (
                      <Text style={[styles.txNote, { color: colors.muted }]} numberOfLines={1}>{transaction.note}</Text>
                    ) : null}
                  </View>
                  <Text style={[styles.txAmount, { color: isIncome ? colors.success : colors.error }]}> 
                    {isIncome ? '+' : '-'}¥{formatAmount(transaction.amount)}
                  </Text>
                </View>
              </SwipeDeleteRow>
            );
          })}
        </View>
      </View>
    );
  }, [colors, handleDelete, settings.locale]);

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={[styles.header, { borderBottomColor: colors.border }]}> 
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{i18n.records.title}</Text>
        <Pressable onPress={handleTransferMenu} style={({ pressed }) => [styles.headerAction, pressed && { opacity: 0.6 }]}> 
          <IconSymbol name="plus.circle.fill" size={24} color={colors.primary} />
        </Pressable>
      </View>

      <View style={[styles.monthRow, { borderBottomColor: colors.border }]}> 
        <Pressable onPress={() => setMonth(prevMonth)} style={({ pressed }) => [styles.monthBtn, pressed && { opacity: 0.6 }]}> 
          <IconSymbol name="chevron.left" size={20} color={colors.primary} />
        </Pressable>
        <Text style={[styles.monthText, { color: colors.foreground }]}>{formatMonthLabel(month)}</Text>
        <Pressable onPress={() => setMonth(nextMonth)} style={({ pressed }) => [styles.monthBtn, pressed && { opacity: 0.6 }]}> 
          <IconSymbol name="chevron.right" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {grouped.length === 0 ? (
        <View style={styles.emptyBox}>
          <IconSymbol name="note.text" size={48} color={colors.muted} />
          <Text style={[styles.emptyText, { color: colors.muted }]}>{i18n.records.noRecords}</Text>
          <Text style={[styles.emptyHint, { color: colors.muted }]}>{i18n.records.swipeToDelete}</Text>
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={(item) => item.date}
          renderItem={renderGroup}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  headerAction: {
    padding: 2,
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
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  dayNum: {
    fontSize: 20,
    fontWeight: '700',
  },
  dayWeek: {
    fontSize: 13,
  },
  dayRight: {
    flexDirection: 'row',
    gap: 12,
  },
  dayAmount: {
    fontSize: 13,
    fontWeight: '500',
  },
  txGroup: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  catIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txInfo: {
    flex: 1,
  },
  txCat: {
    fontSize: 15,
    fontWeight: '500',
  },
  txNote: {
    fontSize: 12,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '500',
    marginTop: 8,
  },
  emptyHint: {
    fontSize: 13,
  },
});
