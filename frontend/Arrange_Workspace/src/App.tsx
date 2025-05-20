import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import styled, { ThemeProvider } from 'styled-components';
import Home from './pages/Home';
import useBookmarkStore from './store/useBookmarkStore';
import { lightTheme, darkTheme } from './styles/theme';

const App: React.FC = () => {
  const { fetchBookmarks, userSettings } = useBookmarkStore();

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  // 다크 모드 클래스 적용
  useEffect(() => {
    if (userSettings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [userSettings.darkMode]);

  return (
    <ThemeProvider theme={userSettings.darkMode ? darkTheme : lightTheme}>
      <AppContainer>
        <MainContentWrapper>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </MainContentWrapper>
      </AppContainer>
    </ThemeProvider>
  );
};

const AppContainer = styled.div`
  height: 100vh;
  width: 100%;
  overflow: hidden;
  background-color: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text.primary};
`;

const MainContentWrapper = styled.main`
  height: 100%;
  overflow-y: auto;
`;

export default App; 