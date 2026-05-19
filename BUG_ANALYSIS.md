# 导入本地账单功能 Bug 分析与修复

## 问题描述

导入本地账单功能失效，用户无法通过选择本地 JSON 文件来导入账单数据。

## 根本原因分析

经过代码审查，发现了 **关键 bug**：

### Bug 1: `importLocalBills()` 函数的验证逻辑过于严格

**位置**: `lib/bill-transfer.ts` 第 139 行和 164 行

**问题代码**:
```typescript
if (!parsed || !Array.isArray(parsed.transactions) || !Array.isArray(parsed.budgets)) {
  throw new Error('Invalid local bill payload');
}
```

**问题分析**:
- 该验证要求导入的 JSON 必须同时包含 `transactions` 和 `budgets` 两个数组字段
- 但在 `records.tsx` 的 `handleImportJSON` 函数中（第 212-216 行），当用户导入纯交易数组时，代码会自动创建一个空的 `budgets` 数组：

```typescript
if (Array.isArray(jsonData)) {
  payload = {
    transactions: jsonData,
    budgets: [],  // 空数组
  };
}
```

- 问题在于：`importLocalBills()` 是由 `handleImportBills` 调用的，它期望返回一个合法的 `BillTransferPayload`
- 但如果用户通过 `handleImportBills` 导入一个纯交易数组的 JSON 文件，`importLocalBills()` 会因为验证失败而返回 `null`，导致导入失败

### Bug 2: 缺少 `handleImportJSON` 的导出菜单选项

**位置**: `app/(tabs)/records.tsx` 第 362-380 行

**问题分析**:
- 菜单中只有两个选项：`handleExportBills` 和 `handleImportBills`
- 没有 `handleImportJSON` 的菜单选项
- 这意味着用户无法通过 UI 访问 `handleImportJSON` 函数，只能通过 `handleImportBills` 导入
- 而 `handleImportBills` 调用的是 `importLocalBills()`，它的验证逻辑过于严格

## 修复方案

### 修复 1: 改进 `importLocalBills()` 的验证逻辑

使 `importLocalBills()` 支持纯交易数组格式，与 `handleImportJSON` 的处理方式保持一致。

**修改文件**: `lib/bill-transfer.ts`

```typescript
export async function importLocalBills(): Promise<BillTransferPayload | null> {
  try {
    // For web platform, use file input
    if (Platform.OS === 'web') {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0];
          if (!file) {
            resolve(null);
            return;
          }
          try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            
            // 支持两种格式
            let payload: BillTransferPayload;
            if (Array.isArray(parsed)) {
              // 纯交易数组格式
              payload = {
                transactions: parsed,
                budgets: [],
              };
            } else if (parsed && parsed.transactions && parsed.budgets) {
              // BillTransferPayload 格式
              payload = parsed;
            } else {
              throw new Error('Invalid JSON format');
            }
            
            // 验证数组类型
            if (!Array.isArray(payload.transactions) || !Array.isArray(payload.budgets)) {
              throw new Error('Invalid local bill payload');
            }
            
            resolve(payload);
          } catch (error) {
            console.error('Failed to parse JSON', error);
            resolve(null);
          }
        };
        input.click();
      });
    }

    // For native platforms
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/json'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.length) {
      return null;
    }
    const fileUri = result.assets[0].uri;
    const raw = await FileSystem.readAsStringAsync(fileUri);
    const parsed = JSON.parse(raw);
    
    // 支持两种格式
    let payload: BillTransferPayload;
    if (Array.isArray(parsed)) {
      // 纯交易数组格式
      payload = {
        transactions: parsed,
        budgets: [],
      };
    } else if (parsed && parsed.transactions && parsed.budgets) {
      // BillTransferPayload 格式
      payload = parsed;
    } else {
      throw new Error('Invalid JSON format');
    }
    
    // 验证数组类型
    if (!Array.isArray(payload.transactions) || !Array.isArray(payload.budgets)) {
      throw new Error('Invalid local bill payload');
    }
    
    return payload;
  } catch (error) {
    console.error('Failed to import local bills', error);
    return null;
  }
}
```

### 修复 2: 添加 `handleImportJSON` 的菜单选项（可选）

为了提供更好的用户体验，可以在菜单中添加一个专门的 "导入 JSON" 选项。

**修改文件**: `app/(tabs)/records.tsx`

在菜单中添加第三个选项：

```typescript
<Pressable onPress={handleImportJSON} style={[styles.menuAction, { backgroundColor: colors.background, borderColor: colors.border }]}>
  <IconSymbol name="doc.text" size={18} color={colors.primary} />
  <Text style={[styles.menuActionText, { color: colors.foreground }]}>{i18n.records.importJSON || 'Import JSON'}</Text>
</Pressable>
```

## 修复后的行为

修复后，用户可以通过 `handleImportBills` 导入以下两种格式的 JSON 文件：

1. **纯交易数组格式**:
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
     }
   ]
   ```

2. **完整 BillTransferPayload 格式**:
   ```json
   {
     "exportedAt": "2024-05-18T21:05:38.637Z",
     "exportedBy": "User A",
     "transactions": [...],
     "budgets": [...]
   }
   ```

## 测试步骤

1. 导出一个包含交易的 JSON 文件（使用 `handleExportBills`）
2. 使用 `handleImportBills` 选择该 JSON 文件
3. 验证交易是否被成功导入
4. 检查导入的交易数据是否正确

## 相关文件

- `lib/bill-transfer.ts` - 文件读写和格式转换
- `app/(tabs)/records.tsx` - 导入导出 UI 和处理函数
- `lib/budget-context.tsx` - 核心状态管理
- `lib/types.ts` - 类型定义
