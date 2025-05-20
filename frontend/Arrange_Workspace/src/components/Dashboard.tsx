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
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

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

  // 방문 횟수 기준 상위 북마크 데이터 가공
  const mostVisitedData = bookmarkStats?.mostVisited.map(item => ({
    name: item.title.length > 20 ? `${item.title.substring(0, 20)}...` : item.title,
    visits: item.count
  })) || [];

  // 카테고리별 분포 데이터 가공
  const categoryDistributionData = bookmarkStats?.categoryDistribution.map(item => ({
    name: item.categoryName,
    value: item.count
  })) || [];

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
            <StatCard className={userSettings.darkMode ? 'bg-gray-800' : 'bg-white'}>
              <StatTitle>전체 북마크</StatTitle>
              <StatValue>{bookmarkStats?.totalBookmarks || bookmarks.length}</StatValue>
            </StatCard>
            <StatCard className={userSettings.darkMode ? 'bg-gray-800' : 'bg-white'}>
              <StatTitle>카테고리</StatTitle>
              <StatValue>{bookmarkStats?.categoriesCount || 0}</StatValue>
            </StatCard>
            <StatCard className={userSettings.darkMode ? 'bg-gray-800' : 'bg-white'}>
              <StatTitle>최근 추가</StatTitle>
              <StatValue>{bookmarkStats?.recentlyAdded.length || 0}</StatValue>
            </StatCard>
          </StatsOverview>

          <ChartSection>
            <ChartTitle>가장 많이 방문한 북마크</ChartTitle>
            <ChartContainer className={userSettings.darkMode ? 'bg-gray-800' : 'bg-white'}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={mostVisitedData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={userSettings.darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'} 
                  />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80} 
                    stroke={userSettings.darkMode ? '#e2e8f0' : '#4a5568'} 
                  />
                  <YAxis 
                    stroke={userSettings.darkMode ? '#e2e8f0' : '#4a5568'} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: userSettings.darkMode ? '#333' : '#fff',
                      color: userSettings.darkMode ? '#fff' : '#333',
                      border: userSettings.darkMode ? '1px solid #444' : '1px solid #ddd'
                    }} 
                  />
                  <Bar dataKey="visits" fill="#0066cc" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </ChartSection>

          <ChartSection>
            <ChartTitle>카테고리별 북마크 분포</ChartTitle>
            <ChartContainer className={userSettings.darkMode ? 'bg-gray-800' : 'bg-white'}>
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
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: userSettings.darkMode ? '#333' : '#fff',
                      color: userSettings.darkMode ? '#fff' : '#333',
                      border: userSettings.darkMode ? '1px solid #444' : '1px solid #ddd'
                    }} 
                  />
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
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 8px;
`;

const StatCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  border-radius: 8px;
  box-shadow: ${props => props.theme.mode === 'dark' 
    ? '0 4px 6px rgba(255, 255, 255, 0.1)' 
    : '0 2px 4px rgba(0, 0, 0, 0.1)'};
  transition: all 0.3s ease;
  background-color: ${props => props.theme.mode === 'dark' ? '#2d3748' : '#ffffff'};
  color: ${props => props.theme.mode === 'dark' ? '#ffffff' : '#000000'};
`;

const StatTitle = styled.h3`
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  opacity: ${props => props.theme.mode === 'dark' ? '0.9' : '0.8'};
  color: ${props => props.theme.mode === 'dark' ? '#e2e8f0' : '#4a5568'};
`;

const StatValue = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: ${props => props.theme.mode === 'dark' ? '#ffffff' : '#2d3748'};
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

export default Dashboard; 