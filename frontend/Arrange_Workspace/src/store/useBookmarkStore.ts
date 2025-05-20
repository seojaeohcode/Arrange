import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Bookmark, Category, UserSettings } from '../types';
import * as bookmarkApi from '../api/bookmarkApi';

interface BookmarkState {
  bookmarks: Bookmark[];
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  userSettings: UserSettings;
  
  // 북마크 액션
  fetchBookmarks: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  addBookmark: (url: string, pageText: string) => Promise<void>;
  removeBookmark: (id: string) => Promise<void>;
  updateBookmark: (id: string, data: Partial<Bookmark>) => Promise<void>;
  
  // 설정 액션
  toggleDarkMode: () => void;
  toggleNotifications: () => void;
  toggleAutoCategories: () => void;
  
  // 크롬 북마크 액션
  importChromeBookmarks: () => Promise<Bookmark[]>;
}

const useBookmarkStore = create<BookmarkState>()(
  persist(
    (set, get) => ({
      bookmarks: [],
      categories: [],
      isLoading: false,
      error: null,
      userSettings: {
        darkMode: false,
        notifications: true,
        autoCategories: true,
      },
      
      // 북마크 가져오기
      fetchBookmarks: async () => {
        set({ isLoading: true, error: null });
        try {
          const bookmarks = await bookmarkApi.getAllBookmarks();
          set({ bookmarks, isLoading: false });
        } catch (error) {
          set({ 
            error: '북마크를 불러오는데 실패했습니다.', 
            isLoading: false 
          });
          console.error('북마크 불러오기 오류:', error);
        }
      },
      
      // 카테고리 가져오기
      fetchCategories: async () => {
        set({ isLoading: true, error: null });
        try {
          const categories = await bookmarkApi.getAllCategories();
          set({ categories, isLoading: false });
        } catch (error) {
          set({ 
            error: '카테고리를 불러오는데 실패했습니다.', 
            isLoading: false 
          });
          console.error('카테고리 불러오기 오류:', error);
        }
      },
      
      // 북마크 추가
      addBookmark: async (url, pageText) => {
        set({ isLoading: true, error: null });
        try {
          const response = await bookmarkApi.saveBookmark(url, pageText);
          const now = new Date().toISOString();

          const newBookmark: Bookmark = {
            id: response.bookmark.id,
            title: response.bookmark.title,
            url,
            categoryId: 'default', // 기본 카테고리 ID
            createdAt: now,
            updatedAt: now,
            visitCount: 0
          };

          set(state => ({
            bookmarks: [...state.bookmarks, newBookmark],
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: '북마크 저장에 실패했습니다.',
            isLoading: false,
          });
          console.error('북마크 저장 오류:', error);
        }
      },
      
      // 북마크 삭제
      removeBookmark: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await bookmarkApi.deleteBookmark(id);
          set(state => ({ 
            bookmarks: state.bookmarks.filter(bookmark => bookmark.id !== id),
            isLoading: false 
          }));
        } catch (error) {
          set({ 
            error: '북마크 삭제에 실패했습니다.', 
            isLoading: false 
          });
          console.error('북마크 삭제 오류:', error);
        }
      },
      
      // 북마크 업데이트
      updateBookmark: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          const updatedBookmark = await bookmarkApi.updateBookmark(id, data);
          set(state => ({ 
            bookmarks: state.bookmarks.map(bookmark => 
              bookmark.id === id ? updatedBookmark : bookmark
            ),
            isLoading: false 
          }));
        } catch (error) {
          set({ 
            error: '북마크 업데이트에 실패했습니다.', 
            isLoading: false 
          });
          console.error('북마크 업데이트 오류:', error);
        }
      },
      
      // 다크 모드 토글
      toggleDarkMode: () => {
        set(state => ({
          userSettings: {
            ...state.userSettings,
            darkMode: !state.userSettings.darkMode
          }
        }));
      },
      
      // 알림 토글
      toggleNotifications: () => {
        set(state => ({
          userSettings: {
            ...state.userSettings,
            notifications: !state.userSettings.notifications
          }
        }));
      },
      
      // 자동 카테고리 토글
      toggleAutoCategories: () => {
        set(state => ({
          userSettings: {
            ...state.userSettings,
            autoCategories: !state.userSettings.autoCategories
          }
        }));
      },
      
      // 크롬 북마크 가져오기
      importChromeBookmarks: async () => {
        set({ isLoading: true, error: null });
        try {
          // 크롬 북마크 API를 통해 북마크 트리 가져오기
          const bookmarks = await new Promise<chrome.bookmarks.BookmarkTreeNode[]>((resolve, reject) => {
            chrome.bookmarks.getTree((results) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(results);
              }
            });
          });

          const transformBookmarks = (nodes: chrome.bookmarks.BookmarkTreeNode[], parentId = '0'): Bookmark[] => {
            return nodes.reduce((acc: Bookmark[], node) => {
              if (node.url) {
                // URL이 있으면 북마크
                const favicon = `https://www.google.com/s2/favicons?sz=64&domain_url=${node.url}`;
                acc.push({
                  id: node.id,
                  title: node.title || '제목 없음',
                  url: node.url,
                  categoryId: parentId,
                  createdAt: node.dateAdded ? new Date(node.dateAdded).toISOString() : new Date().toISOString(),
                  updatedAt: node.dateGroupModified ? new Date(node.dateGroupModified).toISOString() : new Date().toISOString(),
                  visitCount: 0,
                  favicon,
                });
              } else if (node.children) {
                // 폴더인 경우 카테고리로 추가
                if (node.id !== '0' && node.id !== '1') { // root와 북마크 바는 제외
                  // 현재 카테고리 목록 가져오기
                  const currentCategories = get().categories;
                  
                  // 카테고리가 아직 없으면 추가
                  if (!currentCategories.some(cat => cat.id === node.id)) {
                    set(state => ({
                      categories: [
                        ...state.categories,
                        {
                          id: node.id,
                          name: node.title || '카테고리',
                          description: '',
                          color: getRandomColor(),
                          createdAt: node.dateAdded ? new Date(node.dateAdded).toISOString() : new Date().toISOString(),
                          updatedAt: node.dateGroupModified ? new Date(node.dateGroupModified).toISOString() : new Date().toISOString(),
                          bookmarkCount: node.children?.filter(child => child.url).length || 0
                        }
                      ]
                    }));
                  }
                }
                
                // 자식 노드 재귀 처리 (현재 노드 ID를 부모로 전달)
                acc.push(...transformBookmarks(node.children, node.id));
              }
              return acc;
            }, []);
          };

          // 랜덤 색상 생성 함수
          const getRandomColor = () => {
            const colors = [
              '#FF5733', '#33FF57', '#3357FF', '#F3FF33', '#FF33F3', 
              '#33FFF3', '#FF8033', '#8033FF', '#33FF80', '#FF3380'
            ];
            return colors[Math.floor(Math.random() * colors.length)];
          };

          // 북마크를 변환하여 저장
          const transformedBookmarks = transformBookmarks(bookmarks);
          
          // 상태 업데이트
          set(state => ({
            bookmarks: transformedBookmarks,
            isLoading: false
          }));
          
          // 로컬 스토리지에 저장 (API 호출 대신)
          await bookmarkApi.importBookmarks(transformedBookmarks);
          
          return transformedBookmarks;
        } catch (error) {
          console.error('크롬 북마크를 가져오는 중 오류 발생:', error);
          set({
            error: '북마크를 가져오는데 실패했습니다.',
            isLoading: false
          });
          throw error;
        }
      },
    }),
    {
      name: 'bookmark-storage',
      partialize: (state) => ({
        bookmarks: state.bookmarks,
        categories: state.categories,
        userSettings: state.userSettings,
      }),
    }
  )
);

export default useBookmarkStore; 