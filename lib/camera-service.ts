import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

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
    quality: 0.5,
    base64: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    base64: asset.base64 ?? undefined,
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
          const reader = new FileReader();
          reader.onload = (event: any) => {
            resolve({
              uri: event.target.result,
              base64,
              mimeType: file.type || 'image/jpeg',
            });
          };
          reader.readAsDataURL(file);
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
    quality: 0.5,
    base64: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    base64: asset.base64 ?? undefined,
    mimeType: asset.mimeType ?? 'image/jpeg',
  };
}

export async function ensureBase64(image: PickedImage): Promise<PickedImage> {
  return image;
}

export function base64ToDataUrl(base64: string, type = 'image/jpeg') {
  return `data:${type};base64,${base64}`;
}
