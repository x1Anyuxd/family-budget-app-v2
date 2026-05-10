import { useCallback, useMemo, useState } from 'react';

export type LocalAuthUser = {
  id: string;
  name?: string;
  email?: string;
};

type UseAuthOptions = {
  autoFetch?: boolean;
};

export function useAuth(_options?: UseAuthOptions) {
  const [user, setUser] = useState<LocalAuthUser | null>(null);
  const [loading] = useState(false);
  const [error] = useState<Error | null>(null);

  const refresh = useCallback(async () => user, [user]);

  const logout = useCallback(async () => {
    setUser(null);
  }, []);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    refresh,
    logout,
  };
}
