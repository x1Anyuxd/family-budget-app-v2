/**
 * AI 功能屏幕
 * 
 * 展示所有 AI 功能：
 * 1. 语音记账
 * 2. 收据识别
 * 3. 支出预测
 * 4. 财务建议
 */

import React, { useState } from 'react';
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

export default function AIFeaturesScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'voice' | 'receipt' | 'prediction' | 'advice'>('voice');
  const [voiceResult, setVoiceResult] = useState<any>(null);
  const [receiptResult, setReceiptResult] = useState<any>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [advice, setAdvice] = useState<any>(null);

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

  // AI 功能对所有用户开放（包括游客）

  const handleVoiceRecord = async () => {
    // 模拟语音识别
    const result = await recognizeSpeech('https://example.com/audio.mp3');
    if (result) {
      setVoiceResult(result);
    }
  };

  const handleReceiptCapture = async () => {
    // 模拟收据识别
    const result = await recognizeReceipt('https://example.com/receipt.jpg');
    if (result) {
      setReceiptResult(result);
    }
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

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleVoiceRecord}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>🎤 开始录音</Text>
              )}
            </TouchableOpacity>

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

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleReceiptCapture}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>📷 拍摄收据</Text>
              )}
            </TouchableOpacity>

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
                <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(advice.priority) }]}>
                  <Text style={styles.priorityText}>优先级: {advice.priority}</Text>
                </View>
                {advice.advice.map((item: string, index: number) => (
                  <View key={index} style={styles.adviceItem}>
                    <Text style={styles.adviceNumber}>{index + 1}.</Text>
                    <Text style={styles.adviceText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 错误提示 */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={clearError}>
              <Text style={styles.errorDismiss}>关闭</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high':
      return '#FF6B6B';
    case 'medium':
      return '#FFA500';
    case 'low':
      return '#4CAF50';
    default:
      return '#999';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingHorizontal: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    marginBottom: 15,
  },
  predictionMonth: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  predictionBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginBottom: 5,
    overflow: 'hidden',
  },
  predictionFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  predictionAmount: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  priorityBadge: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 15,
  },
  priorityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  adviceItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  adviceNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    marginRight: 10,
    minWidth: 25,
  },
  adviceText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  errorCard: {
    backgroundColor: '#FFE5E5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  errorDismiss: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
});
