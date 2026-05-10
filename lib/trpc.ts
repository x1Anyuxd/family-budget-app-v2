export const trpc: any = {
  Provider: ({ children }: any) => children,
  useContext: () => ({}),
  receipt: {
    analyze: {
      useMutation: () => ({
        mutateAsync: async () => ({}),
        isLoading: false,
      }),
    },
  },
};

export const createTRPCClient = () => ({});
