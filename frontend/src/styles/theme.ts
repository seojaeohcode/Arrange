import { DefaultTheme } from 'styled-components';

declare module 'styled-components' {
  export interface DefaultTheme {
    colors: {
      background: string;
      card: {
        background: string;
      };
      text: {
        primary: string;
        secondary: string;
      };
      primary: string;
      primaryDark: string;
      border: string;
      error: string;
      errorDark: string;
      input: {
        background: string;
      };
      button: {
        secondary: string;
        secondaryHover: string;
      };
    };
    mode: string;
  }
}

export const lightTheme: DefaultTheme = {
  colors: {
    background: '#ffffff',
    card: {
      background: '#ffffff',
    },
    text: {
      primary: '#1a1a1a',
      secondary: '#666666',
    },
    primary: '#0066cc',
    primaryDark: '#0052a3',
    border: '#e5e7eb',
    error: '#dc2626',
    errorDark: '#b91c1c',
    input: {
      background: '#ffffff',
    },
    button: {
      secondary: '#e5e7eb',
      secondaryHover: '#d1d5db',
    },
  },
  mode: 'light',
};

export const darkTheme: DefaultTheme = {
  colors: {
    background: '#181A1B',
    card: {
      background: '#23272A',
    },
    text: {
      primary: '#F3F4F6',
      secondary: '#B0B3B8',
    },
    primary: '#4F8CFF',
    primaryDark: '#2563eb',
    border: '#3A3B3C',
    error: '#ef4444',
    errorDark: '#dc2626',
    input: {
      background: '#23272A',
    },
    button: {
      secondary: '#23272A',
      secondaryHover: '#313338',
    },
  },
  mode: 'dark',
};