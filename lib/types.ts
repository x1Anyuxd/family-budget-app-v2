export type TransactionType = 'income' | 'expense';
export type AppLocale = 'zh' | 'en';
export type Gender = 'male' | 'female' | 'other';

export interface Category {
  id: string;
  name: string;
  icon: string;
  type: TransactionType;
  color: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  date: string; // ISO date string YYYY-MM-DD
  note: string;
  createdAt: string;
  userId?: string;
  userName?: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  limit: number;
  month: string; // YYYY-MM
  userId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LocalUser {
  id: string;
  username: string;
  password: string;
  displayName: string;
  avatarUri?: string;
  gender?: Gender;
  phone?: string;
  birthday?: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface InboxMessage {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  type: 'announcement' | 'budget_alert' | 'system';
  isRead: boolean;
}

export interface AppSettings {
  locale: AppLocale;
  notificationsEnabled: boolean;
  budgetAlertEnabled: boolean;
}

export interface BillTransferPayload {
  exportedAt: string;
  exportedBy?: string;
  transactions: Transaction[];
  budgets: Budget[];
}

export const EXPENSE_CATEGORIES: Category[] = [
  { id: 'food', name: 'food', icon: 'restaurant', type: 'expense', color: '#FF6B6B' },
  { id: 'transport', name: 'transport', icon: 'directions-car', type: 'expense', color: '#4ECDC4' },
  { id: 'shopping', name: 'shopping', icon: 'shopping-bag', type: 'expense', color: '#45B7D1' },
  { id: 'housing', name: 'housing', icon: 'home', type: 'expense', color: '#96CEB4' },
  { id: 'entertain', name: 'entertain', icon: 'movie', type: 'expense', color: '#FFEAA7' },
  { id: 'medical', name: 'medical', icon: 'local-hospital', type: 'expense', color: '#DDA0DD' },
  { id: 'education', name: 'education', icon: 'school', type: 'expense', color: '#98D8C8' },
  { id: 'utilities', name: 'utilities', icon: 'bolt', type: 'expense', color: '#F7DC6F' },
  { id: 'clothing', name: 'clothing', icon: 'checkroom', type: 'expense', color: '#F1948A' },
  { id: 'other_exp', name: 'other_exp', icon: 'more-horiz', type: 'expense', color: '#AED6F1' },
];

export const INCOME_CATEGORIES: Category[] = [
  { id: 'salary', name: 'salary', icon: 'work', type: 'income', color: '#4CAF82' },
  { id: 'investment', name: 'investment', icon: 'trending-up', type: 'income', color: '#5DC994' },
  { id: 'bonus', name: 'bonus', icon: 'card-giftcard', type: 'income', color: '#81C784' },
  { id: 'other_inc', name: 'other_inc', icon: 'attach-money', type: 'income', color: '#A5D6A7' },
];

export const ALL_CATEGORIES: Category[] = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export function getCategoryById(id: string): Category | undefined {
  return ALL_CATEGORIES.find((c) => c.id === id);
}

export function formatAmount(amount: number): string {
  return amount.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-');
  return `${y}年${parseInt(m, 10)}月`;
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthFromDate(dateStr: string): string {
  return dateStr.substring(0, 7);
}
