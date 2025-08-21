// Chrome API용 타입 정의
declare namespace chrome {
  namespace sidePanel {
    function setPanelState(options: { enabled: boolean }): void;
    function open(options: { tabId?: number }): void;
  }

  namespace action {
    const onClicked: {
      addListener(callback: (tab: chrome.tabs.Tab) => void): void;
    };
  }

  namespace tabs {
    interface Tab {
      id?: number;
      url?: string;
      title?: string;
      favIconUrl?: string;
    }

    function get(tabId: number, callback: (tab: Tab) => void): void;
    function query(queryInfo: { active?: boolean, currentWindow?: boolean }, callback: (tabs: Tab[]) => void): void;
  }

  namespace runtime {
    const lastError: chrome.runtime.LastError | undefined;
    
    interface LastError {
      message: string;
    }
    
    function sendMessage(message: any, callback?: (response: any) => void): void;
    
    interface MessageSender {
      tab?: chrome.tabs.Tab;
    }
    
    const onMessage: {
      addListener(
        callback: (
          message: any,
          sender: MessageSender,
          sendResponse: (response?: any) => void
        ) => boolean | void
      ): void;
    };
    
    const onInstalled: {
      addListener(callback: () => void): void;
    };
  }

  namespace contextMenus {
    function create(options: {
      id: string;
      title: string;
      contexts: string[];
    }): void;
    
    const onClicked: {
      addListener(
        callback: (
          info: {
            menuItemId: string;
            linkUrl?: string;
          },
          tab?: chrome.tabs.Tab
        ) => void
      ): void;
    };
  }

  namespace scripting {
    function executeScript(
      options: {
        target: { tabId: number };
        func: () => string;
      },
      callback: (results: { result: string }[]) => void
    ): void;
  }

  namespace notifications {
    function create(options: {
      type: string;
      iconUrl: string;
      title: string;
      message: string;
    }): void;
  }

  namespace bookmarks {
    interface BookmarkTreeNode {
      id: string;
      parentId?: string;
      index?: number;
      url?: string;
      title: string;
      dateAdded?: number;
      dateGroupModified?: number;
      children?: BookmarkTreeNode[];
    }

    function create(bookmark: {
      parentId?: string;
      index?: number;
      title?: string;
      url?: string;
    }, callback?: (result: BookmarkTreeNode) => void): void;

    function getTree(callback: (results: BookmarkTreeNode[]) => void): void;
    function getSubTree(id: string, callback: (results: BookmarkTreeNode[]) => void): void;
    function get(id: string | string[], callback: (results: BookmarkTreeNode[]) => void): void;
    function search(query: string | { query: string, title?: string, url?: string }, callback: (results: BookmarkTreeNode[]) => void): void;
    function remove(id: string, callback?: () => void): void;
    function update(id: string, changes: { title?: string, url?: string }, callback?: (result: BookmarkTreeNode) => void): void;
    function move(id: string, destination: { parentId?: string, index?: number }, callback?: (result: BookmarkTreeNode) => void): void;
  }
} 