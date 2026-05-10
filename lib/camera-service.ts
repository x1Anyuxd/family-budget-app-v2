import * as ImagePicker from 'expo-image-picker';

export interface PickedImage {
  uri: string;
  base64?: string;
  mimeType?: string;
}

export async function takePhoto(): Promise<PickedImage | null> {
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
