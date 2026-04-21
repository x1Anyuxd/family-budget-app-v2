import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ScreenContainer } from '@/components/screen-container';
import { SwipeDeleteRow } from '@/components/swipe-delete-row';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useBudget } from '@/lib/budget-context';
import { getI18n } from '@/lib/i18n';
import {
  EXPENSE_CATEGORIES,
  formatAmount,
  formatMonthLabel,
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

export default function BudgetScreen() {
  const colors = useColors();
  const { settings, getMonthBudgets, getMonthTransactions, setBudget, deleteBudget } = useBudget();
  const i18n = getI18n(settings.locale);

  const [month, setMonth] = useState(getCurrentMonth());
  const [editorVisible, setEditorVisible] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string>('food');
  const [amountInput, setAmountInput] = useState('');

  const budgets = getMonthBudgets(month) ?? [];
  const transactions = getMonthTransactions(month) ?? [];

  const budgetCards = useMemo(() => {
    return budgets
      .map((budget) => {
        const category = EXPENSE_CATEGORIES.find((item) => item.id === budget.categoryId);
        if (!category) return null;
        const spent = transactions
          .filter((item) => item.type === 'expense' && item.categoryId === budget.categoryId)
          .reduce((sum, item) => sum + item.amount, 0);
        const remaining = Math.max(0, budget.amount - spent);
        const isOver = budget.amount > 0 && spent > budget.amount;
        const progress = budget.amount > 0 ? Math.min(spent / budget.amount, 1) : 0;

        return {
          category,
          budget,
          spent,
          remaining,
          isOver,
          progress,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b?.budget.amount ?? 0) - (a?.budget.amount ?? 0));
  }, [budgets, transactions]);

  const summary = useMemo(() => {
    const totalBudget = budgetCards.reduce((sum, item) => sum + (item?.budget.amount ?? 0), 0);
    const totalSpent = budgetCards.reduce((sum, item) => sum + (item?.spent ?? 0), 0);
    return {
      totalBudget,
      totalSpent,
      remaining: Math.max(0, totalBudget - totalSpent),
    };
  }, [budgetCards]);

  const unusedCategories = useMemo(
    () => EXPENSE_CATEGORIES.filter((category) => !budgets.some((item) => item.categoryId === category.id)),
    [budgets],
  );

  const openEditor = (categoryId: string, budgetId?: string, currentAmount?: number) => {
    setEditingCategoryId(categoryId);
    setEditingBudgetId(budgetId ?? null);
    setAmountInput(currentAmount && currentAmount > 0 ? String(currentAmount) : '');
    setEditorVisible(true);
  };

  const handleOpenAddBudget = () => {
    if (unusedCategories.length === 0) {
      Alert.alert(i18n.common.warning, settings.locale === 'en' ? 'All budget categories have been added.' : '当前分类预算已全部添加。');
      return;
    }
    setCategoryPickerVisible(true);
  };

  const handlePickCategory = (categoryId: string) => {
    setCategoryPickerVisible(false);
    openEditor(categoryId);
  };

  const handleSaveBudget = () => {
    const normalized = Number(amountInput.trim());
    if (!Number.isFinite(normalized) || normalized < 0) {
      Alert.alert(i18n.common.warning, i18n.addTransaction.enterAmount);
      return;
    }

    setBudget({
      id: editingBudgetId ?? `budget_${editingCategoryId}_${month}`,
      categoryId: editingCategoryId,
      amount: normalized,
      month,
    });
    setEditorVisible(false);
    setEditingBudgetId(null);
    setAmountInput('');
  };

  const handleDeleteBudget = (budgetId: string) => {
    Alert.alert(i18n.common.warning, i18n.records.deleteConfirm, [
      { text: i18n.common.cancel, style: 'cancel' },
      {
        text: i18n.common.delete,
        style: 'destructive',
        onPress: () => deleteBudget(budgetId),
      },
    ]);
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={[styles.header, { borderBottomColor: colors.border }]}> 
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{i18n.budget.title}</Text>
        <Pressable onPress={handleOpenAddBudget} style={({ pressed }) => [styles.addHeaderBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}> 
          <IconSymbol name="plus.circle.fill" size={16} color="#fff" />
          <Text style={styles.addHeaderBtnText}>{i18n.budget.addBudget}</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={[styles.monthRow, { borderBottomColor: colors.border }]}> 
          <Pressable onPress={() => setMonth(prevMonth(month))} style={({ pressed }) => [styles.monthBtn, pressed && { opacity: 0.6 }]}> 
            <IconSymbol name="chevron.left" size={20} color={colors.primary} />
          </Pressable>
          <Text style={[styles.monthText, { color: colors.foreground }]}>{formatMonthLabel(month)}</Text>
          <Pressable onPress={() => setMonth(nextMonth(month))} style={({ pressed }) => [styles.monthBtn, pressed && { opacity: 0.6 }]}> 
            <IconSymbol name="chevron.right" size={20} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>{i18n.budget.setBudget}</Text>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>¥{formatAmount(summary.totalBudget)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>{i18n.budget.spent}</Text>
            <Text style={[styles.summaryValue, { color: colors.error }]}>¥{formatAmount(summary.totalSpent)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>{i18n.budget.remaining}</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>¥{formatAmount(summary.remaining)}</Text>
          </View>
        </View>

        <View style={styles.listWrap}>
          {budgetCards.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
              <IconSymbol name="credit-card" size={36} color={colors.primary} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{i18n.budget.addBudget}</Text>
              <Text style={[styles.emptyHint, { color: colors.muted }]}>
                {settings.locale === 'en' ? 'No budget has been created for this month. Tap the button above to choose a category first.' : '本月还没有预算，请点击上方“新增预算”后先选择分类。'}
              </Text>
            </View>
          ) : (
            budgetCards.map((item) => {
              if (!item) return null;
              return (
                <SwipeDeleteRow
                  key={item.budget.id}
                  rightActions={[
                    {
                      key: 'delete-budget',
                      label: i18n.common.delete,
                      icon: 'trash',
                      color: colors.error,
                      onPress: () => handleDeleteBudget(item.budget.id),
                    },
                  ]}
                >
                  <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
                    <View style={styles.cardHeader}>
                      <View style={[styles.iconContainer, { backgroundColor: `${item.category.color}20` }]}> 
                        <IconSymbol name={item.category.icon as any} size={20} color={item.category.color} />
                      </View>
                      <View style={styles.cardTitleContainer}>
                        <Text style={[styles.categoryName, { color: colors.foreground }]}>{item.category.name}</Text>
                        <Text style={[styles.budgetInfo, { color: colors.muted }]}>
                          {i18n.budget.setBudget}: ¥{formatAmount(item.budget.amount)}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => openEditor(item.category.id, item.budget.id, item.budget.amount)}
                        style={({ pressed }) => [styles.editBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
                      >
                        <IconSymbol name="pencil" size={14} color="#fff" />
                        <Text style={styles.editBtnText}>{i18n.budget.editBudget}</Text>
                      </Pressable>
                    </View>

                    <View style={styles.progressContainer}>
                      <View style={[styles.progressBar, { backgroundColor: colors.background }]}> 
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${item.progress * 100}%`,
                              backgroundColor: item.isOver ? colors.error : item.category.color,
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.amountRow}>
                        <Text style={[styles.amountLabel, { color: colors.muted }]}> 
                          {i18n.budget.spent}: <Text style={{ color: colors.foreground, fontWeight: '600' }}>¥{formatAmount(item.spent)}</Text>
                        </Text>
                        <Text style={[styles.amountLabel, { color: colors.muted }]}> 
                          {i18n.budget.remaining}:{' '}
                          <Text style={{ color: item.isOver ? colors.error : colors.success, fontWeight: '600' }}>
                            ¥{formatAmount(item.remaining)}
                          </Text>
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardFooter}>
                      {item.isOver ? (
                        <View style={[styles.badge, { backgroundColor: `${colors.error}20` }]}> 
                          <Text style={[styles.badgeText, { color: colors.error }]}>{i18n.budget.overBudget}</Text>
                        </View>
                      ) : (
                        <View style={[styles.badge, { backgroundColor: `${colors.success}20` }]}> 
                          <Text style={[styles.badgeText, { color: colors.success }]}>{Math.round(item.progress * 100)}%</Text>
                        </View>
                      )}
                      <Text style={[styles.swipeHint, { color: colors.muted }]}>{settings.locale === 'en' ? 'Swipe left to delete' : '左划删除'}</Text>
                    </View>
                  </View>
                </SwipeDeleteRow>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal visible={categoryPickerVisible} animationType="slide" transparent onRequestClose={() => setCategoryPickerVisible(false)}>
        <View style={styles.modalMask}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{i18n.budget.addBudget}</Text>
            <Text style={[styles.modalHint, { color: colors.muted }]}>{settings.locale === 'en' ? 'Choose a category first' : '请先选择要设置预算的分类'}</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {unusedCategories.map((category) => (
                <Pressable
                  key={category.id}
                  onPress={() => handlePickCategory(category.id)}
                  style={[styles.categoryOption, { borderColor: colors.border, backgroundColor: colors.background }]}
                >
                  <View style={[styles.optionIcon, { backgroundColor: `${category.color}20` }]}> 
                    <IconSymbol name={category.icon as any} size={18} color={category.color} />
                  </View>
                  <Text style={[styles.optionText, { color: colors.foreground }]}>{category.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={() => setCategoryPickerVisible(false)} style={[styles.secondaryBtn, { borderColor: colors.border }]}> 
              <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>{i18n.common.cancel}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={editorVisible} animationType="slide" transparent onRequestClose={() => setEditorVisible(false)}>
        <View style={styles.modalMask}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{editingBudgetId ? i18n.budget.editBudget : i18n.budget.addBudget}</Text>
            <Text style={[styles.modalHint, { color: colors.muted }]}>
              {formatMonthLabel(month)} · {EXPENSE_CATEGORIES.find((item) => item.id === editingCategoryId)?.name}
            </Text>
            <TextInput
              value={amountInput}
              onChangeText={setAmountInput}
              placeholder={i18n.addTransaction.enterAmount}
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
              style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setEditorVisible(false)} style={({ pressed }) => [styles.secondaryBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}> 
                <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>{i18n.common.cancel}</Text>
              </Pressable>
              <Pressable onPress={handleSaveBudget} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}> 
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
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  addHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addHeaderBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  monthRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  listWrap: {
    padding: 16,
    gap: 16,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyHint: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitleContainer: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
  },
  budgetInfo: {
    fontSize: 12,
    marginTop: 4,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  editBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    width: '100%',
  },
  progressBar: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  amountLabel: {
    flex: 1,
    fontSize: 12,
  },
  cardFooter: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  swipeHint: {
    fontSize: 12,
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
  modalHint: {
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  optionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
