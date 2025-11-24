import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { savingsAPI } from '../../services/api';

// Async thunks
export const fetchSavingsSummary = createAsyncThunk(
  'savings/fetchSummary',
  async (_, { rejectWithValue }) => {
    try {
      const response = await savingsAPI.getSummary();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch savings summary');
    }
  }
);

export const fetchSavingsHistory = createAsyncThunk(
  'savings/fetchHistory',
  async (params, { rejectWithValue }) => {
    try {
      const response = await savingsAPI.getHistory(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch savings history');
    }
  }
);

export const applyCoupon = createAsyncThunk(
  'savings/applyCoupon',
  async (couponData, { rejectWithValue }) => {
    try {
      const response = await savingsAPI.apply(couponData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to apply coupon');
    }
  }
);

export const fetchSavingsStats = createAsyncThunk(
  'savings/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await savingsAPI.getStats();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch savings stats');
    }
  }
);

const initialState = {
  summary: {
    totalSaved: 0,
    lifetimeSavings: 0,
    couponsUsed: 0,
    averageSavings: 0,
    thisMonth: 0,
    lastMonth: 0,
    thisYear: 0,
  },
  history: [],
  stats: {
    topDomains: [],
    monthlySavings: [],
    couponTypes: [],
    savingsGoal: 0,
    goalProgress: 0,
  },
  filters: {
    dateRange: '30d', // '7d', '30d', '90d', '1y', 'all'
    domain: 'all',
    couponType: 'all',
    minAmount: 0,
  },
  loading: {
    summary: false,
    history: false,
    apply: false,
    stats: false,
  },
  error: {
    summary: null,
    history: null,
    apply: null,
    stats: null,
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  recentSavings: [],
  achievements: [],
};

const savingsSlice = createSlice({
  name: 'savings',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1; // Reset to first page when filters change
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
      state.pagination.page = 1;
    },
    setPage: (state, action) => {
      state.pagination.page = action.payload;
    },
    addRecentSaving: (state, action) => {
      const saving = action.payload;
      // Remove if already exists
      state.recentSavings = state.recentSavings.filter(s => s.id !== saving.id);
      // Add to beginning
      state.recentSavings.unshift(saving);
      // Keep only last 10
      if (state.recentSavings.length > 10) {
        state.recentSavings = state.recentSavings.slice(0, 10);
      }
      
      // Update summary totals
      state.summary.totalSaved += saving.amount;
      state.summary.couponsUsed += 1;
      state.summary.averageSavings = state.summary.totalSaved / state.summary.couponsUsed;
    },
    setSavingsGoal: (state, action) => {
      state.stats.savingsGoal = action.payload;
      state.stats.goalProgress = state.summary.totalSaved / action.payload * 100;
    },
    addAchievement: (state, action) => {
      const achievement = action.payload;
      if (!state.achievements.find(a => a.id === achievement.id)) {
        state.achievements.push(achievement);
      }
    },
    markAchievementSeen: (state, action) => {
      const achievementId = action.payload;
      const achievement = state.achievements.find(a => a.id === achievementId);
      if (achievement) {
        achievement.seen = true;
      }
    },
    clearErrors: (state) => {
      state.error = initialState.error;
    },
  },
  extraReducers: (builder) => {
    // Fetch savings summary
    builder
      .addCase(fetchSavingsSummary.pending, (state) => {
        state.loading.summary = true;
        state.error.summary = null;
      })
      .addCase(fetchSavingsSummary.fulfilled, (state, action) => {
        state.loading.summary = false;
        state.summary = { ...state.summary, ...action.payload };
        
        // Update goal progress
        if (state.stats.savingsGoal > 0) {
          state.stats.goalProgress = state.summary.totalSaved / state.stats.savingsGoal * 100;
        }
      })
      .addCase(fetchSavingsSummary.rejected, (state, action) => {
        state.loading.summary = false;
        state.error.summary = action.payload;
      });

    // Fetch savings history
    builder
      .addCase(fetchSavingsHistory.pending, (state) => {
        state.loading.history = true;
        state.error.history = null;
      })
      .addCase(fetchSavingsHistory.fulfilled, (state, action) => {
        state.loading.history = false;
        state.history = action.payload.history || [];
        state.pagination = {
          ...state.pagination,
          ...action.payload.pagination,
        };
      })
      .addCase(fetchSavingsHistory.rejected, (state, action) => {
        state.loading.history = false;
        state.error.history = action.payload;
      });

    // Apply coupon
    builder
      .addCase(applyCoupon.pending, (state) => {
        state.loading.apply = true;
        state.error.apply = null;
      })
      .addCase(applyCoupon.fulfilled, (state, action) => {
        state.loading.apply = false;
        const saving = action.payload.saving;
        
        // Add to recent savings
        savingsSlice.caseReducers.addRecentSaving(state, { payload: saving });
        
        // Add to history
        state.history.unshift(saving);
      })
      .addCase(applyCoupon.rejected, (state, action) => {
        state.loading.apply = false;
        state.error.apply = action.payload;
      });

    // Fetch savings stats
    builder
      .addCase(fetchSavingsStats.pending, (state) => {
        state.loading.stats = true;
        state.error.stats = null;
      })
      .addCase(fetchSavingsStats.fulfilled, (state, action) => {
        state.loading.stats = false;
        state.stats = { ...state.stats, ...action.payload };
      })
      .addCase(fetchSavingsStats.rejected, (state, action) => {
        state.loading.stats = false;
        state.error.stats = action.payload;
      });
  },
});

export const {
  setFilters,
  clearFilters,
  setPage,
  addRecentSaving,
  setSavingsGoal,
  addAchievement,
  markAchievementSeen,
  clearErrors,
} = savingsSlice.actions;

// Selectors
export const selectSavingsSummary = (state) => state.savings.summary;
export const selectSavingsHistory = (state) => state.savings.history;
export const selectSavingsStats = (state) => state.savings.stats;
export const selectSavingsFilters = (state) => state.savings.filters;
export const selectSavingsLoading = (state) => state.savings.loading;
export const selectSavingsErrors = (state) => state.savings.error;
export const selectSavingsPagination = (state) => state.savings.pagination;
export const selectRecentSavings = (state) => state.savings.recentSavings;
export const selectAchievements = (state) => state.savings.achievements;
export const selectUnseenAchievements = (state) => 
  state.savings.achievements.filter(achievement => !achievement.seen);

// Filtered savings history selector
export const selectFilteredSavingsHistory = (state) => {
  const { history, filters } = state.savings;
  let filtered = [...history];

  // Filter by date range
  if (filters.dateRange !== 'all') {
    const now = new Date();
    let startDate;
    
    switch (filters.dateRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = null;
    }
    
    if (startDate) {
      filtered = filtered.filter(saving => new Date(saving.createdAt) >= startDate);
    }
  }

  // Filter by domain
  if (filters.domain !== 'all') {
    filtered = filtered.filter(saving => saving.domain === filters.domain);
  }

  // Filter by coupon type
  if (filters.couponType !== 'all') {
    filtered = filtered.filter(saving => saving.couponType === filters.couponType);
  }

  // Filter by minimum amount
  if (filters.minAmount > 0) {
    filtered = filtered.filter(saving => saving.amount >= filters.minAmount);
  }

  return filtered;
};

// Savings trends selector
export const selectSavingsTrends = (state) => {
  const { summary } = state.savings;
  
  return {
    monthlyGrowth: summary.thisMonth > summary.lastMonth 
      ? ((summary.thisMonth - summary.lastMonth) / summary.lastMonth) * 100 
      : 0,
    isGrowing: summary.thisMonth > summary.lastMonth,
    goalProgress: state.savings.stats.goalProgress,
    isOnTrack: state.savings.stats.goalProgress >= 75, // 75% of goal is considered on track
  };
};

export default savingsSlice.reducer;