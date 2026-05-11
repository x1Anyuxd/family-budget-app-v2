/**
 * AI 功能 Hook
 * 
 * 提供以下功能：
 * 1. 语音记账 - 录音并转换为文字
 * 2. 收据识别 - 拍照识别金额和分类
 * 3. 支出预测 - 预测未来支出
 * 4. 财务建议 - 生成个性化建议
 */

import { useState, useCallback } from 'react';
import { aiApi } from '../lib/api-client';

export interface VoiceRecognitionResult {
  text: string;
  amount?: number;
  category?: string;
  confidence: number;
}

export interface ReceiptRecognitionResult {
  amount: number;
  merchant?: string;
  date?: string;
  category?: string;
  items?: string[];
  confidence: number;
}

export interface ExpensePrediction {
  month: number;
  predicted_amount: number;
  confidence: number;
}

export interface FinancialAdvice {
  advice: string[];
  priority: 'high' | 'medium' | 'low';
}

interface UseAIFeaturesOptions {
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

export function useAIFeatures(options?: UseAIFeaturesOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 语音识别 - 将语音转换为文字和交易信息
   */
  const recognizeSpeech = useCallback(
    async (audioUrl: string): Promise<VoiceRecognitionResult | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await aiApi.recognizeSpeech(audioUrl);

        if (response.success) {
          const result: VoiceRecognitionResult = {
            text: response.text || '',
            amount: response.amount,
            category: response.category,
            confidence: response.confidence || 0.9,
          };

          options?.onSuccess?.(`语音识别成功: ${response.text}`);
          return result;
        } else {
          const errorMsg = response.error || '语音识别失败';
          setError(errorMsg);
          options?.onError?.(errorMsg);
          return null;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '语音识别出错';
        setError(errorMsg);
        options?.onError?.(errorMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  /**
   * 收据识别 - 识别收据图片中的信息
   */
  const recognizeReceipt = useCallback(
    async (imageUrl: string): Promise<ReceiptRecognitionResult | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await aiApi.recognizeReceipt(imageUrl);

        if (response.success) {
          const result: ReceiptRecognitionResult = {
            amount: response.amount || 0,
            merchant: response.merchant,
            date: response.date,
            category: response.category,
            items: response.items,
            confidence: response.confidence || 0.85,
          };

          options?.onSuccess?.(`收据识别成功: ¥${response.amount}`);
          return result;
        } else {
          const errorMsg = response.error || '收据识别失败';
          setError(errorMsg);
          options?.onError?.(errorMsg);
          return null;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '收据识别出错';
        setError(errorMsg);
        options?.onError?.(errorMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  /**
   * 支出预测 - 预测未来支出趋势
   */
  const predictExpense = useCallback(
    async (userId: string, months: number = 6): Promise<ExpensePrediction[] | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await aiApi.predictExpense(userId, months);

        if (response.success) {
          const predictions: ExpensePrediction[] = response.predictions || [];
          options?.onSuccess?.(`预测成功: 获取 ${predictions.length} 个月的预测数据`);
          return predictions;
        } else {
          const errorMsg = response.error || '预测失败';
          setError(errorMsg);
          options?.onError?.(errorMsg);
          return null;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '预测出错';
        setError(errorMsg);
        options?.onError?.(errorMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  /**
   * 生成财务建议
   */
  const generateAdvice = useCallback(
    async (userId: string): Promise<FinancialAdvice | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await aiApi.generateAdvice(userId);

        if (response.success) {
          const advice: FinancialAdvice = {
            advice: response.advice || [],
            priority: response.priority || 'medium',
          };

          options?.onSuccess?.(`建议生成成功: 获取 ${advice.advice.length} 条建议`);
          return advice;
        } else {
          const errorMsg = response.error || '建议生成失败';
          setError(errorMsg);
          options?.onError?.(errorMsg);
          return null;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '建议生成出错';
        setError(errorMsg);
        options?.onError?.(errorMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  /**
   * 清除错误
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    recognizeSpeech,
    recognizeReceipt,
    predictExpense,
    generateAdvice,
    clearError,
  };
}

export default useAIFeatures;
