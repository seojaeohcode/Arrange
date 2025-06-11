import React, { useState } from 'react';
import styled from 'styled-components';
import useBookmarkStore from '../store/useBookmarkStore';
import { motion } from 'framer-motion';

// 페이지 텍스트 추출 함수
const extractPageText = (): string => {
  const bodyText = document.body.innerText;
  const maxLength = 3000; // API 호출 시 최대 텍스트 길이 제한
  return bodyText.slice(0, maxLength);
};

const BookmarkButton: React.FC = () => {
  const { addBookmark, isLoading } = useBookmarkStore();
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const handleAddBookmark = async () => {
    try {
      // 현재 페이지 URL과 텍스트 콘텐츠 가져오기
      const currentUrl = window.location.href;
      const pageText = extractPageText();
      
      await addBookmark(currentUrl, pageText);
      
      // 성공 상태 표시 후 3초 후에 리셋
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (error) {
      // 오류 상태 표시 후 3초 후에 리셋
      setIsError(true);
      setTimeout(() => setIsError(false), 3000);
      console.error('북마크 추가 실패:', error);
    }
  };

  return (
    <ButtonContainer>
      {isSuccess && (
        <StatusMessage
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          success
        >
          북마크가 추가되었습니다! ✓
        </StatusMessage>
      )}
      
      {isError && (
        <StatusMessage
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          success={false}
        >
          북마크 추가 실패. 다시 시도하세요.
        </StatusMessage>
      )}
      
      <Button 
        onClick={handleAddBookmark}
        disabled={isLoading}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 1 }}
      >
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            <BookmarkIcon>📌</BookmarkIcon>
            북마크 추가
          </>
        )}
      </Button>
    </ButtonContainer>
  );
};

interface StatusMessageProps {
  success: boolean;
}

const ButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  margin-bottom: 20px;
`;

const Button = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background-color: #0066cc;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  &:hover {
    background-color: #0055aa;
  }

  &:disabled {
    background-color: #99bbdd;
    cursor: not-allowed;
  }
`;

const BookmarkIcon = styled.span`
  font-size: 18px;
`;

const StatusMessage = styled(motion.div)<StatusMessageProps>`
  position: absolute;
  top: -40px;
  padding: 8px 16px;
  border-radius: 4px;
  background-color: ${props => props.success ? '#4caf50' : '#f44336'};
  color: white;
  font-size: 14px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const LoadingSpinner = styled.div`
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s linear infinite;
  margin: 0 auto;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export default BookmarkButton; 