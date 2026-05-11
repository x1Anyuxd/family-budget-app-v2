/**
 * AI 功能屏幕
 * 
 * 展示所有 AI 功能：
 * 1. 语音记账 - 真实麦克风录音
 * 2. 收据识别 - 真实摄像头拍照
 * 3. 支出预测
 * 4. 财务建议
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useAuth } from '../../hooks/use-auth';
import useAIFeatures from '../../hooks/use-ai-features';
import { i18n } from '../../lib/i18n';
import { uploadAudioBlob, uploadImageBlob, dataUrlToBlob } from '../../lib/media-uploader';

export default function AIFeaturesScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'voice' | 'receipt' | 'prediction' | 'advice'>('voice');
  const [voiceResult, setVoiceResult] = useState<any>(null);
  const [receiptResult, setReceiptResult] = useState<any>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [advice, setAdvice] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    loading,
    error,
    recognizeSpeech,
    recognizeReceipt,
    predictExpense,
    generateAdvice,
    clearError,
  } = useAIFeatures({
    onSuccess: (message) => {
      Alert.alert('成功', message);
    },
    onError: (error) => {
      Alert.alert('错误', error);
    },
  });

  // 开始录音
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        
        // 上传音频到后端获取 URL
        Alert.alert('提示', '正在上传录音...');
        const audioUrl = await uploadAudioBlob(audioBlob);
        
        if (audioUrl) {
          // 发送到后端进行识别
          const result = await recognizeSpeech(audioUrl);
          if (result) {
            setVoiceResult(result);
          }
        } else {
          Alert.alert('错误', '上传录音失败');
        }
        
        // 停止所有音频轨道
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // 计时器
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // 10秒后自动停止录音
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
          if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        }
      }, 10000);
      
    } catch (err) {
      Alert.alert('错误', '无法访问麦克风，请检查权限');
    }
  };

  // 停止录音
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  // 开始摄像头
  const handleStartCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      videoStreamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      Alert.alert('错误', '无法访问摄像头，请检查权限');
    }
  };

  // 拍摄照片
  const handleCapturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    try {
      const context = canvasRef.current.getContext('2d');
      if (!context) return;
      
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      
      const dataUrl = canvasRef.current.toDataURL('image/jpeg');
      setCapturedImage(dataUrl);
      
      // 停止摄像头
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
        videoStreamRef.current = null;
      }
      
      // 上传图片到后端获取 URL
      Alert.alert('提示', '正在上传照片...');
      const imageBlob = dataUrlToBlob(dataUrl);
      const imageUrl = await uploadImageBlob(imageBlob);
      
      if (imageUrl) {
        // 发送到后端进行识别
        const result = await recognizeReceipt(imageUrl);
        if (result) {
          setReceiptResult(result);
        }
      } else {
        Alert.alert('错误', '上传照片失败');
      }
    } catch (err) {
      Alert.alert('错误', '拍摄照片失败');
    }
  };

  // 重新拍摄
  const handleRetakePhoto = async () => {
    setCapturedImage(null);
    await handleStartCamera();
  };

  const handlePredictExpense = async () => {
    const userId = user?.id || 'guest';
    const results = await predictExpense(userId, 6);
    if (results) {
      setPredictions(results);
    }
  };

  const handleGenerateAdvice = async () => {
    const userId = user?.id || 'guest';
    const result = await generateAdvice(userId);
    if (result) {
      setAdvice(result);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* 标题 */}
      <View style={styles.header}>
        <Text style={styles.title}>AI 功能</Text>
        <Text style={styles.subtitle}>智能记账助手</Text>
      </View>

      {/* 标签页 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'voice' && styles.activeTab]}
          onPress={() => setActiveTab('voice')}
        >
          <Text style={[styles.tabText, activeTab === 'voice' && styles.activeTabText]}>
            语音记账
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'receipt' && styles.activeTab]}
          onPress={() => setActiveTab('receipt')}
        >
          <Text style={[styles.tabText, activeTab === 'receipt' && styles.activeTabText]}>
            收据识别
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'prediction' && styles.activeTab]}
          onPress={() => setActiveTab('prediction')}
        >
          <Text style={[styles.tabText, activeTab === 'prediction' && styles.activeTabText]}>
            支出预测
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'advice' && styles.activeTab]}
          onPress={() => setActiveTab('advice')}
        >
          <Text style={[styles.tabText, activeTab === 'advice' && styles.activeTabText]}>
            财务建议
          </Text>
        </TouchableOpacity>
      </View>

      {/* 内容区域 */}
      <View style={styles.content}>
        {/* 语音记账 */}
        {activeTab === 'voice' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>语音记账</Text>
            <Text style={styles.description}>
              按住麦克风按钮说出您的支出信息，AI 将自动识别金额和分类。
            </Text>

            {isRecording ? (
              <View style={styles.recordingContainer}>
                <View style={styles.recordingIndicator}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingText}>录音中... {recordingTime}s</Text>
                </View>
                <TouchableOpacity
                  style={[styles.button, styles.stopButton]}
                  onPress={handleStopRecording}
                >
                  <Text style={styles.buttonText}>⏹ 停止录音</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleStartRecording}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>🎤 开始录音</Text>
                )}
              </TouchableOpacity>
            )}

            {voiceResult && (
              <View style={styles.resultCard}>
                <Text style={styles.resultTitle}>识别结果</Text>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>文字内容:</Text>
                  <Text style={styles.resultValue}>{voiceResult.text}</Text>
                </View>
                {voiceResult.amount && (
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>金额:</Text>
                    <Text style={styles.resultValue}>¥{voiceResult.amount}</Text>
                  </View>
                )}
                {voiceResult.category && (
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>分类:</Text>
                    <Text style={styles.resultValue}>{voiceResult.category}</Text>
                  </View>
                )}
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>置信度:</Text>
                  <Text style={styles.resultValue}>{(voiceResult.confidence * 100).toFixed(0)}%</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* 收据识别 */}
        {activeTab === 'receipt' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>收据识别</Text>
            <Text style={styles.description}>
              拍摄收据照片，AI 将自动识别金额、商户和分类。
            </Text>

            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  style={styles.video}
                  playsInline
                />
                <canvas
                  ref={canvasRef}
                  style={{ display: 'none' }}
                />
                
                {videoStreamRef.current ? (
                  <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleCapturePhoto}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>📸 拍摄照片</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.button}
                    onPress={handleStartCamera}
                  >
                    <Text style={styles.buttonText}>📷 打开摄像头</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <Image
                  source={{ uri: capturedImage }}
                  style={styles.capturedImage}
                />
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleRetakePhoto}
                >
                  <Text style={styles.buttonText}>🔄 重新拍摄</Text>
                </TouchableOpacity>
              </>
            )}

            {receiptResult && (
              <View style={styles.resultCard}>
                <Text style={styles.resultTitle}>识别结果</Text>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>金额:</Text>
                  <Text style={styles.resultValue}>¥{receiptResult.amount}</Text>
                </View>
                {receiptResult.merchant && (
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>商户:</Text>
                    <Text style={styles.resultValue}>{receiptResult.merchant}</Text>
                  </View>
                )}
                {receiptResult.date && (
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>日期:</Text>
                    <Text style={styles.resultValue}>{receiptResult.date}</Text>
                  </View>
                )}
                {receiptResult.category && (
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>分类:</Text>
                    <Text style={styles.resultValue}>{receiptResult.category}</Text>
                  </View>
                )}
                {receiptResult.items && receiptResult.items.length > 0 && (
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>物品:</Text>
                    <Text style={styles.resultValue}>{receiptResult.items.join(', ')}</Text>
                  </View>
                )}
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>置信度:</Text>
                  <Text style={styles.resultValue}>{(receiptResult.confidence * 100).toFixed(0)}%</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* 支出预测 */}
        {activeTab === 'prediction' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>支出预测</Text>
            <Text style={styles.description}>
              基于您的历史消费数据，AI 预测未来 6 个月的支出趋势。
            </Text>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handlePredictExpense}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>📊 生成预测</Text>
              )}
            </TouchableOpacity>

            {predictions.length > 0 && (
              <View style={styles.resultCard}>
                <Text style={styles.resultTitle}>预测结果</Text>
                {predictions.map((pred, index) => (
                  <View key={index} style={styles.predictionItem}>
                    <Text style={styles.predictionMonth}>第 {pred.month} 个月</Text>
                    <View style={styles.predictionBar}>
                      <View
                        style={[
                          styles.predictionFill,
                          { width: `${Math.min((pred.predicted_amount / 5000) * 100, 100)}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.predictionAmount}>
                      ¥{pred.predicted_amount.toFixed(2)} (置信度: {(pred.confidence * 100).toFixed(0)}%)
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 财务建议 */}
        {activeTab === 'advice' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>财务建议</Text>
            <Text style={styles.description}>
              AI 根据您的消费模式生成个性化的财务建议。
            </Text>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleGenerateAdvice}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>💡 获取建议</Text>
              )}
            </TouchableOpacity>

            {advice && (
              <View style={styles.resultCard}>
                <Text style={styles.resultTitle}>财务建议</Text>
                {advice.advice && advice.advice.map((item: string, index: number) => (
                  <View key={index} style={styles.adviceItem}>
                    <Text style={styles.adviceNumber}>{index + 1}.</Text>
                    <Text style={styles.adviceText}>{item}</Text>
                  </View>
                ))}
                {advice.priority && (
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>优先级:</Text>
                    <Text style={styles.resultValue}>
                      {advice.priority === 'high' ? '高' : advice.priority === 'medium' ? '中' : '低'}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    alignItems: 'center',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  recordingContainer: {
    marginVertical: 8,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    marginBottom: 8,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
    marginRight: 8,
    animation: 'pulse 1s infinite',
  },
  recordingText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  video: {
    width: '100%',
    height: 300,
    backgroundColor: '#000',
    borderRadius: 8,
    marginVertical: 8,
  },
  capturedImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginVertical: 8,
  },
  resultCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  resultValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  predictionItem: {
    marginBottom: 12,
  },
  predictionMonth: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  predictionBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  predictionFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  predictionAmount: {
    fontSize: 12,
    color: '#333',
  },
  adviceItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  adviceNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    marginRight: 8,
    minWidth: 20,
  },
  adviceText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
});
