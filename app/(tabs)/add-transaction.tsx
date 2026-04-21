import React, { useState, useCallback } from 'react';
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
import {
  TransactionType, EXPENSE_CATEGORIES, INCOME_CATEGORIES, Category, formatAmount, getCategoryById,
} from '@/lib/types';
import { takePhoto, pickImageFromLibrary, ensureBase64, base64ToDataUrl } from '@/lib/camera-service';
import { trpc } from '@/lib/trpc';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AddTransactionScreen() {
  const colors = useColors();
  const router = useRouter();
  const { addTransaction, deleteTransaction, getRecentTransactions, settings } = useBudget();

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
    if (!amount || isNaN(num) || num <= 0) {
      Alert.alert('請輸入有效金額');
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
  }, [amount, type, selectedCat, date, note, addTransaction, router]);

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
        Alert.alert('錯誤', '無法讀取圖片');
        setIsAnalyzing(false);
        return;
      }

      // 調用後端 API 識別賬單
      const result = await analyzeReceiptMutation.mutateAsync({
        imageBase64: photoWithBase64.base64,
        mimeType: photoWithBase64.mimeType,
      });

      setIsAnalyzing(false);

      if (!result.success) {
        Alert.alert('識別失敗', result.error || '無法識別賬單');
        return;
      }

      // 導向結果頁面
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
      Alert.alert('錯誤', error instanceof Error ? error.message : '發生未知錯誤');
    }
  }, [analyzeReceiptMutation, router]);

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
        Alert.alert('錯誤', '無法讀取圖片');
        setIsAnalyzing(false);
        return;
      }

      const result = await analyzeReceiptMutation.mutateAsync({
        imageBase64: photoWithBase64.base64,
        mimeType: photoWithBase64.mimeType,
      });

      setIsAnalyzing(false);

      if (!result.success) {
        Alert.alert('識別失敗', result.error || '無法識別賬單');
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
      Alert.alert('錯誤', error instanceof Error ? error.message : '發生未知錯誤');
    }
  }, [analyzeReceiptMutation, router]);

  if (isAnalyzing) {
    return (
      <ScreenContainer containerClassName="bg-background">
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>正在識別賬單...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
          <IconSymbol name="xmark" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>新增記帳</Text>
        <Pressable onPress={handleSave} style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}>
          <Text style={styles.saveBtnText}>儲存</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Camera Buttons */}
        <View style={styles.cameraRow}>
          <Pressable
            onPress={handleTakePhoto}
            style={({ pressed }) => [styles.cameraBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
          >
            <IconSymbol name="camera" size={20} color="#fff" />
            <Text style={styles.cameraBtnText}>拍照</Text>
          </Pressable>
          <Pressable
            onPress={handlePickImage}
            style={({ pressed }) => [styles.cameraBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
          >
            <IconSymbol name="photo" size={20} color="#fff" />
            <Text style={styles.cameraBtnText}>相冊</Text>
          </Pressable>
        </View>

        {/* Type Switch */}
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
                {t === 'expense' ? '支出' : '收入'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Amount Input */}
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

        {/* Category Grid */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>分類</Text>
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
                <View style={[styles.catIconWrap, { backgroundColor: cat.color + '22' }]}>
                  <IconSymbol name={cat.icon as any} size={22} color={cat.color} />
                </View>
                <Text style={[styles.catName, { color: selectedCat === cat.id ? cat.color : colors.foreground }]}>
                  {cat.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>日期</Text>
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

        {/* Note */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>備註</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="note.text" size={18} color={colors.muted} />
            <TextInput
              style={[styles.textInput, { color: colors.foreground }]}
              value={note}
              onChangeText={setNote}
              placeholder="新增備註（選填）"
              placeholderTextColor={colors.muted}
              returnKeyType="done"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>{settings.locale === 'en' ? 'RECENT RECORDS' : '最近记录'}</Text>
          {recentTransactions.length === 0 ? (
            <View style={[styles.recentEmpty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={{ color: colors.muted, fontSize: 13 }}>{settings.locale === 'en' ? 'No recent records' : '暂无最近记录'}</Text>
            </View>
          ) : (
            <View style={[styles.recentList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {recentTransactions.map((item, index) => {
                const category = getCategoryById(item.categoryId);
                const isIncome = item.type === 'income';
                return (
                  <SwipeDeleteRow key={item.id} onDelete={() => deleteTransaction(item.id)}>
                    <View style={[styles.recentRow, { borderBottomColor: colors.border }, index === recentTransactions.length - 1 && { borderBottomWidth: 0 }]}>
                      <View style={[styles.catIconWrap, { backgroundColor: `${category?.color ?? colors.muted}22` }]}>
                        <IconSymbol name={(category?.icon as any) || 'more-horiz'} size={20} color={category?.color ?? colors.muted} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '600' }}>{category?.name ?? '其他'}</Text>
                        <Text style={{ color: colors.muted, fontSize: 12 }}>{item.note || item.date}</Text>
                      </View>
                      <Text style={{ color: isIncome ? colors.success : colors.error, fontSize: 14, fontWeight: '700' }}>
                        {isIncome ? '+' : '-'}¥{formatAmount(item.amount)}
                      </Text>
                    </View>
                  </SwipeDeleteRow>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600' },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontSize: 16 },
  cameraRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
  },
  cameraBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  cameraBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  typeSwitch: {
    flexDirection: 'row',
    margin: 20,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 4,
    gap: 4,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  typeBtnText: { fontSize: 15, fontWeight: '600' },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  currencySymbol: { fontSize: 28, fontWeight: '300', marginRight: 4 },
  amountInput: { flex: 1, fontSize: 40, fontWeight: '300' },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '500', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  catItem: {
    width: '18%',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  catIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  textInput: { flex: 1, fontSize: 15 },
  recentEmpty: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  recentList: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
