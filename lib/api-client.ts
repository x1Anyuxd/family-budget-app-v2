/**
 * API 客户端 - 连接到 Spring Boot 后端
 * 
 * 使用方式：
 * import { apiClient } from './api-client';
 * 
 * // 用户认证
 * const response = await apiClient.post('/users/register', { username, email, password });
 * 
 * // 交易管理
 * const transactions = await apiClient.get('/transactions', { userId });
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API 基础 URL - 根据环境调整
// 物理设备需要使用本机 IP 地址而不是 localhost
const API_BASE_URL = 'http://169.254.0.21:8080/api';
// 如果在模拟器上运行，使用 localhost
// const API_BASE_URL = 'http://localhost:8080/api';
// 如果在其他网络上，请修改 IP 地址为你的开发机 IP

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  [key: string]: any;
}

interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器 - 添加令牌
    this.client.interceptors.request.use(
      async (config) => {
        const token = await this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器 - 处理错误
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        // 如果是 401 错误，清除令牌并重新登录
        if (error.response?.status === 401) {
          await this.clearToken();
          // 触发登出事件
          console.log('Token expired, please login again');
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * 获取存储的令牌
   */
  private async getToken(): Promise<string | null> {
    if (this.token) {
      return this.token;
    }
    try {
      this.token = await AsyncStorage.getItem('auth_token');
      return this.token;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  /**
   * 保存令牌
   */
  async setToken(token: string): Promise<void> {
    this.token = token;
    try {
      await AsyncStorage.setItem('auth_token', token);
    } catch (error) {
      console.error('Error saving token:', error);
    }
  }

  /**
   * 清除令牌
   */
  async clearToken(): Promise<void> {
    this.token = null;
    try {
      await AsyncStorage.removeItem('auth_token');
    } catch (error) {
      console.error('Error clearing token:', error);
    }
  }

  /**
   * GET 请求
   */
  async get<T = any>(url: string, params?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get<ApiResponse<T>>(url, { params });
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * POST 请求
   */
  async post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post<ApiResponse<T>>(url, data);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * PUT 请求
   */
  async put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.put<ApiResponse<T>>(url, data);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * DELETE 请求
   */
  async delete<T = any>(url: string): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.delete<ApiResponse<T>>(url);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 错误处理
   */
  private handleError(error: any): ApiResponse {
    console.error('API Error:', error);

    if (error.response) {
      // 服务器响应了错误状态码
      return {
        success: false,
        error: error.response.data?.error || error.message,
        message: error.response.data?.message,
      };
    } else if (error.request) {
      // 请求已发送但没有收到响应
      return {
        success: false,
        error: 'No response from server',
      };
    } else {
      // 请求设置出错
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }
}

// 导出单例
export const apiClient = new ApiClient();

/**
 * 用户相关 API
 */
export const userApi = {
  // 注册
  register: (username: string, email: string, password: string) =>
    apiClient.post('/users/register', { username, email, password }),

  // 登录
  login: (username: string, password: string) =>
    apiClient.post('/users/login', { username, password }),

  // 获取用户信息
  getUser: (userId: string) =>
    apiClient.get(`/users/${userId}`),

  // 更新用户信息
  updateUser: (userId: string, fullName?: string, avatarUrl?: string) =>
    apiClient.put(`/users/${userId}`, { fullName, avatarUrl }),

  // 修改密码
  changePassword: (userId: string, oldPassword: string, newPassword: string) =>
    apiClient.post(`/users/${userId}/change-password`, { oldPassword, newPassword }),
};

/**
 * 交易相关 API
 */
export const transactionApi = {
  // 获取交易列表
  getTransactions: (userId: string) =>
    apiClient.get('/transactions', { userId }),

  // 创建交易
  createTransaction: (userId: string, type: string, amount: number, category: string, description: string, transactionDate: string) =>
    apiClient.post('/transactions', { userId, type, amount, category, description, transactionDate }),

  // 获取交易详情
  getTransaction: (id: string) =>
    apiClient.get(`/transactions/${id}`),

  // 更新交易
  updateTransaction: (id: string, type: string, amount: number, category: string, description: string, transactionDate: string) =>
    apiClient.put(`/transactions/${id}`, { type, amount, category, description, transactionDate }),

  // 删除交易
  deleteTransaction: (id: string) =>
    apiClient.delete(`/transactions/${id}`),
};

/**
 * 预算相关 API
 */
export const budgetApi = {
  // 获取预算列表
  getBudgets: (userId: string) =>
    apiClient.get('/budgets', { userId }),

  // 创建预算
  createBudget: (userId: string, category: string, amount: number, month: string) =>
    apiClient.post('/budgets', { userId, category, amount, month }),

  // 获取预算详情
  getBudget: (id: string) =>
    apiClient.get(`/budgets/${id}`),

  // 更新预算
  updateBudget: (id: string, amount: number) =>
    apiClient.put(`/budgets/${id}`, { amount }),

  // 删除预算
  deleteBudget: (id: string) =>
    apiClient.delete(`/budgets/${id}`),
};

/**
 * AI 相关 API
 */
export const aiApi = {
  // 语音识别
  recognizeSpeech: (audioUrl: string) =>
    apiClient.post('/ai/recognize-speech', { audioUrl }),

  // 收据识别
  recognizeReceipt: (imageUrl: string) =>
    apiClient.post('/ai/recognize-receipt', { imageUrl }),

  // 支出预测
  predictExpense: (userId: string, months: number = 6) =>
    apiClient.get('/ai/predict-expense', { userId, months }),

  // 财务建议
  generateAdvice: (userId: string) =>
    apiClient.get('/ai/generate-advice', { userId }),
};

export default apiClient;
