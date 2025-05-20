import { Bookmark, Category, SaveBookmarkResponse, BookmarkStats } from '../types';

// 로컬 스토리지 키
const STORAGE_KEYS = {
  BOOKMARKS: 'bookmarks',
  CATEGORIES: 'categories',
};

// 페이지 텍스트 추출 및 북마크 저장 API
export const saveBookmark = async (url: string, pageText: string): Promise<SaveBookmarkResponse> => {
  try {
    const bookmarks = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKMARKS) || '[]');
    const sameCategory = bookmarks.filter((bm: Bookmark) => bm.categoryId === '1');
    const maxOrder = sameCategory.length > 0 ? Math.max(...sameCategory.map((bm: Bookmark) => bm.order ?? 0)) : -1;
    const newBookmark: Bookmark = {
      id: Date.now().toString(),
      url,
      title: url.split('/').pop() || 'Untitled',
      description: pageText.substring(0, 200),
      categoryId: '1',
      category: '기본',
      favicon: `https://www.google.com/s2/favicons?domain=${url}`,
      visitCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      order: maxOrder + 1
    };
    
    bookmarks.push(newBookmark);
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
    
    return {
      success: true,
      bookmark: newBookmark,
    };
  } catch (error) {
    console.error('북마크 저장 중 오류 발생:', error);
    throw error;
  }
};

// 모든 북마크 가져오기 API
export const getAllBookmarks = async (): Promise<Bookmark[]> => {
  try {
    const bookmarks = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKMARKS) || '[]');
    return bookmarks;
  } catch (error) {
    console.error('북마크 불러오기 중 오류 발생:', error);
    throw error;
  }
};

// 북마크 삭제 API
export const deleteBookmark = async (bookmarkId: string): Promise<void> => {
  try {
    const bookmarks = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKMARKS) || '[]');
    const updatedBookmarks = bookmarks.filter((bookmark: Bookmark) => bookmark.id !== bookmarkId);
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(updatedBookmarks));
  } catch (error) {
    console.error('북마크 삭제 중 오류 발생:', error);
    throw error;
  }
};

// 북마크 수정 API
export const updateBookmark = async (bookmarkId: string, data: Partial<Bookmark>): Promise<Bookmark> => {
  try {
    const bookmarks = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKMARKS) || '[]');
    const bookmarkIndex = bookmarks.findIndex((bookmark: Bookmark) => bookmark.id === bookmarkId);
    
    if (bookmarkIndex === -1) {
      throw new Error('북마크를 찾을 수 없습니다.');
    }
    
    const updatedBookmark = {
      ...bookmarks[bookmarkIndex],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    
    bookmarks[bookmarkIndex] = updatedBookmark;
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
    
    return updatedBookmark;
  } catch (error) {
    console.error('북마크 수정 중 오류 발생:', error);
    throw error;
  }
};

// 북마크 통계 가져오기 API
export const getBookmarkStats = async (): Promise<BookmarkStats> => {
  try {
    const bookmarks = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKMARKS) || '[]');
    const categories = JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES) || '[]');
    
    const stats: BookmarkStats = {
      totalBookmarks: bookmarks.length,
      categoriesCount: categories.length,
      categoryDistribution: categories.map((category: Category) => ({
        categoryId: category.id,
        categoryName: category.name,
        count: bookmarks.filter((bookmark: Bookmark) => bookmark.categoryId === category.id).length,
      })),
      mostVisited: bookmarks
        .sort((a: Bookmark, b: Bookmark) => b.visitCount - a.visitCount)
        .slice(0, 5),
      recentlyAdded: bookmarks
        .sort((a: Bookmark, b: Bookmark) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    };
    
    return stats;
  } catch (error) {
    console.error('북마크 통계 불러오기 중 오류 발생:', error);
    throw error;
  }
};

// 추천 북마크 가져오기 API
export const getRecommendedBookmarks = async (): Promise<Bookmark[]> => {
  try {
    const bookmarks = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKMARKS) || '[]');
    // 간단한 추천 로직: 최근에 추가된 북마크 3개를 반환
    return bookmarks
      .sort((a: Bookmark, b: Bookmark) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  } catch (error) {
    console.error('추천 북마크 불러오기 중 오류 발생:', error);
    throw error;
  }
};

// 북마크 가져오기 API
export const importBookmarks = async (bookmarks: Bookmark[]): Promise<void> => {
  try {
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
  } catch (error) {
    console.error('북마크 가져오기 중 오류 발생:', error);
    throw error;
  }
}; 