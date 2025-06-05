# hap_main.py 설명 
hap_main.py는 다음 2가지 기능을 제공하는 FastAPI 기반 REST API 서버야:

✅ 1. /generate_title
입력: 요약문 (summary)
출력: 요약문에 기반한 다국어 제목 생성

방법: OpenAI GPT API (gpt-3.5-turbo) 사용

✅ 2. /cluster/
입력: 여러 개의 (제목 + 요약문) 데이터
출력: 클러스터 번호가 붙은 문서 리스트

방법:
1. Sentence-BERT 임베딩
2. StandardScaler로 정규화
3. DBSCAN으로 클러스터링

🔁 실행 흐름
1. 사용자가 /generate_title 또는 /cluster/로 POST 요청을 보냄
2. FastAPI가 요청을 받고, Pydantic 모델을 통해 JSON 데이터 구조를 검사
3. 각각:
/generate_title: GPT 모델에 프롬프트를 보내 제목 생성
/cluster/: 제목+요약문을 임베딩한 후 클러스터링
4. 결과를 JSON으로 응답



# hap_main.py 실행 
## 의존성 설치 
pip install -r requirements.txt

## API 키 
.env 파일을 프로젝트 루트에 생성하고 OPENAI_API_KEY 추가 

## 명령어 예시 
uvicorn hap_main:app --reload
