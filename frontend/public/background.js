// 메시지 타입 정의
const MESSAGE_TYPES = {
  TOGGLE_SIDE_PANEL: 'toggleSidePanel'
};

// 확장 프로그램 아이콘 클릭 시 사이드 패널 열기
chrome.action.onClicked.addListener((tab) => {
  if (tab.id !== undefined) {
    chrome.sidePanel.open({ tabId: tab.id })
      .catch((error) => {
        console.error('Failed to open side panel:', error);
      });
  }
});

// 메시지 리스너: 사이드 패널 토글 요청 처리
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === MESSAGE_TYPES.TOGGLE_SIDE_PANEL && sender.tab?.id) {
    chrome.sidePanel.open({ tabId: sender.tab.id })
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('Failed to open side panel:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 비동기 응답을 위한 true 반환
  }
});