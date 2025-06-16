// 북마크 타입 정의
export interface Bookmark {
  id: number;
  title: string;  // 원본 제목
  generatedTitle?: string;  // AI가 생성한 제목
  url: string;
  description: string; // 요약(없으면 빈 값)
  createdAt: string;
  updatedAt: string;
  visitCount: number;
  favicon?: string;
  categoryId?: string;
  category?: string;
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