import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import useBookmarkStore from '../store/useBookmarkStore';
import CategoryAccordion from '../components/CategoryAccordion';
import BookmarkList from '../components/BookmarkList';
import { Bookmark } from '../types';

const ManageBookmarks: React.FC = () => {
  const { bookmarks, categories, isLoading, error, userSettings } = useBookmarkStore();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredBookmarks, setFilteredBookmarks] = useState<Bookmark[]>([]);
  
  // 검색어를 기반으로 북마크 필터링
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredBookmarks(bookmarks);
    } else {
      const lowercaseSearch = searchTerm.toLowerCase();
      const filtered = bookmarks.filter(bookmark => 
        bookmark.title.toLowerCase().includes(lowercaseSearch) || 
        bookmark.url.toLowerCase().includes(lowercaseSearch)
      );
      setFilteredBookmarks(filtered);
    }
  }, [searchTerm, bookmarks]);

  // 드래그 앤 드롭 처리
  const handleDragEnd = (result: DropResult) => {
    // TODO: 드래그 앤 드롭 구현 (API 연동 필요)
    console.log('드래그 앤 드롭 결과:', result);
  };

  return (
    <ManageContainer className={userSettings.darkMode ? 'text-white' : ''}>
      <Header>
        <Title>북마크 관리</Title>
        <SearchBar>
          <SearchIcon>🔍</SearchIcon>
          <SearchInput 
            type="text" 
            placeholder="북마크 검색..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={userSettings.darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-darkest'}
          />
          {searchTerm && (
            <ClearButton onClick={() => setSearchTerm('')}>✕</ClearButton>
          )}
        </SearchBar>
      </Header>

      {isLoading ? (
        <LoadingMessage>북마크 로딩 중...</LoadingMessage>
      ) : error ? (
        <ErrorMessage>{error}</ErrorMessage>
      ) : (
        <Content>
          {searchTerm ? (
            <SearchResults>
              <ResultTitle>검색 결과: {filteredBookmarks.length}개</ResultTitle>
              <BookmarkList bookmarks={filteredBookmarks} />
            </SearchResults>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <CategorySection>
                  <SectionTitle>카테고리별 북마크</SectionTitle>
                  <CategoryAccordion 
                    categories={categories} 
                    bookmarks={bookmarks}
                  />
                </CategorySection>
              </motion.div>
            </DragDropContext>
          )}
        </Content>
      )}
    </ManageContainer>
  );
};

const ManageContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 16px;
  max-width: 800px;
  margin: 0 auto;
  transition: all 0.3s ease;
`;

const Header = styled.div`
  margin-bottom: 24px;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 16px;
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  padding: 0 12px;
  height: 40px;
  background-color: white;
  border-radius: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: relative;
  transition: all 0.3s ease;
`;

const SearchIcon = styled.span`
  margin-right: 8px;
  opacity: 0.6;
`;

const SearchInput = styled.input`
  flex: 1;
  height: 100%;
  border: none;
  background: none;
  font-size: 14px;
  
  &:focus {
    outline: none;
  }
`;

const ClearButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  opacity: 0.5;
  font-size: 12px;
  padding: 4px;
  
  &:hover {
    opacity: 0.8;
  }
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const CategorySection = styled.section`
  margin-bottom: 24px;
`;

const SectionTitle = styled.h2`
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
`;

const ImportDescription = styled.p`
  margin-bottom: 8px;
  font-size: 14px;
  color: #666;
`;

const SearchResults = styled.div`
  margin-top: 16px;
`;

const ResultTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  opacity: 0.8;
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 32px;
  font-size: 16px;
  color: #666;
`;

const ErrorMessage = styled.div`
  text-align: center;
  padding: 32px;
  font-size: 16px;
  color: #f44336;
  background: rgba(244, 67, 54, 0.1);
  border-radius: 8px;
`;

export default ManageBookmarks; 