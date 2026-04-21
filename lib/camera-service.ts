import * as ImagePicker from 'expo-image-picker';

export async function takePhoto() {
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
  if (!result.canceled) {
    return result.assets[0].base64;
  }
  return null;
}

export async function pickImageFromLibrary() {
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
  if (!result.canceled) {
    return result.assets[0].base64;
  }
  return null;
}

export function ensureBase64(data: string) {
  if (data.startsWith('data:')) {
    return data.split(',')[1];
  }
  return data;
}

export function base64ToDataUrl(base64: string, type = 'image/jpeg') {
  return `data:${type};base64,${base64}`;
}
