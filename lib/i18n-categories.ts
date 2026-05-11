import type { AppLocale } from './types';

export const categoryTranslations: Record<AppLocale, Record<string, string>> = {
  zh: {
    food: '餐饮',
    transport: '交通',
    shopping: '购物',
    housing: '住房',
    entertain: '娱乐',
    medical: '医疗',
    education: '教育',
    utilities: '水电',
    clothing: '服饰',
    other_exp: '其他',
    salary: '薪资',
    investment: '投资',
    bonus: '奖金',
    other_inc: '其他',
  },
  en: {
    food: 'Food',
    transport: 'Transport',
    shopping: 'Shopping',
    housing: 'Housing',
    entertain: 'Entertainment',
    medical: 'Medical',
    education: 'Education',
    utilities: 'Utilities',
    clothing: 'Clothing',
    other_exp: 'Other',
    salary: 'Salary',
    investment: 'Investment',
    bonus: 'Bonus',
    other_inc: 'Other',
  },
};

export const themeTranslations: Record<AppLocale, Record<string, string>> = {
  zh: {
    default: '绿色',
    blue: '蓝色',
    purple: '紫色',
    orange: '橙色',
    pink: '粉色',
    teal: '青色',
  },
  en: {
    default: 'Green',
    blue: 'Blue',
    purple: 'Purple',
    orange: 'Orange',
    pink: 'Pink',
    teal: 'Teal',
  },
};

export function getCategoryName(categoryId: string, locale: AppLocale = 'zh'): string {
  return categoryTranslations[locale][categoryId] || categoryId;
}

export function getThemeName(themeName: string, locale: AppLocale = 'zh'): string {
  return themeTranslations[locale][themeName] || themeName;
}
