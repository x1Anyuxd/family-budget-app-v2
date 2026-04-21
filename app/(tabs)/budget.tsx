import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useBudget } from '@/lib/budget-context';
import { getI18n } from '@/lib/i18n';
import { ScreenContainer } from '@/components/screen-container';

export default function BudgetScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, categories, transactions } = useBudget();
  const i18n = getI18n(settings.locale);

  // Calculate spent amount for each category in current month
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const getSpentAmount = (categoryId: string) => {
    return transactions
      .filter(t => {
        const date = new Date(t.date);
        return t.type === 'expense' && 
               t.categoryId === categoryId && 
               date.getMonth() === currentMonth && 
               date.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>{i18n.budget.title}</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 20 }}>
        {categories.filter(c => c.type === 'expense').map(category => {
          const spent = getSpentAmount(category.id);
          const budget = category.budget || 0;
          const percent = budget > 0 ? Math.min(spent / budget, 1) : 0;
          const isOver = budget > 0 && spent > budget;

          return (
            <View key={category.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
                  <IconSymbol name={category.icon as any} size={20} color={category.color} />
                </View>
                <View style={styles.cardTitleContainer}>
                  <Text style={[styles.categoryName, { color: colors.foreground }]}>{category.name}</Text>
                  <Text style={[styles.budgetInfo, { color: colors.muted }]}>
                    {budget > 0 ? `${i18n.budget.setBudget}: ¥${budget.toFixed(2)}` : i18n.budget.noBudget}
                  </Text>
                </View>
                {isOver && (
                  <View style={[styles.badge, { backgroundColor: colors.error + '20' }]}>
                    <Text style={[styles.badgeText, { color: colors.error }]}>{i18n.budget.overBudget}</Text>
                  </View>
                )}
              </View>

              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { backgroundColor: colors.background }]}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        width: `${percent * 100}%`, 
                        backgroundColor: isOver ? colors.error : colors.primary 
                      }
                    ]} 
                  />
                </View>
                <View style={styles.amountRow}>
                  <Text style={[styles.amountLabel, { color: colors.muted }]}>
                    {i18n.budget.spent}: <Text style={{ color: colors.foreground, fontWeight: '600' }}>¥{spent.toFixed(2)}</Text>
                  </Text>
                  <Text style={[styles.amountLabel, { color: colors.muted }]}>
                    {i18n.budget.remaining}: <Text style={{ color: isOver ? colors.error : colors.success, fontWeight: '600' }}>
                      ¥{Math.max(0, budget - spent).toFixed(2)}
                    </Text>
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  progressContainer: {
    width: '100%',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amountLabel: {
    fontSize: 12,
  },
});
