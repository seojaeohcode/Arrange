# 🚀 FastAPI Clustering API

이 프로젝트는 SentenceTransformer와 DBSCAN 알고리즘을 활용하여 텍스트 데이터(제목 + 요약)를 클러스터링하는 RESTful API입니다.

---

## 📦 설치 및 실행 방법

1. 저장소 클론 및 디렉토리 이동

'''bash
git clone https://github.com/hiwjddn/Arrange.git
cd Arrange

2. 가상환경 생성 및 진입 
python3 -m venv .venv
source .venv/bin/activate

3. 의존성 설치 
pip install -r app/requirements.txt

4. FastAPI 앱 실행
uvicorn app.main:app --reload'''

---

## 브라우저에서 아래 주소로 접속하여 API를 테스트할 수 있습니다:
Swagger UI: http://127.0.0.1:8000/docs
Redoc 문서: http://127.0.0.1:8000/redoc

---

## 아래 명령어를 실행하면 sample.json 파일을 기반으로 클러스터링 API를 호출할 수 있습니다:
curl -X 'POST' \
  'http://127.0.0.1:8000/cluster/' \
  -H 'Content-Type: application/json' \
  -d @sample.json