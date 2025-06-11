from fastapi import FastAPI, HTTPException
from backend.schemas import SummaryInput, InputList, ClusteredInput
from collections import defaultdict
from backend.services import generate_title_from_summary, cluster_items, embedding_model, client
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
import logging
from hdbscan import HDBSCAN

app = FastAPI(title="Multilingual GPT Title Generator & Clustering API")

@app.post("/generate_title")
def generate_title(data: SummaryInput):
    try:
        title = generate_title_from_summary(data.summary)
        return {"title": title}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/process_bookmarks")
async def process_bookmarks(data: InputList):
    # 1. 제목 생성 (입력 요약으로)
    generated_items = []
    for item in data.items:
        # 제목을 생성하지 않고 입력으로 받은 제목을 그대로 사용
        generated_items.append({"title": item.title, "summary": item.summary})

    # 2. 클러스터링 (생성된 제목 + 요약 이용)
    texts = [f"{i['title']} {i['summary']}" for i in generated_items]
    embeddings = embedding_model.encode(texts)
    embeddings_scaled = StandardScaler().fit_transform(embeddings)
    # HDBSCAN을 사용하여 클러스터링
    hdbscan_clusterer = HDBSCAN(min_cluster_size=1, min_samples=1, metric='euclidean')
    labels = hdbscan_clusterer.fit_predict(embeddings_scaled)

    # 3. 카테고리명 생성 (클러스터별 요약 + 제목)
    cluster_dict = defaultdict(list)
    for item, label in zip(generated_items, labels):
        if label != -1:
            cluster_dict[label].append(f"{item['title']}: {item['summary']}")

    categories = {}
    for cluster_id, texts in cluster_dict.items():
        joined_text = "\n".join(texts[:5])
        # ── 프롬프트 엔지니어링 적용 ──
        user_prompt = f"""
        아래 글 묶음은 같은 주제의 북마크입니다. 각 줄은 '제목: 요약' 형식입니다.
        [작성 규칙]
        - 1‒4개의 **완전한 명사 어절**만 사용
        - **단어를 중간에 자르지 말 것** (예: '패'처럼 잘림 금지)
        - 구두점·따옴표·괄호 사용 금지
        - 한국어로 작성
        - 결과는 '카테고리명' 한 줄만 출력
        
        [잘못된 예] 트랜스포머 악성 패
        [올바른 예] 트랜스포머 기반 악성패키지 탐지
        
        [글 묶음]
        {joined_text}
        
        카테고리명:
        """

        new_messages = [
            {
                "role": "system",
                "content": (
                    "You are an expert taxonomy curator. "
                    "Return ONLY one short Korean category label that follows all rules. "
                    "Never add explanations or extra words."
                ),
            },
            {"role": "user", "content": user_prompt},
        ]
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=new_messages,
            temperature=0.3,
            max_tokens=15
        )
        categories[str(cluster_id)] = response.choices[0].message.content.strip()

    # 결과 리턴
    result = []
    for item, label in zip(generated_items, labels):
        result.append({"title": item["title"], "summary": item["summary"], "cluster": int(label)})

    return {"clusters": result, "categories": categories}

@app.get("/health-check")
def health_check():
    return {"status": "status5"}

# @app.post("/cluster")
# def cluster(data: InputList):
#     try:
#         return cluster_items(data.items)
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# @app.post("/cluster")
# async def cluster_items(data: InputList):
#     texts = [f"{item.title} {item.summary}" for item in data.items]
#     embeddings = embedding_model.encode(texts)
#     embeddings_scaled = StandardScaler().fit_transform(embeddings)
#     dbscan = DBSCAN(eps=1.0, min_samples=1, metric='euclidean')
#     labels = dbscan.fit_predict(embeddings_scaled)

#     result = []
#     for item, label in zip(data.items, labels):
#         result.append({
#             "title": item.title,
#             "summary": item.summary,
#             "cluster": int(label)
#         })
#     return {"clusters": result}

# @app.post("/generate_category_titles")
# def generate_category_titles(data: ClusteredInput):
#     try:
#         cluster_dict = defaultdict(list)
#         for item in data.items:
#             if item.cluster != -1:
#                 cluster_dict[item.cluster].append(f"{item.title}: {item.summary}")

#         result = {}
#         for cluster_id, texts in cluster_dict.items():
#             joined_text = "\n".join(texts[:5])  # 과도한 입력 방지
#             prompt = f"""
# The following are summaries and titles of bookmarks that belong to the same cluster.
# Generate a short and clear category name that best represents the topic of this cluster.
# Documents:
# {joined_text}
# Category title (in English):
# """
#             response = client.chat.completions.create(
#                 model="gpt-3.5-turbo",
#                 messages=[
#                     {
#                         "role": "system",
#                         "content": "You are a helpful assistant that summarizes a list of texts into a concise category name."
#                     },
#                     {"role": "user", "content": prompt}
#                 ],
#                 temperature=0.7,
#                 max_tokens=30
#             )
#             result[str(cluster_id)] = response.choices[0].message.content.strip()

#         return {"categories": result}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))