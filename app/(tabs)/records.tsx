import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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
  TransactionType,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
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
    updateTransaction,
    getExportPayload,
    importBills,
  } = useBudget();
  const i18n = getI18n(settings.locale);
  const [month, setMonth] = useState(getCurrentMonth());
  const [transferMenuVisible, setTransferMenuVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editType, setEditType] = useState<TransactionType>('expense');
  const [editAmount, setEditAmount] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('food');
  const [editDate, setEditDate] = useState('');
  const [editNote, setEditNote] = useState('');

  const transactions = getMonthTransactions(month);
  const editCategories = editType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

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

  const openEditor = useCallback((transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditType(transaction.type);
    setEditAmount(String(transaction.amount));
    setEditCategoryId(transaction.categoryId);
    setEditDate(transaction.date);
    setEditNote(transaction.note ?? '');
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingTransaction) return;
    const normalized = Number(editAmount);
    if (!Number.isFinite(normalized) || normalized <= 0) {
      Alert.alert(i18n.common.warning, i18n.addTransaction.enterAmount);
      return;
    }

    await updateTransaction({
      ...editingTransaction,
      type: editType,
      amount: normalized,
      categoryId: editCategoryId,
      date: editDate,
      note: editNote.trim(),
    });

    setEditingTransaction(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [editAmount, editCategoryId, editDate, editNote, editType, editingTransaction, i18n.addTransaction.enterAmount, i18n.common.warning, updateTransaction]);

  const handleTransferMenu = useCallback(() => {
    setTransferMenuVisible(true);
  }, []);

  const handleExportBills = useCallback(async () => {
    setTransferMenuVisible(false);
    const success = await exportLocalBills(getExportPayload());
    Alert.alert(success ? i18n.common.success : i18n.common.warning, success ? i18n.records.exportSuccess : i18n.records.exportFailed);
  }, [getExportPayload, i18n.common.success, i18n.common.warning, i18n.records.exportFailed, i18n.records.exportSuccess]);

  const handleImportBills = useCallback(async () => {
    setTransferMenuVisible(false);
    const payload = await importLocalBills();
    if (!payload) {
      Alert.alert(i18n.common.warning, i18n.records.importFailed);
      return;
    }
    await importBills(payload);
    Alert.alert(i18n.common.success, i18n.records.importSuccess);
  }, [i18n.common.success, i18n.common.warning, i18n.records.importFailed, i18n.records.importSuccess, importBills]);

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
              <SwipeDeleteRow
                key={transaction.id}
                rightActions={[
                  {
                    key: 'edit',
                    label: i18n.common.edit,
                    icon: 'pencil',
                    color: colors.primary,
                    onPress: () => openEditor(transaction),
                  },
                  {
                    key: 'delete',
                    label: i18n.common.delete,
                    icon: 'trash',
                    color: colors.error,
                    onPress: () => handleDelete(transaction.id),
                  },
                ]}
              >
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
  }, [colors, handleDelete, i18n.common.delete, i18n.common.edit, openEditor, settings.locale]);

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
          <Text style={[styles.emptyHint, { color: colors.muted }]}>左划可编辑或删除</Text>
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

      <Modal visible={transferMenuVisible} transparent animationType="fade" onRequestClose={() => setTransferMenuVisible(false)}>
        <View style={styles.modalMask}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{i18n.records.exportImport}</Text>
            <Pressable onPress={handleExportBills} style={[styles.menuAction, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <IconSymbol name="arrow.down.doc" size={18} color={colors.primary} />
              <Text style={[styles.menuActionText, { color: colors.foreground }]}>{i18n.records.exportBills}</Text>
            </Pressable>
            <Pressable onPress={handleImportBills} style={[styles.menuAction, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <IconSymbol name="plus.circle.fill" size={18} color={colors.primary} />
              <Text style={[styles.menuActionText, { color: colors.foreground }]}>{i18n.records.importBills}</Text>
            </Pressable>
            <Pressable onPress={() => setTransferMenuVisible(false)} style={[styles.secondaryBtn, { borderColor: colors.border }]}> 
              <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>{i18n.common.cancel}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(editingTransaction)} transparent animationType="slide" onRequestClose={() => setEditingTransaction(null)}>
        <View style={styles.modalMask}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{i18n.common.edit}</Text>

            <View style={[styles.typeSwitch, { backgroundColor: colors.background, borderColor: colors.border }]}> 
              {(['expense', 'income'] as TransactionType[]).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => {
                    setEditType(t);
                    setEditCategoryId(t === 'expense' ? 'food' : 'salary');
                  }}
                  style={[styles.typeBtn, editType === t && { backgroundColor: t === 'expense' ? colors.error : colors.success }]}
                >
                  <Text style={[styles.typeBtnText, { color: editType === t ? '#fff' : colors.muted }]}>{t === 'expense' ? '支出' : '收入'}</Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              value={editAmount}
              onChangeText={setEditAmount}
              keyboardType="decimal-pad"
              placeholder={i18n.addTransaction.enterAmount}
              placeholderTextColor={colors.muted}
              style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
            />
            <TextInput
              value={editDate}
              onChangeText={setEditDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.muted}
              style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
            />
            <TextInput
              value={editNote}
              onChangeText={setEditNote}
              placeholder="备注"
              placeholderTextColor={colors.muted}
              style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
            />

            <View style={styles.categoryGrid}>
              {editCategories.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => setEditCategoryId(cat.id)}
                  style={[
                    styles.categoryChip,
                    { backgroundColor: colors.background, borderColor: editCategoryId === cat.id ? cat.color : colors.border },
                  ]}
                >
                  <IconSymbol name={cat.icon as any} size={16} color={cat.color} />
                  <Text style={{ color: editCategoryId === cat.id ? cat.color : colors.foreground, fontSize: 12, fontWeight: '600' }}>{cat.name}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalActions}>
              <Pressable onPress={() => setEditingTransaction(null)} style={[styles.secondaryBtn, { borderColor: colors.border }]}> 
                <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>{i18n.common.cancel}</Text>
              </Pressable>
              <Pressable onPress={handleSaveEdit} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}> 
                <Text style={styles.primaryBtnText}>{i18n.common.save}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  modalMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  typeSwitch: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 14,
    padding: 4,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 999,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  menuAction: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuActionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  primaryBtn: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
