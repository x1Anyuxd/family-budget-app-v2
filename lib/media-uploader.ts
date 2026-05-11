/**
 * Media Uploader - Upload audio and image blobs to backend storage
 * Returns URLs that can be used for AI processing
 */

import axios from 'axios';

const API_BASE_URL = 'https://8080-ijnnlol1clhnny9qj9z67-ef85e9c8.sg1.manus.computer/api';

interface UploadResponse {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload audio blob to backend and get URL
 * @param audioBlob Audio blob from MediaRecorder
 * @returns URL to the uploaded audio file
 */
export async function uploadAudioBlob(audioBlob: Blob): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.wav');
    formData.append('type', 'audio');

    const response = await axios.post<UploadResponse>(
      `${API_BASE_URL}/media/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      }
    );

    if (response.data.success && response.data.url) {
      return response.data.url;
    } else {
      console.error('Audio upload failed:', response.data.error);
      return null;
    }
  } catch (error) {
    console.error('Error uploading audio:', error);
    return null;
  }
}

/**
 * Upload image blob to backend and get URL
 * @param imageBlob Image blob from canvas
 * @returns URL to the uploaded image file
 */
export async function uploadImageBlob(imageBlob: Blob): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('file', imageBlob, 'receipt.jpg');
    formData.append('type', 'image');

    const response = await axios.post<UploadResponse>(
      `${API_BASE_URL}/media/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      }
    );

    if (response.data.success && response.data.url) {
      return response.data.url;
    } else {
      console.error('Image upload failed:', response.data.error);
      return null;
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
}

/**
 * Convert data URL to blob
 * @param dataUrl Data URL from canvas.toDataURL()
 * @returns Blob object
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
}
