import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';

export type ThemeMode = 'auto' | 'light' | 'dark';
export type ActualTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  actualTheme: ActualTheme;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>('auto');
  const [actualTheme, setActualTheme] = useState<ActualTheme>('light');

  // 检测系统主题
  const detectSystemTheme = (): ActualTheme => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  };

  // 更新实际主题
  const updateActualTheme = (mode: ThemeMode) => {
    let newActualTheme: ActualTheme;
    
    if (mode === 'auto') {
      newActualTheme = detectSystemTheme();
    } else {
      newActualTheme = mode;
    }
    
    setActualTheme(newActualTheme);
    
    // 更新HTML根元素的data-theme属性
    document.documentElement.setAttribute('data-theme', newActualTheme);
  };

  // 设置主题模式
  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    updateActualTheme(mode);
    
    // 保存到本地存储
    localStorage.setItem('theme', mode);
  };

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = () => {
      if (theme === 'auto') {
        updateActualTheme('auto');
      }
    };
    
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [theme]);

  // 初始化主题
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as ThemeMode;
    
    if (savedTheme && ['auto', 'light', 'dark'].includes(savedTheme)) {
      setThemeState(savedTheme);
      updateActualTheme(savedTheme);
    } else {
      // 默认使用自动检测
      updateActualTheme('auto');
    }
  }, []);

  // 使用Ant Design的ConfigProvider提供主题
  const { defaultAlgorithm, darkAlgorithm } = antdTheme;

  return (
    <ThemeContext.Provider value={{ theme, actualTheme, setTheme }}>
      <ConfigProvider
        theme={{
          algorithm: actualTheme === 'dark' ? darkAlgorithm : defaultAlgorithm,
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};