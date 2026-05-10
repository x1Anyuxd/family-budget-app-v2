import type { Transaction, Budget } from './types';

/**
 * 数据分析模块
 * 提供预测分析、趋势分析等高级功能
 */

export interface TrendAnalysis {
  month: string;
  income: number;
  expense: number;
  balance: number;
  trend: 'up' | 'down' | 'stable';
}

export interface CategoryTrend {
  category: string;
  values: number[];
  average: number;
  trend: 'up' | 'down' | 'stable';
  forecast: number;
}

export interface PredictionResult {
  predictedIncome: number;
  predictedExpense: number;
  predictedBalance: number;
  confidence: number; // 0-1
}

export interface BudgetAnalysis {
  categoryId: string;
  spent: number;
  budgeted: number;
  remaining: number;
  percentUsed: number;
  trend: 'safe' | 'warning' | 'danger';
}

class DataAnalyticsEngine {
  /**
   * 计算月度趋势
   */
  calculateMonthlyTrends(transactions: Transaction[]): TrendAnalysis[] {
    const monthMap = new Map<string, { income: number; expense: number }>();

    transactions.forEach((tx) => {
      const date = new Date(tx.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { income: 0, expense: 0 });
      }

      const month = monthMap.get(monthKey)!;
      if (tx.type === 'income') {
        month.income += tx.amount;
      } else {
        month.expense += tx.amount;
      }
    });

    const trends: TrendAnalysis[] = [];
    const sortedMonths = Array.from(monthMap.keys()).sort();

    sortedMonths.forEach((month, index) => {
      const data = monthMap.get(month)!;
      const balance = data.income - data.expense;

      // 计算趋势
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (index > 0) {
        const prevMonth = monthMap.get(sortedMonths[index - 1])!;
        const prevBalance = prevMonth.income - prevMonth.expense;
        if (balance > prevBalance * 1.1) {
          trend = 'up';
        } else if (balance < prevBalance * 0.9) {
          trend = 'down';
        }
      }

      trends.push({
        month,
        income: data.income,
        expense: data.expense,
        balance,
        trend,
      });
    });

    return trends;
  }

  /**
   * 分析分类消费趋势
   */
  analyzeCategoryTrends(
    transactions: Transaction[],
    categoryId: string,
    months: number = 6
  ): CategoryTrend {
    const monthlyValues: number[] = [];
    const now = new Date();

    // 获取过去 N 个月的数据
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      const monthTotal = transactions
        .filter(
          (tx) =>
            tx.categoryId === categoryId &&
            tx.type === 'expense' &&
            tx.date.startsWith(monthKey)
        )
        .reduce((sum, tx) => sum + tx.amount, 0);

      monthlyValues.push(monthTotal);
    }

    // 计算平均值
    const average = monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length;

    // 计算趋势
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (monthlyValues.length >= 2) {
      const recent = monthlyValues.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const previous = monthlyValues.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;

      if (recent > previous * 1.1) {
        trend = 'up';
      } else if (recent < previous * 0.9) {
        trend = 'down';
      }
    }

    // 预测下个月
    const forecast = this.predictNextValue(monthlyValues);

    return {
      category: categoryId,
      values: monthlyValues,
      average,
      trend,
      forecast,
    };
  }

  /**
   * 预测分析
   */
  predictNextMonth(transactions: Transaction[]): PredictionResult {
    const trends = this.calculateMonthlyTrends(transactions);

    if (trends.length < 2) {
      // 数据不足，返回基于当前月的预测
      const currentMonth = trends[trends.length - 1];
      return {
        predictedIncome: currentMonth.income,
        predictedExpense: currentMonth.expense,
        predictedBalance: currentMonth.balance,
        confidence: 0.3,
      };
    }

    // 使用简单的线性回归预测
    const recentTrends = trends.slice(-6); // 使用最近6个月的数据
    const incomeValues = recentTrends.map((t) => t.income);
    const expenseValues = recentTrends.map((t) => t.expense);

    const predictedIncome = this.predictNextValue(incomeValues);
    const predictedExpense = this.predictNextValue(expenseValues);
    const predictedBalance = predictedIncome - predictedExpense;

    // 计算置信度（基于数据的一致性）
    const incomeVariance = this.calculateVariance(incomeValues);
    const expenseVariance = this.calculateVariance(expenseValues);
    const confidence = Math.max(0.3, 1 - (incomeVariance + expenseVariance) / 2);

    return {
      predictedIncome,
      predictedExpense,
      predictedBalance,
      confidence: Math.min(0.95, confidence),
    };
  }

  /**
   * 预测下一个值
   */
  private predictNextValue(this: DataAnalyticsEngine, values: number[]): number {
    if (values.length === 0) return 0;
    if (values.length === 1) return values[0];

    // 简单的线性回归
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const xMean = x.reduce((a, b) => a + b, 0) / n;
    const yMean = y.reduce((a, b) => a + b, 0) / n;

    const numerator = x.reduce((sum, xi, i) => sum + (xi - xMean) * (y[i] - yMean), 0);
    const denominator = x.reduce((sum, xi) => sum + (xi - xMean) ** 2, 0);

    const slope = denominator === 0 ? 0 : numerator / denominator;
    const intercept = yMean - slope * xMean;

    return Math.max(0, slope * n + intercept);
  }

  /**
   * 计算方差
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((a: number, b: number) => a + b, 0) / values.length;
    const variance = values.reduce((sum: number, val: number) => sum + (val - mean) ** 2, 0) / values.length;

    return Math.sqrt(variance) / (mean || 1); // 返回变异系数
  }

  /**
   * 分析预算使用情况
   */
  analyzeBudgetUsage(
    transactions: Transaction[],
    budgets: Budget[],
    currentMonth: string
  ): BudgetAnalysis[] {
    return budgets.map((budget) => {
      const spent = transactions
        .filter(
          (tx) =>
            tx.categoryId === budget.categoryId &&
            tx.type === 'expense' &&
            tx.date.startsWith(currentMonth)
        )
        .reduce((sum, tx) => sum + tx.amount, 0);

      const remaining = budget.limit - spent;
      const percentUsed = (spent / budget.limit) * 100;

      let trend: 'safe' | 'warning' | 'danger' = 'safe';
      if (percentUsed >= 100) {
        trend = 'danger';
      } else if (percentUsed >= 80) {
        trend = 'warning';
      }

      return {
        categoryId: budget.categoryId,
        spent,
        budgeted: budget.limit,
        remaining,
        percentUsed,
        trend,
      };
    });
  }

  /**
   * 获取支出分类排名
   */
  getCategoryRanking(
    transactions: Transaction[],
    currentMonth: string,
    limit: number = 5
  ): Array<{ categoryId: string; total: number; percentage: number }> {
    const categoryMap = new Map<string, number>();

    transactions
      .filter((tx) => tx.type === 'expense' && tx.date.startsWith(currentMonth))
      .forEach((tx) => {
        const current = categoryMap.get(tx.categoryId) || 0;
        categoryMap.set(tx.categoryId, current + tx.amount);
      });

    const total = Array.from(categoryMap.values()).reduce((a, b) => a + b, 0);

    return Array.from(categoryMap.entries())
      .map(([categoryId, amount]) => ({
        categoryId,
        total: amount,
        percentage: (amount / total) * 100,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  }

  /**
   * 计算关键指标
   */
  calculateKeyMetrics(
    transactions: Transaction[],
    currentMonth: string
  ): {
    totalIncome: number;
    totalExpense: number;
    netBalance: number;
    averageDailyExpense: number;
    daysInMonth: number;
  } {
    const monthTransactions = transactions.filter((tx) => tx.date.startsWith(currentMonth));

    const totalIncome = monthTransactions
      .filter((tx) => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalExpense = monthTransactions
      .filter((tx) => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const netBalance = totalIncome - totalExpense;

    // 计算月份的天数
    const [year, month] = currentMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    const averageDailyExpense = totalExpense / daysInMonth;

    return {
      totalIncome,
      totalExpense,
      netBalance,
      averageDailyExpense,
      daysInMonth,
    };
  }

  /**
   * 生成财务报告
   */
  generateFinancialReport(
    this: DataAnalyticsEngine,
    transactions: Transaction[],
    budgets: Budget[],
    currentMonth: string
  ): {
    summary: ReturnType<DataAnalyticsEngine['calculateKeyMetrics']>;
    budgetAnalysis: BudgetAnalysis[];
    categoryRanking: ReturnType<DataAnalyticsEngine['getCategoryRanking']>;
    prediction: PredictionResult;
    trends: TrendAnalysis[];
  } {
    return {
      summary: this.calculateKeyMetrics(transactions, currentMonth),
      budgetAnalysis: this.analyzeBudgetUsage(transactions, budgets, currentMonth),
      categoryRanking: this.getCategoryRanking(transactions, currentMonth),
      prediction: this.predictNextMonth(transactions),
      trends: this.calculateMonthlyTrends(transactions),
    };
  }
}

export const dataAnalyticsEngine = new DataAnalyticsEngine();
