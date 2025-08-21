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
  // 연속된 공백과 줄바꿈을 하나의 공백으로 처리
  const normalizedText = text
    .replace(/\s+/g, ' ')  // 연속된 공백을 하나로
    .replace(/\n+/g, ' ')  // 줄바꿈을 공백으로
    .trim();  // 앞뒤 공백 제거

  // 문장 구분자로 분리 (마침표, 느낌표, 물음표, 줄바꿈)
  const sentences = normalizedText
    .split(/(?<=[.!?。])\s+/)  // 마침표 뒤 공백을 기준으로 분리
    .map(s => s.trim())  // 각 문장의 앞뒤 공백 제거
    .filter(s => s.length > 0);  // 빈 문장 제거

  return sentences;
}

// --- 광고/불필요 문장 필터링 ---
function isIrrelevantSentence(sentence: string): boolean {
  const patterns = [
    /광고/, /배너/, /추천/, /관련 ?글/, /후원/, /구독/, /더보기/, /댓글/, /공유/, /저장/, /클릭/, /이전글/, /다음글/, /위로가기/, /목차/, /카테고리/, /태그/, /공지/, /이벤트/, /문의/, /연락처/, /쿠키/, /정책/, /약관/,
    /copyright/i, /all rights reserved/i, /terms of use/i, /privacy policy/i,
    /click here/i, /read more/i, /subscribe/i, /follow us/i
  ];
  return patterns.some(re => re.test(sentence));
}

// --- TextRank 기반 문장 요약 ---
function textRankSummary(text: string, maxLen = 500): string {
  // 1. 문장 분리
  const sentences = splitSentences(text);
  if (sentences.length === 0) return '';

  // 2. 문장 벡터화 (단어 집합)
  const tokenize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9가-힣 ]/g, '').split(/\s+/).filter(w => w.length > 1);
  const sentenceTokens = sentences.map(tokenize);

  // 3. 문장 간 유사도 행렬 (코사인 유사도)
  const simMatrix: number[][] = Array(sentences.length).fill(0).map(() => Array(sentences.length).fill(0));
  for (let i = 0; i < sentences.length; i++) {
    for (let j = 0; j < sentences.length; j++) {
      if (i === j) continue;
      const allWords = Array.from(new Set([...sentenceTokens[i], ...sentenceTokens[j]]));
      const v1 = allWords.map(w => sentenceTokens[i].filter(x => x === w).length);
      const v2 = allWords.map(w => sentenceTokens[j].filter(x => x === w).length);
      const dot = v1.reduce((acc, v, k) => acc + v * v2[k], 0);
      const norm1 = Math.sqrt(v1.reduce((acc, v) => acc + v * v, 0));
      const norm2 = Math.sqrt(v2.reduce((acc, v) => acc + v * v, 0));
      simMatrix[i][j] = (norm1 && norm2) ? dot / (norm1 * norm2) : 0;
    }
  }

  // 4. TextRank 점수 계산 (PageRank 방식)
  const d = 0.85;
  const minDiff = 0.0001;
  const steps = 20;
  let scores = Array(sentences.length).fill(1.0);
  for (let step = 0; step < steps; step++) {
    const prev = [...scores];
    for (let i = 0; i < sentences.length; i++) {
      let sum = 0;
      for (let j = 0; j < sentences.length; j++) {
        if (i === j) continue;
        const norm = simMatrix[j].reduce((a, b) => a + b, 0);
        if (norm === 0) continue;
        sum += (simMatrix[j][i] / norm) * prev[j];
      }
      scores[i] = (1 - d) + d * sum;
    }
    // 수렴 체크
    if (scores.every((s, idx) => Math.abs(s - prev[idx]) < minDiff)) break;
  }

  // 5. 점수순 정렬, maxLen 이내로 이어붙이기
  const sorted = sentences
    .map((s, i) => ({ s, score: scores[i], idx: i }))
    .sort((a, b) => b.score - a.score || a.idx - b.idx);
  let summary = '';
  for (const { s } of sorted) {
    if ((summary + s).length > maxLen) break;
    summary += s + ' ';
  }
  return summary.trim();
}

// --- 최종 요약 함수: TextRank 사용 ---
function smartSummary(text: string, title: string, maxLen = 1000): string {
  return textRankSummary(text, maxLen);
}

export class BookmarkProcessor {
   private static readonly MAX_SUMMARY_LENGTH = 1000;

  // 1. 현재 탭에서 본문 추출 → 요약 → 백엔드로 제목 생성 요청 → 결과 반환
  public static async processCurrentTab(): Promise<{ success: boolean; step: string; message: string; data?: BookmarkData }> {
    // 1. 탭 정보
    let tab: chrome.tabs.Tab;
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs || tabs.length === 0) {
        throw new Error('현재 활성화된 탭을 찾을 수 없습니다.');
      }
      tab = tabs[0];
      if (!tab.url || !tab.id) {
        throw new Error('유효하지 않은 탭 정보입니다.');
      }
    } catch (e: any) {
      console.error('탭 정보 조회 실패:', e);
      return { success: false, step: '탭 정보', message: e?.message || String(e) };
    }

    // 2. content script로 본문 요청
    let pageData: { title: string; url: string; content: string };
    try {
      pageData = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('본문 추출 시간 초과'));
        }, 10000); // 10초 타임아웃

        chrome.tabs.sendMessage(
          tab.id as number,
          { type: 'GET_PAGE_TEXT' },
          (res) => {
            clearTimeout(timeout);
            if (chrome.runtime.lastError) {
              reject(new Error(`본문 추출 실패: ${chrome.runtime.lastError.message}`));
            } else if (!res || !res.content) {
              reject(new Error('본문 내용이 없습니다.'));
            } else {
              resolve({
                title: res.title || tab.title || '',
                url: tab.url || '',
                content: res.content
              });
            }
          }
        );
      });
    } catch (e: any) {
      console.error('본문 추출 실패:', e);
      return { success: false, step: '본문 추출', message: e?.message || String(e) };
    }

    // 3. 요약
    let summary = '';
    try {
      if (!pageData.content.trim()) {
        throw new Error('요약할 내용이 없습니다.');
      }
      summary = smartSummary(pageData.content, pageData.title, this.MAX_SUMMARY_LENGTH);
      if (!summary) {
        throw new Error('요약 생성에 실패했습니다.');
      }
    } catch (e: any) {
      console.error('요약 실패:', e);
      return { success: false, step: '요약', message: e?.message || String(e) };
    }

    // 4. 백엔드에 제목 생성 요청
    let generatedTitle = '';
    try {
      const response = await axios.post(`${BACKEND_URL}/generate_title`, {
        title: pageData.title,
        summary
      }, {
        timeout: 5000 // 5초 타임아웃
      });
      
      if (!response.data || !response.data.title) {
        throw new Error('제목 생성 응답이 올바르지 않습니다.');
      }
      generatedTitle = response.data.title;
    } catch (e: any) {
      console.error('제목 생성 실패:', e);
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