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
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { ScreenContainer } from '@/components/screen-container';
import { SwipeDeleteRow } from '@/components/swipe-delete-row';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useBudget } from '@/lib/budget-context';
import { getI18n } from '@/lib/i18n';
import {
  Transaction,
  formatAmount,
  formatDate,
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

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const {
    settings,
    currentUser,
    users,
    isAdmin,
    getMonthTransactions,
    getMonthSummary,
    publishAnnouncement,
    deleteTransaction,
  } = useBudget();
  const i18n = getI18n(settings.locale);

  const [month, setMonth] = useState(getCurrentMonth());
  const [showAdminSheet, setShowAdminSheet] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showMemberBillsModal, setShowMemberBillsModal] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');
  const otherMembers = useMemo(
    () => users.filter((user) => user.id !== currentUser?.id),
    [currentUser?.id, users],
  );
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const summary = getMonthSummary(month);
  const transactions = getMonthTransactions(month).slice(0, 10);
  const selectedMemberTransactions = selectedMemberId ? getMonthTransactions(month, selectedMemberId) : [];

  const openMemberBills = () => {
    if (!otherMembers.length) {
      Alert.alert(i18n.common.warning, i18n.home.noMembers);
      return;
    }
    setSelectedMemberId(otherMembers[0].id);
    setShowMemberBillsModal(true);
    setShowAdminSheet(false);
  };

  const handlePublishAnnouncement = async () => {
    const result = await publishAnnouncement(announcementText);
    Alert.alert(result.success ? i18n.common.success : i18n.common.warning, result.message);
    if (result.success) {
      setAnnouncementText('');
      setShowAnnouncementModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const renderTransaction = (item: Transaction) => {
    const category = getCategoryById(item.categoryId);
    const isIncome = item.type === 'income';
    return (
      <SwipeDeleteRow key={item.id} onDelete={() => deleteTransaction(item.id)}>
        <View style={[styles.txRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}> 
          <View style={[styles.catIcon, { backgroundColor: `${category?.color ?? colors.muted}22` }]}>
            <IconSymbol name={(category?.icon as any) || 'more-horiz'} size={20} color={category?.color ?? colors.muted} />
          </View>
          <View style={styles.txInfo}>
            <Text style={[styles.txCat, { color: colors.foreground }]}>{category?.name ?? '其他'}</Text>
            <Text style={[styles.txNote, { color: colors.muted }]} numberOfLines={1}>
              {item.note || item.userName || '--'}
            </Text>
          </View>
          <View style={styles.txRight}>
            <Text style={[styles.txAmount, { color: isIncome ? colors.success : colors.error }]}>
              {isIncome ? '+' : '-'}¥{formatAmount(item.amount)}
            </Text>
            <Text style={[styles.txDate, { color: colors.muted }]}>{formatDate(item.date)}</Text>
          </View>
        </View>
      </SwipeDeleteRow>
    );
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}> 
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.headerTitle}>{i18n.home.title}</Text>
              <Text style={styles.headerSubtitle}>{currentUser ? `${currentUser.displayName}` : i18n.settings.guest}</Text>
            </View>
            {isAdmin ? (
              <Pressable
                onPress={() => setShowAdminSheet(true)}
                style={({ pressed }) => [styles.adminBtn, pressed && { opacity: 0.75 }]}
              >
                <IconSymbol name="plus.circle.fill" size={26} color="#fff" />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.monthRow}>
            <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMonth(prevMonth); }} style={({ pressed }) => [styles.monthBtn, pressed && { opacity: 0.6 }]}> 
              <IconSymbol name="chevron.left" size={20} color="#fff" />
            </Pressable>
            <Text style={styles.monthText}>{formatMonthLabel(month)}</Text>
            <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMonth(nextMonth); }} style={({ pressed }) => [styles.monthBtn, pressed && { opacity: 0.6 }]}> 
              <IconSymbol name="chevron.right" size={20} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{i18n.home.income}</Text>
              <Text style={styles.summaryValue}>¥{formatAmount(summary.income)}</Text>
            </View>
            <View style={[styles.summaryCard, styles.summaryCardCenter]}>
              <Text style={styles.summaryLabel}>{i18n.home.expense}</Text>
              <Text style={styles.summaryValue}>¥{formatAmount(summary.expense)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{i18n.home.balance}</Text>
              <Text style={[styles.summaryValue, { color: summary.balance >= 0 ? '#fff' : '#FFD0CC' }]}>¥{formatAmount(summary.balance)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{i18n.home.recentTransactions}</Text>
            <Pressable onPress={() => router.push('/(tabs)/records' as any)} style={({ pressed }) => pressed && { opacity: 0.6 }}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>{i18n.home.viewAll}</Text>
            </Pressable>
          </View>
          {transactions.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: colors.surface }]}> 
              <IconSymbol name="note.text" size={40} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>{i18n.home.noTransactions}</Text>
              <Text style={[styles.emptyHint, { color: colors.muted }]}>{i18n.home.tapToAdd}</Text>
            </View>
          ) : (
            <View style={[styles.txList, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
              {transactions.map(renderTransaction)}
            </View>
          )}
        </View>
      </ScrollView>

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/(tabs)/add-transaction' as any);
        }}
        style={({ pressed }) => [styles.fab, { backgroundColor: colors.primary, transform: [{ scale: pressed ? 0.95 : 1 }] }]}
      >
        <IconSymbol name="plus.circle.fill" size={28} color="#fff" />
        <Text style={styles.fabText}>{i18n.home.addTransaction}</Text>
      </Pressable>

      <Modal visible={showAdminSheet} transparent animationType="fade" onRequestClose={() => setShowAdminSheet(false)}>
        <Pressable style={styles.modalMask} onPress={() => setShowAdminSheet(false)}>
          <View style={[styles.actionSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{i18n.home.adminActions}</Text>
            <Pressable
              onPress={() => {
                setShowAdminSheet(false);
                setShowAnnouncementModal(true);
              }}
              style={[styles.sheetButton, { backgroundColor: colors.background }]}
            >
              <IconSymbol name="note.text" size={18} color={colors.primary} />
              <Text style={[styles.sheetButtonText, { color: colors.foreground }]}>{i18n.home.publishAnnouncement}</Text>
            </Pressable>
            <Pressable onPress={openMemberBills} style={[styles.sheetButton, { backgroundColor: colors.background }]}> 
              <IconSymbol name="list.bullet" size={18} color={colors.primary} />
              <Text style={[styles.sheetButtonText, { color: colors.foreground }]}>{i18n.home.viewMemberBills}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={showAnnouncementModal} transparent animationType="slide" onRequestClose={() => setShowAnnouncementModal(false)}>
        <View style={styles.centeredModal}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{i18n.home.publishAnnouncement}</Text>
            <TextInput
              value={announcementText}
              onChangeText={setAnnouncementText}
              placeholder={i18n.home.announcementPlaceholder}
              placeholderTextColor={colors.muted}
              multiline
              textAlignVertical="top"
              style={[styles.textArea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            />
            <View style={styles.modalButtonRow}>
              <Pressable onPress={() => setShowAnnouncementModal(false)} style={[styles.secondaryButton, { borderColor: colors.border }]}> 
                <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>{i18n.common.cancel}</Text>
              </Pressable>
              <Pressable onPress={handlePublishAnnouncement} style={[styles.primaryModalButton, { backgroundColor: colors.primary }]}> 
                <Text style={styles.primaryButtonText}>{i18n.home.sendAnnouncement}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showMemberBillsModal} transparent animationType="slide" onRequestClose={() => setShowMemberBillsModal(false)}>
        <View style={styles.centeredModal}>
          <View style={[styles.largeModalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{i18n.home.memberBills}</Text>
              <Pressable onPress={() => setShowMemberBillsModal(false)}>
                <IconSymbol name="xmark" size={20} color={colors.foreground} />
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.memberSelectorRow}>
              {otherMembers.map((member) => {
                const active = selectedMemberId === member.id;
                return (
                  <Pressable
                    key={member.id}
                    onPress={() => setSelectedMemberId(member.id)}
                    style={[styles.memberChip, { backgroundColor: active ? colors.primary : colors.background }]}
                  >
                    <Text style={{ color: active ? '#fff' : colors.foreground, fontWeight: '600' }}>{member.displayName}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <ScrollView style={{ maxHeight: 340 }}>
              {selectedMemberTransactions.length === 0 ? (
                <View style={styles.memberEmptyWrap}>
                  <Text style={[styles.itemHint, { color: colors.muted }]}>{i18n.common.noData}</Text>
                </View>
              ) : (
                selectedMemberTransactions.map(renderTransaction)
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 16,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
  },
  adminBtn: {
    padding: 4,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  monthBtn: {
    padding: 8,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginHorizontal: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
  },
  summaryCardCenter: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '500',
  },
  txList: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
  txDate: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyBox: {
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
  },
  emptyHint: {
    fontSize: 13,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  actionSheet: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    gap: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sheetButton: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sheetButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  centeredModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  largeModalCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  primaryModalButton: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  memberSelectorRow: {
    gap: 10,
    paddingBottom: 14,
  },
  memberChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  memberEmptyWrap: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  itemHint: {
    fontSize: 14,
  },
});
