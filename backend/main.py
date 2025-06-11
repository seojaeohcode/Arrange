from fastapi import FastAPI, HTTPException
from backend.schemas import SummaryInput, InputList, ClusteredInput
from collections import defaultdict
from backend.services import generate_title_from_summary, cluster_items, embedding_model, client
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
import logging

app = FastAPI(title="Multilingual GPT Title Generator & Clustering API")

# 로깅 설정
logging.basicConfig(level=logging.INFO)

@app.post("/generate_title")
def generate_title(data: SummaryInput):
    try:
        title = generate_title_from_summary(data.summary)
        return {"title": title}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# @app.post("/cluster")
# def cluster(data: InputList):
#     try:
#         return cluster_items(data.items)
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

@app.post("/cluster")
async def cluster_items(data: InputList):
    texts = [f"{item.title} {item.summary}" for item in data.items]
    embeddings = embedding_model.encode(texts)
    embeddings_scaled = StandardScaler().fit_transform(embeddings)
    dbscan = DBSCAN(eps=1.0, min_samples=1, metric='euclidean')
    labels = dbscan.fit_predict(embeddings_scaled)

    result = []
    for item, label in zip(data.items, labels):
        result.append({
            "title": item.title,
            "summary": item.summary,
            "cluster": int(label)
        })
    return {"clusters": result}

@app.post("/generate_category_titles")
def generate_category_titles(data: ClusteredInput):
    try:
        cluster_dict = defaultdict(list)
        for item in data.items:
            if item.cluster != -1:
                cluster_dict[item.cluster].append(f"{item.title}: {item.summary}")

        result = {}
        for cluster_id, texts in cluster_dict.items():
            joined_text = "\n".join(texts[:5])  # 과도한 입력 방지
            prompt = f"""
The following are summaries and titles of bookmarks that belong to the same cluster.
Generate a short and clear category name that best represents the topic of this cluster.
Documents:
{joined_text}
Category title (in English):
"""
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful assistant that summarizes a list of texts into a concise category name."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=30
            )
            result[str(cluster_id)] = response.choices[0].message.content.strip()

        return {"categories": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/process_bookmarks")
async def process_bookmarks(data: InputList):
    # 1. 제목 생성 (입력 요약으로)
    generated_items = []
    for item in data.items:
        generated_title = generate_title_from_summary(item.summary)
        generated_items.append({"title": generated_title, "summary": item.summary})
        # 생성된 제목과 요약을 로그로 출력
        logging.info(f"Generated Title: {generated_title}, Summary: {item.summary}")

    # 2. 클러스터링 (생성된 제목 + 요약 이용)
    texts = [f"{i['title']} {i['summary']}" for i in generated_items]
    embeddings = embedding_model.encode(texts)
    embeddings_scaled = StandardScaler().fit_transform(embeddings)
    dbscan = DBSCAN(eps=1.0, min_samples=1, metric='euclidean')
    labels = dbscan.fit_predict(embeddings_scaled)

    # 3. 카테고리명 생성 (클러스터별 요약 + 제목)
    cluster_dict = defaultdict(list)
    for item, label in zip(generated_items, labels):
        if label != -1:
            cluster_dict[label].append(f"{item['title']}: {item['summary']}")

    categories = {}
    for cluster_id, texts in cluster_dict.items():
        joined_text = "\n".join(texts[:5])
        prompt = f"""[Prompt 작성]"""
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant..."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=30
        )
        categories[str(cluster_id)] = response.choices[0].message.content.strip()

    # 결과 리턴
    result = []
    for item, label in zip(generated_items, labels):
        result.append({"title": item["title"], "summary": item["summary"], "cluster": int(label)})

    return {"clusters": result, "categories": categories}

@app.get("/health-check")
def health_check():
    return {"status": "status"}