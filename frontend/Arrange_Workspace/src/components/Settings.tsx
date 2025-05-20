import React from 'react';
import styled from 'styled-components';
import useBookmarkStore from '../store/useBookmarkStore';

const Settings: React.FC = () => {
  const { 
    userSettings, 
    toggleDarkMode, 
    toggleNotifications, 
    toggleAutoCategories,
    importChromeBookmarks
  } = useBookmarkStore();
  
  const [isImporting, setIsImporting] = React.useState(false);
  const [importResult, setImportResult] = React.useState<string | null>(null);

  const handleImportBookmarks = async () => {
    setIsImporting(true);
    setImportResult(null);
    
    try {
      await importChromeBookmarks();
      setImportResult('북마크가 성공적으로 가져와졌습니다!');
    } catch (error) {
      console.error('북마크 가져오기 실패:', error);
      setImportResult('북마크 가져오기에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <SettingsContainer>
      <SettingsHeader>
        <Title>설정</Title>
        <Description>북마크 앱 설정을 관리하세요</Description>
      </SettingsHeader>

      <SettingsSection>
        <SectionTitle>앱 설정</SectionTitle>
        
        <SettingItem>
          <SettingLabelGroup>
            <SettingLabel>다크 모드</SettingLabel>
            <SettingDescription>다크 모드를 전환합니다.</SettingDescription>
          </SettingLabelGroup>
          <ToggleButton 
            active={userSettings.darkMode} 
            onClick={toggleDarkMode}
            aria-label="다크 모드 전환"
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
            aria-label="알림 전환"
          >
            <ToggleSlider active={userSettings.notifications} />
          </ToggleButton>
        </SettingItem>
        
        <SettingItem>
          <SettingLabelGroup>
            <SettingLabel>자동 카테고리 분류</SettingLabel>
            <SettingDescription>자동으로 카테고리를 분류합니다.</SettingDescription>
          </SettingLabelGroup>
          <ToggleButton 
            active={userSettings.autoCategories} 
            onClick={toggleAutoCategories}
            aria-label="자동 카테고리 분류 전환"
          >
            <ToggleSlider active={userSettings.autoCategories} />
          </ToggleButton>
        </SettingItem>
      </SettingsSection>
      
      <SettingsSection>
        <SectionTitle>데이터 관리</SectionTitle>
        
        <ImportContainer>
          <ImportDescription>
            현재 크롬 브라우저에 저장된 북마크를 앱으로 가져옵니다.
          </ImportDescription>
          
          <ImportButton 
            onClick={handleImportBookmarks}
            disabled={isImporting}
          >
            {isImporting ? '가져오는 중...' : '크롬 북마크 가져오기'}
          </ImportButton>
          
          {importResult && (
            <ImportResult success={importResult.includes('성공')}>
              {importResult}
            </ImportResult>
          )}
        </ImportContainer>
        
        <SettingsRow>
          <SettingLabel>모든 북마크 백업</SettingLabel>
          <ActionButton>내보내기</ActionButton>
        </SettingsRow>
        
        <SettingsRow>
          <SettingLabel>백업 파일에서 복원</SettingLabel>
          <ActionButton>파일 선택</ActionButton>
        </SettingsRow>
      </SettingsSection>
      
      <SettingsSection>
        <DangerRow>
          <DangerLabel>모든 북마크 삭제</DangerLabel>
          <DangerButton>초기화</DangerButton>
        </DangerRow>
      </SettingsSection>
    </SettingsContainer>
  );
};

const SettingsContainer = styled.div`
  padding: 12px;
  background-color: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text.primary};
  height: 100%;
  overflow-y: auto;
`;

const SettingsHeader = styled.div`
  margin-bottom: 16px;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 700;
  margin: 8px 0 8px 0;
`;

const Description = styled.p`
  font-size: 14px;
  color: #666;
`;

const SettingsSection = styled.div`
  margin-bottom: 32px;
  background-color: ${props => props.theme.colors.card.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  padding: 20px;
`;

const SectionTitle = styled.h2`
  margin: 8px 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
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

const ToggleButton = styled.button<{ active: boolean }>`
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
  background-color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.button.secondary};
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

const ImportContainer = styled.div`
  padding: 16px;
  border-bottom: 1px solid #eee;
`;

const ImportDescription = styled.p`
  margin-bottom: 12px;
  font-size: 14px;
  color: #666;
`;

const ImportButton = styled.button`
  display: block;
  margin: 0 auto 0 auto;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  
  &:hover {
    background-color: #43A047;
  }
  
  &:disabled {
    background-color: #9E9E9E;
    cursor: not-allowed;
  }
`;

interface ResultProps {
  success: boolean;
}

const ImportResult = styled.div<ResultProps>`
  margin-top: 16px;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  background-color: ${props => props.success ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)'};
  color: ${props => props.success ? '#388E3C' : '#D32F2F'};
`;

const SettingsRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid ${props => props.theme.colors.border};

  &:last-child {
    border-bottom: none;
  }
`;

const ActionButton = styled.button`
  margin-left: auto;
  background-color: #f0f0f0;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  
  &:hover {
    background-color: #e0e0e0;
  }
`;

const DangerRow = styled(SettingsRow)`
  background-color: ${({ theme }) => theme.colors.card.background};
`;

const DangerLabel = styled.div`
  font-size: 14px;
  color: #D32F2F;
`;

const DangerButton = styled.button`
  background-color: #F44336;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  
  &:hover {
    background-color: #D32F2F;
  }
`;

export default Settings; 