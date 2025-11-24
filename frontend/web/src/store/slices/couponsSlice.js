import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { couponsAPI } from '../../services/api';

// Async thunks
export const fetchCoupons = createAsyncThunk(
  'coupons/fetchCoupons',
  async (params, { rejectWithValue }) => {
    try {
      const response = await couponsAPI.getAll(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch coupons');
    }
  }
);

export const searchCoupons = createAsyncThunk(
  'coupons/searchCoupons',
  async (domain, { rejectWithValue }) => {
    try {
      const response = await couponsAPI.search(domain);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to search coupons');
    }
  }
);

export const validateCoupon = createAsyncThunk(
  'coupons/validateCoupon',
  async ({ code, domain }, { rejectWithValue }) => {
    try {
      const response = await couponsAPI.validate(code, domain);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to validate coupon');
    }
  }
);

export const fetchCouponStats = createAsyncThunk(
  'coupons/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await couponsAPI.getStats();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch coupon stats');
    }
  }
);

const initialState = {
  coupons: [],
  searchResults: [],
  stats: {
    totalCoupons: 0,
    activeCoupons: 0,
    successRate: 0,
    totalSavings: 0,
  },
  filters: {
    category: 'all',
    sortBy: 'newest',
    domain: '',
    discountType: 'all',
  },
  loading: {
    coupons: false,
    search: false,
    validation: false,
    stats: false,
  },
  error: {
    coupons: null,
    search: null,
    validation: null,
    stats: null,
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  selectedCoupon: null,
  recentlyUsed: [],
};

const couponsSlice = createSlice({
  name: 'coupons',
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
    setSelectedCoupon: (state, action) => {
      state.selectedCoupon = action.payload;
    },
    clearSelectedCoupon: (state) => {
      state.selectedCoupon = null;
    },
    addRecentlyUsed: (state, action) => {
      const coupon = action.payload;
      // Remove if already exists
      state.recentlyUsed = state.recentlyUsed.filter(c => c.id !== coupon.id);
      // Add to beginning
      state.recentlyUsed.unshift(coupon);
      // Keep only last 10
      if (state.recentlyUsed.length > 10) {
        state.recentlyUsed = state.recentlyUsed.slice(0, 10);
      }
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.error.search = null;
    },
    clearErrors: (state) => {
      state.error = initialState.error;
    },
  },
  extraReducers: (builder) => {
    // Fetch coupons
    builder
      .addCase(fetchCoupons.pending, (state) => {
        state.loading.coupons = true;
        state.error.coupons = null;
      })
      .addCase(fetchCoupons.fulfilled, (state, action) => {
        state.loading.coupons = false;
        state.coupons = action.payload.coupons || [];
        state.pagination = {
          ...state.pagination,
          ...action.payload.pagination,
        };
      })
      .addCase(fetchCoupons.rejected, (state, action) => {
        state.loading.coupons = false;
        state.error.coupons = action.payload;
      });

    // Search coupons
    builder
      .addCase(searchCoupons.pending, (state) => {
        state.loading.search = true;
        state.error.search = null;
      })
      .addCase(searchCoupons.fulfilled, (state, action) => {
        state.loading.search = false;
        state.searchResults = action.payload.coupons || [];
      })
      .addCase(searchCoupons.rejected, (state, action) => {
        state.loading.search = false;
        state.error.search = action.payload;
      });

    // Validate coupon
    builder
      .addCase(validateCoupon.pending, (state) => {
        state.loading.validation = true;
        state.error.validation = null;
      })
      .addCase(validateCoupon.fulfilled, (state, action) => {
        state.loading.validation = false;
        // Update coupon in the list if it exists
        const couponIndex = state.coupons.findIndex(c => c.code === action.payload.code);
        if (couponIndex !== -1) {
          state.coupons[couponIndex] = { ...state.coupons[couponIndex], ...action.payload };
        }
      })
      .addCase(validateCoupon.rejected, (state, action) => {
        state.loading.validation = false;
        state.error.validation = action.payload;
      });

    // Fetch stats
    builder
      .addCase(fetchCouponStats.pending, (state) => {
        state.loading.stats = true;
        state.error.stats = null;
      })
      .addCase(fetchCouponStats.fulfilled, (state, action) => {
        state.loading.stats = false;
        state.stats = action.payload;
      })
      .addCase(fetchCouponStats.rejected, (state, action) => {
        state.loading.stats = false;
        state.error.stats = action.payload;
      });
  },
});

export const {
  setFilters,
  clearFilters,
  setPage,
  setSelectedCoupon,
  clearSelectedCoupon,
  addRecentlyUsed,
  clearSearchResults,
  clearErrors,
} = couponsSlice.actions;

// Selectors
export const selectCoupons = (state) => state.coupons.coupons;
export const selectSearchResults = (state) => state.coupons.searchResults;
export const selectCouponStats = (state) => state.coupons.stats;
export const selectCouponFilters = (state) => state.coupons.filters;
export const selectCouponLoading = (state) => state.coupons.loading;
export const selectCouponErrors = (state) => state.coupons.error;
export const selectCouponPagination = (state) => state.coupons.pagination;
export const selectSelectedCoupon = (state) => state.coupons.selectedCoupon;
export const selectRecentlyUsedCoupons = (state) => state.coupons.recentlyUsed;

// Filtered coupons selector
export const selectFilteredCoupons = (state) => {
  const { coupons, filters } = state.coupons;
  let filtered = [...coupons];

  // Filter by category
  if (filters.category !== 'all') {
    filtered = filtered.filter(coupon => coupon.category === filters.category);
  }

  // Filter by domain
  if (filters.domain) {
    filtered = filtered.filter(coupon => 
      coupon.domain.toLowerCase().includes(filters.domain.toLowerCase())
    );
  }

  // Filter by discount type
  if (filters.discountType !== 'all') {
    filtered = filtered.filter(coupon => coupon.discountType === filters.discountType);
  }

  // Sort
  switch (filters.sortBy) {
    case 'newest':
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
    case 'oldest':
      filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      break;
    case 'discount_high':
      filtered.sort((a, b) => b.discountValue - a.discountValue);
      break;
    case 'discount_low':
      filtered.sort((a, b) => a.discountValue - b.discountValue);
      break;
    case 'success_rate':
      filtered.sort((a, b) => (b.successRate || 0) - (a.successRate || 0));
      break;
    default:
      break;
  }

  return filtered;
};

export default couponsSlice.reducer;