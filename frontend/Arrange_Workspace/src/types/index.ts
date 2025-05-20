// 북마크 타입 정의
export interface Bookmark {
  id: string;
  title: string;
  url: string;
  categoryId: string;
  category?: string;
  favicon?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  visitCount: number;
  order: number;
}

// 카테고리 타입 정의
export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
  bookmarkCount?: number;
}

// 북마크 저장 응답 타입
export interface SaveBookmarkResponse {
  success: boolean;
  bookmark: Bookmark;
}

// 사용자 설정 타입
export interface UserSettings {
  darkMode: boolean;
  notifications: boolean;
  autoCategories: boolean;
}

// 북마크 통계 타입
export interface BookmarkStats {
  totalBookmarks: number;
  categoriesCount: number;
  mostVisited: Array<{ id: string; title: string; count: number }>;
  recentlyAdded: Bookmark[];
  categoryDistribution: Array<{
    categoryId: string;
    categoryName: string;
    count: number;
  }>;
} 