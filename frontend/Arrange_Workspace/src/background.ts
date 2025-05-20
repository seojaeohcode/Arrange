export {};

// 사이드바 및 북마크 관련 기능 활성화
chrome.sidePanel.setPanelState({
  enabled: true
});

// 확장 프로그램 아이콘 클릭 시 사이드바 토글
chrome.action.onClicked.addListener((tab) => {
  // 크롬 사이드 패널을 현재 탭에서 엽니다
  chrome.sidePanel.open({ tabId: tab.id });
});

// 컨텍스트 메뉴 추가 (현재 페이지를 북마크로 저장)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-bookmark',
    title: '이 페이지를 북마크에 추가',
    contexts: ['page', 'link']
  });
});

// 컨텍스트 메뉴 클릭 이벤트 처리
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'save-bookmark') {
    const url = info.linkUrl || (tab?.url || '');
    
    // 현재 페이지 텍스트 추출을 위한 콘텐츠 스크립트 실행
    if (tab?.id) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.body.innerText.substring(0, 3000), // 처음 3000자만 추출
      }, (results) => {
        if (chrome.runtime.lastError) {
          console.error('스크립트 실행 오류:', chrome.runtime.lastError);
          return;
        }
        
        const pageText = results[0]?.result || '';
        
        // 백그라운드에서 북마크 저장 메시지 전송
        chrome.runtime.sendMessage({
          action: 'saveBookmark',
          data: { url, pageText }
        });
        
        // 저장 성공 알림 표시
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon128.png',
          title: '북마크 저장',
          message: '페이지가 북마크에 추가되었습니다.'
        });
      });
    }
  }
});

// 메시지 리스너 등록
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleSidePanel') {
    if (sender.tab?.id) {
      chrome.sidePanel.open({ tabId: sender.tab.id });
    }
    sendResponse({ success: true });
  }
  
  if (message.action === 'syncBookmarks') {
    // 북마크 동기화 요청 처리
    chrome.bookmarks.getTree((bookmarks) => {
      sendResponse({ success: true, bookmarks });
    });
    return true; // 비동기 응답을 위한 true 반환
  }
  
  return true; // 비동기 응답을 위한 true 반환
}); 