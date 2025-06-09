# 📄 hap_main.py 설명

`hap_main.py`는 FastAPI 기반의 REST API 서버로, 다음 2가지 주요 기능을 제공합니다:

---

## ✅ 1. `/generate_title`

- **입력**: 요약문 (`summary`)  
- **출력**: 요약 내용을 기반으로 한 다국어 제목 생성  
- **방식**: OpenAI GPT API (`gpt-3.5-turbo`)를 활용해 언어 감지 및 간결한 제목 자동 생성

---

## ✅ 2. `/cluster/`

- **입력**: 여러 개의 `(제목 + 요약문)` 데이터  
- **출력**: 각 문서에 대해 클러스터 번호가 포함된 리스트 반환  
- **처리 과정**:
  1. Sentence-BERT로 텍스트 임베딩  
  2. `StandardScaler`를 이용해 임베딩 정규화  
  3. `DBSCAN`으로 밀도 기반 클러스터링 수행

---

## 🔁 실행 흐름

1. 사용자가 `/generate_title` 또는 `/cluster/`로 POST 요청을 전송  
2. FastAPI가 요청을 수신하고, Pydantic을 이용해 JSON 데이터 유효성 검사  
3. 엔드포인트에 따라 다음 중 하나를 수행:
   - `/generate_title`: GPT 모델을 호출해 제목 생성  
   - `/cluster/`: 텍스트를 임베딩하고 클러스터링 수행  
4. 결과를 JSON 형태로 응답

---

# ⚙️ hap\_main.py 실행 방법

## 1. 의존성 설치

FastAPI 및 관련 패키지를 설치합니다:

```bash
pip install -r requirements.txt
```

* 주요 의종성:

  * `fastapi`: API 서버 구현
  * `uvicorn`: ASGI 서버
  * `openai`: GPT API 호출용
  * `sentence-transformers`: 문장 임벤딩
  * `scikit-learn`: 클러스터링 및 전체 전처리
  * `python-dotenv`: `.env` 파일에서 환경변수 로딩

---

## 2. OpenAI API 키 설정

OpenAI GPT API를 사용하기 위해 `.env` 파일을 루트 디렉토리에 생성하고 아래 내용을 입력합니다:

```
OPENAI_API_KEY=your_openai_api_key_here
```

> ✅ `.env` 파일은 GitHub 등에 업로드되지 않도록 `.gitignore`에 포함하는 것을 권장합니다.

---

## 3. 서버 실행

Uvicorn으로 FastAPI 서버를 실행합니다:

```bash
uvicorn hap_main:app --reload
```

* `hap_main`: 파일 이름 (`.py` 확장자 제외)
* `app`: FastAPI 인스턴스 이름
* `--reload`: 코드 변경 시 서버 자동 재시작 (개발 시 유용)

---

## 4. 실행 예시 (cURL)

다음은 실제 API 테스트 예시입니다:

```bash
curl -X POST "http://localhost:8000/generate_title" \
-H "Content-Type: application/json" \
-d '{"summary": "이 논문은 트랜스포머 기반 다국어 악성 패키지 탑지 방법을 제안한다."}'
```

---

필요 시 `/generate_category_titles` 연동 설명도 추가해드립니다.






