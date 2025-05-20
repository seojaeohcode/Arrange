# lambda_function.py
from typing import List

from fastapi import FastAPI
from mangum import Mangum
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler


# ──────────────────────────────────────────────────────────────
# 1) FastAPI 애플리케이션 정의
# ──────────────────────────────────────────────────────────────
app = FastAPI(title="Arrange-Clustering-API")

# ── 사전 로드: SentenceTransformer 임베딩 모델 (콜드스타트 최소화)
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")


# ──────────────────────────────────────────────────────────────
# 2) 데이터 모델(Pydantic)
# ──────────────────────────────────────────────────────────────
class InputItem(BaseModel):
    title: str
    summary: str


class InputList(BaseModel):
    items: List[InputItem]


# ──────────────────────────────────────────────────────────────
# 3) 클러스터링 핵심 로직
# ──────────────────────────────────────────────────────────────
def cluster_documents(items: List[InputItem], eps: float = 0.5, min_samples: int = 2):
    """
    주어진 문서 목록을 DBSCAN으로 클러스터링해 라벨을 반환한다.

    Parameters
    ----------
    items : List[InputItem]
        제목·요약 쌍.
    eps : float, optional
        DBSCAN 거리 임계값, by default 0.5
    min_samples : int, optional
        최소 군집 크기, by default 2
    """
    # 1) 텍스트 결합
    texts = [f"{it.title} {it.summary}" for it in items]

    # 2) 문장 임베딩
    embeddings = embedding_model.encode(texts)

    # 3) 스케일링 (DBSCAN 성능 안정화)
    embeddings_scaled = StandardScaler().fit_transform(embeddings)

    # 4) 클러스터링
    dbscan = DBSCAN(eps=eps, min_samples=min_samples, metric="euclidean")
    labels = dbscan.fit_predict(embeddings_scaled)

    # 5) 결과 매핑
    return [
        {"title": it.title, "summary": it.summary, "cluster": int(label)}
        for it, label in zip(items, labels)
    ]


# ──────────────────────────────────────────────────────────────
# 4) 라우팅
# ──────────────────────────────────────────────────────────────
@app.get("/health-check-fix")
async def health_check():
    """배포 상태 확인용 엔드포인트"""
    return {"status": "ok"}


@app.post("/cluster/")
async def cluster_items(data: InputList):
    """문서 리스트를 받아 클러스터링 결과를 반환"""
    return {"clusters": cluster_documents(data.items)}


# ──────────────────────────────────────────────────────────────
# 5) FastAPI → AWS Lambda 어댑터 & 기본 핸들러
# ──────────────────────────────────────────────────────────────
asgi_handler = Mangum(app)


def lambda_handler(event, context):
    """
    AWS Lambda가 호출하는 기본 진입점.
    Mangum이 반환한 ASGI 어댑터에 이벤트·컨텍스트를 전달한다.
    """
    return asgi_handler(event, context)
