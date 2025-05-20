import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import useBookmarkStore from '../store/useBookmarkStore';
import { BookmarkStats } from '../types';
import { getBookmarkStats } from '../api/bookmarkApi';

const Dashboard: React.FC = () => {
  const { bookmarks, userSettings } = useBookmarkStore();
  const [bookmarkStats, setBookmarkStats] = useState<BookmarkStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 색상 배열 
  const COLORS = ['#4CAF50', '#2196F3', '#FFC107', '#FF5722', '#9C27B0'];

  useEffect(() => {
    const loadStats = async () => {
      if (bookmarks.length > 0) {
        setIsLoading(true);
        try {
          const stats = await getBookmarkStats();
          setBookmarkStats(stats);
          setError(null);
        } catch (err) {
          setError('통계 데이터를 불러오는데 실패했습니다.');
          console.error('통계 로드 실패:', err);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadStats();
  }, [bookmarks]);

  // 방문수 기준 Top 3 북마크를 직접 계산
  const top3Visited = [...bookmarks]
    .sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0))
    .slice(0, 3);

  // 카테고리별 분포 데이터 가공
  const uncategorizedCount = bookmarkStats?.totalBookmarks || 0;
  const categoryDistributionData = [
    { name: '미분류', value: uncategorizedCount }
  ];

  if (top3Visited.length === 0) {
    return <EmptyState>방문 기록이 있는 북마크가 없습니다.</EmptyState>;
  }

  return (
    <DashboardContainer className={userSettings.darkMode ? 'text-white' : ''}>
      <Title>북마크 대시보드</Title>

      {isLoading ? (
        <LoadingMessage>통계 데이터 로딩 중...</LoadingMessage>
      ) : error ? (
        <ErrorMessage>{error}</ErrorMessage>
      ) : bookmarks.length === 0 ? (
        <EmptyState>
          <EmptyIcon>📊</EmptyIcon>
          <EmptyText>
            저장된 북마크가 없습니다. 북마크를 추가하면 통계를 확인할 수 있습니다.
          </EmptyText>
        </EmptyState>
      ) : (
        <DashboardContent>
          <StatsOverview>
            <StatRow>
              <StatLabel>전체 북마크</StatLabel>
              <StatValue>{bookmarkStats?.totalBookmarks || bookmarks.length}</StatValue>
            </StatRow>
            <StatRow>
              <StatLabel>카테고리</StatLabel>
              <StatValue>1</StatValue>
            </StatRow>
            <StatRow>
              <StatLabel>최근 추가</StatLabel>
              <StatValue>{bookmarkStats?.recentlyAdded.length || 0}</StatValue>
            </StatRow>
          </StatsOverview>

          <ChartSection>
            <ChartTitle>가장 많이 방문한 북마크 Top 3</ChartTitle>
            <TopList>
              {top3Visited.map((item, idx) => (
                <TopListItem key={item.id}>
                  <Rank>{idx + 1}</Rank>
                  <TopTitle>{item.title}</TopTitle>
                  <TopCount>{item.visitCount ?? 0}회</TopCount>
                </TopListItem>
              ))}
            </TopList>
          </ChartSection>

          <ChartSection>
            <ChartTitle>카테고리별 북마크 분포</ChartTitle>
            <ChartContainer>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    <Cell fill="#8884d8" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </ChartSection>
        </DashboardContent>
      )}
    </DashboardContainer>
  );
};

const DashboardContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 16px;
  max-width: 800px;
  margin: 0 auto;
  transition: all 0.3s ease;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 700;
  margin: 8px 0 8px 0;
`;

const DashboardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const StatsOverview = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
`;

const StatRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #eee;
  font-size: 16px;
  font-weight: 500;
`;

const StatLabel = styled.span`
  color: #666;
`;

const StatValue = styled.span`
  font-size: 22px;
  font-weight: bold;
  color: #388E3C;
`;

const ChartSection = styled.section`
  margin-bottom: 24px;
`;

const ChartTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: ${props => props.theme.mode === 'dark' ? '#ffffff' : '#2d3748'};
`;

const ChartContainer = styled.div`
  padding: 16px;
  border-radius: 8px;
  box-shadow: ${props => props.theme.mode === 'dark' 
    ? '0 4px 6px rgba(255, 255, 255, 0.1)' 
    : '0 2px 4px rgba(0, 0, 0, 0.1)'};
  transition: all 0.3s ease;
  background-color: ${props => props.theme.mode === 'dark' ? '#2d3748' : '#ffffff'};
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 32px;
  font-size: 16px;
  color: #666;
`;

const ErrorMessage = styled.div`
  text-align: center;
  padding: 32px;
  font-size: 16px;
  color: #f44336;
  background: rgba(244, 67, 54, 0.1);
  border-radius: 8px;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 16px;
  background-color: rgba(0, 0, 0, 0.03);
  border-radius: 12px;
  text-align: center;
`;

const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
`;

const EmptyText = styled.p`
  font-size: 16px;
  line-height: 1.5;
  max-width: 400px;
  margin: 0;
`;

const TopList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 24px 0;
`;

const TopListItem = styled.li`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  font-size: 15px;
`;

const Rank = styled.span`
  font-size: 18px;
  font-weight: bold;
  color: #4CAF50;
  width: 24px;
`;

const TopTitle = styled.span`
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TopCount = styled.span`
  color: #388E3C;
  font-size: 15px;
  min-width: 36px;
  text-align: right;
`;

export default Dashboard; 