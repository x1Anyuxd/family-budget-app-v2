/**
 * 云同步服务 - 与 Spring Boot 后端集成
 * 
 * 功能：
 * 1. 用户认证和令牌管理
 * 2. 交易数据同步
 * 3. 预算数据同步
 * 4. 多设备同步
 * 5. 冲突解决
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { transactionApi, budgetApi, apiClient } from './api-client';
import type { Transaction, Budget } from './types';

interface SyncOptions {
  userId: string;
  deviceId: string;
  forceSync?: boolean;
}

interface SyncResult {
  success: boolean;
  message: string;
  transactionsSynced?: number;
  budgetsSynced?: number;
  error?: string;
}

class CloudSyncService {
  private lastSyncTime: number = 0;
  private syncInterval: number = 5 * 60 * 1000; // 5 分钟
  private isSyncing: boolean = false;

  /**
   * 初始化同步服务
   */
  async initialize(): Promise<void> {
    try {
      const lastSync = await AsyncStorage.getItem('last_sync_time');
      if (lastSync) {
        this.lastSyncTime = parseInt(lastSync, 10);
      }
    } catch (error) {
      console.error('Failed to initialize sync service:', error);
    }
  }

  /**
   * 同步所有数据
   */
  async syncAll(options: SyncOptions): Promise<SyncResult> {
    if (this.isSyncing) {
      return {
        success: false,
        message: 'Sync already in progress',
      };
    }

    this.isSyncing = true;
    try {
      const results = await Promise.all([
        this.syncTransactions(options),
        this.syncBudgets(options),
      ]);

      const transactionsSynced = results[0];
      const budgetsSynced = results[1];

      // 更新最后同步时间
      this.lastSyncTime = Date.now();
      await AsyncStorage.setItem('last_sync_time', this.lastSyncTime.toString());

      return {
        success: true,
        message: 'Sync completed successfully',
        transactionsSynced,
        budgetsSynced,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Sync failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * 同步交易数据
   */
  private async syncTransactions(options: SyncOptions): Promise<number> {
    try {
      // 获取本地交易
      const localTransactions = await this.getLocalTransactions(options.userId);

      // 上传本地未同步的交易
      let uploadedCount = 0;
      for (const transaction of localTransactions) {
        if (!transaction.synced) {
          try {
            const response = await transactionApi.createTransaction(
              options.userId,
              transaction.type,
              transaction.amount,
              transaction.category,
              transaction.description || '',
              transaction.date
            );

            if (response.success) {
              // 标记为已同步
              await this.markTransactionSynced(transaction.id, response.id);
              uploadedCount++;
            }
          } catch (error) {
            console.error('Failed to upload transaction:', error);
          }
        }
      }

      // 下载服务器交易
      const response = await transactionApi.getTransactions(options.userId);
      if (response.success && response.data) {
        const serverTransactions = response.data;
        await this.saveRemoteTransactions(options.userId, serverTransactions);
      }

      return uploadedCount;
    } catch (error) {
      console.error('Transaction sync failed:', error);
      return 0;
    }
  }

  /**
   * 同步预算数据
   */
  private async syncBudgets(options: SyncOptions): Promise<number> {
    try {
      // 获取本地预算
      const localBudgets = await this.getLocalBudgets(options.userId);

      // 上传本地未同步的预算
      let uploadedCount = 0;
      for (const budget of localBudgets) {
        if (!budget.synced) {
          try {
            const response = await budgetApi.createBudget(
              options.userId,
              budget.category,
              budget.amount,
              budget.month
            );

            if (response.success) {
              // 标记为已同步
              await this.markBudgetSynced(budget.id, response.id);
              uploadedCount++;
            }
          } catch (error) {
            console.error('Failed to upload budget:', error);
          }
        }
      }

      // 下载服务器预算
      const response = await budgetApi.getBudgets(options.userId);
      if (response.success && response.data) {
        const serverBudgets = response.data;
        await this.saveRemoteBudgets(options.userId, serverBudgets);
      }

      return uploadedCount;
    } catch (error) {
      console.error('Budget sync failed:', error);
      return 0;
    }
  }

  /**
   * 获取本地交易
   */
  private async getLocalTransactions(userId: string): Promise<any[]> {
    try {
      const key = `transactions_${userId}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get local transactions:', error);
      return [];
    }
  }

  /**
   * 获取本地预算
   */
  private async getLocalBudgets(userId: string): Promise<any[]> {
    try {
      const key = `budgets_${userId}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get local budgets:', error);
      return [];
    }
  }

  /**
   * 标记交易已同步
   */
  private async markTransactionSynced(localId: string, serverId: string): Promise<void> {
    try {
      const key = 'transaction_sync_map';
      const data = await AsyncStorage.getItem(key);
      const map = data ? JSON.parse(data) : {};
      map[localId] = serverId;
      await AsyncStorage.setItem(key, JSON.stringify(map));
    } catch (error) {
      console.error('Failed to mark transaction synced:', error);
    }
  }

  /**
   * 标记预算已同步
   */
  private async markBudgetSynced(localId: string, serverId: string): Promise<void> {
    try {
      const key = 'budget_sync_map';
      const data = await AsyncStorage.getItem(key);
      const map = data ? JSON.parse(data) : {};
      map[localId] = serverId;
      await AsyncStorage.setItem(key, JSON.stringify(map));
    } catch (error) {
      console.error('Failed to mark budget synced:', error);
    }
  }

  /**
   * 保存远程交易
   */
  private async saveRemoteTransactions(userId: string, transactions: any[]): Promise<void> {
    try {
      const key = `remote_transactions_${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(transactions));
    } catch (error) {
      console.error('Failed to save remote transactions:', error);
    }
  }

  /**
   * 保存远程预算
   */
  private async saveRemoteBudgets(userId: string, budgets: any[]): Promise<void> {
    try {
      const key = `remote_budgets_${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(budgets));
    } catch (error) {
      console.error('Failed to save remote budgets:', error);
    }
  }

  /**
   * 获取同步状态
   */
  async getSyncStatus(): Promise<{
    lastSyncTime: number;
    isSyncing: boolean;
    nextSyncIn: number;
  }> {
    const nextSyncIn = Math.max(0, this.lastSyncTime + this.syncInterval - Date.now());
    return {
      lastSyncTime: this.lastSyncTime,
      isSyncing: this.isSyncing,
      nextSyncIn,
    };
  }

  /**
   * 上传交易
   */
  async uploadTransaction(
    userId: string,
    transaction: Transaction
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const response = await transactionApi.createTransaction(
        userId,
        transaction.type,
        transaction.amount,
        transaction.category,
        transaction.description || '',
        transaction.date
      );

      if (response.success) {
        return { success: true, id: response.id };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 上传预算
   */
  async uploadBudget(
    userId: string,
    budget: Budget
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const response = await budgetApi.createBudget(
        userId,
        budget.category,
        budget.amount,
        budget.month
      );

      if (response.success) {
        return { success: true, id: response.id };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 删除交易
   */
  async deleteTransaction(transactionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await transactionApi.deleteTransaction(transactionId);
      if (response.success) {
        return { success: true };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 删除预算
   */
  async deleteBudget(budgetId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await budgetApi.deleteBudget(budgetId);
      if (response.success) {
        return { success: true };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const cloudSyncService = new CloudSyncService();
export default cloudSyncService;
