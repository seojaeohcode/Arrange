import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import useBookmarkStore from '../store/useBookmarkStore';
import { Bookmark } from '../types';

interface BookmarkListProps {
  title?: string;
  bookmarks: Bookmark[];
  showControls?: boolean;
  maxItems?: number;
}

const BookmarkList: React.FC<BookmarkListProps> = ({ 
  title = '북마크 목록', 
  bookmarks, 
  showControls = true,
  maxItems 
}) => {
  const { removeBookmark, updateBookmark, userSettings } = useBookmarkStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string>('');

  // 표시할 북마크 목록 제한
  const displayedBookmarks = maxItems ? bookmarks.slice(0, maxItems) : bookmarks;

  const handleEditClick = (bookmark: Bookmark) => {
    setEditingId(bookmark.id);
    setEditedTitle(bookmark.title);
    setEditError('');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editedTitle.trim()) {
      setEditError('제목을 입력해주세요.');
      return;
    }
    
    try {
      await updateBookmark(id, { title: editedTitle });
      setEditingId(null);
      setEditError('');
    } catch (error) {
      setEditError('저장 중 오류가 발생했습니다.');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditError('');
  };

  const handleDeleteClick = async (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async (id: string) => {
    try {
      await removeBookmark(id);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('북마크 삭제 중 오류 발생:', error);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const openBookmark = (url: string) => {
    window.open(url, '_blank');
  };

  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + (urlObj.pathname !== '/' ? urlObj.pathname : '');
    } catch {
      return url;
    }
  };

  // 북마크가 없을 때 표시할 메시지
  if (bookmarks.length === 0) {
    return (
      <EmptyContainer className={userSettings.darkMode ? 'text-gray-300' : 'text-gray-dark'}>
        <EmptyIcon>📚</EmptyIcon>
        <EmptyText>저장된 북마크가 없습니다.</EmptyText>
      </EmptyContainer>
    );
  }

  return (
    <ListContainer>
      {title && (
        <ListTitle className={userSettings.darkMode ? 'text-white' : 'text-gray-darkest'}>
          {title}
        </ListTitle>
      )}
      
      <ListItems>
        <AnimatePresence>
          {displayedBookmarks.map((bookmark, index) => (
            <BookmarkItem
              key={bookmark.id}
              as={motion.div}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
              className={userSettings.darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-lightest'}
            >
              {bookmark.favicon && (
                <BookmarkIcon src={bookmark.favicon} alt="" />
              )}
              
              <BookmarkContent>
                {editingId === bookmark.id ? (
                  <EditContainer>
                    <EditInput
                      type="text"
                      value={editedTitle}
                      onChange={(e) => {
                        setEditedTitle(e.target.value);
                        setEditError('');
                      }}
                      className={userSettings.darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-darkest'}
                      placeholder="북마크 제목을 입력하세요"
                    />
                    {editError && <EditError>{editError}</EditError>}
                  </EditContainer>
                ) : (
                  <BookmarkTitle
                    onClick={() => openBookmark(bookmark.url)}
                    className={userSettings.darkMode ? 'text-white' : 'text-gray-darkest'}
                  >
                    {bookmark.title}
                  </BookmarkTitle>
                )}
                
                <BookmarkUrl 
                  className={userSettings.darkMode ? 'text-gray-400' : 'text-gray'}
                  onClick={() => openBookmark(bookmark.url)}
                  title={bookmark.url}
                >
                  {formatUrl(bookmark.url)}
                </BookmarkUrl>
              </BookmarkContent>
              
              {showControls && (
                <BookmarkActions>
                  {editingId === bookmark.id ? (
                    <>
                      <ActionButton onClick={() => handleSaveEdit(bookmark.id)}>
                        저장
                      </ActionButton>
                      <ActionButton onClick={handleCancelEdit}>
                        취소
                      </ActionButton>
                    </>
                  ) : (
                    <>
                      <ActionButton onClick={() => handleEditClick(bookmark)}>
                        편집
                      </ActionButton>
                      <ActionButton onClick={() => handleDeleteClick(bookmark.id)}>
                        삭제
                      </ActionButton>
                    </>
                  )}
                </BookmarkActions>
              )}
            </BookmarkItem>
          ))}
        </AnimatePresence>
      </ListItems>
      
      {maxItems && bookmarks.length > maxItems && (
        <ViewMoreButton 
          className={userSettings.darkMode ? 'bg-blue-900 hover:bg-blue-800' : 'bg-primary hover:bg-primary-dark'}
        >
          더 보기 ({bookmarks.length - maxItems}개)
        </ViewMoreButton>
      )}

      <AnimatePresence>
        {deleteConfirmId && (
          <DeleteConfirmModal
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <DeleteConfirmContent>
              <DeleteConfirmTitle>북마크 삭제</DeleteConfirmTitle>
              <DeleteConfirmText>이 북마크를 삭제하시겠습니까?</DeleteConfirmText>
              <DeleteConfirmButtons>
                <DeleteConfirmButton onClick={() => confirmDelete(deleteConfirmId)}>
                  삭제
                </DeleteConfirmButton>
                <DeleteCancelButton onClick={cancelDelete}>
                  취소
                </DeleteCancelButton>
              </DeleteConfirmButtons>
            </DeleteConfirmContent>
          </DeleteConfirmModal>
        )}
      </AnimatePresence>
    </ListContainer>
  );
};

const ListContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 16px;
  background-color: ${props => props.theme.colors.background};
`;

const ListTitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  position: sticky;
  top: 0;
  background: inherit;
  z-index: 1;
  padding: 8px 0;
  color: ${props => props.theme.colors.text.primary};
`;

const ListItems = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  overflow: visible;
  min-height: fit-content;
`;

const BookmarkItem = styled.div`
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  background-color: ${props => props.theme.mode === 'dark' ? '#2d3748' : '#ffffff'};
  border: 1px solid ${props => props.theme.mode === 'dark' ? '#4a5568' : '#e2e8f0'};
  width: 100%;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: ${props => props.theme.mode === 'dark' 
      ? '0 4px 6px rgba(255, 255, 255, 0.1)' 
      : '0 2px 5px rgba(0, 0, 0, 0.15)'};
    background-color: ${props => props.theme.mode === 'dark' ? '#1a202c' : '#f7fafc'};
  }
`;

const BookmarkIcon = styled.img`
  width: 20px;
  height: 20px;
  margin-right: 12px;
  object-fit: contain;
`;

const BookmarkContent = styled.div`
  flex: 1;
  min-width: 0;
  margin-right: 12px;
`;

const BookmarkTitle = styled.h4`
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s ease;
  color: ${props => props.theme.mode === 'dark' ? '#e2e8f0' : '#2d3748'};
  
  &:hover {
    text-decoration: underline;
    color: ${props => props.theme.mode === 'dark' ? '#63b3ed' : '#3182ce'};
  }
`;

const BookmarkUrl = styled.div`
  font-size: 12px;
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  color: ${props => props.theme.mode === 'dark' ? '#a0aec0' : '#718096'};
  
  &:hover {
    text-decoration: underline;
    color: ${props => props.theme.mode === 'dark' ? '#63b3ed' : '#3182ce'};
  }
`;

const BookmarkActions = styled.div`
  display: flex;
  gap: 8px;
  margin-left: auto;
  flex-shrink: 0;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  font-size: 12px;
  color: ${props => props.theme.mode === 'dark' ? '#a0aec0' : '#4a5568'};
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${props => props.theme.mode === 'dark' ? 'rgba(99, 179, 237, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
    color: ${props => props.theme.mode === 'dark' ? '#63b3ed' : '#2d3748'};
  }
`;

const EditContainer = styled.div`
  width: 100%;
`;

const EditInput = styled.input`
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid ${props => props.theme.colors.border};
  font-size: 14px;
  background-color: ${props => props.theme.colors.input.background};
  color: ${props => props.theme.colors.text.primary};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
`;

const EditError = styled.div`
  color: ${props => props.theme.colors.error};
  font-size: 12px;
  margin-top: 4px;
`;

const ViewMoreButton = styled.button`
  margin-top: 12px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 500;
  cursor: pointer;
  align-self: center;
  background-color: ${props => props.theme.colors.primary};
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${props => props.theme.colors.primaryDark};
    transform: translateY(-1px);
  }
`;

const EmptyContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: ${props => props.theme.colors.text.secondary};
`;

const EmptyIcon = styled.div`
  font-size: 36px;
  margin-bottom: 16px;
`;

const EmptyText = styled.p`
  font-size: 16px;
  margin: 0;
`;

const DeleteConfirmModal = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const DeleteConfirmContent = styled.div`
  background-color: ${props => props.theme.colors.card.background};
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  width: 90%;
  border: 1px solid ${props => props.theme.colors.border};
`;

const DeleteConfirmTitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
`;

const DeleteConfirmText = styled.p`
  margin: 0 0 24px 0;
  font-size: 14px;
  color: ${props => props.theme.colors.text.secondary};
`;

const DeleteConfirmButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const DeleteConfirmButton = styled.button`
  padding: 8px 16px;
  background-color: ${props => props.theme.colors.error};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${props => props.theme.colors.errorDark};
  }
`;

const DeleteCancelButton = styled.button`
  padding: 8px 16px;
  background-color: ${props => props.theme.colors.button.secondary};
  color: ${props => props.theme.colors.text.primary};
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${props => props.theme.colors.button.secondaryHover};
  }
`;

export default BookmarkList; 