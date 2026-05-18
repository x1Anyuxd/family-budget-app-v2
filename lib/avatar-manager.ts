/**
 * 头像管理模块
 * 
 * 功能：
 * 1. 自动压缩头像到合理大小
 * 2. 限制头像存储空间
 * 3. 提供清理机制
 */

const MAX_AVATAR_SIZE = 50 * 1024; // 50KB - 每个头像的最大大小
const MAX_TOTAL_AVATARS_SIZE = 500 * 1024; // 500KB - 所有头像的最大总大小

/**
 * 检查 base64 字符串的大小（以字节为单位）
 */
export function getBase64Size(base64: string): number {
  // base64 编码后的大小约为原始大小的 1.33 倍
  // 但我们直接计算字符串长度作为近似值
  return Math.ceil((base64.length * 3) / 4);
}

/**
 * 压缩 base64 图片
 */
export async function compressBase64Image(
  base64: string,
  mimeType: string = 'image/jpeg',
  maxWidth: number = 200,
  maxHeight: number = 200,
  quality: number = 0.5
): Promise<string> {
  return new Promise((resolve) => {
    // 如果在非 Web 环境，直接返回
    if (typeof document === 'undefined') {
      resolve(base64);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64);
        return;
      }

      // 计算缩放尺寸
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      // 转换为 base64
      const dataUrl = canvas.toDataURL(mimeType, quality);
      const compressed = dataUrl.split(',')[1];
      resolve(compressed);
    };

    img.onerror = () => {
      resolve(base64);
    };

    img.src = `data:${mimeType};base64,${base64}`;
  });
}

/**
 * 优化头像：压缩到指定大小以内
 */
export async function optimizeAvatar(
  base64: string,
  mimeType: string = 'image/jpeg'
): Promise<string> {
  let compressed = base64;
  let size = getBase64Size(compressed);

  // 如果已经在限制内，直接返回
  if (size <= MAX_AVATAR_SIZE) {
    return compressed;
  }

  // 尝试不同的压缩参数
  const compressionParams = [
    { quality: 0.5, maxWidth: 200, maxHeight: 200 },
    { quality: 0.4, maxWidth: 150, maxHeight: 150 },
    { quality: 0.3, maxWidth: 120, maxHeight: 120 },
    { quality: 0.2, maxWidth: 100, maxHeight: 100 },
  ];

  for (const params of compressionParams) {
    compressed = await compressBase64Image(
      base64,
      mimeType,
      params.maxWidth,
      params.maxHeight,
      params.quality
    );
    size = getBase64Size(compressed);
    if (size <= MAX_AVATAR_SIZE) {
      console.log(`Avatar optimized to ${size} bytes with quality ${params.quality}`);
      return compressed;
    }
  }

  // 如果仍然超过限制，返回最后的压缩版本
  console.warn(`Avatar size (${size} bytes) still exceeds limit, using best effort`);
  return compressed;
}

/**
 * 验证头像数据
 */
export function validateAvatarData(base64: string): { valid: boolean; size: number; message: string } {
  if (!base64) {
    return { valid: false, size: 0, message: 'Avatar data is empty' };
  }

  const size = getBase64Size(base64);
  if (size > MAX_AVATAR_SIZE) {
    return {
      valid: false,
      size,
      message: `Avatar size (${Math.round(size / 1024)}KB) exceeds limit (${Math.round(MAX_AVATAR_SIZE / 1024)}KB)`,
    };
  }

  return { valid: true, size, message: 'Avatar is valid' };
}

/**
 * 计算所有头像的总大小
 */
export function calculateTotalAvatarSize(avatars: Array<{ avatarUri?: string }>): number {
  return avatars.reduce((total, user) => {
    if (!user.avatarUri || !user.avatarUri.startsWith('data:')) {
      return total;
    }
    const base64 = user.avatarUri.split(',')[1];
    return total + getBase64Size(base64);
  }, 0);
}

/**
 * 检查是否需要清理头像
 */
export function shouldCleanupAvatars(avatars: Array<{ avatarUri?: string }>): boolean {
  const totalSize = calculateTotalAvatarSize(avatars);
  return totalSize > MAX_TOTAL_AVATARS_SIZE;
}

/**
 * 获取存储统计信息
 */
export function getStorageStats(avatars: Array<{ avatarUri?: string }>): {
  totalSize: number;
  maxSize: number;
  usagePercent: number;
  warning: boolean;
} {
  const totalSize = calculateTotalAvatarSize(avatars);
  const usagePercent = (totalSize / MAX_TOTAL_AVATARS_SIZE) * 100;

  return {
    totalSize,
    maxSize: MAX_TOTAL_AVATARS_SIZE,
    usagePercent,
    warning: usagePercent > 80,
  };
}
