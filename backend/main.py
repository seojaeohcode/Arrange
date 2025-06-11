from fastapi import FastAPI, HTTPException
from backend.schemas import SummaryInput, InputList, ClusteredInput
from collections import defaultdict
from backend.services import generate_title_from_summary, cluster_items, embedding_model, client
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
import logging

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
    dbscan = DBSCAN(eps=0.5, min_samples=1, metric='euclidean')
    labels = dbscan.fit_predict(embeddings_scaled)

    # 3. 카테고리명 생성 (클러스터별 요약 + 제목)
    cluster_dict = defaultdict(list)
    for item, label in zip(generated_items, labels):
        if label != -1:
            cluster_dict[label].append(f"{item['title']}: {item['summary']}")

    categories = {}
    for cluster_id, texts in cluster_dict.items():
        joined_text = "\n".join(texts[:5])
        # ── 프롬프트 엔지니어링 적용 ──
        user_content = (
            "## 규칙\n"
            "1) 2~4개의 핵심 명사만 사용\n"
            "2) 불필요한 형용사·동사·중복어 제거\n"
            "3) 출력은 카테고리명 한 줄만 (따옴표·마침표 금지)\n\n"
            "## 예시 1\n"
            "Documents:\n"
            "AI 혁신: 인공지능 발전 현황\n"
            "딥러닝 연구: 최신 트렌드 분석\n"
            "머신러닝 응용: 산업 사례\n"
            "Category title: 인공지능 연구동향\n\n"
            "## 예시 2\n"
            "Documents:\n"
            "원유 가격 상승: 경제 파장\n"
            "에너지 전환 가속: 화석연료 수요 감소\n"
            "국제 석유 시장 전망\n"
            "Category title: 글로벌 에너지시장\n\n"
            "## 작업 대상\n"
            "Documents:\n"
            f"{joined_text}\n"
            "Category title:"
        )

        new_messages = [
            {
                "role": "system",
                "content": (
                    "You are an expert taxonomy curator. "
                    "Given a list of <title>: <summary> lines in the same cluster, "
                    "output ONLY one short Korean category label (2-4 nouns, no punctuation, no quotes). "
                    "Never add explanations or extra words."
                ),
            },
            {"role": "user", "content": user_content},
        ]
        # prompt = f"""
        # The following are summaries and titles of bookmarks that belong to the same cluster.
        # Generate a short and clear category name that best represents the topic of this cluster.
        # Documents:
        # {joined_text}
        # Category title:
        # """
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            # messages=[
            #     {"role": "system", "content": "You are a helpful assistant that summarizes a list of texts into a concise category name."},
            #     {"role": "user", "content": prompt}
            # ],
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
    return {"status": "status2"}

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