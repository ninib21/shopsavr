import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';

// Import slices
import uiSlice from './slices/uiSlice';
import couponsSlice from './slices/couponsSlice';
import wishlistSlice from './slices/wishlistSlice';
import savingsSlice from './slices/savingsSlice';
import subscriptionSlice from './slices/subscriptionSlice';

// Persist configuration
const persistConfig = {
  key: 'shopsavr',
  storage,
  whitelist: ['ui'], // Only persist UI preferences
  blacklist: ['coupons', 'wishlist', 'savings', 'subscription'], // Don't persist sensitive data
};

// Root reducer
const rootReducer = combineReducers({
  ui: uiSlice,
  coupons: couponsSlice,
  wishlist: wishlistSlice,
  savings: savingsSlice,
  subscription: subscriptionSlice,
});

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Persistor
export const persistor = persistStore(store);

// Types for TypeScript (if needed)
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;