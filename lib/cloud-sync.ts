import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Transaction, Budget } from './types';

/**
 * 云同步模块
 * 提供数据的上传、下载和多设备同步功能
 */

export interface SyncMetadata {
  lastSyncTime: number;
  deviceId: string;
  version: number;
}

export interface SyncPayload {
  transactions: Transaction[];
  budgets: Budget[];
  metadata: SyncMetadata;
}

export interface SyncConflict {
  type: 'transaction' | 'budget';
  id: string;
  localVersion: any;
  remoteVersion: any;
  localTimestamp: number;
  remoteTimestamp: number;
}

class CloudSyncManager {
  private syncEndpoint = 'https://api.example.com/sync'; // 替换为实际的 API 端点
  private deviceId: string;
  private lastSyncTime: number = 0;
  private syncInProgress: boolean = false;

  constructor() {
    this.deviceId = this.generateDeviceId();
    this.loadSyncMetadata();
  }

  /**
   * 生成唯一的设备 ID
   */
  private generateDeviceId(): string {
    const stored = AsyncStorage.getItem('@device_id');
    if (stored) {
      return stored as unknown as string;
    }
    const newId = `device_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    AsyncStorage.setItem('@device_id', newId);
    return newId;
  }

  /**
   * 加载同步元数据
   */
  private async loadSyncMetadata(): Promise<void> {
    try {
      const metadata = await AsyncStorage.getItem('@sync_metadata');
      if (metadata) {
        const parsed = JSON.parse(metadata);
        this.lastSyncTime = parsed.lastSyncTime || 0;
      }
    } catch (error) {
      console.error('Failed to load sync metadata:', error);
    }
  }

  /**
   * 保存同步元数据
   */
  private async saveSyncMetadata(): Promise<void> {
    try {
      const metadata: SyncMetadata = {
        lastSyncTime: Date.now(),
        deviceId: this.deviceId,
        version: 1,
      };
      await AsyncStorage.setItem('@sync_metadata', JSON.stringify(metadata));
      this.lastSyncTime = metadata.lastSyncTime;
    } catch (error) {
      console.error('Failed to save sync metadata:', error);
    }
  }

  /**
   * 上传本地数据到云端
   */
  async uploadData(
    transactions: Transaction[],
    budgets: Budget[]
  ): Promise<{ success: boolean; error?: string }> {
    if (this.syncInProgress) {
      return { success: false, error: 'Sync already in progress' };
    }

    this.syncInProgress = true;
    try {
      const payload: SyncPayload = {
        transactions,
        budgets,
        metadata: {
          lastSyncTime: Date.now(),
          deviceId: this.deviceId,
          version: 1,
        },
      };

      const response = await fetch(`${this.syncEndpoint}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-ID': this.deviceId,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      await this.saveSyncMetadata();
      return { success: true };
    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * 从云端下载数据
   */
  async downloadData(): Promise<{
    success: boolean;
    data?: SyncPayload;
    error?: string;
  }> {
    if (this.syncInProgress) {
      return { success: false, error: 'Sync already in progress' };
    }

    this.syncInProgress = true;
    try {
      const response = await fetch(
        `${this.syncEndpoint}/download?since=${this.lastSyncTime}`,
        {
          method: 'GET',
          headers: {
            'X-Device-ID': this.deviceId,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const data: SyncPayload = await response.json();
      await this.saveSyncMetadata();
      return { success: true, data };
    } catch (error) {
      console.error('Download error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * 双向同步
   */
  async bidirectionalSync(
    localTransactions: Transaction[],
    localBudgets: Budget[]
  ): Promise<{
    success: boolean;
    mergedTransactions?: Transaction[];
    mergedBudgets?: Budget[];
    conflicts?: SyncConflict[];
    error?: string;
  }> {
    try {
      // 1. 上传本地数据
      const uploadResult = await this.uploadData(localTransactions, localBudgets);
      if (!uploadResult.success) {
        throw new Error(uploadResult.error);
      }

      // 2. 下载远程数据
      const downloadResult = await this.downloadData();
      if (!downloadResult.success) {
        throw new Error(downloadResult.error);
      }

      const remoteData = downloadResult.data!;

      // 3. 检测冲突并合并
      const conflicts: SyncConflict[] = [];
      const mergedTransactions = this.mergeTransactions(
        localTransactions,
        remoteData.transactions,
        conflicts
      );
      const mergedBudgets = this.mergeBudgets(
        localBudgets,
        remoteData.budgets,
        conflicts
      );

      return {
        success: true,
        mergedTransactions,
        mergedBudgets,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
      };
    } catch (error) {
      console.error('Bidirectional sync error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 合并交易记录
   */
  private mergeTransactions(
    local: Transaction[],
    remote: Transaction[],
    conflicts: SyncConflict[]
  ): Transaction[] {
    const merged = new Map<string, Transaction>();

    // 添加本地数据
    local.forEach((tx) => merged.set(tx.id, tx));

    // 处理远程数据
    remote.forEach((remoteTx) => {
      const localTx = merged.get(remoteTx.id);

      if (!localTx) {
        // 远程有，本地没有 - 添加远程数据
        merged.set(remoteTx.id, remoteTx);
      } else {
        // 两边都有 - 检查冲突
        const localTime = new Date(localTx.createdAt).getTime();
        const remoteTime = new Date(remoteTx.createdAt).getTime();

        if (localTime === remoteTime && JSON.stringify(localTx) !== JSON.stringify(remoteTx)) {
          // 时间戳相同但内容不同 - 冲突
          conflicts.push({
            type: 'transaction',
            id: remoteTx.id,
            localVersion: localTx,
            remoteVersion: remoteTx,
            localTimestamp: localTime,
            remoteTimestamp: remoteTime,
          });
          // 保留最新修改的版本
          merged.set(remoteTx.id, remoteTime > localTime ? remoteTx : localTx);
        } else if (remoteTime > localTime) {
          // 远程更新 - 使用远程版本
          merged.set(remoteTx.id, remoteTx);
        }
        // 否则保留本地版本
      }
    });

    return Array.from(merged.values());
  }

  /**
   * 合并预算数据
   */
  private mergeBudgets(
    local: Budget[],
    remote: Budget[],
    conflicts: SyncConflict[]
  ): Budget[] {
    const merged = new Map<string, Budget>();

    // 添加本地数据
    local.forEach((budget) => merged.set(budget.id, budget));

    // 处理远程数据
    remote.forEach((remoteBudget) => {
      const localBudget = merged.get(remoteBudget.id);

      if (!localBudget) {
        // 远程有，本地没有 - 添加远程数据
        merged.set(remoteBudget.id, remoteBudget);
      } else {
        // 两边都有 - 检查冲突
        const localTime = new Date(localBudget.createdAt).getTime();
        const remoteTime = new Date(remoteBudget.createdAt).getTime();

        if (localTime === remoteTime && JSON.stringify(localBudget) !== JSON.stringify(remoteBudget)) {
          // 时间戳相同但内容不同 - 冲突
          conflicts.push({
            type: 'budget',
            id: remoteBudget.id,
            localVersion: localBudget,
            remoteVersion: remoteBudget,
            localTimestamp: localTime,
            remoteTimestamp: remoteTime,
          });
          // 保留最新修改的版本
          merged.set(remoteBudget.id, remoteTime > localTime ? remoteBudget : localBudget);
        } else if (remoteTime > localTime) {
          // 远程更新 - 使用远程版本
          merged.set(remoteBudget.id, remoteBudget);
        }
        // 否则保留本地版本
      }
    });

    return Array.from(merged.values());
  }

  /**
   * 解决冲突
   */
  resolveConflict(
    conflict: SyncConflict,
    resolution: 'local' | 'remote'
  ): Transaction | Budget {
    return resolution === 'local' ? conflict.localVersion : conflict.remoteVersion;
  }

  /**
   * 获取同步状态
   */
  getSyncStatus(): {
    lastSyncTime: number;
    deviceId: string;
    isSyncing: boolean;
  } {
    return {
      lastSyncTime: this.lastSyncTime,
      deviceId: this.deviceId,
      isSyncing: this.syncInProgress,
    };
  }

  /**
   * 清除同步数据
   */
  async clearSyncData(): Promise<void> {
    try {
      await AsyncStorage.removeItem('@sync_metadata');
      this.lastSyncTime = 0;
    } catch (error) {
      console.error('Failed to clear sync data:', error);
    }
  }
}

export const cloudSyncManager = new CloudSyncManager();
