import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Bookmark, Category, UserSettings } from '../types';
import * as bookmarkApi from '../api/bookmarkApi';
import { importChromeBookmarks as importChromeBookmarksApi } from '../api/bookmarkApi';
import { useEffect } from 'react';
import { BookmarkProcessor } from '../bookmarkProcessor';

interface BookmarkState {
  bookmarks: Bookmark[];
  categories: string[];
  isLoading: boolean;
  error: string | null;
  userSettings: UserSettings;
  
  // 북마크 액션
  fetchBookmarks: () => Promise<void>;
  addBookmark: (bookmark: Bookmark) => Promise<void>;
  removeBookmark: (id: number) => Promise<void>;
  updateBookmark: (id: number, data: Partial<Bookmark>) => Promise<void>;
  
  // 설정 액션
  toggleDarkMode: () => void;
  toggleNotifications: () => void;
  toggleAutoCategories: () => void;
  
  // 크롬 북마크 액션
  importChromeBookmarks: () => Promise<Bookmark[]>;

  // 실시간 업데이트 액션
  syncBookmarks: (newBookmarks: Bookmark[]) => void;

  // 북마크 목록 갱신
  refreshBookmarks: () => Promise<void>;
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
          const result = await chrome.storage.local.get('bookmark-storage');
          const storage = result['bookmark-storage'] || {};
          const bookmarks = storage.bookmarks || [];
          set({ bookmarks, isLoading: false });
        } catch (error) {
          set({ error: '북마크를 불러오는데 실패했습니다.', isLoading: false });
        }
      },
      
      // 북마크 추가
      addBookmark: async (bookmark) => {
        set({ isLoading: true, error: null });
        try {
          // 스토리지에서 기존 북마크 불러오기
          const result = await chrome.storage.local.get('bookmark-storage');
          const storage = result['bookmark-storage'] || {};
          const bookmarks = storage.bookmarks || [];
          // id를 0부터 1씩 증가하는 값으로 할당
          let newId = 0;
          if (bookmarks.length > 0) {
            const maxId = Math.max(...bookmarks.map((b: Bookmark) => b.id || 0));
            newId = maxId + 1;
          }
          // Bookmark 타입의 모든 필드 기본값 보장
          const now = new Date().toISOString();
          const newBookmark = {
            id: newId,
            title: bookmark.title || '',
            generatedTitle: bookmark.generatedTitle || '',
            url: bookmark.url || '',
            description: bookmark.description || '',
            createdAt: now,
            updatedAt: now,
            visitCount: typeof bookmark.visitCount === 'number' ? bookmark.visitCount : 0,
            favicon: bookmark.favicon || '',
            categoryId: typeof bookmark.categoryId === 'string' ? bookmark.categoryId : '-1',
            category: typeof bookmark.category === 'string' ? bookmark.category : '',
          };
          const updatedBookmarks = [...bookmarks, newBookmark];
          storage.bookmarks = updatedBookmarks;
          await chrome.storage.local.set({ 'bookmark-storage': storage });
          set(state => ({
            bookmarks: updatedBookmarks,
            isLoading: false
          }));
        } catch (error) {
          set({ error: '북마크 추가 실패', isLoading: false });
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
          set({ error: '북마크 삭제 실패', isLoading: false });
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
          set({ error: '북마크 업데이트에 실패했습니다.', isLoading: false });
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
          const bookmarks = await importChromeBookmarksApi();
          if (bookmarks.length === 0) {
            set({ isLoading: false });
            return get().bookmarks; // 기존 상태 유지
          }
          set({
            bookmarks,
            isLoading: false
          });
          return bookmarks;
        } catch (error) {
          set({
            error: '북마크를 가져오는데 실패했습니다.',
            isLoading: false
          });
          throw error;
        }
      },

      // 실시간 북마크 동기화
      syncBookmarks: (newBookmarks) => {
        set({ bookmarks: newBookmarks });
        // chrome.storage.local에도 동기화
        chrome.storage.local.get('bookmark-storage', (result) => {
          const storage = result['bookmark-storage'] || {};
          storage.bookmarks = newBookmarks;
          chrome.storage.local.set({ 'bookmark-storage': storage });
        });
      },

      // 북마크 목록 갱신
      refreshBookmarks: async () => {
        try {
          set({ isLoading: true, error: null });
          const bookmarks = await bookmarkApi.getAllBookmarks();
          set({ bookmarks, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '북마크를 불러오는데 실패했습니다.', 
            isLoading: false 
          });
        }
      } 
    }),
    {
      name: 'bookmark-storage',
      partialize: (state) => ({
        bookmarks: state.bookmarks,
        userSettings: state.userSettings,
      }),
    }
  )
);

export default useBookmarkStore; 