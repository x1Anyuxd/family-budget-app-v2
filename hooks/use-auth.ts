import { useCallback, useMemo, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient, userApi } from '../lib/api-client';

export type LocalAuthUser = {
  id: string;
  name?: string;
  email?: string;
  username?: string;
  fullName?: string;
  avatarUrl?: string;
};

type UseAuthOptions = {
  autoFetch?: boolean;
};

export function useAuth(_options?: UseAuthOptions) {
  const [user, setUser] = useState<LocalAuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 初始化时检查是否已登录
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        const userId = await AsyncStorage.getItem('user_id');
        
        if (token && userId) {
          // 从后端获取用户信息
          const response = await userApi.getUser(userId);
          if (response.success && response.data) {
            setUser({
              id: response.data.id || userId,
              name: response.data.fullName || response.data.username,
              email: response.data.email,
              username: response.data.username,
              fullName: response.data.fullName,
              avatarUrl: response.data.avatarUrl,
            });
          }
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        // 清除过期的令牌
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('user_id');
      }
    };

    checkAuth();
  }, []);

  // 注册
  const register = useCallback(
    async (username: string, email: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await userApi.register(username, email, password);
        if (response.success) {
          // 自动登录
          return await login(username, password);
        } else {
          throw new Error(response.error || 'Registration failed');
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Registration failed');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // 登录
  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await userApi.login(username, password);
      if (response.success) {
        const userData: LocalAuthUser = {
          id: response.userId,
          username: response.username,
          email: response.email,
          name: response.username,
        };

        // 保存令牌和用户信息
        await apiClient.setToken(response.token);
        await AsyncStorage.setItem('user_id', response.userId);
        await AsyncStorage.setItem('user_data', JSON.stringify(userData));

        setUser(userData);
        return userData;
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Login failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 登出
  const logout = useCallback(async () => {
    try {
      await apiClient.clearToken();
      await AsyncStorage.removeItem('user_id');
      await AsyncStorage.removeItem('user_data');
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }, []);

  // 更新用户信息
  const updateProfile = useCallback(
    async (fullName?: string, avatarUrl?: string) => {
      if (!user) throw new Error('User not logged in');

      setLoading(true);
      setError(null);
      try {
        const response = await userApi.updateUser(user.id, fullName, avatarUrl);
        if (response.success) {
          const updatedUser: LocalAuthUser = {
            ...user,
            fullName: fullName || user.fullName,
            avatarUrl: avatarUrl || user.avatarUrl,
            name: fullName || user.name,
          };
          setUser(updatedUser);
          await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
          return updatedUser;
        } else {
          throw new Error(response.error || 'Update failed');
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Update failed');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  // 刷新用户信息
  const refresh = useCallback(async () => {
    if (!user) return user;

    try {
      const response = await userApi.getUser(user.id);
      if (response.success && response.data) {
        const updatedUser: LocalAuthUser = {
          id: response.data.id,
          username: response.data.username,
          email: response.data.email,
          fullName: response.data.fullName,
          avatarUrl: response.data.avatarUrl,
          name: response.data.fullName || response.data.username,
        };
        setUser(updatedUser);
        return updatedUser;
      }
    } catch (err) {
      console.error('Refresh failed:', err);
    }
    return user;
  }, [user]);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    register,
    login,
    logout,
    updateProfile,
    refresh,
  };
}
