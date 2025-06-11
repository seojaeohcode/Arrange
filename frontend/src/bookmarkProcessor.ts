import * as cheerio from 'cheerio';
import axios from 'axios';

interface BookmarkData {
  url: string;
  title: string;
  summary: string;
  timestamp: number;
}

// --- TextRank 스타일 요약 함수 시작 ---
function splitSentences(text: string): string[] {
  return text.match(/[^.!?\r\n]+[.!?\r\n]+/g) || [text];
}

function getWords(sentence: string): string[] {
  return sentence
    .toLowerCase()
    .replace(/[^a-z0-9가-힣 ]/g, '')
    .split(' ')
    .filter(Boolean);
}

function sentenceSimilarity(a: string, b: string): number {
  const aWords = new Set(getWords(a));
  const bWords = new Set(getWords(b));
  const intersection = [...aWords].filter(x => bWords.has(x));
  if (aWords.size === 0 || bWords.size === 0) return 0;
  return intersection.length / (Math.log(aWords.size + 1) + Math.log(bWords.size + 1));
}

function textRankSummary(text: string, maxLen = 300): string {
  const sentences = splitSentences(text);
  const n = sentences.length;
  if (n === 1) return sentences[0].slice(0, maxLen);

  // 유사도 행렬 및 점수 계산
  const scores = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) scores[i] += sentenceSimilarity(sentences[i], sentences[j]);
    }
  }

  // 점수 높은 순으로 정렬 후, 300자 이내로 문장 이어붙이기
  const sorted = sentences
    .map((s, i) => ({ s, score: scores[i], idx: i }))
    .sort((a, b) => b.score - a.score || a.idx - b.idx); // 점수 같으면 원래 순서

  let summary = '';
  for (const { s } of sorted) {
    if ((summary + s).length > maxLen) break;
    summary += s;
  }
  return summary.trim();
}
// --- TextRank 스타일 요약 함수 끝 ---

export class BookmarkProcessor {
  private static readonly MAX_SUMMARY_LENGTH = 300;

  public static async processCurrentTab(): Promise<{ success: boolean; step: string; message: string; data?: BookmarkData }> {
    // 1단계: 탭 정보
    let tab: chrome.tabs.Tab;
    try {
      [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (typeof tab.id !== "number") {
        throw new Error('현재 탭의 ID를 가져올 수 없습니다.');
      }
    } catch (e: any) {
      return { success: false, step: '탭 정보', message: e?.message || String(e) };
    }

    // 2단계: content script로 본문 요청
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

    // 3단계: 요약
    let summary = '';
    try {
      summary = textRankSummary(pageData.content, this.MAX_SUMMARY_LENGTH);
      if (!summary) throw new Error('요약에 실패했습니다.');
    } catch (e: any) {
      return { success: false, step: '요약', message: e?.message || String(e) };
    }

    // 성공
    return {
      success: true,
      step: '완료',
      message: '북마크 요약 성공',
      data: {
        url: pageData.url,
        title: pageData.title,
        summary,
        timestamp: Date.now()
      }
    };
  }

  public static async saveBookmark(bookmarkData: BookmarkData): Promise<void> {
    try {
      // 백엔드 API 호출
      const response = await axios.post('http://localhost:3000/api/bookmarks', bookmarkData);
      console.log('북마크가 성공적으로 저장되었습니다:', response.data);
    } catch (error) {
      console.error('북마크 저장 중 오류가 발생했습니다:', error);
      throw error;
    }
  }
} 