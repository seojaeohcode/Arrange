# A!rrange - AI 스마트 북마크 관리 크롬 확장 프로그램

AI를 활용한 스마트 북마크 관리 크롬 확장 프로그램입니다. 자동 분류, 통계 분석, 공유 기능을 제공합니다.

## 주요 기능

- AI 기반 북마크 자동 분류
- 북마크 사용 통계 시각화
- 북마크 공유 기능
- 다크 모드 지원
- 사용자 맞춤 설정

## 기술 스택

- React 18
- TypeScript
- Tailwind CSS
- Styled Components
- Framer Motion
- Zustand (상태 관리)
- Chrome Extension API

## 설치 방법

1. 프로젝트 클론
   ```bash
   git clone [repository URL]
   ```

2. 의존성 설치
   ```bash
   npm install
   ```

3. 개발 서버 실행
   ```bash
   npm start
   ```

4. 빌드
   ```bash
   npm run build
   ```

5. 크롬 확장 프로그램 로드
   - 크롬 브라우저에서 `chrome://extensions/` 접속
   - 개발자 모드 활성화
   - '압축해제된 확장 프로그램을 로드합니다' 클릭
   - 빌드된 `build` 폴더 선택

## 사용 방법

1. 크롬 브라우저 툴바에서 확장 프로그램 아이콘 클릭
2. 사이드바에서 북마크 추가/관리
3. AI가 자동으로 북마크를 분류
4. 대시보드에서 북마크 사용 통계 확인
5. 북마크 공유 기능 사용

## 프로젝트 구조

```
src/
  ├── api/          # API 통신 관련
  ├── components/   # React 컴포넌트
  ├── pages/        # 페이지 컴포넌트
  ├── store/        # Zustand 상태 관리
  ├── types/        # TypeScript 타입 정의
  └── background.ts # 백그라운드 스크립트
```

## 라이센스

MIT License 