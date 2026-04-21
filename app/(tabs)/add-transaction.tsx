import React, { useCallback, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator,
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
  TransactionType, EXPENSE_CATEGORIES, INCOME_CATEGORIES, Category, formatAmount, getCategoryById,
} from '@/lib/types';
import { takePhoto, pickImageFromLibrary, ensureBase64 } from '@/lib/camera-service';
import { trpc } from '@/lib/trpc';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AddTransactionScreen() {
  const colors = useColors();
  const router = useRouter();
  const { addTransaction, deleteTransaction, getRecentTransactions, settings } = useBudget();
  const i18n = getI18n(settings.locale);

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('food');
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const recentTransactions = getRecentTransactions(4);
  const analyzeReceiptMutation = trpc.receipt.analyze.useMutation();

  const handleTypeSwitch = useCallback((t: TransactionType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setType(t);
    setSelectedCat(t === 'expense' ? 'food' : 'salary');
  }, []);

  const handleSave = useCallback(() => {
    const num = parseFloat(amount);
    if (!amount || Number.isNaN(num) || num <= 0) {
      Alert.alert(i18n.addTransaction.invalidAmount);
      return;
    }
    addTransaction({
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      type,
      amount: num,
      categoryId: selectedCat,
      date,
      note: note.trim(),
      createdAt: new Date().toISOString(),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [amount, type, selectedCat, date, note, addTransaction, router, i18n.addTransaction.invalidAmount]);

  const handleTakePhoto = useCallback(async () => {
    try {
      setIsAnalyzing(true);
      const photo = await takePhoto();
      if (!photo) {
        setIsAnalyzing(false);
        return;
      }

      const photoWithBase64 = await ensureBase64(photo);
      if (!photoWithBase64.base64) {
        Alert.alert(i18n.addTransaction.photoError, i18n.addTransaction.readImageFailed);
        setIsAnalyzing(false);
        return;
      }

      const result = await analyzeReceiptMutation.mutateAsync({
        imageBase64: photoWithBase64.base64,
        mimeType: photoWithBase64.mimeType,
      });

      setIsAnalyzing(false);

      if (!result.success) {
        Alert.alert(i18n.addTransaction.receiptFailed, result.error || i18n.addTransaction.unknownError);
        return;
      }

      const resultData = {
        imageUri: photo.uri,
        amount: result.data?.amount,
        categoryId: result.data?.categoryId,
        categoryName: result.data?.categoryName,
        merchant: result.data?.merchant,
        description: result.data?.description,
        confidence: result.data?.confidence || 0,
      };

      router.push({
        pathname: '/(tabs)/receipt-result',
        params: { result: JSON.stringify(resultData) },
      });
    } catch (error) {
      setIsAnalyzing(false);
      Alert.alert(i18n.addTransaction.photoError, error instanceof Error ? error.message : i18n.addTransaction.unknownError);
    }
  }, [analyzeReceiptMutation, router, i18n.addTransaction]);

  const handlePickImage = useCallback(async () => {
    try {
      setIsAnalyzing(true);
      const photo = await pickImageFromLibrary();
      if (!photo) {
        setIsAnalyzing(false);
        return;
      }

      const photoWithBase64 = await ensureBase64(photo);
      if (!photoWithBase64.base64) {
        Alert.alert(i18n.addTransaction.photoError, i18n.addTransaction.readImageFailed);
        setIsAnalyzing(false);
        return;
      }

      const result = await analyzeReceiptMutation.mutateAsync({
        imageBase64: photoWithBase64.base64,
        mimeType: photoWithBase64.mimeType,
      });

      setIsAnalyzing(false);

      if (!result.success) {
        Alert.alert(i18n.addTransaction.receiptFailed, result.error || i18n.addTransaction.unknownError);
        return;
      }

      const resultData = {
        imageUri: photo.uri,
        amount: result.data?.amount,
        categoryId: result.data?.categoryId,
        categoryName: result.data?.categoryName,
        merchant: result.data?.merchant,
        description: result.data?.description,
        confidence: result.data?.confidence || 0,
      };

      router.push({
        pathname: '/(tabs)/receipt-result',
        params: { result: JSON.stringify(resultData) },
      });
    } catch (error) {
      setIsAnalyzing(false);
      Alert.alert(i18n.addTransaction.photoError, error instanceof Error ? error.message : i18n.addTransaction.unknownError);
    }
  }, [analyzeReceiptMutation, router, i18n.addTransaction]);

  if (isAnalyzing) {
    return (
      <ScreenContainer containerClassName="bg-background">
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>{i18n.addTransaction.loadingReceipt}</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={[styles.header, { borderBottomColor: colors.border }]}> 
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}> 
          <IconSymbol name="xmark" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{i18n.addTransaction.title}</Text>
        <Pressable onPress={handleSave} style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}> 
          <Text style={styles.saveBtnText}>{i18n.addTransaction.save}</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.cameraRow}>
          <Pressable
            onPress={handleTakePhoto}
            style={({ pressed }) => [styles.cameraBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
          >
            <IconSymbol name="camera" size={20} color="#fff" />
            <Text style={styles.cameraBtnText}>{i18n.addTransaction.takePhoto}</Text>
          </Pressable>
          <Pressable
            onPress={handlePickImage}
            style={({ pressed }) => [styles.cameraBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
          >
            <IconSymbol name="photo" size={20} color="#fff" />
            <Text style={styles.cameraBtnText}>{i18n.addTransaction.selectPhoto}</Text>
          </Pressable>
        </View>

        <View style={[styles.typeSwitch, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          {(['expense', 'income'] as TransactionType[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => handleTypeSwitch(t)}
              style={[
                styles.typeBtn,
                type === t && { backgroundColor: t === 'expense' ? colors.error : colors.success },
              ]}
            >
              <Text style={[styles.typeBtnText, { color: type === t ? '#fff' : colors.muted }]}> 
                {t === 'expense' ? i18n.addTransaction.expense : i18n.addTransaction.income}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.amountBox, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <Text style={[styles.currencySymbol, { color: colors.muted }]}>¥</Text>
          <TextInput
            style={[styles.amountInput, { color: colors.foreground }]}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>{i18n.addTransaction.category}</Text>
          <View style={styles.catGrid}>
            {categories.map((cat: Category) => (
              <Pressable
                key={cat.id}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedCat(cat.id); }}
                style={[
                  styles.catItem,
                  { backgroundColor: colors.surface, borderColor: selectedCat === cat.id ? cat.color : colors.border },
                  selectedCat === cat.id && { borderWidth: 2 },
                ]}
              >
                <View style={[styles.catIconWrap, { backgroundColor: `${cat.color}22` }]}> 
                  <IconSymbol name={cat.icon as any} size={22} color={cat.color} />
                </View>
                <Text style={[styles.catName, { color: selectedCat === cat.id ? cat.color : colors.foreground }]}>{cat.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>{i18n.addTransaction.date}</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <IconSymbol name="calendar" size={18} color={colors.muted} />
            <TextInput
              style={[styles.textInput, { color: colors.foreground }]}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.muted}
              returnKeyType="done"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>{i18n.addTransaction.note}</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <IconSymbol name="note.text" size={18} color={colors.muted} />
            <TextInput
              style={[styles.textInput, { color: colors.foreground }]}
              value={note}
              onChangeText={setNote}
              placeholder={i18n.addTransaction.notePlaceholder}
              placeholderTextColor={colors.muted}
              returnKeyType="done"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>{i18n.addTransaction.latestRecords}</Text>
          {recentTransactions.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
              <Text style={[styles.emptyText, { color: colors.muted }]}>{i18n.addTransaction.emptyRecent}</Text>
            </View>
          ) : (
            recentTransactions.map((item) => {
              const category = getCategoryById(item.categoryId);
              const isIncome = item.type === 'income';
              return (
                <SwipeDeleteRow key={item.id} onDelete={() => deleteTransaction(item.id)}>
                  <View style={[styles.recentRow, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
                    <View style={[styles.recentIcon, { backgroundColor: `${category?.color ?? colors.muted}22` }]}> 
                      <IconSymbol name={(category?.icon as any) || 'more-horiz'} size={18} color={category?.color ?? colors.muted} />
                    </View>
                    <View style={styles.recentInfo}>
                      <Text style={[styles.recentTitle, { color: colors.foreground }]}>{category?.name ?? '-'}</Text>
                      <Text style={[styles.recentNote, { color: colors.muted }]} numberOfLines={1}>{item.note || '--'}</Text>
                    </View>
                    <Text style={[styles.recentAmount, { color: isIncome ? colors.success : colors.error }]}> 
                      {isIncome ? '+' : '-'}¥{formatAmount(item.amount)}
                    </Text>
                  </View>
                </SwipeDeleteRow>
              );
            })
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  saveBtn: {
    minWidth: 60,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  cameraRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  cameraBtn: {
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 14,
  },
  cameraBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  typeSwitch: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 14,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 16,
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
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 18,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  currencySymbol: {
    fontSize: 26,
    fontWeight: '700',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 34,
    fontWeight: '700',
    paddingVertical: 10,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  catItem: {
    width: '31%',
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  catIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  catName: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    gap: 10,
  },
  textInput: {
    flex: 1,
    height: 48,
    fontSize: 15,
  },
  emptyBox: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  recentRow: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  recentIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recentInfo: {
    flex: 1,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  recentNote: {
    fontSize: 12,
    marginTop: 2,
  },
  recentAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
});
