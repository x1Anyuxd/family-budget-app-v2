import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type {
  AppSettings,
  BillTransferPayload,
  Budget,
  InboxMessage,
  LocalUser,
  Transaction,
} from './types';
import { getMonthFromDate } from './types';

const STORAGE_KEY_TRANSACTIONS = '@budget_transactions';
const STORAGE_KEY_BUDGETS = '@budget_budgets';
const STORAGE_KEY_USERS = '@budget_users';
const STORAGE_KEY_CURRENT_USER = '@budget_current_user';
const STORAGE_KEY_INBOX = '@budget_inbox';
const STORAGE_KEY_SETTINGS = '@budget_settings';

const DEFAULT_SETTINGS: AppSettings = {
  locale: 'zh',
  notificationsEnabled: false,
  budgetAlertEnabled: true,
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface BudgetState {
  transactions: Transaction[];
  budgets: Budget[];
  users: LocalUser[];
  currentUserId: string | null;
  inbox: InboxMessage[];
  settings: AppSettings;
  isLoaded: boolean;
}

type BudgetAction =
  | {
      type: 'LOAD';
      transactions: Transaction[];
      budgets: Budget[];
      users: LocalUser[];
      currentUserId: string | null;
      inbox: InboxMessage[];
      settings: AppSettings;
    }
  | { type: 'ADD_TRANSACTION'; transaction: Transaction }
  | { type: 'DELETE_TRANSACTION'; id: string }
  | { type: 'SET_BUDGET'; budget: Budget }
  | { type: 'DELETE_BUDGET'; id: string }
  | { type: 'REGISTER_USER'; user: LocalUser; loginAfterRegister: boolean }
  | { type: 'LOGIN'; userId: string }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_PROFILE'; userId: string; patch: Partial<LocalUser> }
  | { type: 'UPDATE_SETTINGS'; patch: Partial<AppSettings> }
  | { type: 'ADD_MESSAGES'; messages: InboxMessage[] }
  | { type: 'MARK_MESSAGE_READ'; id: string }
  | { type: 'MERGE_IMPORTED_BILLS'; payload: BillTransferPayload };

function reducer(state: BudgetState, action: BudgetAction): BudgetState {
  switch (action.type) {
    case 'LOAD':
      return {
        ...state,
        transactions: action.transactions,
        budgets: action.budgets,
        users: action.users,
        currentUserId: action.currentUserId,
        inbox: action.inbox,
        settings: action.settings,
        isLoaded: true,
      };
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [action.transaction, ...state.transactions] };
    case 'DELETE_TRANSACTION':
      return { ...state, transactions: state.transactions.filter((t) => t.id !== action.id) };
    case 'SET_BUDGET': {
      const exists = state.budgets.findIndex((b) => b.id === action.budget.id);
      if (exists >= 0) {
        const updated = [...state.budgets];
        updated[exists] = action.budget;
        return { ...state, budgets: updated };
      }
      return { ...state, budgets: [...state.budgets, action.budget] };
    }
    case 'DELETE_BUDGET':
      return { ...state, budgets: state.budgets.filter((b) => b.id !== action.id) };
    case 'REGISTER_USER':
      return {
        ...state,
        users: [...state.users, action.user],
        currentUserId: action.loginAfterRegister ? action.user.id : state.currentUserId,
      };
    case 'LOGIN':
      return { ...state, currentUserId: action.userId };
    case 'LOGOUT':
      return { ...state, currentUserId: null };
    case 'UPDATE_PROFILE':
      return {
        ...state,
        users: state.users.map((user) =>
          user.id === action.userId
            ? {
                ...user,
                ...action.patch,
              }
            : user,
        ),
      };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'ADD_MESSAGES':
      return { ...state, inbox: [...action.messages, ...state.inbox] };
    case 'MARK_MESSAGE_READ':
      return {
        ...state,
        inbox: state.inbox.map((message) =>
          message.id === action.id ? { ...message, isRead: true } : message,
        ),
      };
    case 'MERGE_IMPORTED_BILLS': {
      const incomingTransactions = action.payload.transactions.filter(
        (item) => !state.transactions.some((existing) => existing.id === item.id),
      );
      const incomingBudgets = action.payload.budgets.filter(
        (item) => !state.budgets.some((existing) => existing.id === item.id),
      );
      return {
        ...state,
        transactions: [...incomingTransactions, ...state.transactions],
        budgets: [...incomingBudgets, ...state.budgets],
      };
    }
    default:
      return state;
  }
}

interface AuthResult {
  success: boolean;
  message: string;
}

interface RegisterInput {
  username: string;
  password: string;
  displayName?: string;
  isAdmin?: boolean;
}

interface LoginInput {
  username: string;
  password: string;
}

interface BudgetContextValue {
  state: BudgetState;
  currentUser: LocalUser | null;
  users: LocalUser[];
  settings: AppSettings;
  isAuthenticated: boolean;
  isAdmin: boolean;
  inboxMessages: InboxMessage[];
  addTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => void;
  setBudget: (budget: Budget) => void;
  deleteBudget: (id: string) => void;
  getMonthTransactions: (month: string, userId?: string) => Transaction[];
  getRecentTransactions: (limit?: number, userId?: string) => Transaction[];
  getMonthSummary: (month: string, userId?: string) => { income: number; expense: number; balance: number };
  getMonthBudgets: (month: string, userId?: string) => Budget[];
  login: (input: LoginInput) => Promise<AuthResult>;
  register: (input: RegisterInput) => Promise<AuthResult>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<LocalUser>) => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  publishAnnouncement: (content: string) => Promise<AuthResult>;
  markMessageRead: (id: string) => void;
  getExportPayload: () => BillTransferPayload;
  importBills: (payload: BillTransferPayload) => Promise<void>;
}

const BudgetContext = createContext<BudgetContextValue | null>(null);

async function requestNotificationPermission() {
  if (Platform.OS === 'web') return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.status === 'granted') return true;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.status === 'granted';
  } catch {
    return false;
  }
}

async function syncDailyReminder(enabled: boolean) {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!enabled) return;
    const granted = await requestNotificationPermission();
    if (!granted) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '家庭记账',
        body: '记得记录今天的收支情况。',
      },
      trigger: {
        hour: 20,
        minute: 0,
        repeats: true,
      } as any,
    });
  } catch (error) {
    console.error('Failed to sync daily reminder', error);
  }
}

async function pushInstantNotification(title: string, body: string) {
  if (Platform.OS === 'web') return;
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  } catch (error) {
    console.error('Failed to push local notification', error);
  }
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    transactions: [],
    budgets: [],
    users: [],
    currentUserId: null,
    inbox: [],
    settings: DEFAULT_SETTINGS,
    isLoaded: false,
  });

  useEffect(() => {
    (async () => {
      try {
        const [
          txRaw,
          bgRaw,
          usersRaw,
          currentUserRaw,
          inboxRaw,
          settingsRaw,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_TRANSACTIONS),
          AsyncStorage.getItem(STORAGE_KEY_BUDGETS),
          AsyncStorage.getItem(STORAGE_KEY_USERS),
          AsyncStorage.getItem(STORAGE_KEY_CURRENT_USER),
          AsyncStorage.getItem(STORAGE_KEY_INBOX),
          AsyncStorage.getItem(STORAGE_KEY_SETTINGS),
        ]);

        dispatch({
          type: 'LOAD',
          transactions: txRaw ? JSON.parse(txRaw) : [],
          budgets: bgRaw ? JSON.parse(bgRaw) : [],
          users: usersRaw ? JSON.parse(usersRaw) : [],
          currentUserId: currentUserRaw ?? null,
          inbox: inboxRaw ? JSON.parse(inboxRaw) : [],
          settings: settingsRaw ? { ...DEFAULT_SETTINGS, ...JSON.parse(settingsRaw) } : DEFAULT_SETTINGS,
        });
      } catch (error) {
        console.error('Failed to load local budget data', error);
        dispatch({
          type: 'LOAD',
          transactions: [],
          budgets: [],
          users: [],
          currentUserId: null,
          inbox: [],
          settings: DEFAULT_SETTINGS,
        });
      }
    })();
  }, []);

  useEffect(() => {
    if (!state.isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(state.transactions));
  }, [state.transactions, state.isLoaded]);

  useEffect(() => {
    if (!state.isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY_BUDGETS, JSON.stringify(state.budgets));
  }, [state.budgets, state.isLoaded]);

  useEffect(() => {
    if (!state.isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(state.users));
  }, [state.users, state.isLoaded]);

  useEffect(() => {
    if (!state.isLoaded) return;
    if (state.currentUserId) {
      AsyncStorage.setItem(STORAGE_KEY_CURRENT_USER, state.currentUserId);
    } else {
      AsyncStorage.removeItem(STORAGE_KEY_CURRENT_USER);
    }
  }, [state.currentUserId, state.isLoaded]);

  useEffect(() => {
    if (!state.isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY_INBOX, JSON.stringify(state.inbox));
  }, [state.inbox, state.isLoaded]);

  useEffect(() => {
    if (!state.isLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(state.settings));
  }, [state.settings, state.isLoaded]);

  useEffect(() => {
    if (!state.isLoaded) return;
    syncDailyReminder(state.settings.notificationsEnabled);
  }, [state.settings.notificationsEnabled, state.isLoaded]);

  const currentUser = useMemo(
    () => state.users.find((user) => user.id === state.currentUserId) ?? null,
    [state.currentUserId, state.users],
  );

  const resolveUserId = useCallback(
    (userId?: string) => userId ?? state.currentUserId ?? undefined,
    [state.currentUserId],
  );

  const getMonthTransactions = useCallback(
    (month: string, userId?: string) => {
      const targetUserId = resolveUserId(userId);
      return state.transactions
        .filter((item) => item.date.startsWith(month))
        .filter((item) => (targetUserId ? item.userId === targetUserId || !item.userId : true))
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    },
    [resolveUserId, state.transactions],
  );

  const getRecentTransactions = useCallback(
    (limit = 5, userId?: string) => {
      const targetUserId = resolveUserId(userId);
      return [...state.transactions]
        .filter((item) => (targetUserId ? item.userId === targetUserId || !item.userId : true))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit);
    },
    [resolveUserId, state.transactions],
  );

  const getMonthSummary = useCallback(
    (month: string, userId?: string) => {
      const list = getMonthTransactions(month, userId);
      const income = list.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
      const expense = list.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
      return { income, expense, balance: income - expense };
    },
    [getMonthTransactions],
  );

  const getMonthBudgets = useCallback(
    (month: string, userId?: string) => {
      const targetUserId = resolveUserId(userId);
      return state.budgets.filter((item) => item.month === month && (targetUserId ? item.userId === targetUserId || !item.userId : true));
    },
    [resolveUserId, state.budgets],
  );

  const addTransaction = useCallback(
    async (transaction: Transaction) => {
      const ownerId = currentUser?.id ?? transaction.userId;
      const ownerName = currentUser?.displayName ?? currentUser?.username ?? transaction.userName;
      const normalizedTransaction: Transaction = {
        ...transaction,
        userId: ownerId,
        userName: ownerName,
      };

      dispatch({ type: 'ADD_TRANSACTION', transaction: normalizedTransaction });

      if (
        normalizedTransaction.type === 'expense' &&
        ownerId &&
        state.settings.budgetAlertEnabled
      ) {
        const month = getMonthFromDate(normalizedTransaction.date);
        const targetBudget = state.budgets.find(
          (item) =>
            item.month === month &&
            item.categoryId === normalizedTransaction.categoryId &&
            (item.userId === ownerId || !item.userId),
        );

        if (targetBudget) {
          const spent = state.transactions
            .filter(
              (item) =>
                item.type === 'expense' &&
                item.categoryId === normalizedTransaction.categoryId &&
                getMonthFromDate(item.date) === month &&
                (item.userId === ownerId || !item.userId),
            )
            .reduce((sum, item) => sum + item.amount, 0) + normalizedTransaction.amount;

          if (spent > targetBudget.amount) {
            const alertMessage: InboxMessage = {
              id: makeId('msg'),
              title: '超预支提醒',
              content: `你在 ${month} 的该分类支出已超过预算，当前累计 ¥${spent.toFixed(2)}。`,
              createdAt: new Date().toISOString(),
              senderId: 'system',
              senderName: '系统',
              recipientId: ownerId,
              type: 'budget_alert',
              isRead: false,
            };
            dispatch({ type: 'ADD_MESSAGES', messages: [alertMessage] });
            if (state.settings.notificationsEnabled) {
              await pushInstantNotification(alertMessage.title, alertMessage.content);
            }
          }
        }
      }
    },
    [currentUser, state.budgets, state.settings.budgetAlertEnabled, state.settings.notificationsEnabled, state.transactions],
  );

  const deleteTransaction = useCallback((id: string) => {
    dispatch({ type: 'DELETE_TRANSACTION', id });
  }, []);

  const setBudget = useCallback(
    (budget: Budget) => {
      const normalizedBudget: Budget = {
        ...budget,
        userId: currentUser?.id ?? budget.userId,
      };
      dispatch({ type: 'SET_BUDGET', budget: normalizedBudget });
    },
    [currentUser],
  );

  const deleteBudget = useCallback((id: string) => {
    dispatch({ type: 'DELETE_BUDGET', id });
  }, []);

  const login = useCallback(async ({ username, password }: LoginInput) => {
    const matched = state.users.find((user) => user.username === username.trim());
    if (!matched || matched.password !== password) {
      return { success: false, message: '账号或密码错误' };
    }
    dispatch({ type: 'LOGIN', userId: matched.id });
    return { success: true, message: '登录成功' };
  }, [state.users]);

  const register = useCallback(async ({ username, password, displayName, isAdmin }: RegisterInput) => {
    const normalizedName = username.trim();
    if (!normalizedName || !password.trim()) {
      return { success: false, message: '账号和密码不能为空' };
    }
    if (state.users.some((user) => user.username === normalizedName)) {
      return { success: false, message: '该账号已存在' };
    }

    const newUser: LocalUser = {
      id: makeId('user'),
      username: normalizedName,
      password,
      displayName: displayName?.trim() || normalizedName,
      avatarUri: '',
      gender: undefined,
      phone: '',
      birthday: '',
      isAdmin: Boolean(isAdmin),
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: 'REGISTER_USER', user: newUser, loginAfterRegister: true });
    return { success: true, message: '注册成功' };
  }, [state.users]);

  const logout = useCallback(async () => {
    dispatch({ type: 'LOGOUT' });
  }, []);

  const updateProfile = useCallback(async (patch: Partial<LocalUser>) => {
    if (!currentUser) return;
    dispatch({ type: 'UPDATE_PROFILE', userId: currentUser.id, patch });
  }, [currentUser]);

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', patch });
    if (patch.notificationsEnabled) {
      await requestNotificationPermission();
    }
  }, []);

  const publishAnnouncement = useCallback(async (content: string) => {
    if (!currentUser || !currentUser.isAdmin) {
      return { success: false, message: '仅管理员可使用该功能' };
    }

    const trimmed = content.trim();
    if (!trimmed) {
      return { success: false, message: '公告内容不能为空' };
    }

    const recipients = state.users.length > 0 ? state.users : [currentUser];
    const messages: InboxMessage[] = recipients.map((user) => ({
      id: makeId('msg'),
      title: '家庭公告',
      content: trimmed,
      createdAt: new Date().toISOString(),
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      recipientId: user.id,
      type: 'announcement',
      isRead: user.id === currentUser.id,
    }));

    dispatch({ type: 'ADD_MESSAGES', messages });

    if (state.settings.notificationsEnabled) {
      await pushInstantNotification('家庭公告', trimmed);
    }

    return { success: true, message: '公告已发送到所有成员收信箱' };
  }, [currentUser, state.settings.notificationsEnabled, state.users]);

  const markMessageRead = useCallback((id: string) => {
    dispatch({ type: 'MARK_MESSAGE_READ', id });
  }, []);

  const getExportPayload = useCallback((): BillTransferPayload => {
    const targetUserId = state.currentUserId;
    return {
      exportedAt: new Date().toISOString(),
      exportedBy: currentUser?.displayName,
      transactions: state.transactions.filter((item) => (targetUserId ? item.userId === targetUserId || !item.userId : true)),
      budgets: state.budgets.filter((item) => (targetUserId ? item.userId === targetUserId || !item.userId : true)),
    };
  }, [currentUser?.displayName, state.budgets, state.currentUserId, state.transactions]);

  const importBills = useCallback(async (payload: BillTransferPayload) => {
    dispatch({ type: 'MERGE_IMPORTED_BILLS', payload });
  }, []);

  const inboxMessages = useMemo(
    () =>
      state.inbox
        .filter((item) => (state.currentUserId ? item.recipientId === state.currentUserId : false))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.currentUserId, state.inbox],
  );

  const value = useMemo<BudgetContextValue>(
    () => ({
      state,
      currentUser,
      users: state.users,
      settings: state.settings,
      isAuthenticated: Boolean(currentUser),
      isAdmin: Boolean(currentUser?.isAdmin),
      inboxMessages,
      addTransaction,
      deleteTransaction,
      setBudget,
      deleteBudget,
      getMonthTransactions,
      getRecentTransactions,
      getMonthSummary,
      getMonthBudgets,
      login,
      register,
      logout,
      updateProfile,
      updateSettings,
      publishAnnouncement,
      markMessageRead,
      getExportPayload,
      importBills,
    }),
    [
      state,
      currentUser,
      inboxMessages,
      addTransaction,
      deleteTransaction,
      setBudget,
      deleteBudget,
      getMonthTransactions,
      getRecentTransactions,
      getMonthSummary,
      getMonthBudgets,
      login,
      register,
      logout,
      updateProfile,
      updateSettings,
      publishAnnouncement,
      markMessageRead,
      getExportPayload,
      importBills,
    ],
  );

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget() {
  const context = useContext(BudgetContext);
  if (!context) throw new Error('useBudget must be used within BudgetProvider');
  return context;
}
