from sentence_transformers import SentenceTransformer
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler

# 모델은 미리 로딩해두는 것이 효율적
model = SentenceTransformer('all-MiniLM-L6-v2')

def cluster_documents(items, eps=0.5, min_samples=2):
    # 1. 텍스트 결합
    texts = [f"{item.title} {item.summary}" for item in items]

    # 2. 임베딩
    embeddings = model.encode(texts)

    # 3. 스케일링
    embeddings_scaled = StandardScaler().fit_transform(embeddings)

    # 4. 클러스터링
    dbscan = DBSCAN(eps=eps, min_samples=min_samples, metric='euclidean')
    labels = dbscan.fit_predict(embeddings_scaled)

    # 5. 결과 생성
    result = []
    for item, label in zip(items, labels):
        result.append({
            "title": item.title,
            "summary": item.summary,
            "cluster": int(label)  # -1: noise
        })

    return result
