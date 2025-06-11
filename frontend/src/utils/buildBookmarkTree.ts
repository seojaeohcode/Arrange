import { Bookmark } from '../types';

interface CategoryCluster {
  categoryId: string;
  categoryName: string;
  bookmarkIds: string[];
}

interface CategoryTree {
  id: string;
  name: string;
  children: Bookmark[];
}

// 카테고리-북마크 id 매핑과 전체 북마크 정보를 합쳐 트리 구조로 변환
export function buildBookmarkTree(
  allBookmarks: Bookmark[],
  clusters: CategoryCluster[]
): CategoryTree[] {
  return clusters.map((cluster): CategoryTree => ({
    id: cluster.categoryId,
    name: cluster.categoryName,
    children: cluster.bookmarkIds
      .map((bid: string) => allBookmarks.find((bm: Bookmark) => bm.id === bid)!)
      .filter((bm): bm is Bookmark => Boolean(bm))
  }));
} 