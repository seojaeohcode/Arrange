import { Bookmark } from '../types';

interface TreeCategory {
  id: string;
  name: string;
  children: (TreeCategory | TreeBookmark)[];
}

interface TreeBookmark {
  id: string;
  title: string;
  url: string;
  summary?: string;
  visitCount?: number;
}

// 트리 구조의 카테고리-북마크 JSON을 평탄화된 북마크 배열로 변환
export function flattenBookmarks(treeData: TreeCategory[] | TreeCategory): Bookmark[] {
  const result: Bookmark[] = [];
  function traverse(node: TreeCategory | TreeBookmark | TreeCategory[] | TreeBookmark[], parentCategory: { id: string; name: string } | null) {
    if (Array.isArray(node)) {
      node.forEach(child => traverse(child, null));
    } else if ('children' in node) {
      // 카테고리
      node.children.forEach(child => traverse(child, { id: node.id, name: node.name }));
    } else {
      // 북마크
      result.push({
        ...node,
        categoryId: parentCategory?.id || 'uncategorized',
        category: parentCategory?.name || '미분류',
        visitCount: node.visitCount || 0,
        order: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Bookmark);
    }
  }
  traverse(treeData, null);
  // order 부여
  return result.map((bm, idx) => ({ ...bm, order: idx }));
} 