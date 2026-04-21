import { apiRequest } from '@/lib/api';

export type PrimaryGoal = 'control' | 'save' | 'budget';
export type ExpenseCategory =
  | 'health'
  | 'groceries'
  | 'utilities'
  | 'entertainment'
  | 'dining'
  | 'transport'
  | 'other';

export type UserPayload = {
  id: string;
  fullName: string;
  email: string;
  isEmailVerified: boolean;
  monthlyIncome: number;
  primaryGoal?: PrimaryGoal;
  phoneCountryCode?: string;
  phoneNumber?: string;
};

export type RegisterResponse = {
  message: string;
  token: string;
  user: UserPayload;
  verificationRequired: boolean;
  devVerificationUrl?: string;
};

export type LoginResponse = {
  message: string;
  token: string;
  user: UserPayload;
};

export type VerificationStatusResponse = {
  email: string;
  verified: boolean;
};

export type ResendVerificationResponse = {
  message: string;
  verified?: boolean;
  devVerificationUrl?: string;
};

export type CreateExpenseResponse = {
  message: string;
  expense: {
    id: string;
    category: ExpenseCategory;
    amount: number;
    description?: string;
    spentAt: string;
    createdAt: string;
    updatedAt: string;
  };
};

export type UpdateExpenseResponse = {
  message: string;
  expense: ExpensePayload;
};

export type ExpensePayload = {
  id: string;
  category: ExpenseCategory;
  amount: number;
  description?: string;
  spentAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ExpensesResponse = {
  expenses: ExpensePayload[];
};

export type ExpenseCategorySummaryPayload = {
  key: ExpenseCategory;
  name: string;
  month: string;
  currentMonthTotal: number;
  sixMonthAverage: number;
  transactionsCount: number;
  percentageDelta: number;
  hasHistoricalAverage: boolean;
};

export type ExpenseDetailResponse = {
  expense: ExpensePayload;
  categorySummary: ExpenseCategorySummaryPayload;
};

export type ExpenseCategoryAnalysisResponse = {
  month: string;
  category: {
    key: ExpenseCategory;
    name: string;
  };
  currentMonthTotal: number;
  sixMonthAverage: number;
  transactionsCount: number;
  percentageDelta: number;
  hasHistoricalAverage: boolean;
  trend: {
    month: string;
    label: string;
    amount: number;
  }[];
  recentTransactions: ExpensePayload[];
  aiInsight: string;
};

export type CurrentUserResponse = {
  user: UserPayload;
};

export type MonthlySummaryResponse = {
  month: string;
  financialHealthScore: number;
  totalSpending: number;
  previousMonthSpending: number;
  savings: number;
  underBudgetAmount: number;
  topCategory: {
    key: ExpenseCategory;
    name: string;
    amount: number;
  } | null;
  categoryBreakdown: {
    key: ExpenseCategory;
    name: string;
    amount: number;
    share: number;
  }[];
  aiSummary: string;
};

export type OverspendingAlertsResponse = {
  activeAlerts: number;
  alerts: {
    key: ExpenseCategory;
    name: string;
    currentSpending: number;
    sixMonthAverage: number;
    percentageAboveAverage: number;
    risk: 'medium' | 'low';
  }[];
  smartTips: string[];
};

export type AssistantChatMessage = {
  role: 'user' | 'assistant';
  text: string;
};

export type AssistantChatResponse = {
  reply: string;
  provider: 'anthropic' | 'fallback';
};

export function registerUser(payload: {
  fullName: string;
  email: string;
  password: string;
}) {
  return apiRequest<RegisterResponse>('/api/auth/register', {
    method: 'POST',
    body: payload,
  });
}

export function loginUser(payload: { email: string; password: string }) {
  return apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: payload,
  });
}

export function getVerificationStatus(email: string) {
  const query = new URLSearchParams({ email });
  return apiRequest<VerificationStatusResponse>(`/api/auth/verification-status?${query.toString()}`);
}

export function resendVerificationEmail(email: string) {
  return apiRequest<ResendVerificationResponse>('/api/auth/resend-verification', {
    method: 'POST',
    body: { email },
  });
}

export function getCurrentUser(token: string) {
  return apiRequest<CurrentUserResponse>('/api/users/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function updateCurrentUser(
  token: string,
  payload: {
    monthlyIncome?: number;
    primaryGoal?: PrimaryGoal;
    fullName?: string;
    email?: string;
    phoneCountryCode?: string;
    phoneNumber?: string;
  },
) {
  return apiRequest<{ message: string; user: UserPayload }>('/api/users/me', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: payload,
  });
}

export function changePassword(
  token: string,
  payload: {
    currentPassword: string;
    newPassword: string;
  },
) {
  return apiRequest<{ message: string }>('/api/users/change-password', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: payload,
  });
}

export function createExpense(
  token: string,
  payload: {
    category: ExpenseCategory;
    amount: number;
    description?: string;
    spentAt?: string;
  },
) {
  return apiRequest<CreateExpenseResponse>('/api/expenses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: payload,
  });
}

export function getExpenses(token: string, month?: string) {
  const query = month ? `?${new URLSearchParams({ month }).toString()}` : '';

  return apiRequest<ExpensesResponse>(`/api/expenses${query}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getExpenseDetail(token: string, expenseId: string) {
  return apiRequest<ExpenseDetailResponse>(`/api/expenses/${expenseId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function updateExpense(
  token: string,
  expenseId: string,
  payload: {
    category?: ExpenseCategory;
    amount?: number;
    description?: string;
    spentAt?: string;
  },
) {
  return apiRequest<UpdateExpenseResponse>(`/api/expenses/${expenseId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: payload,
  });
}

export function deleteExpense(token: string, expenseId: string) {
  return apiRequest<{ message: string }>(`/api/expenses/${expenseId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getExpenseCategoryAnalysis(token: string, category: ExpenseCategory, month?: string) {
  const query = month ? `?${new URLSearchParams({ month }).toString()}` : '';

  return apiRequest<ExpenseCategoryAnalysisResponse>(
    `/api/expenses/category-analysis/${category}${query}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
}

export function getMonthlySummary(token: string, month?: string) {
  const query = month ? `?${new URLSearchParams({ month }).toString()}` : '';

  return apiRequest<MonthlySummaryResponse>(`/api/expenses/monthly-summary${query}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getOverspendingAlerts(token: string, month?: string) {
  const query = month ? `?${new URLSearchParams({ month }).toString()}` : '';

  return apiRequest<OverspendingAlertsResponse>(`/api/expenses/overspending-alerts${query}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function chatWithAssistant(
  token: string,
  payload: {
    message: string;
    history?: AssistantChatMessage[];
    context?: {
      screen?: string;
      category?: ExpenseCategory;
      expenseId?: string;
    };
    month?: string;
  },
) {
  return apiRequest<AssistantChatResponse>('/api/assistant/chat', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: payload,
  });
}
