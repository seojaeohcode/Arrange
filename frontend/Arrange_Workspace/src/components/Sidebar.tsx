import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import useBookmarkStore from '../store/useBookmarkStore';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { userSettings, toggleDarkMode, toggleNotifications, toggleAutoCategories, importChromeBookmarks } = useBookmarkStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string>('');

  const isActive = (path: string): boolean => {
    return location.pathname === path;
  };
  
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleImport = async () => {
    try {
      setIsImporting(true);
      setImportStatus('북마크 가져오는 중...');
      await importChromeBookmarks();
      setImportStatus('북마크 가져오기 완료!');
      setTimeout(() => setImportStatus(''), 3000);
    } catch (error) {
      setImportStatus('북마크 가져오기 실패');
      setTimeout(() => setImportStatus(''), 3000);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <SidebarContainer collapsed={isCollapsed}>
      <HeaderSection>
        {!isCollapsed && <Title>A!rrange 북마크</Title>}
        <CollapseButton onClick={toggleCollapse} aria-label={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}>
          {isCollapsed ? '»' : '«'}
        </CollapseButton>
      </HeaderSection>
      
      <NavSection>
        <NavItem to="/" isActive={isActive('/')}>
          <IconWrapper>{isActive('/') ? '🏠' : '🏠'}</IconWrapper>
          {!isCollapsed && <NavText>홈</NavText>}
        </NavItem>
        
        <NavItem to="/manage" isActive={isActive('/manage')}>
          <IconWrapper>{isActive('/manage') ? '📑' : '📑'}</IconWrapper>
          {!isCollapsed && <NavText>북마크 관리</NavText>}
        </NavItem>
        
        <NavItem to="/dashboard" isActive={isActive('/dashboard')}>
          <IconWrapper>{isActive('/dashboard') ? '📊' : '📊'}</IconWrapper>
          {!isCollapsed && <NavText>대시보드</NavText>}
        </NavItem>
      </NavSection>
      
      <SettingsSection>
        {!isCollapsed && <SectionTitle>설정</SectionTitle>}
        {isCollapsed && <IconWrapper style={{textAlign: 'center', marginBottom: '16px'}}>⚙️</IconWrapper>}
        
        {!isCollapsed && (
          <>
            <SettingItem>
              <SettingLabelGroup>
                <SettingLabel>다크 모드</SettingLabel>
                <SettingDescription>다크 모드를 전환합니다.</SettingDescription>
              </SettingLabelGroup>
              <ToggleButton
                active={userSettings.darkMode}
                onClick={toggleDarkMode}
                role="switch"
                aria-checked={userSettings.darkMode}
                aria-label="다크 모드"
              >
                <ToggleSlider active={userSettings.darkMode} />
              </ToggleButton>
            </SettingItem>
            
            <SettingItem>
              <SettingLabelGroup>
                <SettingLabel>알림</SettingLabel>
                <SettingDescription>알림을 전환합니다.</SettingDescription>
              </SettingLabelGroup>
              <ToggleButton
                active={userSettings.notifications}
                onClick={toggleNotifications}
                role="switch"
                aria-checked={userSettings.notifications}
                aria-label="알림"
              >
                <ToggleSlider active={userSettings.notifications} />
              </ToggleButton>
            </SettingItem>
            
            <SettingItem>
              <SettingLabelGroup>
                <SettingLabel>자동 분류</SettingLabel>
                <SettingDescription>자동으로 분류합니다.</SettingDescription>
              </SettingLabelGroup>
              <ToggleButton
                active={userSettings.autoCategories}
                onClick={toggleAutoCategories}
                role="switch"
                aria-checked={userSettings.autoCategories}
                aria-label="자동 분류"
              >
                <ToggleSlider active={userSettings.autoCategories} />
              </ToggleButton>
            </SettingItem>

            <ImportButton 
              onClick={handleImport}
              disabled={isImporting}
              aria-busy={isImporting}
            >
              <IconWrapper>📥</IconWrapper>
              <ButtonText>
                {isImporting ? '가져오는 중...' : '크롬 북마크 가져오기'}
              </ButtonText>
            </ImportButton>

            <AnimatePresence>
              {importStatus && (
                <ImportStatus
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {importStatus}
                </ImportStatus>
              )}
            </AnimatePresence>
          </>
        )}
      </SettingsSection>
      
      <DangerSection>
        <DangerRow>
          <DangerLabel>모든 북마크 삭제</DangerLabel>
          <DangerButton>초기화</DangerButton>
        </DangerRow>
      </DangerSection>
      
      <FooterSection>
        {!isCollapsed && <FooterText>© 2025 A!rrange</FooterText>}
      </FooterSection>
    </SidebarContainer>
  );
};

interface SidebarContainerProps {
  collapsed: boolean;
}

const SidebarContainer = styled.div<SidebarContainerProps>`
  width: ${props => props.collapsed ? '60px' : '280px'};
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: ${props => props.theme.colors.background};
  border-right: 1px solid ${props => props.theme.colors.border};
  transition: width 0.3s ease, background-color 0.3s ease;
  overflow: hidden;
  color: ${props => props.theme.colors.text.primary};
`;

const HeaderSection = styled.div`
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.text.primary};
`;

const Title = styled.h1`
  margin: 0;
  font-size: 18px;
  font-weight: bold;
`;

const CollapseButton = styled.button`
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: ${props => props.theme.colors.text.primary};
  opacity: 0.6;
  
  &:hover {
    opacity: 1;
  }
`;

const NavSection = styled.div`
  display: flex;
  flex-direction: column;
  padding: 8px 0;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

interface NavItemProps {
  isActive: boolean;
}

const NavItem = styled(Link)<NavItemProps>`
  padding: 12px 16px;
  display: flex;
  align-items: center;
  text-decoration: none;
  color: ${props => props.isActive ? props.theme.colors.primary : props.theme.colors.text.primary};
  font-weight: ${props => props.isActive ? 'bold' : 'normal'};
  background-color: ${props => props.isActive ? props.theme.colors.button.secondary : 'transparent'};
  
  &:hover {
    background-color: ${props => props.isActive ? props.theme.colors.button.secondary : props.theme.colors.button.secondaryHover};
  }
`;

const IconWrapper = styled.div`
  margin-right: 12px;
  font-size: 18px;
  width: 24px;
  text-align: center;
`;

const NavText = styled.span`
  font-size: 14px;
`;

const SettingsSection = styled.div`
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const SectionTitle = styled.h2`
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: bold;
`;

const SettingItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  padding: 12px;
  background-color: ${props => props.theme.colors.background};
  border-radius: 6px;
  border: 1px solid ${props => props.theme.colors.border};
`;

const SettingLabelGroup = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const SettingLabel = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.text.primary};
  font-weight: 500;
`;

const SettingDescription = styled.p`
  margin: 4px 0 0 0;
  font-size: 12px;
  color: ${props => props.theme.colors.text.secondary};
`;

interface ToggleButtonProps {
  active: boolean;
}

const ToggleButton = styled.button<ToggleButtonProps>`
  position: relative;
  width: 44px;
  height: 24px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  outline: none;
  
  &:focus-visible {
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primary};
  }
`;

const ToggleSlider = styled.div<{ active: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${props => props.active ? props.theme.colors.primary : '#ccc'};
  border-radius: 12px;
  transition: background-color 0.3s ease;
  
  &:before {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    top: 2px;
    left: ${props => props.active ? '22px' : '2px'};
    transition: left 0.3s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
`;

const FooterSection = styled.div`
  padding: 16px;
  border-top: 1px solid ${props => props.theme.colors.border};
  text-align: center;
`;

const FooterText = styled.div`
  font-size: 12px;
  color: #999;
`;

const ImportButton = styled.button`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 12px 16px;
  margin-top: 16px;
  background-color: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover:not(:disabled) {
    background-color: ${props => props.theme.colors.primaryDark};
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primary};
  }
`;

const ButtonText = styled.span`
  font-size: 14px;
  font-weight: bold;
`;

const ImportStatus = styled(motion.div)`
  margin-top: 8px;
  padding: 8px;
  background-color: ${props => props.theme.colors.primary};
  color: white;
  border-radius: 4px;
  font-size: 12px;
  text-align: center;
`;

const DangerSection = styled(SettingsSection)`
  padding: 10px 20px;
  margin-bottom: 16px;
`;

const DangerRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const DangerLabel = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.text.primary};
  font-weight: 500;
`;

const DangerButton = styled.button`
  background: none;
  border: none;
  font-size: 14px;
  color: ${props => props.theme.colors.primary};
  cursor: pointer;
  padding: 0;
  transition: color 0.3s ease;
  
  &:hover {
    color: ${props => props.theme.colors.primaryDark};
  }
`;

export default Sidebar; 