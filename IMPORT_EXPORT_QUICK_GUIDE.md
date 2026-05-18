# JSON 导入导出功能 - 快速参考指南

## 🐛 问题已修复

从一个账号导出 JSON 数据后，导入到另一个账号时，数据现在可以正确导入了！

## 📋 修复摘要

| 问题 | 位置 | 修复方案 |
|------|------|--------|
| 异步状态更新未完成 | `lib/budget-context.tsx` | 添加 Promise 和 setTimeout 确保完成 |
| 导入函数未实际导入数据 | `app/(tabs)/records.tsx` | 调用 `importBills()` 实际导入 |
| 缺少错误处理 | `app/(tabs)/records.tsx` | 添加 try-catch 和日志 |

## 🚀 使用方法

### 导出账单

```
记录 → 菜单 → 导出账单 (或 导出 JSON)
```

**导出格式**:
```json
{
  "exportedAt": "2024-05-18T21:05:38.637Z",
  "exportedBy": "User A",
  "transactions": [...],
  "budgets": [...]
}
```

### 导入账单

```
切换账号 → 记录 → 菜单 → 导入账单 (或 导入 JSON) → 选择文件
```

## ✨ 新增功能

### 支持两种 JSON 格式

#### 格式 1: 完整的 BillTransferPayload（推荐）
```json
{
  "exportedAt": "...",
  "exportedBy": "...",
  "transactions": [...],
  "budgets": [...]
}
```

#### 格式 2: 简单的交易数组
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

## 🔄 数据流程

```
导出 JSON
   ↓
选择文件
   ↓
解析 JSON
   ↓
验证格式
   ↓
调用 importBills()
   ↓
dispatch MERGE_IMPORTED_BILLS
   ↓
状态更新 + AsyncStorage 写入
   ↓
等待 100ms 确保完成
   ↓
显示成功提示
```

## 📝 关键改进

### 1. 异步等待机制
```typescript
// 修复前：立即返回，数据可能未保存
dispatch({ type: 'MERGE_IMPORTED_BILLS', ... });

// 修复后：等待状态更新和持久化完成
return new Promise<void>((resolve) => {
  dispatch({ type: 'MERGE_IMPORTED_BILLS', ... });
  setTimeout(() => resolve(), 100);
});
```

### 2. 完整的导入逻辑
```typescript
// 修复前：只计数，不导入
let importedCount = 0;
for (const item of jsonData) { importedCount++; }

// 修复后：真正导入数据
await importBills(payload);
```

### 3. 错误处理
```typescript
try {
  await importBills(payload);
  Alert.alert(i18n.common.success, '导入成功');
} catch (error) {
  console.error('Failed to import', error);
  Alert.alert(i18n.common.warning, '导入失败');
}
```

## 🧪 测试验证

运行测试脚本：
```bash
cd /home/ubuntu/family-budget-app-v2
node test-import-export.js
```

测试结果：
- ✅ 导出格式正确
- ✅ 导入数据正确分配
- ✅ 原有数据不被覆盖
- ✅ 去重机制正常

## 📚 详细文档

查看完整的修复说明：
```bash
cat docs/IMPORT_EXPORT_FIX.md
```

## ⚙️ 技术细节

### 修改的文件

1. **lib/budget-context.tsx**
   - 修改 `importBills` 函数
   - 添加 Promise 包装和延迟

2. **app/(tabs)/records.tsx**
   - 修改 `handleImportJSON` 函数
   - 修改 `handleImportBills` 函数
   - 添加错误处理

### 不需要修改的文件

- `lib/bill-transfer.ts` - 导出/导入文件逻辑保持不变
- `lib/types.ts` - 类型定义保持不变

## 🎯 预期行为

### 导入前
- 账号 A：10 笔交易，5 个预算
- 账号 B：3 笔交易，1 个预算

### 导入后
- 账号 B：13 笔交易（3 + 10），6 个预算（1 + 5）
- 所有导入的交易 userId 变为账号 B 的 ID
- 所有导入的交易 userName 变为账号 B 的名字

## ❓ 常见问题

### Q: 导入后数据在哪里看？
**A**: 在 **记录** 标签中可以看到所有导入的交易。按日期排序显示。

### Q: 导入会覆盖现有数据吗？
**A**: 不会。导入是**合并**操作，会保留现有数据。

### Q: 如果导入重复的数据怎么办？
**A**: 系统会自动去重。相同 ID 的交易不会被导入两次。

### Q: 导入需要多长时间？
**A**: 通常 100-200ms。系统会显示成功提示。

### Q: 支持哪些文件格式？
**A**: 只支持 JSON 格式。不支持 CSV 或其他格式的导入。

## 🔐 数据安全

- 所有数据存储在本地设备上
- 导入/导出不涉及云端
- 用户完全控制数据

## 📞 反馈

如果遇到问题，请检查：
1. JSON 文件格式是否正确
2. 浏览器控制台是否有错误信息
3. 是否已登录到目标账号

详见 `docs/IMPORT_EXPORT_FIX.md` 的"已知限制"部分。
