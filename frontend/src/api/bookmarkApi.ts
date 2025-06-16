import { Bookmark, Category, BookmarkStats } from '../types';

// 로컬 스토리지 키
const STORAGE_KEYS = {
  BOOKMARKS: 'bookmarks',
  CATEGORIES: 'categories',
};

// 모든 북마크 가져오기 API
export const getAllBookmarks = async (): Promise<Bookmark[]> => {
  try {
    const result = await chrome.storage.local.get('bookmark-storage');
    const storage = result['bookmark-storage'] || {};
    const bookmarks = storage.bookmarks || [];
    return bookmarks;
  } catch (error) {
    console.error('북마크 불러오기 중 오류 발생:', error);
    return [];
  }
};

// 북마크 삭제 API
export const deleteBookmark = async (bookmarkId: number): Promise<void> => {
  try {
    const result = await chrome.storage.local.get('bookmark-storage');
    const storage = result['bookmark-storage'] || {};
    const bookmarks = storage.bookmarks || [];
    const updatedBookmarks = bookmarks.filter((bookmark: Bookmark) => bookmark.id !== bookmarkId);
    storage.bookmarks = updatedBookmarks;
    await chrome.storage.local.set({ 'bookmark-storage': storage });
  } catch (error) {
    console.error('북마크 삭제 중 오류 발생:', error);
    throw error;
  }
};

// 북마크 수정 API
export const updateBookmark = async (bookmarkId: number, data: Partial<Bookmark>): Promise<Bookmark> => {
  try {
    const result = await chrome.storage.local.get('bookmark-storage');
    const storage = result['bookmark-storage'] || {};
    const bookmarks: Bookmark[] = storage.bookmarks || [];
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
    storage.bookmarks = bookmarks;
    await chrome.storage.local.set({ 'bookmark-storage': storage });
    return updatedBookmark;
  } catch (error) {
    console.error('북마크 수정 중 오류 발생:', error);
    throw error;
  }
};

// 북마크 통계 가져오기 API
export const getBookmarkStats = async (): Promise<BookmarkStats> => {
  try {
    const result = await chrome.storage.local.get(['bookmark-storage', STORAGE_KEYS.CATEGORIES]);
    const storage = result['bookmark-storage'] || {};
    const bookmarks = storage.bookmarks || [];
    const categories = result[STORAGE_KEYS.CATEGORIES] || [];
    
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
    const result = await chrome.storage.local.get('bookmark-storage');
    const storage = result['bookmark-storage'] || {};
    const bookmarks = storage.bookmarks || [];
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
    const result = await chrome.storage.local.get('bookmark-storage');
    const storage = result['bookmark-storage'] || {};
    storage.bookmarks = bookmarks;
    await chrome.storage.local.set({ 'bookmark-storage': storage });
  } catch (error) {
    console.error('북마크 가져오기 중 오류 발생:', error);
    throw error;
  }
};

// 크롬 북마크에서 모든 북마크(폴더 포함) 재귀적으로 가져오기 및 변환
export async function getAllChromeBookmarks(): Promise<Bookmark[]> {
  return new Promise((resolve) => {
    chrome.bookmarks.getTree((nodes) => {
      let bookmarks: Bookmark[] = [];
      function traverse(nodeList: chrome.bookmarks.BookmarkTreeNode[]) {
        for (const node of nodeList) {
          if (node.url) {
            bookmarks.push({
              // id는 임시로 0으로 할당, 이후 일괄 재할당
              id: 0,
              title: node.title || '제목 없음',
              url: node.url,
              description: '',
              createdAt: node.dateAdded ? new Date(node.dateAdded).toISOString() : new Date().toISOString(),
              updatedAt: node.dateGroupModified ? new Date(node.dateGroupModified).toISOString() : new Date().toISOString(),
              visitCount: 0,
              favicon: `https://www.google.com/s2/favicons?sz=64&domain_url=${node.url}`,
              categoryId: '-1',
              category: ''
            });
          }
          if (node.children) traverse(node.children);
        }
      }
      traverse(nodes);
      // id를 0부터 1씩 증가하는 값으로 일괄 재할당
      bookmarks = bookmarks.map((bm, idx) => ({ ...bm, id: idx }));
      resolve(bookmarks);
    });
  });
}

// 크롬 북마크를 chrome.storage.local에 저장 (덮어쓰기)
export const importChromeBookmarks = async (): Promise<Bookmark[]> => {
  const bookmarks = await getAllChromeBookmarks();
  
  // chrome.storage.local에서 현재 저장소 가져오기
  const result = await chrome.storage.local.get('bookmark-storage');
  const storage = result['bookmark-storage'] || {};
  
  // 북마크 업데이트
  storage.bookmarks = bookmarks;
  
  // chrome.storage.local에 저장
  await chrome.storage.local.set({
    'bookmark-storage': storage
  });
  
  return bookmarks;
}; 