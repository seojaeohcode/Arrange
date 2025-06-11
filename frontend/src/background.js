// 확장 프로그램 아이콘 클릭 시 사이드 패널 열기
chrome.action.onClicked.addListener((tab) => {
    if (tab.id !== undefined) {
        chrome.sidePanel.open({ tabId: tab.id });
    }
});

// 메시지 리스너: 사이드 패널 토글 요청 처리
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'toggleSidePanel' && sender.tab?.id) {
        chrome.sidePanel.open({ tabId: sender.tab.id });
        sendResponse({ success: true });
    }
    return true; // 비동기 응답을 위한 true 반환
});