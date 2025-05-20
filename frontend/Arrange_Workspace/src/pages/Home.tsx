import React, { useState, useEffect, lazy, Suspense } from 'react';
import styled from 'styled-components';
import useBookmarkStore from '../store/useBookmarkStore';

// 지연 로딩으로 각 페이지 컴포넌트 가져오기
const DashboardComponent = lazy(() => import('../components/Dashboard'));
const SettingsComponent = lazy(() => import('../components/Settings'));

const Home: React.FC = () => {
  const { userSettings, fetchBookmarks, fetchCategories, importChromeBookmarks, removeBookmark, updateBookmark } = useBookmarkStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSection, setActiveSection] = useState("HOME");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["1"]));
  const [isLoading, setIsLoading] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    fetchBookmarks();
    fetchCategories();
  }, []);

  // 북마크 클릭 시 새 탭으로 열기
  const openBookmark = (url: string) => {
    window.open(url, '_blank');
  };

  // 카테고리 펼치기/접기 토글
  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // 크롬 북마크 동기화
  const syncChromeBookmarks = async () => {
    try {
      setIsLoading(true);
      const importedBookmarks = await importChromeBookmarks();
      setIsLoading(false);
      alert(`${importedBookmarks.length}개의 북마크가 성공적으로 동기화되었습니다.`);
    } catch (error) {
      setIsLoading(false);
      console.error('북마크 동기화 실패:', error);
      alert('북마크 동기화에 실패했습니다.');
    }
  };

  // 북마크 삭제
  const handleDeleteBookmark = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 북마크 열기 방지
    if (window.confirm('정말로 이 북마크를 삭제하시겠습니까?')) {
      try {
        await removeBookmark(id);
      } catch (error) {
        console.error('북마크 삭제 실패:', error);
        alert('북마크 삭제에 실패했습니다.');
      }
    }
  };

  // 북마크 제목 편집 시작
  const handleEditStart = (bookmark: any, e: React.MouseEvent) => {
    e.stopPropagation(); // 북마크 열기 방지
    setEditingBookmark(bookmark.id);
    setEditTitle(bookmark.title);
  };

  // 북마크 제목 저장
  const handleSaveTitle = async (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (editTitle.trim()) {
      try {
        await updateBookmark(id, { title: editTitle });
        setEditingBookmark(null);
      } catch (error) {
        console.error('북마크 업데이트 실패:', error);
        alert('북마크 업데이트에 실패했습니다.');
      }
    }
  };

  // 컨텐츠 렌더링
  const renderContent = () => {
    switch (activeSection) {
      case 'DASHBOARD':
        return (
          <Suspense fallback={<LoadingPlaceholder>대시보드 로딩 중...</LoadingPlaceholder>}>
            <DashboardComponent />
          </Suspense>
        );
      case 'SETTINGS':
        return (
          <Suspense fallback={<LoadingPlaceholder>설정 로딩 중...</LoadingPlaceholder>}>
            <SettingsComponent />
          </Suspense>
        );
      default:
        return renderBookmarks();
    }
  };

  // 실제 북마크 데이터 렌더링
  const renderBookmarks = () => {
    const { bookmarks, categories, isLoading: storeLoading } = useBookmarkStore.getState();
    
    // 전역 또는 컴포넌트 로딩 상태 확인
    if (isLoading || storeLoading) {
      return (
        <LoadingContainer>
          <LoadingSpinner />
          <LoadingMessage>북마크 데이터를 불러오는 중...</LoadingMessage>
        </LoadingContainer>
      );
    }

    if (bookmarks.length === 0) {
      return (
        <EmptyState>
          <EmptyIcon>📚</EmptyIcon>
          <EmptyText>
            저장된 북마크가 없습니다. 
            <SyncButtonLink onClick={syncChromeBookmarks}>크롬 북마크를 가져오기</SyncButtonLink>를 통해 북마크를 불러올 수 있습니다.
          </EmptyText>
        </EmptyState>
      );
    }

    // 카테고리별로 북마크 그룹화
    const bookmarksByCategory = categories.map(category => {
      return {
        category,
        bookmarks: bookmarks.filter(bookmark => bookmark.categoryId === category.id)
      };
    });

    // 카테고리가 없는 북마크는 '기타' 그룹으로
    const uncategorizedBookmarks = bookmarks.filter(
      bookmark => !categories.some(cat => cat.id === bookmark.categoryId)
    );

    if (uncategorizedBookmarks.length > 0) {
      bookmarksByCategory.push({
        category: {
          id: 'uncategorized',
          name: '기타',
          color: '#888',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        bookmarks: uncategorizedBookmarks
      });
    }

    return (
      <BookmarksList>
        {bookmarksByCategory.map(group => (
          group.bookmarks.length > 0 && (
            <CategoryGroup key={group.category.id}>
              <CategoryHeader onClick={() => toggleCategory(group.category.id)}>
                <FolderIcon>{expandedCategories.has(group.category.id) ? "📂" : "📁"}</FolderIcon>
                <CategoryName>{group.category.name}</CategoryName>
                <BookmarkCount>({group.bookmarks.length})</BookmarkCount>
              </CategoryHeader>
              
              {expandedCategories.has(group.category.id) && (
                <BookmarksContainer>
                  {group.bookmarks.map(bookmark => (
                    <BookmarkItem key={bookmark.id} onClick={() => openBookmark(bookmark.url)}>
                      <ServiceIcon>
                        {bookmark.favicon ? (
                          <img src={bookmark.favicon} alt="" width="16" height="16" />
                        ) : (
                          <IconText>🔖</IconText>
                        )}
                      </ServiceIcon>
                      <BookmarkContent>
                        {editingBookmark === bookmark.id ? (
                          <EditForm onSubmit={(e) => handleSaveTitle(bookmark.id, e)} onClick={(e) => e.stopPropagation()}>
                            <EditInput 
                              value={editTitle} 
                              onChange={(e) => setEditTitle(e.target.value)}
                              autoFocus
                            />
                            <SaveButton type="submit">✓</SaveButton>
                            <CancelButton type="button" onClick={() => setEditingBookmark(null)}>✕</CancelButton>
                          </EditForm>
                        ) : (
                          <BookmarkTitle>{bookmark.title}</BookmarkTitle>
                        )}
                        <BookmarkUrl>{bookmark.url}</BookmarkUrl>
                      </BookmarkContent>
                      <BookmarkActions onClick={(e) => e.stopPropagation()}>
                        <ActionButton onClick={(e) => handleEditStart(bookmark, e)} title="북마크 이름 변경">✏️</ActionButton>
                        <ActionButton onClick={(e) => handleDeleteBookmark(bookmark.id, e)} title="북마크 삭제">🗑️</ActionButton>
                      </BookmarkActions>
                    </BookmarkItem>
                  ))}
                </BookmarksContainer>
              )}
            </CategoryGroup>
          )
        ))}
      </BookmarksList>
    );
  };

  return (
    <HomeContainer className={userSettings.darkMode ? 'dark-mode' : ''}>
      <Header>
        <LogoSection>
          <AILogo>A!</AILogo>
          <AppTitle>Arrange</AppTitle>
        </LogoSection>
        <SearchBar>
          <SearchInput 
            type="text" 
            placeholder="북마크 검색" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <SearchIcon>🔍</SearchIcon>
        </SearchBar>
        <SyncButton 
          onClick={syncChromeBookmarks} 
          title="크롬 북마크 동기화"
          disabled={isLoading}
        >
          {isLoading ? '⏳' : '🔄'}
        </SyncButton>
      </Header>

      <MainNavigation>
        <NavigationTab 
          active={activeSection === "HOME"} 
          onClick={() => setActiveSection("HOME")}
        >
          🏠 홈
        </NavigationTab>
        <NavigationTab 
          active={activeSection === "DASHBOARD"} 
          onClick={() => setActiveSection("DASHBOARD")}
        >
          📊 대시보드
        </NavigationTab>
        <NavigationTab 
          active={activeSection === "SETTINGS"} 
          onClick={() => setActiveSection("SETTINGS")}
        >
          ⚙️ 설정
        </NavigationTab>
      </MainNavigation>

      <ContentArea>
        {renderContent()}
      </ContentArea>
    </HomeContainer>
  );
};

const HomeContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 12px;
  background-color: #fff;
  max-width: 100%;
  width: 360px;
  margin: 0 auto;
  
  &.dark-mode {
    background-color: #222;
    color: #eee;
  }
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
`;

const LogoSection = styled.div`
  display: flex;
  align-items: center;
  margin-right: 10px;
`;

const AILogo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: #4CAF50;
  color: white;
  font-weight: bold;
  font-size: 14px;
`;

const AppTitle = styled.div`
  font-weight: bold;
  margin-left: 6px;
  font-size: 14px;
  display: none;
  
  @media (min-width: 340px) {
    display: block;
  }
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  border: 1px solid #ddd;
  border-radius: 20px;
  padding: 4px 10px;
  min-width: 0;
`;

const SearchInput = styled.input`
  flex: 1;
  border: none;
  outline: none;
  background: none;
  font-size: 13px;
  min-width: 0;
  width: 100%;
`;

const SearchIcon = styled.span`
  color: #777;
  cursor: pointer;
  font-size: 14px;
`;

const SyncButton = styled.button`
  background: none;
  border: none;
  font-size: 18px;
  margin-left: 8px;
  cursor: pointer;
  color: #555;
  padding: 4px;
  
  &:hover {
    color: #4CAF50;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const MainNavigation = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
`;

interface TabProps {
  active: boolean;
}

const NavigationTab = styled.button<TabProps>`
  padding: 6px 10px;
  background-color: ${({ active, theme }) =>
    active
      ? '#4CAF50'
      : 'transparent'};
  color: ${({ active, theme }) =>
    active
      ? '#fff'
      : theme.colors && theme.colors.text && theme.colors.text.primary
        ? theme.colors.text.primary
        : '#222'};
  border: none;
  border-radius: 16px;
  font-size: 13px;
  font-weight: ${({ active }) => (active ? 'bold' : 'normal')};
  margin-right: 8px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;

  &:hover {
    background-color: #388E3C;
    color: #fff;
  }
`;

const ContentArea = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const BookmarksList = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const CategoryGroup = styled.div`
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 10px;
  overflow: hidden;
`;

const CategoryHeader = styled.div`
  display: flex;
  align-items: center;
  background-color: #f5f5f5;
  padding: 8px 10px;
  cursor: pointer;
  color: ${({ theme }) => theme.mode === 'dark' ? '#222' : '#1a1a1a'};
  
  &:hover {
    background-color: #f0f0f0;
  }
`;

const FolderIcon = styled.div`
  color: #4CAF50;
  margin-right: 8px;
  font-size: 16px;
`;

const CategoryName = styled.div`
  font-weight: bold;
  flex: 1;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${({ theme }) => theme.mode === 'dark' ? '#222' : '#1a1a1a'};
`;

const BookmarkCount = styled.div`
  color: #777;
  font-size: 12px;
  margin-left: 4px;
`;

const BookmarksContainer = styled.div`
  max-height: 300px;
  overflow-y: auto;
`;

const BookmarkItem = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 10px;
  border-top: 1px solid #eee;
  cursor: pointer;
  
  &:hover {
    background-color: #f9f9f9;
  }
`;

const ServiceIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  margin-right: 10px;
  background-color: #e8e8e8;
  overflow: hidden;
`;

const IconText = styled.span`
  color: #555;
  font-size: 12px;
  font-weight: bold;
`;

const BookmarkContent = styled.div`
  flex: 1;
  min-width: 0;
  overflow: hidden;
`;

const BookmarkTitle = styled.div`
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const BookmarkUrl = styled.div`
  font-size: 11px;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
`;

const BookmarkActions = styled.div`
  display: flex;
  margin-left: 6px;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  font-size: 13px;
  opacity: 0.6;
  cursor: pointer;
  padding: 4px;
  
  &:hover {
    opacity: 1;
  }
`;

const EditForm = styled.form`
  display: flex;
  align-items: center;
  width: 100%;
`;

const EditInput = styled.input`
  flex: 1;
  border: 1px solid #4CAF50;
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 13px;
  min-width: 0;
`;

const SaveButton = styled.button`
  background: none;
  border: none;
  color: #4CAF50;
  font-size: 14px;
  cursor: pointer;
  padding: 0 4px;
`;

const CancelButton = styled.button`
  background: none;
  border: none;
  color: #f44336;
  font-size: 14px;
  cursor: pointer;
  padding: 0 4px;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 20px;
`;

const LoadingSpinner = styled.div`
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 4px solid #4CAF50;
  width: 32px;
  height: 32px;
  margin-bottom: 16px;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingMessage = styled.div`
  font-size: 14px;
  color: #666;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  height: 100%;
  text-align: center;
`;

const EmptyIcon = styled.div`
  font-size: 36px;
  margin-bottom: 16px;
`;

const EmptyText = styled.p`
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
`;

const SyncButtonLink = styled.button`
  background: none;
  border: none;
  color: #4CAF50;
  font-weight: bold;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  font-size: 14px;
  
  &:hover {
    color: #388E3C;
  }
`;

const LoadingPlaceholder = styled.div`
  padding: 20px;
  text-align: center;
  color: #666;
  font-size: 14px;
`;

export default Home; 