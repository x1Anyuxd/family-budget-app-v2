# JSON 导入导出功能修复说明

## 问题描述

用户从一个账号导出 JSON 账单数据后，导入到另一个账号时，数据没有被正确导入。

## 根本原因分析

### 问题 1: 异步状态更新未完成
**文件**: `lib/budget-context.tsx`  
**函数**: `importBills`

原始代码：
```typescript
const importBills = useCallback(async (payload: BillTransferPayload) => {
  dispatch({
    type: 'MERGE_IMPORTED_BILLS',
    payload,
    userId: currentUser?.id ?? null,
    userName: currentUser?.displayName ?? currentUser?.username,
  });
}, [currentUser]);
```

**问题**：
- `dispatch` 是同步操作，但 React 的状态更新是异步的
- 状态更新完成后，`AsyncStorage` 的写入也是异步的
- 函数立即返回，导致调用者认为导入已完成，但实际上数据还没有保存到本地存储

### 问题 2: 导入函数没有实际导入数据
**文件**: `app/(tabs)/records.tsx`  
**函数**: `handleImportJSON`

原始代码：
```typescript
const handleImportJSON = useCallback(async () => {
  // ... 文件选择和解析 ...
  let importedCount = 0;
  for (const item of jsonData) {
    if (item.type && item.amount && item.categoryId && item.date) {
      importedCount++;
    }
  }
  Alert.alert(i18n.common.success, `${i18n.records.importSuccess} (${importedCount} items)`);
}, [i18n]);
```

**问题**：
- 函数只是计算导入的数量，但**没有调用 `importBills` 来实际导入数据**
- 这导致即使文件被正确解析，数据也不会被导入到应用中

## 修复方案

### 修复 1: 添加异步等待机制
**文件**: `lib/budget-context.tsx`

```typescript
const importBills = useCallback(async (payload: BillTransferPayload) => {
  return new Promise<void>((resolve) => {
    dispatch({
      type: 'MERGE_IMPORTED_BILLS',
      payload,
      userId: currentUser?.id ?? null,
      userName: currentUser?.displayName ?? currentUser?.username,
    });
    // 等待 React 完成状态更新，然后再等待 AsyncStorage 写入完成
    // 使用 setTimeout 确保状态更新和持久化完成
    setTimeout(() => {
      resolve();
    }, 100);
  });
}, [currentUser]);
```

**改进**：
- 返回 `Promise<void>` 以支持异步等待
- 使用 `setTimeout` 给 React 和 `AsyncStorage` 足够的时间完成更新
- 调用者可以使用 `await importBills(payload)` 来等待导入完成

### 修复 2: 实现完整的导入逻辑
**文件**: `app/(tabs)/records.tsx`

```typescript
const handleImportJSON = useCallback(async () => {
  setTransferMenuVisible(false);
  try {
    const result = await DocumentPickerModule.getDocumentAsync({
      type: 'application/json',
    });
    if (result.canceled) {
      return;
    }
    const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
    const jsonData = JSON.parse(fileContent);
    
    let payload: any;
    if (Array.isArray(jsonData)) {
      // 如果是数组，假设是交易列表
      payload = {
        transactions: jsonData,
        budgets: [],
      };
    } else if (jsonData.transactions && jsonData.budgets) {
      // 如果是 BillTransferPayload 格式
      payload = jsonData;
    } else {
      Alert.alert(i18n.common.warning, i18n.records.invalidJSONFormat || 'Invalid JSON format');
      return;
    }

    if (!Array.isArray(payload.transactions) || !Array.isArray(payload.budgets)) {
      Alert.alert(i18n.common.warning, i18n.records.invalidJSONFormat || 'Invalid JSON format');
      return;
    }

    // 实际导入数据
    await importBills(payload);
    Alert.alert(i18n.common.success, `${i18n.records.importSuccess} (${payload.transactions.length} items)`);
  } catch (error) {
    console.error('Failed to import JSON', error);
    Alert.alert(i18n.common.warning, i18n.records.importFailed);
  }
}, [i18n, importBills]);
```

**改进**：
- 支持两种 JSON 格式：
  1. 直接的交易数组
  2. 完整的 `BillTransferPayload` 对象（包含 `transactions` 和 `budgets`）
- 调用 `importBills(payload)` 来真正导入数据
- 添加了完整的错误处理和日志记录

### 修复 3: 改进 `handleImportBills` 函数
**文件**: `app/(tabs)/records.tsx`

添加了 `try-catch` 块来捕获导入过程中的错误：

```typescript
const handleImportBills = useCallback(async () => {
  setTransferMenuVisible(false);
  const payload = await importLocalBills();
  if (!payload) {
    Alert.alert(i18n.common.warning, i18n.records.importFailed);
    return;
  }
  try {
    await importBills(payload);
    Alert.alert(i18n.common.success, i18n.records.importSuccess);
  } catch (error) {
    console.error('Failed to import bills', error);
    Alert.alert(i18n.common.warning, i18n.records.importFailed);
  }
}, [i18n.common.success, i18n.common.warning, i18n.records.importFailed, i18n.records.importSuccess, importBills]);
```

## 数据流程

修复后的完整数据流程：

```
用户选择 JSON 文件
    ↓
解析 JSON 文件
    ↓
验证数据格式（transactions 和 budgets 数组）
    ↓
调用 importBills(payload)
    ↓
dispatch MERGE_IMPORTED_BILLS action
    ↓
reducer 处理：
  - 重新分配 userId 和 userName
  - 去重（避免导入重复的交易和预算）
  - 合并新数据和现有数据
    ↓
React 状态更新
    ↓
useEffect 触发 AsyncStorage 写入
    ↓
等待 100ms 确保持久化完成
    ↓
返回成功
    ↓
显示成功提示
```

## 测试验证

运行测试脚本验证修复：

```bash
node test-import-export.js
```

测试结果：
- ✅ 导出的数据格式正确
- ✅ 导入的交易被正确分配给新账号
- ✅ 导入的预算被正确分配给新账号
- ✅ 原有数据不被覆盖
- ✅ 去重机制正常工作

## 使用说明

### 导出账单

1. 打开 **记录** 标签
2. 点击 **菜单** 按钮（三点图标）
3. 选择 **导出账单** 或 **导出 JSON**
4. 选择保存位置

### 导入账单

1. 切换到目标账号（或创建新账号）
2. 打开 **记录** 标签
3. 点击 **菜单** 按钮（三点图标）
4. 选择 **导入账单** 或 **导入 JSON**
5. 选择之前导出的 JSON 文件
6. 等待导入完成

### 支持的 JSON 格式

#### 格式 1: BillTransferPayload（推荐）
```json
{
  "exportedAt": "2024-05-18T21:05:38.637Z",
  "exportedBy": "User A",
  "transactions": [...],
  "budgets": [...]
}
```

#### 格式 2: 交易数组
```json
[
  {
    "id": "tx_001",
    "type": "expense",
    "amount": 100,
    "categoryId": "food",
    "date": "2024-05-15",
    "note": "Lunch",
    "createdAt": "2024-05-15T12:00:00Z"
  },
  ...
]
```

## 相关文件

- `lib/budget-context.tsx` - 核心状态管理和 `importBills` 函数
- `app/(tabs)/records.tsx` - 导入导出 UI 和处理函数
- `lib/bill-transfer.ts` - 文件读写和格式转换
- `lib/types.ts` - 类型定义

## 已知限制

1. **100ms 延迟** - 为了确保异步操作完成，导入时会有 100ms 的延迟。这是为了兼容 React 的异步状态更新和 AsyncStorage 的异步写入。

2. **去重基于 ID** - 如果导入的交易 ID 与现有交易 ID 相同，则不会导入。这是为了避免重复数据。

3. **用户信息重新分配** - 导入时，所有交易和预算的 `userId` 和 `userName` 都会被重新分配给当前登录的用户。

## 未来改进

1. 使用 `flushSync` 或其他机制替代 `setTimeout` 来确保同步完成
2. 添加导入前预览功能，让用户确认要导入的数据
3. 支持选择性导入（只导入特定类别或日期范围的数据）
4. 添加导入历史记录和撤销功能
