// contentScript.ts 시작 부분에 추가
console.log('Readability available:', typeof Readability !== 'undefined');
// Readability를 사용하여 본문 추출
function extractArticleContent() {
    return new Promise((resolve) => {
        if (document.readyState === 'complete') {
            resolve(extractContent());
        } else {
            window.addEventListener('load', () => resolve(extractContent()));
        }
    });
}

function extractContent() {
    try {
        const article = new Readability(document).parse();
        if (!article) {
            throw new Error('본문을 추출할 수 없습니다.');
        }
        return {
            title: article.title,
            url: window.location.href,
            content: article.textContent
        };
    } catch (error) {
        console.error('본문 추출 중 오류 발생:', error);
        return null;
    }
}

// 메시지 리스너 등록
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_PAGE_TEXT') {
        const articleData = extractArticleContent();
        sendResponse(articleData);
    }
    return true; // 비동기 응답을 위해 true 반환
});
export {};