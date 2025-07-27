import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  sidebarOpen: false,
  loading: false,
  notifications: [],
  modals: {
    couponDetails: { open: false, data: null },
    productDetails: { open: false, data: null },
    settings: { open: false },
    upgrade: { open: false },
  },
  toast: {
    open: false,
    message: '',
    type: 'info', // 'success', 'error', 'warning', 'info'
    duration: 4000,
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    addNotification: (state, action) => {
      const notification = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        read: false,
        ...action.payload,
      };
      state.notifications.unshift(notification);
      
      // Keep only last 50 notifications
      if (state.notifications.length > 50) {
        state.notifications = state.notifications.slice(0, 50);
      }
    },
    markNotificationRead: (state, action) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification) {
        notification.read = true;
      }
    },
    markAllNotificationsRead: (state) => {
      state.notifications.forEach(notification => {
        notification.read = true;
      });
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    openModal: (state, action) => {
      const { modalName, data } = action.payload;
      if (state.modals[modalName]) {
        state.modals[modalName].open = true;
        if (data) {
          state.modals[modalName].data = data;
        }
      }
    },
    closeModal: (state, action) => {
      const modalName = action.payload;
      if (state.modals[modalName]) {
        state.modals[modalName].open = false;
        state.modals[modalName].data = null;
      }
    },
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach(modalName => {
        state.modals[modalName].open = false;
        state.modals[modalName].data = null;
      });
    },
    showToast: (state, action) => {
      state.toast = {
        open: true,
        ...action.payload,
      };
    },
    hideToast: (state) => {
      state.toast.open = false;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  setLoading,
  addNotification,
  markNotificationRead,
  markAllNotificationsRead,
  removeNotification,
  clearNotifications,
  openModal,
  closeModal,
  closeAllModals,
  showToast,
  hideToast,
} = uiSlice.actions;

// Selectors
export const selectSidebarOpen = (state) => state.ui.sidebarOpen;
export const selectLoading = (state) => state.ui.loading;
export const selectNotifications = (state) => state.ui.notifications;
export const selectUnreadNotifications = (state) => 
  state.ui.notifications.filter(n => !n.read);
export const selectModal = (modalName) => (state) => state.ui.modals[modalName];
export const selectToast = (state) => state.ui.toast;

export default uiSlice.reducer;