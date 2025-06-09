# API 문서

## 개요
이 문서는 백엔드 서비스의 `main.py` 파일에 있는 API 엔드포인트에 대한 개요를 제공합니다. 이 서비스는 FastAPI로 구축되었으며, 제목 생성, 항목 클러스터링, 서비스 상태 확인 기능을 제공합니다.

## 엔드포인트
### 0. 서버 IP
http://54.196.39.51:8000 (/generate_title) -> 예시
### 1. 제목 생성
- **URL**: `/generate_title`
- **메서드**: POST
- **요청 본문**:
  - `summary` (문자열): 제목을 생성할 요약문.
- **응답**:
  - `title` (문자열): 제공된 요약문을 기반으로 생성된 제목.
- **설명**: 이 엔드포인트는 요약문을 입력으로 받아 동일한 언어로 간결하고 적절한 제목을 반환합니다.
- **예시 결과**:
  - 입력: `{"summary": "이 논문은 트랜스포머 기반 다국어 악성 패키지 탐지 방법을 제안한다."}`
  - 출력: `{"title":"Language: Korean\n\nTitle: 다국어 악성 패키지 탐지를 위한 트랜스포머 기반 방법"}`

### 2. 항목 클러스터링
- **URL**: `/cluster`
- **메서드**: POST
- **요청 본문**:
  - `items` (객체 리스트): 각 객체는 `title`과 `summary` 필드를 포함해야 합니다.
- **응답**:
  - `clusters` (객체 리스트): 각 객체는 `title`, `summary`, `cluster` 필드를 포함하며, 클러스터 할당을 나타냅니다.
- **설명**: 이 엔드포인트는 제공된 항목을 제목과 요약을 기반으로 클러스터링합니다.
- **예시 결과**:
  - 입력: `{"items":[{"title":"AI 발전","summary":"인공지능은 빠르게 발전하고 있습니다."},{"title":"환경 보호","summary":"지구 온난화를 막기 위한 정책들이 필요합니다."},{"title":"AI 기술","summary":"AI는 다양한 산업에 활용되고 있습니다."}]}`
  - 출력: `{"clusters":[{"title":"AI 발전","summary":"인공지능은 빠르게 발전하고 있습니다.","cluster":-1},{"title":"환경 보호","summary":"지구 온난화를 막기 위한 정책들이 필요합니다.","cluster":-1},{"title":"AI 기술","summary":"AI는 다양한 산업에 활용되고 있습니다.","cluster":-1}]}`

### 3. 카테고리 제목 생성
- **URL**: `/generate_category_titles`
- **메서드**: POST
- **요청 본문**:
  - `items` (객체 리스트): 각 객체는 `title`, `summary`, `cluster` 필드를 포함해야 합니다.
- **응답**:
  - `categories` (사전): 키는 클러스터 ID이고 값은 생성된 카테고리 제목입니다.
- **설명**: 이 엔드포인트는 항목의 클러스터에 대한 카테고리 제목을 생성합니다.
- **예시 결과**:
  - 입력: `{"items": [{"title": "AI 발전", "summary": "인공지능은 빠르게 발전하고 있습니다.", "cluster": 0}, {"title": "AI 기술", "summary": "AI는 다양한 산업에 활용되고 있습니다.", "cluster": 0}, {"title": "환경 보호", "summary": "지구 온난화를 막기 위한 정책들이 필요합니다.", "cluster": 1}]}`
  - 출력: `{"categories":{"0":"AI Advancements and Applications","1":"Environmental Protection: Policies to Combat Global Warming"}}`

### 4. 헬스 체크
- **URL**: `/health-check`
- **메서드**: GET
- **응답**:
  - `status` (문자열): 서비스가 실행 중임을 나타내는 간단한 상태 메시지 (예: "ok").
- **설명**: 이 엔드포인트는 서비스의 상태를 확인하는 데 사용됩니다.
