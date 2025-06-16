import axios from 'axios';
import type { Bookmark } from './types/index';

interface BookmarkData {
  url: string;
  title: string;  // 원본 제목
  generatedTitle?: string;  // AI가 생성한 제목
  summary: string;
  timestamp: number;
}

const BACKEND_URL = 'http://54.196.39.51:8000';

// --- 문장 분리 ---
function splitSentences(text: string): string[] {
  // 한글, 영어, 일본어, 중국어 마침표 모두 지원
  return text.match(/[^.!?。\r\n]+[.!?。\r\n]+/g) || text.split(/[\r\n]+/).filter(Boolean);
}

// --- 광고/불필요 문장 필터링 ---
function isIrrelevantSentence(sentence: string): boolean {
  const patterns = [
    /광고/, /배너/, /추천/, /관련 ?글/, /후원/, /구독/, /더보기/, /댓글/, /공유/, /저장/, /클릭/, /이전글/, /다음글/, /위로가기/, /목차/, /카테고리/, /태그/, /공지/, /이벤트/, /문의/, /연락처/, /쿠키/, /정책/, /약관/
  ];
  return patterns.some(re => re.test(sentence));
}

// --- TF-IDF 계산 (문장별 점수) ---
function computeTfIdf(sentences: string[]): Record<number, number> {
  const tf: Record<string, number[]> = {};
  const df: Record<string, number> = {};
  const N = sentences.length;

  sentences.forEach((s, i) => {
    const words = s.toLowerCase().replace(/[^a-z0-9가-힣 ]/g, '').split(/\s+/).filter(Boolean);
    const unique = new Set(words);
    unique.forEach(w => { df[w] = (df[w] || 0) + 1; });
    words.forEach(w => {
      if (!tf[w]) tf[w] = Array(N).fill(0);
      tf[w][i]++;
    });
  });

  const tfidf: Record<number, number> = {};
  for (let i = 0; i < N; i++) {
    tfidf[i] = 0;
    for (const w in tf) {
      if (tf[w][i] > 0) {
        const idf = Math.log(N / (df[w] || 1));
        tfidf[i] += tf[w][i] * idf;
      }
    }
  }
  return tfidf;
}

// --- 제목과의 유사도(키워드 포함 개수) ---
function titleSimilarity(sentence: string, title: string): number {
  const titleWords = title.toLowerCase().replace(/[^a-z0-9가-힣 ]/g, '').split(/\s+/).filter(Boolean);
  const sentWords = sentence.toLowerCase();
  return titleWords.reduce((acc, w) => acc + (sentWords.includes(w) ? 1 : 0), 0);
}

// --- 최종 요약 함수: TF-IDF + 제목 유사도만 반영 ---
function smartSummary(text: string, title: string, maxLen = 500): string {
  // 1. 문장 분리
  let sentences = splitSentences(text);

  // 2. 불필요 문장(광고 등) + 공백만 있는 문장 + 너무 짧은 문장 제외
  sentences = sentences.filter(
    s => !isIrrelevantSentence(s) && s.replace(/\s/g, '').length > 10
  );

  if (sentences.length === 0) return '요약할 내용이 없습니다.';

  // 3. TF-IDF 점수 계산
  const tfidf = computeTfIdf(sentences);

  // 4. 각 문장에 TF-IDF + 제목 유사도만 반영
  const scored = sentences.map((s, i) => ({
    s,
    score: (tfidf[i] || 0) + titleSimilarity(s, title) * 2,
    idx: i
  }));

  // 5. 점수순 정렬, 500자 이내로 이어붙이기
  const sorted = scored.sort((a, b) => b.score - a.score || a.idx - b.idx);
  let summary = '';
  for (const { s } of sorted) {
    if ((summary + s).length > maxLen) break;
    summary += s;
  }
  return summary.trim();
}

export class BookmarkProcessor {
   private static readonly MAX_SUMMARY_LENGTH = 500;

  // 1. 현재 탭에서 본문 추출 → 요약 → 백엔드로 제목 생성 요청 → 결과 반환
  public static async processCurrentTab(): Promise<{ success: boolean; step: string; message: string; data?: BookmarkData }> {
    // 1. 탭 정보
    let tab: chrome.tabs.Tab;
    try {
      [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (typeof tab.id !== "number") throw new Error('현재 탭의 ID를 가져올 수 없습니다.');
    } catch (e: any) {
      return { success: false, step: '탭 정보', message: e?.message || String(e) };
    }

    // 2. content script로 본문 요청
    let pageData: { title: string; url: string; content: string };
    try {
      pageData = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(
          tab.id as number,
          { type: 'GET_PAGE_TEXT' },
          (res) => {
            if (chrome.runtime.lastError || !res) {
              reject(new Error('본문 추출에 실패했습니다.'));
            } else {
              resolve(res);
            }
          }
        );
      });
    } catch (e: any) {
      return { success: false, step: '본문 추출', message: e?.message || String(e) };
    }

    // 3. 요약
    let summary = '';
    try {
      summary = smartSummary(pageData.content, pageData.title, this.MAX_SUMMARY_LENGTH);
      if (!summary) throw new Error('요약에 실패했습니다.');
    } catch (e: any) {
      return { success: false, step: '요약', message: e?.message || String(e) };
    }

    // 4. 백엔드에 제목 생성 요청
    let generatedTitle = '';
    try {
      const response = await axios.post(`${BACKEND_URL}/generate_title`, {
        title: pageData.title,
        summary
      });
      generatedTitle = response.data.title || pageData.title;
    } catch (e: any) {
      // 실패 시 기존 제목 사용
      generatedTitle = pageData.title;
    }

    // 성공
    return {
      success: true,
      step: '완료',
      message: `북마크 요약 및 제목 생성 성공\n\n원본 제목: ${pageData.title}\n생성된 제목: ${generatedTitle}`,
      data: {
        url: pageData.url,
        title: pageData.title,
        generatedTitle: generatedTitle,
        summary,
        timestamp: Date.now()
      }
    };
  }

  // 북마크 클러스터링 및 카테고리명 할당
  public static async clusterBookmarks(bookmarks: Bookmark[]): Promise<Bookmark[]> {
    // 1. API 요청용 데이터 준비
    const items = bookmarks.map(bm => ({
      id: bm.id,
      title: bm.generatedTitle || bm.title,
      summary: bm.description && bm.description.trim() !== '' ? bm.description : '내용 없음'
    }));
    // 디버깅용 콘솔 출력
    console.log('[클러스터링 요청 items]', items);
    try {
      // 2. API 호출
      const res = await axios.post(`${BACKEND_URL}/cluster`, { items });
      console.log('[클러스터링 백엔드 응답]', res.data); // 응답 전체 출력
      const { clusters, categories } = res.data;
      if (!Array.isArray(clusters) || !categories) {
        alert('클러스터링 백엔드 응답이 올바르지 않습니다. 관리자에게 문의하세요.');
        throw new Error('클러스터링 결과가 올바르지 않습니다. (clusters, categories)');
      }
      // 3. 클러스터 정보 북마크에 매핑
      const clusterMap = new Map(clusters.map((c: any) => [c.id, c.cluster]));
      // 4. 북마크에 categoryId, category 필드 추가
      return bookmarks.map(bm => {
        const clusterValue = clusterMap.get(bm.id);
        return {
          ...bm,
          categoryId: clusterValue !== undefined ? String(clusterValue) : undefined,
          category: categories[String(clusterValue)] || '미분류'
        };
      });
    } catch (err) {
      console.error('[클러스터링 실패]', err);
      throw err;
    }
  }
}