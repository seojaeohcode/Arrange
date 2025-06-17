import React, { useState, useEffect } from 'react';
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

  // 카테고리 수 계산
  const categoryCount = React.useMemo(() => {
    const set = new Set(bookmarks.map(bm => bm.categoryId || 'uncategorized'));
    return set.size;
  }, [bookmarks]);

  // 카테고리별 분포 데이터 가공
  const categoryDistributionData = React.useMemo(() => {
    const categoryMap = new Map<string, number>();
    
    // 모든 북마크를 순회하며 카테고리별 카운트 계산
    bookmarks.forEach(bookmark => {
      const category = bookmark.category || '미분류';
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });

    // Map을 배열로 변환하여 차트 데이터 생성
    return Array.from(categoryMap.entries()).map(([name, value]) => ({
      name,
      value
    }));
  }, [bookmarks]);

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
              <StatValue>{categoryCount}</StatValue>
            </StatRow>
          </StatsOverview>

          <ChartSection>
            <ChartTitle>가장 많이 방문한 북마크 Top 3</ChartTitle>
            <TopList>
              {top3Visited.map((item, idx) => (
                <TopListItem key={item.id}>
                  <Rank>{idx + 1}</Rank>
                  <TopTitle>{item.generatedTitle || item.title}</TopTitle>
                  <TopCount>{item.visitCount ?? 0}회</TopCount>
                </TopListItem>
              ))}
            </TopList>
          </ChartSection>

          <ChartSection>
            <ChartTitle>최근 추가된 북마크 Top 5</ChartTitle>
            <RecentList>
              {(bookmarkStats?.recentlyAdded || []).map((item, idx) => (
                <RecentItem
                  key={item.id}
                  onClick={() => window.open(item.url, '_blank')}
                  tabIndex={0}
                  title={item.url}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') window.open(item.url, '_blank'); }}
                >
                  <Favicon src={item.favicon} alt="" />
                  <RecentInfo>
                    <RecentTitle>{item.generatedTitle || item.title}</RecentTitle>
                    <RecentUrl>{item.url}</RecentUrl>
                  </RecentInfo>
                  <RecentDate>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </RecentDate>
                </RecentItem>
              ))}
            </RecentList>
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
                    {categoryDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
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
  padding: 12px 16px;
  max-width: 100%;
  width: 100%;
  min-width: 0;
  margin: 0;
  transition: all 0.3s ease;
  background: ${({ theme }) => theme.mode === 'dark' ? '#181a1b' : '#fff'};
  color: ${({ theme }) => theme.mode === 'dark' ? '#f5f6fa' : '#222'};
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 700;
  margin: 8px 0 8px 0;
`;

const DashboardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const StatsOverview = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
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
  margin-bottom: 10px;
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
  margin: 0 0 10px 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
`;

const TopListItem = styled.li`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 16px;
  font-size: 15px;
  background: ${({ theme }) => theme.mode === 'dark' ? '#23272f' : '#f8fbff'};
  border: 1px solid ${({ theme }) => theme.mode === 'dark' ? '#33363d' : '#e0e7ef'};
  border-radius: 7px;
  transition: background 0.15s, box-shadow 0.15s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
  width: 100%;
  min-width: 0;
  color: ${({ theme }) => theme.mode === 'dark' ? '#f5f6fa' : '#222'};
  &:hover {
    background: ${({ theme }) => theme.mode === 'dark' ? '#2a2e38' : '#e3eaf6'};
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }
`;

const Rank = styled.span`
  font-size: 17px;
  font-weight: bold;
  color: #4CAF50;
  width: 16px;
  text-align: right;
`;

const TopTitle = styled.span`
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${({ theme }) => theme.mode === 'dark' ? '#f5f6fa' : '#222'};
`;

const TopCount = styled.span`
  color: #4CAF50;
  font-size: 15px;
  min-width: 36px;
  text-align: right;
`;

const RecentList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 16px 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
`;

const RecentItem = styled.li`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.mode === 'dark' ? '#23272f' : '#f8fbff'};
  border: 1px solid ${({ theme }) => theme.mode === 'dark' ? '#33363d' : '#e0e7ef'};
  border-radius: 8px;
  padding: 10px 16px;
  gap: 10px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.03);
  cursor: pointer;
  transition: background 0.15s, box-shadow 0.15s;
  width: 100%;
  min-width: 0;
  color: ${({ theme }) => theme.mode === 'dark' ? '#f5f6fa' : '#222'};
  &:hover {
    background: ${({ theme }) => theme.mode === 'dark' ? '#2a2e38' : '#e3eaf6'};
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }
`;

const Favicon = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 4px;
`;

const RecentInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const RecentTitle = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.mode === 'dark' ? '#f5f6fa' : '#222'};
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const RecentUrl = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.mode === 'dark' ? '#bbb' : '#888'};
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const RecentDate = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.mode === 'dark' ? '#bbb' : '#aaa'};
  min-width: 70px;
  text-align: right;
`;

export default Dashboard;