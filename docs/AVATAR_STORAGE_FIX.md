# 头像存储优化 - 修复说明

## 问题描述

当用户为两个不同的账号设置不同的头像时，会出现以下错误：

```
Uncaught Error
Failed to execute 'setItem' on 'Storage': Setting the value of '@budget_users' exceeded the quota.
```

这是因为 AsyncStorage 的存储空间有限（通常 5-10MB），而头像被存储为完整的 base64 data URL，占用大量空间。

## 根本原因分析

### 问题 1: 头像数据过大
- 每个头像被转换为 `data:image/jpeg;base64,{很长的base64字符串}` 格式
- 一个 1MB 的图片会产生约 1.3MB 的 base64 字符串
- 多个用户的头像会快速填满 AsyncStorage 的配额

**示例**：
- 原始图片：1920x1080 像素，质量 0.8
- Base64 大小：约 1.3MB
- 3 个用户 × 1.3MB = 3.9MB（已接近或超过配额）

### 问题 2: 没有压缩机制
- 原始代码直接保存图片，没有任何压缩
- 即使用户选择的图片很大，也会完整保存

## 修复方案

### 方案 1: 自动压缩头像（已实现）

创建了 `lib/avatar-manager.ts` 模块，提供以下功能：

1. **自动压缩**
   - 将头像缩放到 200x200 像素（足够显示）
   - 降低 JPEG 质量到 0.5（从 0.8）
   - 自动选择最佳压缩参数

2. **大小限制**
   - 单个头像最大 50KB
   - 所有头像总大小最大 500KB
   - 超过限制时自动降低质量

3. **存储统计**
   - 计算头像占用空间
   - 提供使用百分比
   - 警告当使用率超过 80%

### 方案 2: 降低初始质量

在 `lib/camera-service.ts` 中：
- 将拍照质量从 0.8 改为 0.5
- 将相册导入质量从 0.8 改为 0.5

### 方案 3: Web 端额外压缩

对于 Web 平台，在上传前进行额外的 Canvas 压缩：
```typescript
// 在 Web 上压缩图片
const optimizedBase64 = await optimizeAvatar(base64, file.type || 'image/jpeg');
```

## 修改的文件

| 文件 | 修改内容 |
|------|--------|
| `lib/avatar-manager.ts` | 新建：头像优化和管理模块 |
| `lib/camera-service.ts` | 集成头像优化函数，降低初始质量 |

## 技术细节

### 头像优化流程

```
用户选择图片
    ↓
读取为 base64
    ↓
调用 optimizeAvatar()
    ↓
检查大小是否超过 50KB
    ↓
如果超过，尝试压缩参数：
  - 质量 0.5, 200x200
  - 质量 0.4, 150x150
  - 质量 0.3, 120x120
  - 质量 0.2, 100x100
    ↓
返回最优压缩版本
    ↓
保存到 AsyncStorage
```

### 压缩参数

| 参数 | 初始值 | 优化值 | 说明 |
|------|-------|-------|------|
| 拍照质量 | 0.8 | 0.5 | 降低初始质量 |
| 相册质量 | 0.8 | 0.5 | 降低初始质量 |
| 最大宽度 | 无限 | 200px | 缩放到合理大小 |
| 最大高度 | 无限 | 200px | 缩放到合理大小 |
| 单个头像限制 | 无限 | 50KB | 防止单个头像过大 |
| 总头像限制 | 无限 | 500KB | 防止总体占用过多空间 |

### 大小对比

| 场景 | 原始大小 | 优化后大小 | 压缩率 |
|------|---------|----------|-------|
| 1920x1080, 质量0.8 | ~1.3MB | ~30-40KB | 97% ↓ |
| 1080x1080, 质量0.8 | ~800KB | ~25-35KB | 96% ↓ |
| 800x600, 质量0.8 | ~500KB | ~20-30KB | 95% ↓ |

## 使用示例

### 在 settings.tsx 中使用

```typescript
import { optimizeAvatar } from '@/lib/avatar-manager';

const handlePickAvatar = async () => {
  try {
    const image = await pickImageFromLibrary();
    if (!image) return;
    
    // 优化头像（自动完成）
    await updateProfile({ avatarUri: image.uri });
    Alert.alert(i18n.common.success, i18n.messages.profileSaved);
  } catch (error) {
    console.error('Avatar upload error:', error);
    Alert.alert(i18n.common.error, 'Failed to upload avatar');
  }
};
```

### 检查存储状态

```typescript
import { getStorageStats } from '@/lib/avatar-manager';

const stats = getStorageStats(users);
console.log(`Avatar storage: ${stats.usagePercent.toFixed(1)}%`);
if (stats.warning) {
  console.warn('Avatar storage usage is high!');
}
```

## 预期效果

### 修复前
- 2 个用户，每个 1MB 头像 = 2.6MB 占用
- 第 3 个用户尝试上传头像 → **存储空间超出配额错误**

### 修复后
- 2 个用户，每个 30KB 头像 = 60KB 占用
- 第 3 个用户可以正常上传头像
- 可以支持 15+ 个用户的头像存储

## 测试方法

1. **测试单个头像优化**
   ```bash
   # 在浏览器控制台运行
   import { optimizeAvatar, getBase64Size } from '@/lib/avatar-manager';
   const base64 = '...'; // 大的 base64 字符串
   const optimized = await optimizeAvatar(base64);
   console.log(`Original: ${getBase64Size(base64)} bytes`);
   console.log(`Optimized: ${getBase64Size(optimized)} bytes`);
   ```

2. **测试多用户场景**
   - 创建 5 个不同的账号
   - 为每个账号设置不同的头像
   - 验证所有头像都能正确保存和显示

3. **测试存储统计**
   ```typescript
   import { getStorageStats } from '@/lib/avatar-manager';
   const stats = getStorageStats(users);
   console.log(stats);
   // 输出: { totalSize: 150000, maxSize: 500000, usagePercent: 30, warning: false }
   ```

## 已知限制

1. **Web 端压缩需要 Canvas API**
   - 如果浏览器不支持 Canvas，会返回原始 base64
   - 这种情况很少见（IE 8 及更早版本）

2. **Native 端依赖 Expo ImagePicker**
   - 质量参数可能在不同设备上有所不同
   - 某些设备可能不支持 base64 导出

3. **首次优化可能较慢**
   - 大图片的压缩可能需要 100-500ms
   - 这是正常的，用户不会感到明显延迟

## 未来改进

1. **使用 IndexedDB 存储头像**
   - IndexedDB 有更大的存储空间（通常 50MB+）
   - 可以存储完整质量的头像

2. **云端头像存储**
   - 将头像上传到云端
   - 本地只保存 URL 引用
   - 节省本地存储空间

3. **自适应压缩**
   - 根据设备存储空间自动调整压缩参数
   - 根据网络速度选择合适的质量

4. **头像缓存管理**
   - 自动清理旧的或未使用的头像
   - 定期优化存储空间

## 相关文件

- `lib/avatar-manager.ts` - 头像优化和管理模块
- `lib/camera-service.ts` - 图片选择和处理
- `app/(tabs)/settings.tsx` - 设置页面（使用头像功能）
- `lib/budget-context.tsx` - 用户数据管理

## 参考资源

- [MDN: Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [MDN: Blob.text()](https://developer.mozilla.org/en-US/docs/Web/API/Blob/text)
- [Expo ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/)
- [AsyncStorage 限制](https://react-native-async-storage.github.io/async-storage/)
