import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, Category } from '../types';
import BookmarkList from './BookmarkList';
import useBookmarkStore from '../store/useBookmarkStore';

interface CategoryAccordionProps {
  categories: Category[];
  bookmarks: Bookmark[];
}

const CategoryAccordion: React.FC<CategoryAccordionProps> = ({ categories, bookmarks }) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const { userSettings } = useBookmarkStore();

  // 카테고리 확장/축소 토글
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prevExpandedCategories => {
      const newExpandedCategories = new Set(prevExpandedCategories);
      if (newExpandedCategories.has(categoryId)) {
        newExpandedCategories.delete(categoryId);
      } else {
        newExpandedCategories.add(categoryId);
      }
      return newExpandedCategories;
    });
  };

  // 카테고리별 북마크 필터링
  const getBookmarksByCategory = (categoryId: string): Bookmark[] => {
    return bookmarks.filter(bookmark => bookmark.categoryId === categoryId);
  };

  // 카테고리가 없는 북마크 필터링
  const uncategorizedBookmarks = bookmarks.filter(bookmark => !bookmark.categoryId);

  return (
    <AccordionContainer>
      {categories.map(category => (
        <CategoryItem 
          key={category.id}
          className={userSettings.darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-lightest'}
        >
          <CategoryHeader 
            onClick={() => toggleCategory(category.id)}
            className={userSettings.darkMode ? 'text-white' : 'text-gray-darkest'}
          >
            <CategoryTitle>
              {category.name} <CategoryCount>({category.bookmarkCount})</CategoryCount>
            </CategoryTitle>
            <ExpandIcon expanded={expandedCategories.has(category.id)}>
              ▼
            </ExpandIcon>
          </CategoryHeader>
          
          <AnimatePresence>
            {expandedCategories.has(category.id) && (
              <CategoryContent
                as={motion.div}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <BookmarkList 
                  bookmarks={getBookmarksByCategory(category.id)} 
                  title={undefined}
                />
              </CategoryContent>
            )}
          </AnimatePresence>
        </CategoryItem>
      ))}
      
      {uncategorizedBookmarks.length > 0 && (
        <CategoryItem 
          className={userSettings.darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-lightest'}
        >
          <CategoryHeader 
            onClick={() => toggleCategory('uncategorized')}
            className={userSettings.darkMode ? 'text-white' : 'text-gray-darkest'}
          >
            <CategoryTitle>
              미분류 <CategoryCount>({uncategorizedBookmarks.length})</CategoryCount>
            </CategoryTitle>
            <ExpandIcon expanded={expandedCategories.has('uncategorized')}>
              ▼
            </ExpandIcon>
          </CategoryHeader>
          
          <AnimatePresence>
            {expandedCategories.has('uncategorized') && (
              <CategoryContent
                as={motion.div}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <BookmarkList 
                  bookmarks={uncategorizedBookmarks} 
                  title={undefined}
                />
              </CategoryContent>
            )}
          </AnimatePresence>
        </CategoryItem>
      )}
    </AccordionContainer>
  );
};

interface ExpandIconProps {
  expanded: boolean;
}

const AccordionContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
`;

const CategoryItem = styled.div`
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
`;

const CategoryHeader = styled.div`
  background: ${props => props.theme.colors.card.background};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.text.primary};
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  cursor: pointer;
  user-select: none;
`;

const CategoryTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
`;

const CategoryCount = styled.span`
  font-weight: normal;
  font-size: 14px;
  margin-left: 6px;
  opacity: 0.7;
`;

const ExpandIcon = styled.span<ExpandIconProps>`
  font-size: 12px;
  transition: transform 0.3s ease;
  transform: ${props => props.expanded ? 'rotate(180deg)' : 'rotate(0)'};
`;

const CategoryContent = styled.div`
  padding: 0 16px 16px;
  overflow: hidden;
`;

export default CategoryAccordion; 