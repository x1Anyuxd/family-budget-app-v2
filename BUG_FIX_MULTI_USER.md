# 多用户导入重复账单 Bug 修复

## 问题描述

当用户在第一个账号导入 JSON 账单后，切换到第二个账号再导入相同的 JSON 文件时，导入失效。系统显示导入成功，但实际上没有添加任何数据。

## 根本原因

在 `lib/budget-context.tsx` 的 `MERGE_IMPORTED_BILLS` reducer 中，去重逻辑只检查了账单的 `id` 字段：

```typescript
// 旧的去重逻辑（有问题）
const incomingTransactions = normalizedTransactions.filter(
  (item) => !state.transactions.some((existing) => existing.id === item.id),
);
```

这导致以下问题：
1. 用户 A 导入了账单 ID 为 `tx_001` 的交易
2. 切换到用户 B，导入相同的 JSON 文件
3. 系统检查发现 `tx_001` 已存在，认为是重复数据
4. 即使这笔交易属于不同的用户，也会被过滤掉

## 修复方案

改进去重逻辑，**同时检查账单 ID 和用户 ID**。只有当两者都相同时，才认为是重复数据：

```typescript
// 新的去重逻辑（已修复）
const incomingTransactions = normalizedTransactions.filter(
  (item) => !state.transactions.some(
    (existing) => existing.id === item.id && existing.userId === item.userId
  ),
);
```

## 修复后的行为

- ✅ 用户 A 导入 JSON → 账单被添加到用户 A 的数据中
- ✅ 切换到用户 B，导入相同 JSON → 账单被添加到用户 B 的数据中
- ✅ 同一用户重复导入相同 JSON → 只添加一次（真正的去重）
- ✅ 不同用户的账单数据完全隔离

## 修改文件

- `lib/budget-context.tsx` - 第 168-179 行
  - 修复 `MERGE_IMPORTED_BILLS` 中的交易去重逻辑
  - 修复 `MERGE_IMPORTED_BILLS` 中的预算去重逻辑

## 测试步骤

1. 创建两个账号（账号 A 和账号 B）
2. 使用账号 A 导入一个 JSON 文件
3. 验证账单是否出现在账号 A 的记录中
4. 切换到账号 B
5. 导入相同的 JSON 文件
6. 验证账单是否出现在账号 B 的记录中
7. 切换回账号 A，验证其数据未被修改
8. 再次用账号 A 导入相同的 JSON，验证没有重复添加

## 相关文件

- `lib/budget-context.tsx` - 核心状态管理和 reducer 逻辑
- `lib/bill-transfer.ts` - 文件读写和格式转换
- `app/(tabs)/records.tsx` - 导入导出 UI
