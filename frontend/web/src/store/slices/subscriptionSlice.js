import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { subscriptionAPI } from '../../services/api';

// Async thunks
export const fetchSubscriptionPlans = createAsyncThunk(
  'subscription/fetchPlans',
  async (_, { rejectWithValue }) => {
    try {
      const response = await subscriptionAPI.getPlans();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch subscription plans');
    }
  }
);

export const fetchCurrentSubscription = createAsyncThunk(
  'subscription/fetchCurrent',
  async (_, { rejectWithValue }) => {
    try {
      const response = await subscriptionAPI.getCurrent();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch current subscription');
    }
  }
);

export const createSubscription = createAsyncThunk(
  'subscription/create',
  async (planData, { rejectWithValue }) => {
    try {
      const response = await subscriptionAPI.create(planData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create subscription');
    }
  }
);

export const updateSubscription = createAsyncThunk(
  'subscription/update',
  async (planData, { rejectWithValue }) => {
    try {
      const response = await subscriptionAPI.update(planData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update subscription');
    }
  }
);

export const cancelSubscription = createAsyncThunk(
  'subscription/cancel',
  async (cancelData, { rejectWithValue }) => {
    try {
      const response = await subscriptionAPI.cancel(cancelData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to cancel subscription');
    }
  }
);

export const fetchPaymentMethods = createAsyncThunk(
  'subscription/fetchPaymentMethods',
  async (_, { rejectWithValue }) => {
    try {
      const response = await subscriptionAPI.getPaymentMethods();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch payment methods');
    }
  }
);

export const createSetupIntent = createAsyncThunk(
  'subscription/createSetupIntent',
  async (_, { rejectWithValue }) => {
    try {
      const response = await subscriptionAPI.createSetupIntent();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create setup intent');
    }
  }
);

export const fetchBillingHistory = createAsyncThunk(
  'subscription/fetchBillingHistory',
  async (_, { rejectWithValue }) => {
    try {
      const response = await subscriptionAPI.getBillingHistory();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch billing history');
    }
  }
);

const initialState = {
  plans: [],
  currentSubscription: null,
  paymentMethods: [],
  billingHistory: [],
  setupIntent: null,
  loading: {
    plans: false,
    current: false,
    create: false,
    update: false,
    cancel: false,
    paymentMethods: false,
    setupIntent: false,
    billingHistory: false,
  },
  error: {
    plans: null,
    current: null,
    create: null,
    update: null,
    cancel: null,
    paymentMethods: null,
    setupIntent: null,
    billingHistory: null,
  },
  ui: {
    showUpgradeModal: false,
    showCancelModal: false,
    showPaymentModal: false,
    selectedPlan: null,
  },
};

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    setSelectedPlan: (state, action) => {
      state.ui.selectedPlan = action.payload;
    },
    showUpgradeModal: (state, action) => {
      state.ui.showUpgradeModal = true;
      if (action.payload) {
        state.ui.selectedPlan = action.payload;
      }
    },
    hideUpgradeModal: (state) => {
      state.ui.showUpgradeModal = false;
      state.ui.selectedPlan = null;
    },
    showCancelModal: (state) => {
      state.ui.showCancelModal = true;
    },
    hideCancelModal: (state) => {
      state.ui.showCancelModal = false;
    },
    showPaymentModal: (state) => {
      state.ui.showPaymentModal = true;
    },
    hidePaymentModal: (state) => {
      state.ui.showPaymentModal = false;
    },
    clearErrors: (state) => {
      state.error = initialState.error;
    },
    updateSubscriptionStatus: (state, action) => {
      if (state.currentSubscription) {
        state.currentSubscription.status = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch subscription plans
    builder
      .addCase(fetchSubscriptionPlans.pending, (state) => {
        state.loading.plans = true;
        state.error.plans = null;
      })
      .addCase(fetchSubscriptionPlans.fulfilled, (state, action) => {
        state.loading.plans = false;
        state.plans = action.payload.plans || [];
      })
      .addCase(fetchSubscriptionPlans.rejected, (state, action) => {
        state.loading.plans = false;
        state.error.plans = action.payload;
      });

    // Fetch current subscription
    builder
      .addCase(fetchCurrentSubscription.pending, (state) => {
        state.loading.current = true;
        state.error.current = null;
      })
      .addCase(fetchCurrentSubscription.fulfilled, (state, action) => {
        state.loading.current = false;
        state.currentSubscription = action.payload.subscription;
      })
      .addCase(fetchCurrentSubscription.rejected, (state, action) => {
        state.loading.current = false;
        state.error.current = action.payload;
      });

    // Create subscription
    builder
      .addCase(createSubscription.pending, (state) => {
        state.loading.create = true;
        state.error.create = null;
      })
      .addCase(createSubscription.fulfilled, (state, action) => {
        state.loading.create = false;
        state.currentSubscription = action.payload.subscription;
        state.ui.showUpgradeModal = false;
        state.ui.selectedPlan = null;
      })
      .addCase(createSubscription.rejected, (state, action) => {
        state.loading.create = false;
        state.error.create = action.payload;
      });

    // Update subscription
    builder
      .addCase(updateSubscription.pending, (state) => {
        state.loading.update = true;
        state.error.update = null;
      })
      .addCase(updateSubscription.fulfilled, (state, action) => {
        state.loading.update = false;
        state.currentSubscription = action.payload.subscription;
        state.ui.showUpgradeModal = false;
        state.ui.selectedPlan = null;
      })
      .addCase(updateSubscription.rejected, (state, action) => {
        state.loading.update = false;
        state.error.update = action.payload;
      });

    // Cancel subscription
    builder
      .addCase(cancelSubscription.pending, (state) => {
        state.loading.cancel = true;
        state.error.cancel = null;
      })
      .addCase(cancelSubscription.fulfilled, (state, action) => {
        state.loading.cancel = false;
        state.currentSubscription = action.payload.subscription;
        state.ui.showCancelModal = false;
      })
      .addCase(cancelSubscription.rejected, (state, action) => {
        state.loading.cancel = false;
        state.error.cancel = action.payload;
      });

    // Fetch payment methods
    builder
      .addCase(fetchPaymentMethods.pending, (state) => {
        state.loading.paymentMethods = true;
        state.error.paymentMethods = null;
      })
      .addCase(fetchPaymentMethods.fulfilled, (state, action) => {
        state.loading.paymentMethods = false;
        state.paymentMethods = action.payload.paymentMethods || [];
      })
      .addCase(fetchPaymentMethods.rejected, (state, action) => {
        state.loading.paymentMethods = false;
        state.error.paymentMethods = action.payload;
      });

    // Create setup intent
    builder
      .addCase(createSetupIntent.pending, (state) => {
        state.loading.setupIntent = true;
        state.error.setupIntent = null;
      })
      .addCase(createSetupIntent.fulfilled, (state, action) => {
        state.loading.setupIntent = false;
        state.setupIntent = action.payload.setupIntent;
      })
      .addCase(createSetupIntent.rejected, (state, action) => {
        state.loading.setupIntent = false;
        state.error.setupIntent = action.payload;
      });

    // Fetch billing history
    builder
      .addCase(fetchBillingHistory.pending, (state) => {
        state.loading.billingHistory = true;
        state.error.billingHistory = null;
      })
      .addCase(fetchBillingHistory.fulfilled, (state, action) => {
        state.loading.billingHistory = false;
        state.billingHistory = action.payload.invoices || [];
      })
      .addCase(fetchBillingHistory.rejected, (state, action) => {
        state.loading.billingHistory = false;
        state.error.billingHistory = action.payload;
      });
  },
});

export const {
  setSelectedPlan,
  showUpgradeModal,
  hideUpgradeModal,
  showCancelModal,
  hideCancelModal,
  showPaymentModal,
  hidePaymentModal,
  clearErrors,
  updateSubscriptionStatus,
} = subscriptionSlice.actions;

// Selectors
export const selectSubscriptionPlans = (state) => state.subscription.plans;
export const selectCurrentSubscription = (state) => state.subscription.currentSubscription;
export const selectPaymentMethods = (state) => state.subscription.paymentMethods;
export const selectBillingHistory = (state) => state.subscription.billingHistory;
export const selectSetupIntent = (state) => state.subscription.setupIntent;
export const selectSubscriptionLoading = (state) => state.subscription.loading;
export const selectSubscriptionErrors = (state) => state.subscription.error;
export const selectSubscriptionUI = (state) => state.subscription.ui;

// Computed selectors
export const selectIsSubscribed = (state) => {
  const subscription = state.subscription.currentSubscription;
  return subscription && subscription.status === 'active';
};

export const selectSubscriptionTier = (state) => {
  const subscription = state.subscription.currentSubscription;
  return subscription?.tier || 'free';
};

export const selectCanUpgrade = (state) => {
  const currentTier = selectSubscriptionTier(state);
  return currentTier === 'free' || currentTier === 'pro';
};

export const selectCanDowngrade = (state) => {
  const currentTier = selectSubscriptionTier(state);
  return currentTier === 'pro_max' || currentTier === 'pro';
};

export const selectSubscriptionFeatures = (state) => {
  const tier = selectSubscriptionTier(state);
  
  const features = {
    free: {
      coupons: 'Basic coupon finding',
      wishlist: '10 items max',
      priceTracking: 'Basic alerts',
      support: 'Community support',
      analytics: 'Basic stats',
    },
    pro: {
      coupons: 'Advanced coupon automation',
      wishlist: '100 items max',
      priceTracking: 'Advanced alerts',
      support: 'Email support',
      analytics: 'Detailed analytics',
    },
    pro_max: {
      coupons: 'Premium automation + exclusive coupons',
      wishlist: 'Unlimited items',
      priceTracking: 'Real-time alerts',
      support: 'Priority support',
      analytics: 'Advanced analytics + insights',
    },
  };
  
  return features[tier] || features.free;
};

export const selectNextBillingDate = (state) => {
  const subscription = state.subscription.currentSubscription;
  return subscription?.currentPeriodEnd || null;
};

export const selectSubscriptionValue = (state) => {
  const subscription = state.subscription.currentSubscription;
  const savingsTotal = state.savings?.summary?.totalSaved || 0;
  
  if (!subscription || subscription.tier === 'free') {
    return { value: savingsTotal, roi: null };
  }
  
  const monthlyPrice = subscription.tier === 'pro' ? 9.99 : 19.99;
  const monthsSubscribed = subscription.monthsActive || 1;
  const totalPaid = monthlyPrice * monthsSubscribed;
  
  return {
    value: savingsTotal - totalPaid,
    roi: totalPaid > 0 ? ((savingsTotal - totalPaid) / totalPaid) * 100 : 0,
    totalPaid,
    totalSaved: savingsTotal,
  };
};

export default subscriptionSlice.reducer;