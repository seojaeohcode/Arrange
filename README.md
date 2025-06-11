# API 문서

## 개요
이 문서는 백엔드 서비스의 `main.py` 파일에 있는 API 엔드포인트에 대한 개요를 제공합니다. 이 서비스는 FastAPI로 구축되었으며, 제목 생성, 북마크 일괄 처리, 서비스 상태 확인 기능을 제공합니다.

## 엔드포인트
### 0. 서버 IP
http://54.196.39.51:8000 (/generate_title) -> 예시

### 1. 제목 생성
- **URL**: `/generate_title`
- **메서드**: POST
- **요청 본문**:
  - `summary` (string): 제목을 생성할 요약문.
  - `title` (string): 기존 제목.
- **응답**:
  - `title` (string): 제공된 요약문과 제목을 기반으로 생성된 제목.
- **설명**: 이 엔드포인트는 요약문과 기존 제목을 입력으로 받아 동일한 언어로 간결하고 적절한 제목을 반환합니다.

### 2. 북마크 일괄 처리
- **URL**: `/process_bookmarks`
- **메서드**: POST
- **요청 본문**:
  - `items` (list of objects): 각 객체는 `title` (string)과 `summary` (string) 필드를 포함해야 합니다.
- **응답**:
  - `clusters` (list of objects): 각 객체는 생성된 `title` (string), 원본 `summary` (string), 그리고 `cluster` 번호 (integer)를 포함합니다.
  - `categories` (dictionary): 클러스터별 생성된 카테고리 제목을 포함합니다.
- **설명**:  
  입력된 원본 북마크 제목과 요약을 바탕으로,  
  1) GPT 기반 제목을 새로 생성하고,  
  2) 생성된 제목과 요약을 합쳐 임베딩 → HDBSCAN 클러스터링 후,  
  3) 각 클러스터에 대해 GPT로 대표 카테고리 제목을 생성하는 통합 API입니다.

### 3. 헬스 체크
- **URL**: `/health-check`
- **메서드**: GET
- **응답**:
  - `status` (string): 서비스가 실행 중임을 나타내는 간단한 상태 메시지 (예: "ok").
- **설명**: 이 엔드포인트는 서비스의 상태를 확인하는 데 사용됩니다.