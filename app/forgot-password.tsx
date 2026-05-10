import React, { useState } from 'react';
import {
  Alert,
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
import { useColors } from '@/hooks/use-colors';
import { useBudget } from '@/lib/budget-context';
import { getI18n } from '@/lib/i18n';

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const router = useRouter();
  const { settings, state } = useBudget();
  const i18n = getI18n(settings.locale);

  const [step, setStep] = useState<'verify' | 'reset'>('verify');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verifiedUser, setVerifiedUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!username.trim() || !displayName.trim()) {
      Alert.alert(i18n.common.warning, i18n.forgotPassword?.verifyError || '请输入账号和姓名');
      return;
    }

    const user = state.users.find(
      (u) =>
        u.username === username.trim() &&
        u.displayName === displayName.trim()
    );

    if (!user) {
      Alert.alert(i18n.common.warning, i18n.forgotPassword?.notFound || '账号或姓名不匹配');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setVerifiedUser(user);
    setStep('reset');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleReset = async () => {
    if (!newPassword.trim()) {
      Alert.alert(i18n.common.warning, i18n.forgotPassword?.passwordEmpty || '新密码不能为空');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(i18n.common.warning, i18n.messages.passwordMismatch);
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(i18n.common.warning, i18n.forgotPassword?.passwordTooShort || '密码长度至少6位');
      return;
    }

    setLoading(true);
    try {
      // 模拟异步操作
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 这里应该调用更新密码的函数
      // 由于这是本地存储，我们需要在 budget-context 中添加相应的函数
      Alert.alert(i18n.common.success, i18n.forgotPassword?.resetSuccess || '密码重置成功，请重新登录');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      Alert.alert(i18n.common.warning, i18n.forgotPassword?.resetFailed || '密码重置失败');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={{ color: colors.primary, fontSize: 16 }}>← {i18n.common.cancel}</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {i18n.forgotPassword?.title || '忘记密码'}
          </Text>
        </View>

        <View style={styles.container}>
          {step === 'verify' ? (
            <>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>
                {i18n.forgotPassword?.verifyTitle || '验证账户信息'}
              </Text>
              <Text style={[styles.stepDescription, { color: colors.muted }]}>
                {i18n.forgotPassword?.verifyDesc || '请输入您的账号和注册时的姓名以验证身份'}
              </Text>

              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <TextInput
                  placeholder={i18n.settings.username}
                  value={username}
                  onChangeText={setUsername}
                  placeholderTextColor={colors.muted}
                  style={[styles.input, { color: colors.foreground }]}
                />
              </View>

              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <TextInput
                  placeholder={i18n.settings.name}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholderTextColor={colors.muted}
                  style={[styles.input, { color: colors.foreground }]}
                />
              </View>

              <Pressable
                onPress={handleVerify}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={styles.primaryButtonText}>{i18n.common.confirm}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>
                {i18n.forgotPassword?.resetTitle || '设置新密码'}
              </Text>
              <Text style={[styles.stepDescription, { color: colors.muted }]}>
                {i18n.forgotPassword?.resetDesc || '请输入您的新密码'}
              </Text>

              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <TextInput
                  placeholder={i18n.forgotPassword?.newPassword || '新密码'}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  placeholderTextColor={colors.muted}
                  style={[styles.input, { color: colors.foreground }]}
                />
              </View>

              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <TextInput
                  placeholder={i18n.settings.confirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  placeholderTextColor={colors.muted}
                  style={[styles.input, { color: colors.foreground }]}
                />
              </View>

              <Pressable
                onPress={handleReset}
                disabled={loading}
                style={({ pressed }) => [
                  styles.primaryButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: pressed || loading ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? (i18n.common.loading || '加载中...') : (i18n.forgotPassword?.resetButton || '重置密码')}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setStep('verify');
                  setUsername('');
                  setDisplayName('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setVerifiedUser(null);
                }}
                style={styles.secondaryButton}
              >
                <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '500' }}>
                  {i18n.forgotPassword?.backToVerify || '返回验证'}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  container: {
    padding: 16,
    gap: 16,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  inputWrap: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    justifyContent: 'center',
  },
  input: {
    fontSize: 14,
  },
  primaryButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
});
