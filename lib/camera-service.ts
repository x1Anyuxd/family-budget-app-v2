import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { optimizeAvatar } from './avatar-manager';

export interface PickedImage {
  uri: string;
  base64?: string;
  mimeType?: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 在 Web 上压缩图片到合理的大小
 * 用于头像存储，确保不超过 AsyncStorage 配额
 */
async function compressImageBase64(base64: string, mimeType: string = 'image/jpeg'): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64);
        return;
      }

      // 将图片缩小到 200x200 像素（足够显示头像）
      const maxSize = 200;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      // 转换为低质量 base64
      const dataUrl = canvas.toDataURL(mimeType, 0.5);
      const compressed = dataUrl.split(',')[1];
      resolve(compressed);
    };
    img.onerror = () => {
      resolve(base64);
    };
    img.src = `data:${mimeType};base64,${base64}`;
  });
}

export async function takePhoto(): Promise<PickedImage | null> {
  if (Platform.OS === 'web') {
    alert('Web platform does not support camera');
    return null;
  }
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    alert('需要相机权限');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.5,  // 降低质量以减少文件大小
    base64: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  
  // Convert to base64 data URL for persistence
  let uri = asset.uri;
  let base64 = asset.base64;
  if (base64) {
    // 优化头像大小
    base64 = await optimizeAvatar(base64, asset.mimeType || 'image/jpeg');
    uri = `data:${asset.mimeType || 'image/jpeg'};base64,${base64}`;
  }
  
  return {
    uri,
    base64: base64 ?? undefined,
    mimeType: asset.mimeType ?? 'image/jpeg',
  };
}

export async function pickImageFromLibrary(): Promise<PickedImage | null> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        try {
          const base64 = await fileToBase64(file);
          // 优化头像大小
          const optimizedBase64 = await optimizeAvatar(base64, file.type || 'image/jpeg');
          const dataUrl = `data:${file.type || 'image/jpeg'};base64,${optimizedBase64}`;
          resolve({
            uri: dataUrl,
            base64: optimizedBase64,
            mimeType: file.type || 'image/jpeg',
          });
        } catch (error) {
          console.error('Error reading file:', error);
          resolve(null);
        }
      };
      input.click();
    });
  }
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    alert('需要相册权限');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.5,  // 降低质量以减少文件大小
    base64: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  
  // For native platforms, convert URI to base64 data URL for persistence
  let uri = asset.uri;
  let base64 = asset.base64;
  
  if (base64) {
    // 优化头像大小
    base64 = await optimizeAvatar(base64, asset.mimeType || 'image/jpeg');
    // Convert to data URL for better cross-platform persistence
    uri = `data:${asset.mimeType || 'image/jpeg'};base64,${base64}`;
  }
  
  return {
    uri,
    base64: base64 ?? undefined,
    mimeType: asset.mimeType ?? 'image/jpeg',
  };
}

export async function ensureBase64(image: PickedImage): Promise<PickedImage> {
  return image;
}

export function base64ToDataUrl(base64: string, type = 'image/jpeg') {
  return `data:${type};base64,${base64}`;
}
