import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark } from '../types';
import useBookmarkStore from '../store/useBookmarkStore';

interface ShareBookmarkModalProps {
  bookmark: Bookmark;
  isOpen: boolean;
  onClose: () => void;
}

const ShareBookmarkModal: React.FC<ShareBookmarkModalProps> = ({ 
  bookmark, 
  isOpen, 
  onClose 
}) => {
  const { userSettings } = useBookmarkStore();
  const [isCopied, setIsCopied] = useState<boolean>(false);
  
  // 공유 URL 생성 (실제로는 백엔드 API로 짧은 URL을 생성할 수 있음)
  const shareUrl = `https://arrange.app/share?url=${encodeURIComponent(bookmark.url)}&title=${encodeURIComponent(bookmark.title)}`;
  
  // 클립보드에 URL 복사
  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(err => {
        console.error('클립보드 복사 실패:', err);
      });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <ModalOverlay
          as={motion.div}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <ModalContent
            as={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={e => e.stopPropagation()}
            className={userSettings.darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-darkest'}
          >
            <ModalHeader>
              <ModalTitle>북마크 공유</ModalTitle>
              <CloseButton onClick={onClose}>✕</CloseButton>
            </ModalHeader>
            
            <BookmarkInfo>
              <BookmarkTitle>{bookmark.title}</BookmarkTitle>
              <BookmarkUrl>{bookmark.url}</BookmarkUrl>
            </BookmarkInfo>
            
            <ShareSection>
              <SectionTitle>공유 링크</SectionTitle>
              <ShareLinkContainer>
                <ShareLink>{shareUrl}</ShareLink>
                <CopyButton 
                  onClick={copyToClipboard}
                  disabled={isCopied}
                  className={isCopied ? 'copied' : ''}
                >
                  {isCopied ? '복사됨!' : '복사'}
                </CopyButton>
              </ShareLinkContainer>
              
              <SectionTitle>소셜 미디어 공유</SectionTitle>
              <SocialShareButtons>
                <SocialButton>
                  <SocialIcon>📱</SocialIcon>
                  카카오톡
                </SocialButton>
                <SocialButton>
                  <SocialIcon>✉️</SocialIcon>
                  이메일
                </SocialButton>
                <SocialButton>
                  <SocialIcon>🔗</SocialIcon>
                  URL
                </SocialButton>
              </SocialShareButtons>
            </ShareSection>
          </ModalContent>
        </ModalOverlay>
      )}
    </AnimatePresence>
  );
};

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  width: 90%;
  max-width: 500px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow-y: auto;
  transition: all 0.3s ease;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
  
  &:hover {
    opacity: 1;
  }
`;

const BookmarkInfo = styled.div`
  padding: 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
`;

const BookmarkTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 500;
`;

const BookmarkUrl = styled.div`
  font-size: 14px;
  color: #666;
  word-break: break-all;
  opacity: 0.8;
`;

const ShareSection = styled.div`
  padding: 20px;
`;

const SectionTitle = styled.h4`
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  opacity: 0.8;
`;

const ShareLinkContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  padding: 8px 12px;
  overflow: hidden;
`;

const ShareLink = styled.div`
  flex: 1;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CopyButton = styled.button`
  background-color: #0066cc;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: #0055aa;
  }
  
  &.copied {
    background-color: #4caf50;
  }
`;

const SocialShareButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
`;

const SocialButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  font-size: 12px;
  cursor: pointer;
  transition: transform 0.2s;
  
  &:hover {
    transform: translateY(-2px);
  }
`;

const SocialIcon = styled.div`
  font-size: 24px;
  margin-bottom: 4px;
`;

export default ShareBookmarkModal; 