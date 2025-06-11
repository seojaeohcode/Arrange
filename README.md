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

### 5. 북마크 일괄 처리

- **URL**: `/process_bookmarks`
- **메서드**: POST
- **요청 본문**:
  - `items` (객체 리스트): 각 객체는 `title`과 `summary` 필드를 포함해야 합니다.
- **응답**:
  - `clusters` (객체 리스트): 각 객체는 생성된 `title`, 원본 `summary`, 그리고 `cluster` 번호를 포함합니다.
  - `categories` (사전): 클러스터별 생성된 카테고리 제목을 포함합니다.
- **설명**:  
  입력된 원본 북마크 제목과 요약을 바탕으로,  
  1) GPT 기반 제목을 새로 생성하고,  
  2) 생성된 제목과 요약을 합쳐 임베딩 → DBSCAN 클러스터링 후,  
  3) 각 클러스터에 대해 GPT로 대표 카테고리 제목을 생성하는 통합 API입니다.
- **예시 결과**:
  - 입력:  
    ```json
    {
      "items": [
        {"title": "원제목1", "summary": "요약1"},
        {"title": "원제목2", "summary": "요약2"},
        {"title": "원제목3", "summary": "요약3"}
      ]
    }
    ```
  - 출력:  
    ```json
    {
      "clusters": [
        {"title": "생성된 제목1", "summary": "요약1", "cluster": 0},
        {"title": "생성된 제목2", "summary": "요약2", "cluster": 0},
        {"title": "생성된 제목3", "summary": "요약3", "cluster": 1}
      ],
      "categories": {
        "0": "카테고리명 A",
        "1": "카테고리명 B"
      }
    }
    ```

## 명령어 복붙 정리
1) 제목 생성
curl -X POST "http://54.196.39.51:8000/generate_title" \
     -H "Content-Type: application/json" \
     -d '{"summary":"이 논문은 트랜스포머 기반 다국어 악성 패키지 탐지 방법을 제안한다."}'

2) 아이템 클러스터링
curl -X POST "http://54.196.39.51:8000/cluster" \
     -H "Content-Type: application/json" \
     -d '{"items":[{"title":"AI 발전","summary":"인공지능은 빠르게 발전하고 있습니다."},{"title":"환경 보호","summary":"지구 온난화를 막기 위한 정책들이 필요합니다."},{"title":"AI 기술","summary":"AI는 다양한 산업에 활용되고 있습니다."}]}'

3) 헬스 체크
curl -X GET "http://54.196.39.51:8000/health-check"

4) 카테고리별 제목 생성
curl -X POST "http://54.196.39.51:8000/generate_category_titles" \
     -H "Content-Type: application/json" \
     -d '{"items":[{"title":"AI 발전","summary":"인공지능은 빠르게 발전하고 있습니다.","cluster":0},{"title":"AI 기술","summary":"AI는 다양한 산업에 활용되고 있습니다.","cluster":0},{"title":"환경 보호","summary":"지구 온난화를 막기 위한 정책들이 필요합니다.","cluster":1}]}'

5) 북마크 일괄 처리
curl -X POST "http://54.196.39.51:8000/process_bookmarks" \
     -H "Content-Type: application/json" \
     -d '{"items":[{"title":"원제목1","summary":"요약1"},{"title":"원제목2","summary":"요약2"},{"title":"원제목3","summary":"요약3"}]}'
