import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import styled from 'styled-components';
import useBookmarkStore from '../store/useBookmarkStore';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark } from 'types';
import { flattenBookmarks } from '../utils/transformBookmarks';
import { buildBookmarkTree } from '../utils/buildBookmarkTree';

// 지연 로딩으로 각 페이지 컴포넌트 가져오기
const DashboardComponent = lazy(() => import('../components/Dashboard'));
const SettingsComponent = lazy(() => import('../components/Settings'));

interface CategoryTree {
  id: string;
  name: string;
  children: Bookmark[];
}

const Home: React.FC = () => {
  const { userSettings, fetchBookmarks, importChromeBookmarks, removeBookmark, updateBookmark } = useBookmarkStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSection, setActiveSection] = useState("HOME");
  const [isLoading, setIsLoading] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const [bookmarkTree, setBookmarkTree] = useState<CategoryTree[]>([]);
  const { bookmarks } = useBookmarkStore();

  useEffect(() => {
    fetchBookmarks();
  }, []);

  useEffect(() => {
    // 탭(섹션) 변경 시 스크롤 맨 위로 이동
    if (contentAreaRef.current) {
      contentAreaRef.current.scrollTop = 0;
    }
  }, [activeSection]);

  // 북마크 클릭 시 새 탭으로 열기
  const handleBookmarkClick = async (bookmark: Bookmark) => {
    window.open(bookmark.url, '_blank');
    await updateBookmark(bookmark.id, { visitCount: (bookmark.visitCount || 0) + 1 });
    await fetchBookmarks();
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

  const handleArrangeClick = async () => {
    // 1. 북마크 id, title, summary만 추출
    const minimalList = bookmarks.map(bm => ({
      id: bm.id,
      title: bm.title,
      summary: bm.description || ''
    }));
    // 2. 서버에 POST
    const res = await fetch('/api/cluster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(minimalList)
    });
    const clusters = await res.json(); // [{ categoryId, categoryName, bookmarkIds }]
    // 3. 트리 구조로 변환
    const tree = buildBookmarkTree(bookmarks, clusters);
    setBookmarkTree(tree);
    // 4. 평탄화하여 localStorage/zustand에 반영 (선택)
    const flat = tree.flatMap(cat => cat.children.map(bm => ({ ...bm, categoryId: cat.id, category: cat.name })));
    localStorage.setItem('bookmarks', JSON.stringify(flat));
    await fetchBookmarks();
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
    const { bookmarks, isLoading: storeLoading } = useBookmarkStore.getState();
    
    if (isLoading || storeLoading) {
      return <LoadingMessage>북마크 데이터를 불러오는 중...</LoadingMessage>;
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

    const sortedBookmarks = [...bookmarks].sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0));
    const maxVisit = sortedBookmarks[0]?.visitCount || 1;

    // 모든 북마크를 미분류로 렌더링
    return (
      <BookmarksContainer>
        {sortedBookmarks.map(bookmark => {
          const fillRatio = maxVisit > 0 ? (bookmark.visitCount || 0) / maxVisit : 0;
          return (
            <BookmarkItem
              key={bookmark.id}
              fillRatio={fillRatio}
              onClick={() => handleBookmarkClick(bookmark)}
              onMouseLeave={() => setOpenActionId(null)}
            >
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
              <VisitCount>{bookmark.visitCount || 0}</VisitCount>
              <ActionMenuWrapper>
                <ActionMenuButton onClick={e => { e.stopPropagation(); setOpenActionId(bookmark.id === openActionId ? null : bookmark.id); }}>
                  ⋯
                </ActionMenuButton>
                {openActionId === bookmark.id && (
                  <ActionMenu>
                    <ActionButton onClick={e => { e.stopPropagation(); handleEditStart(bookmark, e); setOpenActionId(null); }}>이름 변경</ActionButton>
                    <ActionButton onClick={e => { e.stopPropagation(); handleDeleteBookmark(bookmark.id, e); setOpenActionId(null); }}>삭제</ActionButton>
                  </ActionMenu>
                )}
              </ActionMenuWrapper>
            </BookmarkItem>
          );
        })}
      </BookmarksContainer>
    );
  };

  return (
    <HomeContainer className={userSettings.darkMode ? 'dark-mode' : ''}>
      <Header>
        <LogoSection>
          <AILogo>A!</AILogo>
          <AppTitle>A!rrange</AppTitle>
        </LogoSection>
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
      </Header>
      <Separator />
      <ContentArea ref={contentAreaRef}>
        {activeSection === 'HOME' && (
          <TopBar>
            <ArrangeButton onClick={handleArrangeClick}>A! 정리</ArrangeButton>
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
          </TopBar>
        )}
        {/* 트리 구조 렌더링 예시 */}
        {bookmarkTree.length > 0 && (
          <div style={{ margin: '16px 0' }}>
            {bookmarkTree.map((category: CategoryTree) => (
              <div key={category.id} style={{ marginBottom: 12 }}>
                <strong>{category.name}</strong>
                <ul>
                  {category.children.map((bm: Bookmark) => (
                    <li key={bm.id}>{bm.title}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        {renderContent()}
      </ContentArea>
    </HomeContainer>
  );
};

const HomeContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
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
  justify-content: space-between;
  margin-bottom: 0;
  padding-bottom: 0;
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
  border-radius: 30%;
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
  margin-bottom: 0;
  border-bottom: none;
  padding-bottom: 0;
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
  min-height: 0;
  overflow-y: auto;
`;

const BookmarksList = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const BookmarksContainer = styled.div`
  overflow-y: auto;
  padding-bottom: 16px;
`;

const BookmarkItem = styled.div<{ fillRatio: number }>`
  user-select: none;
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 12px;
  margin: 4px 0;
  border: none;
  box-shadow: 0 1px 6px rgba(0,0,0,0.04);
  cursor: pointer;
  background: ${({ theme, fillRatio }) =>
    theme.mode === 'dark'
      ? `linear-gradient(to right, #b6e7b6 ${fillRatio * 100}%, transparent ${fillRatio * 100}% 100%)`
      : `linear-gradient(to right, #c8e6c9 ${fillRatio * 100}%, transparent ${fillRatio * 100}% 100%)`};
  position: relative;
  transition: background 0.2s, box-shadow 0.2s;
  &:hover::after {
    content: '';
    position: absolute;
    left: 0; top: 0; right: 0; bottom: 0;
    border-radius: 12px;
    background: rgba(76, 175, 80, 0.08);
    pointer-events: none;
  }
  &:hover {
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }
`;

const ServiceIcon = styled.div`
  user-select: none;
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
  user-select: none;
  color: #555;
  font-size: 12px;
  font-weight: bold;
`;

const BookmarkContent = styled.div`
  user-select: none;
  flex: 1;
  min-width: 0;
  overflow: hidden;
`;

const BookmarkTitle = styled.div`
  user-select: none;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${({ theme }) => theme.mode === 'dark' ? '#222' : '#222'};
`;

const BookmarkUrl = styled.div`
  user-select: none;
  font-size: 11px;
  color: ${({ theme }) => theme.mode === 'dark' ? '#b0b3b8' : '#888'};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
`;

const VisitCount = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.mode === 'dark' ? '#222' : '#388E3C'};
  margin-left: 8px;
  min-width: 24px;
  text-align: right;
`;

const ActionMenuWrapper = styled.div`
  position: relative;
  margin-left: 8px;
`;

const ActionMenuButton = styled.button`
  background: none;
  border: none;
  font-size: 20px;
  color: #888;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 8px;
  transition: background 0.2s;
  &:hover {
    background: #e0e0e0;
  }
`;

const ActionMenu = styled.div`
  position: absolute;
  top: 28px;
  right: 0;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  display: flex;
  flex-direction: column;
  min-width: 90px;
  z-index: 10;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  color: #333;
  font-size: 14px;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  border-radius: 10px;
  transition: background 0.2s;
  &:hover {
    background: #f0f0f0;
  }
`;

const EditForm = styled.form`
  user-select: none;
  display: flex;
  align-items: center;
  width: 100%;
`;

const EditInput = styled.input`
  user-select: none;
  flex: 1;
  border: 1px solid #4CAF50;
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 13px;
  min-width: 0;
`;

const SaveButton = styled.button`
  user-select: none;
  background: none;
  border: none;
  color: #4CAF50;
  font-size: 14px;
  cursor: pointer;
  padding: 0 4px;
`;

const CancelButton = styled.button`
  user-select: none;
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
  user-select: none;
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

const TopBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
`;

const Separator = styled.div`
  width: 100%;
  height: 1px;
  background: #e0e0e0;
  margin: 8px 0 12px 0;
`;

const ArrangeButton = styled.button`
  background: #4CAF50;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 14px;
  font-weight: bold;
  margin-right: 8px;
  cursor: pointer;
  transition: background 0.2s;
  &:hover {
    background: #388E3C;
  }
`;

export default Home; 