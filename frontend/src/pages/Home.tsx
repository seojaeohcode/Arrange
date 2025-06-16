import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import styled from 'styled-components';
import useBookmarkStore from '../store/useBookmarkStore';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark } from 'types';
import { BookmarkProcessor } from '../bookmarkProcessor';

// 지연 로딩으로 각 페이지 컴포넌트 가져오기
const DashboardComponent = lazy(() => import('../components/Dashboard'));
const SettingsComponent = lazy(() => import('../components/Settings'));

interface CategoryTree {
  id: string;
  name: string;
  children: Bookmark[];
}

const Home: React.FC = () => {
  const { userSettings, fetchBookmarks, importChromeBookmarks, removeBookmark, updateBookmark, syncBookmarks, refreshBookmarks, addBookmark } = useBookmarkStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSection, setActiveSection] = useState("HOME");
  const [isLoading, setIsLoading] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [openActionId, setOpenActionId] = useState<number | null>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const [bookmarkTree, setBookmarkTree] = useState<CategoryTree[]>([]);
  const { bookmarks } = useBookmarkStore();
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  // 실시간 업데이트 메시지 리스너
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === 'BOOKMARK_UPDATE' && message.data?.bookmarks) {
        syncBookmarks(message.data.bookmarks);
      }
    };

    // 메시지 리스너 등록
    chrome.runtime.onMessage.addListener(handleMessage);
  }, [syncBookmarks]);

  useEffect(() => {
    // 탭(섹션) 변경 시 스크롤 맨 위로 이동
    if (contentAreaRef.current) {
      contentAreaRef.current.scrollTop = 0;
    }
  }, [activeSection]);

  // 북마크 클릭 시 새 탭으로 열기
  const handleBookmarkClick = async (bookmark: Bookmark) => {
    window.open(bookmark.url, '_blank');
    // 방문 시 visitCount 증가
    await updateBookmark(bookmark.id, { visitCount: (bookmark.visitCount || 0) + 1 });
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
  const handleDeleteBookmark = async (id: number, e: React.MouseEvent) => {
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
  const handleEditStart = (bookmark: Bookmark, e: React.MouseEvent) => {
    e.stopPropagation(); // 북마크 열기 방지
    setEditingBookmark(bookmark.id);
    setEditTitle(bookmark.title);
  };

  // 북마크 제목 저장
  const handleSaveTitle = async (id: number, e: React.FormEvent) => {
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
    setIsLoading(true);
    try {
      // 1. 클러스터링 처리 (bookmarkProcessor로 위임)
      const clustered = await BookmarkProcessor.clusterBookmarks(bookmarks);
      // 2. zustand에 반영
      syncBookmarks(clustered);
      setIsLoading(false);
      alert('북마크가 카테고리별로 정리되었습니다!');
    } catch (error) {
      setIsLoading(false);
      alert('클러스터링에 실패했습니다.');
      console.error(error);
    }
  };

  // 북마크 추가 버튼 클릭 시: 실제 탭 새로고침
  const handleAddBookmarkClick = () => {
    if (window.chrome && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]?.id) {
          chrome.tabs.reload(tabs[0].id);
          // 북마크 추가 플래그를 localStorage에 저장
          localStorage.setItem('add_bookmark_after_reload', '1');
          // 팝업도 새로고침(혹은 닫기)
          window.location.reload();
        }
      });
    } else {
      // fallback: 기존 방식
      const url = new URL(window.location.href);
      url.searchParams.set('add_bookmark', '1');
      window.location.replace(url.toString());
    }
  };

  // 페이지 로드 시 북마크 추가 플래그 확인
  useEffect(() => {
    if (localStorage.getItem('add_bookmark_after_reload') === '1') {
      (async () => {
        localStorage.removeItem('add_bookmark_after_reload');
        const result = await BookmarkProcessor.processCurrentTab();
        if (!result.success) {
          alert(`[${result.step}] 단계에서 실패: ${result.message}`);
        } else {
          const now = new Date().toISOString();
          const bookmarkData = result.data!;
          const bookmark = {
            id: 0,
            title: bookmarkData.title || '',
            generatedTitle: bookmarkData.generatedTitle || '',
            url: bookmarkData.url || '',
            description: bookmarkData.summary || '',
            createdAt: now,
            updatedAt: now,
            visitCount: 0,
            favicon: `https://www.google.com/s2/favicons?sz=64&domain_url=${bookmarkData.url || ''}`,
            categoryId: '-1',
            category: ''
          };
          await addBookmark(bookmark);
          await refreshBookmarks();
          alert(
            `북마크 저장 완료!\n\n` +
            `원본 제목: ${bookmarkData.title}\n\n` +
            `생성된 제목: ${bookmarkData.generatedTitle}\n\n` +
            `URL: ${bookmarkData.url}\n\n` +
            `요약: ${bookmarkData.summary}`
          );
          // 북마크 추가 후 팝업 새로고침
          window.location.reload();
        }
      })();
    }
  }, [addBookmark, refreshBookmarks]);

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
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
    // categoryId 기준으로 그룹화
    const grouped = bookmarks.reduce((acc, bm) => {
      const catId = bm.categoryId || 'uncategorized';
      if (!acc[catId]) acc[catId] = [];
      acc[catId].push(bm);
      return acc;
    }, {} as Record<string, Bookmark[]>);
    // categoryId → category명 매핑
    const categoryNameMap: Record<string, string> = {};
    bookmarks.forEach(bm => {
      if (bm.categoryId && bm.category) categoryNameMap[bm.categoryId] = bm.category;
    });
    return (
      <div>
        {Object.entries(grouped).map(([categoryId, bms]) => {
          const sortedBms = [...bms].sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0));
          const maxVisit = Math.max(...sortedBms.map(bm => bm.visitCount || 0), 1);
          const isCollapsed = collapsedCategories[categoryId];
          return (
            <div key={categoryId}>
              <CategoryHeader collapsed={!!isCollapsed} onClick={() => toggleCategory(categoryId)}>
                <FolderIcon>
                  {isCollapsed ? '📁' : '📂'}
                </FolderIcon>
                <span style={{ flex: 1 }}>{categoryNameMap[categoryId] || '미분류'}</span>
                <span style={{ fontSize: '1.2em', marginLeft: 8 }}>
                  {isCollapsed ? '▶' : '▼'}
                </span>
              </CategoryHeader>
              {!isCollapsed && (
                <CategoryContent>
                  {sortedBms.map(bookmark => (
                    <BookmarkItem
                      key={bookmark.id}
                      fillRatio={maxVisit > 0 ? (bookmark.visitCount || 0) / maxVisit : 0}
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
                          <BookmarkTitle fillRatio={maxVisit > 0 ? (bookmark.visitCount || 0) / maxVisit : 0}>{bookmark.generatedTitle || bookmark.title}</BookmarkTitle>
                        )}
                        <BookmarkUrl fillRatio={maxVisit > 0 ? (bookmark.visitCount || 0) / maxVisit : 0}>{bookmark.url}</BookmarkUrl>
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
                  ))}
                </CategoryContent>
              )}
            </div>
          );
        })}
      </div>
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
        <TopBar>
          <AddBookmarkButton onClick={handleAddBookmarkClick}>+</AddBookmarkButton>
          <SearchBar>
            <SearchInput 
              type="text" 
              placeholder="북마크 검색" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <SearchIcon>🔍</SearchIcon>
          </SearchBar>
          <ArrangeButton onClick={handleArrangeClick}>A! 정리</ArrangeButton>
        </TopBar>
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
  overflow-y: scroll;
  scrollbar-gutter: stable;
  padding-right: 8px;
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
  padding: 8px 8px 8px 4px;
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
  color: ${({ fillRatio, theme }) =>
    fillRatio >= 0.2 ? '#222' : (theme.mode === 'dark' ? '#f5f6fa' : '#222')};
`;

const ServiceIcon = styled.div`
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  margin: 0 8px;
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

const BookmarkTitle = styled.div<{ fillRatio?: number }>`
  user-select: none;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${({ fillRatio, theme }) =>
    fillRatio && fillRatio >= 0.2 ? '#222' : (theme.mode === 'dark' ? '#f5f6fa' : '#222')};
`;

const BookmarkUrl = styled.div<{ fillRatio?: number }>`
  user-select: none;
  font-size: 11px;
  color: ${({ fillRatio, theme }) =>
    fillRatio && fillRatio >= 0.2 ? '#444' : (theme.mode === 'dark' ? '#b0b3b8' : '#888')};
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

const AddBookmarkButton = styled.button`
  background: #4CAF50;
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  transition: background 0.2s;
  &:hover {
    background: #388e3c;
  }
`;

const CategoryHeader = styled.div<{ collapsed: boolean }>`
  margin: 16px 0 0 0;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  font-size: 1.1em;
  font-weight: bold;
  background: ${({ theme }) => theme.mode === 'dark' ? '#23272f' : '#f5f7fa'};
  border: 1.5px solid ${({ theme }) => theme.mode === 'dark' ? '#33363d' : '#e0e0e0'};
  border-radius: ${({ collapsed }) => (collapsed ? '10px' : '10px 10px 0 0')};
  transition: background 0.2s, border 0.2s, border-radius 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
  color: ${({ theme }) => theme.mode === 'dark' ? '#f5f6fa' : '#222'};
  &:hover {
    background: ${({ theme }) => theme.mode === 'dark' ? '#2a2e38' : '#e3eaf6'};
    border-color: ${({ theme }) => theme.mode === 'dark' ? '#444' : '#b6c6e3'};
  }
`;

const CategoryContent = styled.div`
  background: ${({ theme }) => theme.mode === 'dark' ? '#1e2128' : '#fafbfc'};
  border: 1.5px solid ${({ theme }) => theme.mode === 'dark' ? '#33363d' : '#e0e0e0'};
  border-top: none;
  border-radius: 0 0 10px 10px;
  padding: 12px 4px 8px 8px;
  margin-bottom: 18px;
  transition: max-height 0.3s cubic-bezier(0.4,0,0.2,1);
  overflow: hidden;
`;

const FolderIcon = styled.span`
  font-size: 1.3em;
  margin-right: 10px;
  display: flex;
  align-items: center;
  width: 24px;
  justify-content: center;
`;

export default Home; 