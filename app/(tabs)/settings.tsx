import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useBudget } from '@/lib/budget-context';
import { getI18n } from '@/lib/i18n';
import { pickImageFromLibrary } from '@/lib/camera-service';
import { useThemeContext } from '@/lib/theme-provider';
import { THEME_LABELS, THEME_NAMES } from '@/lib/themes';
import type { Gender } from '@/lib/types';

export default function SettingsScreen() {
  const colors = useColors();
  const {
    currentUser,
    settings,
    inboxMessages,
    login,
    register,
    logout,
    updateProfile,
    updateSettings,
    markMessageRead,
    deleteAnnouncementGroup,
  } = useBudget();
  const { currentTheme, setCurrentTheme } = useThemeContext();
  const i18n = getI18n(settings.locale);

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerIsAdmin, setRegisterIsAdmin] = useState(false);

  const [profileExpanded, setProfileExpanded] = useState(false);
  const [profileName, setProfileName] = useState(currentUser?.displayName ?? '');
  const [gender, setGender] = useState<Gender | undefined>(currentUser?.gender);
  const [phone, setPhone] = useState(currentUser?.phone ?? '');
  const [birthday, setBirthday] = useState(currentUser?.birthday ?? '');

  React.useEffect(() => {
    setProfileName(currentUser?.displayName ?? '');
    setGender(currentUser?.gender);
    setPhone(currentUser?.phone ?? '');
    setBirthday(currentUser?.birthday ?? '');
    setProfileExpanded(false);
  }, [currentUser]);

  const unreadCount = useMemo(
    () => inboxMessages.filter((item) => !item.isRead).length,
    [inboxMessages],
  );

  const profileSummary = useMemo(() => {
    if (!currentUser) return i18n.settings.noProfile;
    const segments = [
      currentUser.displayName || currentUser.username,
      currentUser.gender
        ? currentUser.gender === 'male'
          ? i18n.settings.male
          : currentUser.gender === 'female'
            ? i18n.settings.female
            : i18n.settings.other
        : '',
      currentUser.phone || '',
      currentUser.birthday || '',
    ].filter(Boolean);
    return segments.length > 0 ? segments.join(' · ') : i18n.settings.noProfile;
  }, [currentUser, i18n.settings]);

  const handleAuth = async () => {
    if (authMode === 'login') {
      const result = await login({ username, password });
      Alert.alert(result.success ? i18n.common.success : i18n.common.warning, result.message);
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPassword('');
      }
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(i18n.common.warning, i18n.messages.passwordMismatch);
      return;
    }

    const result = await register({
      username,
      password,
      displayName: registerName,
      isAdmin: registerIsAdmin,
    });
    Alert.alert(result.success ? i18n.common.success : i18n.common.warning, result.message);
    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setConfirmPassword('');
      setRegisterName('');
      setRegisterIsAdmin(false);
    }
  };

  const handlePickAvatar = async () => {
    const image = await pickImageFromLibrary();
    if (!image) return;
    await updateProfile({ avatarUri: image.uri });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSaveProfile = async () => {
    await updateProfile({
      displayName: profileName.trim() || currentUser?.username || profileName,
      gender,
      phone,
      birthday,
    });
    setProfileExpanded(false);
    Alert.alert(i18n.common.success, i18n.messages.profileSaved);
  };

  const handleDeleteAnnouncement = (messageId: string) => {
    const target = inboxMessages.find((item) => item.id === messageId);
    if (!target) return;
    deleteAnnouncementGroup(target);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={[styles.header, { borderBottomColor: colors.border }]}> 
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{i18n.settings.title}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{i18n.settings.login}</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            {currentUser ? (
              <>
                <View style={styles.rowBetween}>
                  <View>
                    <Text style={[styles.itemTitle, { color: colors.foreground }]}>{i18n.settings.loggedInAs}</Text>
                    <Text style={[styles.itemSubtitle, { color: colors.muted }]}>
                      {currentUser.displayName} · {currentUser.username}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: currentUser.isAdmin ? colors.primary : colors.background }]}> 
                    <Text style={{ color: currentUser.isAdmin ? '#fff' : colors.foreground, fontSize: 12, fontWeight: '600' }}>
                      {currentUser.isAdmin ? i18n.settings.roleAdmin : i18n.settings.roleMember}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={logout}
                  style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.error, opacity: pressed ? 0.85 : 1 }]}
                >
                  <Text style={styles.primaryButtonText}>{i18n.settings.logout}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.segmentRow}>
                  {(['login', 'register'] as const).map((mode) => {
                    const active = authMode === mode;
                    return (
                      <Pressable
                        key={mode}
                        onPress={() => setAuthMode(mode)}
                        style={[
                          styles.segmentButton,
                          { backgroundColor: active ? colors.primary : colors.background },
                        ]}
                      >
                        <Text style={{ color: active ? '#fff' : colors.foreground, fontWeight: '600' }}>
                          {mode === 'login' ? i18n.settings.login : i18n.settings.register}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={[styles.hint, { color: colors.muted }]}>
                  {authMode === 'login' ? i18n.settings.loginHint : i18n.settings.registerHint}
                </Text>
                <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}> 
                  <TextInput
                    value={username}
                    onChangeText={setUsername}
                    placeholder={i18n.settings.username}
                    placeholderTextColor={colors.muted}
                    style={[styles.input, { color: colors.foreground }]}
                  />
                </View>
                {authMode === 'register' && (
                  <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}> 
                    <TextInput
                      value={registerName}
                      onChangeText={setRegisterName}
                      placeholder={i18n.settings.name}
                      placeholderTextColor={colors.muted}
                      style={[styles.input, { color: colors.foreground }]}
                    />
                  </View>
                )}
                <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}> 
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder={i18n.settings.password}
                    placeholderTextColor={colors.muted}
                    secureTextEntry
                    style={[styles.input, { color: colors.foreground }]}
                  />
                </View>
                {authMode === 'register' && (
                  <>
                    <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}> 
                      <TextInput
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder={i18n.settings.confirmPassword}
                        placeholderTextColor={colors.muted}
                        secureTextEntry
                        style={[styles.input, { color: colors.foreground }]}
                      />
                    </View>
                    <Pressable
                      onPress={() => setRegisterIsAdmin((prev) => !prev)}
                      style={[styles.toggleRow, { borderColor: colors.border, backgroundColor: colors.background }]}
                    >
                      <Text style={[styles.itemTitle, { color: colors.foreground }]}>{i18n.settings.adminOption}</Text>
                      <View style={[styles.checkbox, { borderColor: colors.primary, backgroundColor: registerIsAdmin ? colors.primary : 'transparent' }]}> 
                        {registerIsAdmin ? <IconSymbol name="checkmark" size={14} color="#fff" /> : null}
                      </View>
                    </Pressable>
                  </>
                )}
                <Pressable
                  onPress={handleAuth}
                  style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
                >
                  <Text style={styles.primaryButtonText}>
                    {authMode === 'login' ? i18n.settings.login : i18n.settings.register}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{i18n.settings.profile}</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <View style={styles.rowBetween}>
              <View style={styles.profileSummaryWrap}>
                {currentUser?.avatarUri ? (
                  <Image source={{ uri: currentUser.avatarUri }} style={styles.summaryAvatar} />
                ) : (
                  <View style={[styles.summaryAvatar, { backgroundColor: colors.background, borderColor: colors.border }]}> 
                    <IconSymbol name="person.crop.circle" size={34} color={colors.primary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.foreground }]}>{i18n.settings.profileSummary}</Text>
                  <Text style={[styles.itemSubtitle, { color: colors.muted }]}>{profileSummary}</Text>
                </View>
              </View>
              <Pressable
                onPress={() => setProfileExpanded((prev) => !prev)}
                style={[styles.miniActionBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
              >
                <Text style={[styles.miniActionText, { color: colors.foreground }]}>
                  {profileExpanded ? i18n.settings.hideProfile : i18n.settings.editProfile}
                </Text>
              </Pressable>
            </View>

            {profileExpanded ? (
              <>
                <Pressable onPress={handlePickAvatar} style={styles.avatarRow}>
                  <Text style={[styles.itemTitle, { color: colors.foreground }]}>{i18n.settings.avatar}</Text>
                  <Text style={[styles.itemSubtitle, { color: colors.muted }]}>{i18n.settings.chooseAvatar}</Text>
                </Pressable>

                <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}> 
                  <TextInput
                    value={profileName}
                    onChangeText={setProfileName}
                    placeholder={i18n.settings.name}
                    placeholderTextColor={colors.muted}
                    editable={Boolean(currentUser)}
                    style={[styles.input, { color: colors.foreground }]}
                  />
                </View>
                <View style={styles.genderRow}>
                  {([
                    ['male', i18n.settings.male],
                    ['female', i18n.settings.female],
                    ['other', i18n.settings.other],
                  ] as const).map(([value, label]) => {
                    const active = gender === value;
                    return (
                      <Pressable
                        key={value}
                        onPress={() => currentUser && setGender(value as Gender)}
                        style={[
                          styles.genderBtn,
                          { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : colors.surface },
                        ]}
                      >
                        <Text style={{ color: active ? '#fff' : colors.foreground, fontWeight: '600' }}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}> 
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder={i18n.settings.phone}
                    placeholderTextColor={colors.muted}
                    editable={Boolean(currentUser)}
                    keyboardType="phone-pad"
                    style={[styles.input, { color: colors.foreground }]}
                  />
                </View>
                <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}> 
                  <TextInput
                    value={birthday}
                    onChangeText={setBirthday}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.muted}
                    editable={Boolean(currentUser)}
                    style={[styles.input, { color: colors.foreground }]}
                  />
                </View>
                <Pressable
                  onPress={() => {
                    if (!currentUser) {
                      Alert.alert(i18n.common.warning, i18n.messages.needLogin);
                      return;
                    }
                    handleSaveProfile();
                  }}
                  style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
                >
                  <Text style={styles.primaryButtonText}>{i18n.settings.saveProfile}</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{i18n.settings.notifications}</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemTitle, { color: colors.foreground }]}>{i18n.settings.enableNotifications}</Text>
                <Text style={[styles.itemSubtitle, { color: colors.muted }]}>{i18n.settings.permissionNotice}</Text>
              </View>
              <Switch
                value={settings.notificationsEnabled}
                onValueChange={(value) => updateSettings({ notificationsEnabled: value })}
                trackColor={{ true: colors.primary }}
              />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemTitle, { color: colors.foreground }]}>{i18n.settings.budgetAlert}</Text>
                <Text style={[styles.itemSubtitle, { color: colors.muted }]}>{i18n.settings.budgetAlertDesc}</Text>
              </View>
              <Switch
                value={settings.budgetAlertEnabled}
                onValueChange={(value) => updateSettings({ budgetAlertEnabled: value })}
                trackColor={{ true: colors.primary }}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{i18n.settings.language}</Text>
          <View style={[styles.optionRow, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            {([
              ['zh', '中文'],
              ['en', 'English'],
            ] as const).map(([locale, label]) => {
              const active = settings.locale === locale;
              return (
                <Pressable
                  key={locale}
                  onPress={() => updateSettings({ locale })}
                  style={[
                    styles.optionButton,
                    { backgroundColor: active ? colors.primary : colors.background },
                  ]}
                >
                  <Text style={{ color: active ? '#fff' : colors.foreground, fontWeight: '600' }}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{i18n.settings.theme}</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <View style={styles.themeGrid}>
              {THEME_NAMES.map((themeName) => {
                const active = currentTheme === themeName;
                return (
                  <Pressable
                    key={themeName}
                    onPress={() => setCurrentTheme(themeName)}
                    style={[
                      styles.themeItem,
                      { borderColor: active ? colors.primary : colors.border, backgroundColor: colors.background },
                    ]}
                  >
                    <View style={[styles.colorDot, { backgroundColor: themeName === 'default' ? '#4CAF82' : themeName === 'blue' ? '#3B82F6' : themeName === 'purple' ? '#8B5CF6' : themeName === 'orange' ? '#F97316' : themeName === 'pink' ? '#EC4899' : '#14B8A6' }]} />
                    <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 12 }}>{THEME_LABELS[themeName]}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{i18n.settings.inbox}</Text>
            <View style={[styles.badge, { backgroundColor: unreadCount > 0 ? colors.primary : colors.background }]}> 
              <Text style={{ color: unreadCount > 0 ? '#fff' : colors.foreground, fontWeight: '600', fontSize: 12 }}>{unreadCount}</Text>
            </View>
          </View>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            {inboxMessages.length === 0 ? (
              <Text style={[styles.itemSubtitle, { color: colors.muted }]}>{i18n.settings.noMessages}</Text>
            ) : (
              inboxMessages.map((message) => {
                const canDeleteAnnouncement = Boolean(
                  currentUser?.isAdmin &&
                  message.type === 'announcement' &&
                  message.senderId === currentUser?.id,
                );

                return (
                  <View
                    key={message.id}
                    style={[styles.mailItem, { borderColor: colors.border, backgroundColor: message.isRead ? colors.surface : colors.background }]}
                  >
                    <View style={styles.rowBetween}>
                      <Pressable onPress={() => markMessageRead(message.id)} style={styles.mailContentPressable}>
                        <Text style={[styles.itemTitle, { color: colors.foreground, flex: 1 }]}>{message.title}</Text>
                        <Text style={[styles.itemSubtitle, { color: colors.foreground, marginTop: 6 }]}>{message.content}</Text>
                        <Text style={[styles.mailMeta, { color: colors.muted }]}>{new Date(message.createdAt).toLocaleString()}</Text>
                      </Pressable>
                      <View style={styles.mailActions}>
                        {!message.isRead && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
                        {canDeleteAnnouncement ? (
                          <Pressable
                            onPress={() => handleDeleteAnnouncement(message.id)}
                            style={[styles.deleteChip, { backgroundColor: `${colors.error}18` }]}
                          >
                            <IconSymbol name="trash" size={12} color={colors.error} />
                            <Text style={[styles.deleteChipText, { color: colors.error }]}>{i18n.settings.deleteAnnouncement}</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{i18n.settings.about}</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <Text style={[styles.itemTitle, { color: colors.foreground }]}>{i18n.settings.version}</Text>
            <Text style={[styles.itemSubtitle, { color: colors.muted }]}>EXD毕业设计</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
  inputWrap: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 2,
  },
  input: {
    height: 44,
    fontSize: 15,
  },
  primaryButton: {
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
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  itemSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  badge: {
    minWidth: 48,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  toggleRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSummaryWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  miniActionBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  miniActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  avatarRow: {
    paddingVertical: 6,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  optionRow: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
  },
  optionButton: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  themeItem: {
    width: '31%',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  mailItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  mailContentPressable: {
    flex: 1,
  },
  mailActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  deleteChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  mailMeta: {
    marginTop: 8,
    fontSize: 12,
  },
});
