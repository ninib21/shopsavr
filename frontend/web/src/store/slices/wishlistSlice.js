import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { wishlistAPI } from '../../services/api';

// Async thunks
export const fetchWishlist = createAsyncThunk(
  'wishlist/fetchWishlist',
  async (_, { rejectWithValue }) => {
    try {
      const response = await wishlistAPI.getAll();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch wishlist');
    }
  }
);

export const addToWishlist = createAsyncThunk(
  'wishlist/addToWishlist',
  async (productData, { rejectWithValue }) => {
    try {
      const response = await wishlistAPI.add(productData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add to wishlist');
    }
  }
);

export const removeFromWishlist = createAsyncThunk(
  'wishlist/removeFromWishlist',
  async (id, { rejectWithValue }) => {
    try {
      await wishlistAPI.remove(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to remove from wishlist');
    }
  }
);

export const updateWishlistItem = createAsyncThunk(
  'wishlist/updateWishlistItem',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await wishlistAPI.update(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update wishlist item');
    }
  }
);

export const fetchPriceUpdates = createAsyncThunk(
  'wishlist/fetchPriceUpdates',
  async (_, { rejectWithValue }) => {
    try {
      const response = await wishlistAPI.getPriceUpdates();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch price updates');
    }
  }
);

const initialState = {
  items: [],
  priceUpdates: [],
  filters: {
    category: 'all',
    priceRange: 'all',
    sortBy: 'newest',
    search: '',
  },
  loading: {
    items: false,
    add: false,
    remove: false,
    update: false,
    priceUpdates: false,
  },
  error: {
    items: null,
    add: null,
    remove: null,
    update: null,
    priceUpdates: null,
  },
  selectedItems: [],
  viewMode: 'grid', // 'grid' or 'list'
  stats: {
    totalItems: 0,
    totalValue: 0,
    averagePrice: 0,
    priceDrops: 0,
  },
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    setViewMode: (state, action) => {
      state.viewMode = action.payload;
    },
    toggleItemSelection: (state, action) => {
      const itemId = action.payload;
      const index = state.selectedItems.indexOf(itemId);
      
      if (index > -1) {
        state.selectedItems.splice(index, 1);
      } else {
        state.selectedItems.push(itemId);
      }
    },
    selectAllItems: (state) => {
      state.selectedItems = state.items.map(item => item.id);
    },
    clearSelection: (state) => {
      state.selectedItems = [];
    },
    updateItemPrice: (state, action) => {
      const { itemId, newPrice, oldPrice } = action.payload;
      const item = state.items.find(item => item.id === itemId);
      
      if (item) {
        item.pricing.currentPrice = newPrice;
        item.pricing.previousPrice = oldPrice;
        item.pricing.lastUpdated = new Date().toISOString();
        
        // Calculate price change
        if (oldPrice && newPrice < oldPrice) {
          item.pricing.priceChange = {
            amount: oldPrice - newPrice,
            percentage: ((oldPrice - newPrice) / oldPrice) * 100,
            type: 'decrease'
          };
        } else if (oldPrice && newPrice > oldPrice) {
          item.pricing.priceChange = {
            amount: newPrice - oldPrice,
            percentage: ((newPrice - oldPrice) / oldPrice) * 100,
            type: 'increase'
          };
        }
      }
    },
    markPriceUpdateSeen: (state, action) => {
      const updateId = action.payload;
      const update = state.priceUpdates.find(u => u.id === updateId);
      if (update) {
        update.seen = true;
      }
    },
    clearErrors: (state) => {
      state.error = initialState.error;
    },
    updateStats: (state) => {
      const items = state.items;
      state.stats = {
        totalItems: items.length,
        totalValue: items.reduce((sum, item) => sum + (item.pricing.currentPrice || 0), 0),
        averagePrice: items.length > 0 
          ? items.reduce((sum, item) => sum + (item.pricing.currentPrice || 0), 0) / items.length 
          : 0,
        priceDrops: state.priceUpdates.filter(update => update.type === 'price_drop').length,
      };
    },
  },
  extraReducers: (builder) => {
    // Fetch wishlist
    builder
      .addCase(fetchWishlist.pending, (state) => {
        state.loading.items = true;
        state.error.items = null;
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.loading.items = false;
        state.items = action.payload.items || [];
        wishlistSlice.caseReducers.updateStats(state);
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.loading.items = false;
        state.error.items = action.payload;
      });

    // Add to wishlist
    builder
      .addCase(addToWishlist.pending, (state) => {
        state.loading.add = true;
        state.error.add = null;
      })
      .addCase(addToWishlist.fulfilled, (state, action) => {
        state.loading.add = false;
        state.items.unshift(action.payload.item);
        wishlistSlice.caseReducers.updateStats(state);
      })
      .addCase(addToWishlist.rejected, (state, action) => {
        state.loading.add = false;
        state.error.add = action.payload;
      });

    // Remove from wishlist
    builder
      .addCase(removeFromWishlist.pending, (state) => {
        state.loading.remove = true;
        state.error.remove = null;
      })
      .addCase(removeFromWishlist.fulfilled, (state, action) => {
        state.loading.remove = false;
        state.items = state.items.filter(item => item.id !== action.payload);
        state.selectedItems = state.selectedItems.filter(id => id !== action.payload);
        wishlistSlice.caseReducers.updateStats(state);
      })
      .addCase(removeFromWishlist.rejected, (state, action) => {
        state.loading.remove = false;
        state.error.remove = action.payload;
      });

    // Update wishlist item
    builder
      .addCase(updateWishlistItem.pending, (state) => {
        state.loading.update = true;
        state.error.update = null;
      })
      .addCase(updateWishlistItem.fulfilled, (state, action) => {
        state.loading.update = false;
        const index = state.items.findIndex(item => item.id === action.payload.item.id);
        if (index !== -1) {
          state.items[index] = action.payload.item;
        }
        wishlistSlice.caseReducers.updateStats(state);
      })
      .addCase(updateWishlistItem.rejected, (state, action) => {
        state.loading.update = false;
        state.error.update = action.payload;
      });

    // Fetch price updates
    builder
      .addCase(fetchPriceUpdates.pending, (state) => {
        state.loading.priceUpdates = true;
        state.error.priceUpdates = null;
      })
      .addCase(fetchPriceUpdates.fulfilled, (state, action) => {
        state.loading.priceUpdates = false;
        state.priceUpdates = action.payload.updates || [];
      })
      .addCase(fetchPriceUpdates.rejected, (state, action) => {
        state.loading.priceUpdates = false;
        state.error.priceUpdates = action.payload;
      });
  },
});

export const {
  setFilters,
  clearFilters,
  setViewMode,
  toggleItemSelection,
  selectAllItems,
  clearSelection,
  updateItemPrice,
  markPriceUpdateSeen,
  clearErrors,
  updateStats,
} = wishlistSlice.actions;

// Selectors
export const selectWishlistItems = (state) => state.wishlist.items;
export const selectWishlistFilters = (state) => state.wishlist.filters;
export const selectWishlistLoading = (state) => state.wishlist.loading;
export const selectWishlistErrors = (state) => state.wishlist.error;
export const selectSelectedItems = (state) => state.wishlist.selectedItems;
export const selectViewMode = (state) => state.wishlist.viewMode;
export const selectWishlistStats = (state) => state.wishlist.stats;
export const selectPriceUpdates = (state) => state.wishlist.priceUpdates;
export const selectUnseenPriceUpdates = (state) => 
  state.wishlist.priceUpdates.filter(update => !update.seen);

// Filtered wishlist items selector
export const selectFilteredWishlistItems = (state) => {
  const { items, filters } = state.wishlist;
  let filtered = [...items];

  // Filter by search
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(item =>
      item.product.name.toLowerCase().includes(searchLower) ||
      item.product.domain.toLowerCase().includes(searchLower)
    );
  }

  // Filter by category
  if (filters.category !== 'all') {
    filtered = filtered.filter(item => item.product.category === filters.category);
  }

  // Filter by price range
  if (filters.priceRange !== 'all') {
    const [min, max] = filters.priceRange.split('-').map(Number);
    filtered = filtered.filter(item => {
      const price = item.pricing.currentPrice || 0;
      if (max) {
        return price >= min && price <= max;
      } else {
        return price >= min;
      }
    });
  }

  // Sort
  switch (filters.sortBy) {
    case 'newest':
      filtered.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
      break;
    case 'oldest':
      filtered.sort((a, b) => new Date(a.addedAt) - new Date(b.addedAt));
      break;
    case 'price_high':
      filtered.sort((a, b) => (b.pricing.currentPrice || 0) - (a.pricing.currentPrice || 0));
      break;
    case 'price_low':
      filtered.sort((a, b) => (a.pricing.currentPrice || 0) - (b.pricing.currentPrice || 0));
      break;
    case 'name':
      filtered.sort((a, b) => a.product.name.localeCompare(b.product.name));
      break;
    case 'discount':
      filtered.sort((a, b) => {
        const aDiscount = a.pricing.priceChange?.percentage || 0;
        const bDiscount = b.pricing.priceChange?.percentage || 0;
        return bDiscount - aDiscount;
      });
      break;
    default:
      break;
  }

  return filtered;
};

export default wishlistSlice.reducer;