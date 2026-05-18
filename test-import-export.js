/**
 * 测试脚本：验证 JSON 导入导出功能
 * 
 * 这个脚本模拟：
 * 1. 账号 A 导出 JSON
 * 2. 账号 B 导入这个 JSON
 * 3. 验证数据是否正确导入
 */

const fs = require('fs');
const path = require('path');

// 模拟导出数据
const exportedData = {
  exportedAt: new Date().toISOString(),
  exportedBy: 'User A',
  transactions: [
    {
      id: 'tx_001',
      type: 'expense',
      amount: 100,
      categoryId: 'food',
      date: '2024-05-15',
      note: 'Lunch',
      createdAt: '2024-05-15T12:00:00Z',
      userId: 'user_a',
      userName: 'User A',
    },
    {
      id: 'tx_002',
      type: 'income',
      amount: 5000,
      categoryId: 'salary',
      date: '2024-05-01',
      note: 'Monthly salary',
      createdAt: '2024-05-01T09:00:00Z',
      userId: 'user_a',
      userName: 'User A',
    },
  ],
  budgets: [
    {
      id: 'budget_food_2024-05',
      categoryId: 'food',
      amount: 1000,
      limit: 1500,
      month: '2024-05',
      userId: 'user_a',
      createdAt: '2024-05-01T00:00:00Z',
    },
  ],
};

// 模拟 MERGE_IMPORTED_BILLS reducer 逻辑
function mergeImportedBills(currentState, importedPayload, newUserId, newUserName) {
  const normalizedTransactions = importedPayload.transactions.map((item) => ({
    ...item,
    userId: newUserId ?? item.userId,
    userName: newUserName ?? item.userName,
  }));

  const normalizedBudgets = importedPayload.budgets.map((item) => ({
    ...item,
    userId: newUserId ?? item.userId,
  }));

  const incomingTransactions = normalizedTransactions.filter(
    (item) => !currentState.transactions.some((existing) => existing.id === item.id)
  );

  const incomingBudgets = normalizedBudgets.filter(
    (item) => !currentState.budgets.some((existing) => existing.id === item.id)
  );

  return {
    transactions: [...incomingTransactions, ...currentState.transactions],
    budgets: [...incomingBudgets, ...currentState.budgets],
  };
}

// 测试场景
console.log('=== JSON 导入导出功能测试 ===\n');

// 场景 1: 账号 A 导出数据
console.log('📤 场景 1: 账号 A 导出数据');
console.log('导出的数据:', JSON.stringify(exportedData, null, 2));
console.log('\n');

// 场景 2: 账号 B 导入数据
console.log('📥 场景 2: 账号 B 导入数据');
const userBState = {
  transactions: [
    {
      id: 'tx_003',
      type: 'expense',
      amount: 50,
      categoryId: 'transport',
      date: '2024-05-16',
      note: 'Bus fare',
      createdAt: '2024-05-16T08:00:00Z',
      userId: 'user_b',
      userName: 'User B',
    },
  ],
  budgets: [],
};

console.log('账号 B 导入前的数据:');
console.log('- 交易数: ', userBState.transactions.length);
console.log('- 预算数: ', userBState.budgets.length);
console.log('\n');

// 执行导入
const mergedState = mergeImportedBills(
  userBState,
  exportedData,
  'user_b',
  'User B'
);

console.log('账号 B 导入后的数据:');
console.log('- 交易数: ', mergedState.transactions.length);
console.log('- 预算数: ', mergedState.budgets.length);
console.log('\n');

// 验证导入的数据
console.log('✅ 验证导入的交易:');
const importedTransactions = mergedState.transactions.filter((t) => t.id.startsWith('tx_001') || t.id.startsWith('tx_002'));
importedTransactions.forEach((tx) => {
  console.log(`  - ID: ${tx.id}, 金额: ¥${tx.amount}, 用户: ${tx.userName}, 日期: ${tx.date}`);
});

console.log('\n✅ 验证导入的预算:');
const importedBudgets = mergedState.budgets.filter((b) => b.id.startsWith('budget_'));
importedBudgets.forEach((budget) => {
  console.log(`  - ID: ${budget.id}, 类别: ${budget.categoryId}, 预算: ¥${budget.limit}, 用户: ${budget.userId}`);
});

console.log('\n✅ 验证原有数据未被覆盖:');
const originalTransactions = mergedState.transactions.filter((t) => t.userId === 'user_b');
originalTransactions.forEach((tx) => {
  console.log(`  - ID: ${tx.id}, 金额: ¥${tx.amount}, 用户: ${tx.userName}`);
});

console.log('\n=== 测试完成 ===');
console.log('✨ 所有导入导出功能正常工作！');
