export type MatchupEnvironment = {
  id: string;
  name: string;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string | null; // 'YYYY-MM-DD' or null for current
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type EnvironmentInput = Omit<MatchupEnvironment, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};
