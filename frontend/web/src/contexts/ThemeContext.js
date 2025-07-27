import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Theme Context
const ThemeContext = createContext();

// Theme Actions
const THEME_ACTIONS = {
  SET_THEME: 'SET_THEME',
  TOGGLE_THEME: 'TOGGLE_THEME',
  SET_SYSTEM_THEME: 'SET_SYSTEM_THEME'
};

// Available themes
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
};

// Get stored theme or default to system
const getStoredTheme = () => {
  try {
    return localStorage.getItem('shopsavr-theme') || THEMES.SYSTEM;
  } catch {
    return THEMES.SYSTEM;
  }
};

// Get system theme preference
const getSystemTheme = () => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches 
      ? THEMES.DARK 
      : THEMES.LIGHT;
  }
  return THEMES.LIGHT;
};

// Initial State
const initialState = {
  theme: getStoredTheme(),
  systemTheme: getSystemTheme(),
  effectiveTheme: getStoredTheme() === THEMES.SYSTEM ? getSystemTheme() : getStoredTheme()
};

// Theme Reducer
const themeReducer = (state, action) => {
  switch (action.type) {
    case THEME_ACTIONS.SET_THEME:
      const newTheme = action.payload;
      const newEffectiveTheme = newTheme === THEMES.SYSTEM ? state.systemTheme : newTheme;
      
      return {
        ...state,
        theme: newTheme,
        effectiveTheme: newEffectiveTheme
      };

    case THEME_ACTIONS.TOGGLE_THEME:
      const toggledTheme = state.effectiveTheme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
      
      return {
        ...state,
        theme: toggledTheme,
        effectiveTheme: toggledTheme
      };

    case THEME_ACTIONS.SET_SYSTEM_THEME:
      const systemTheme = action.payload;
      const effectiveTheme = state.theme === THEMES.SYSTEM ? systemTheme : state.effectiveTheme;
      
      return {
        ...state,
        systemTheme,
        effectiveTheme
      };

    default:
      return state;
  }
};

// Theme Provider Component
export const ThemeProvider = ({ children }) => {
  const [state, dispatch] = useReducer(themeReducer, initialState);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = (e) => {
        dispatch({
          type: THEME_ACTIONS.SET_SYSTEM_THEME,
          payload: e.matches ? THEMES.DARK : THEMES.LIGHT
        });
      };

      mediaQuery.addEventListener('change', handleChange);
      
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  // Save theme to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('shopsavr-theme', state.theme);
    } catch (error) {
      console.error('Failed to save theme to localStorage:', error);
    }
  }, [state.theme]);

  // Set theme function
  const setTheme = (theme) => {
    if (Object.values(THEMES).includes(theme)) {
      dispatch({
        type: THEME_ACTIONS.SET_THEME,
        payload: theme
      });
    }
  };

  // Toggle theme function
  const toggleTheme = () => {
    dispatch({ type: THEME_ACTIONS.TOGGLE_THEME });
  };

  // Get theme display name
  const getThemeDisplayName = (theme) => {
    switch (theme) {
      case THEMES.LIGHT:
        return 'Light';
      case THEMES.DARK:
        return 'Dark';
      case THEMES.SYSTEM:
        return 'System';
      default:
        return 'Unknown';
    }
  };

  // Check if theme is dark
  const isDark = state.effectiveTheme === THEMES.DARK;

  // Check if theme is light
  const isLight = state.effectiveTheme === THEMES.LIGHT;

  // Check if using system theme
  const isSystemTheme = state.theme === THEMES.SYSTEM;

  // Context value
  const value = {
    theme: state.effectiveTheme, // The actual theme being used
    selectedTheme: state.theme, // The user's theme preference
    systemTheme: state.systemTheme,
    isDark,
    isLight,
    isSystemTheme,
    setTheme,
    toggleTheme,
    getThemeDisplayName,
    availableThemes: Object.values(THEMES)
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};