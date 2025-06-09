from fastapi import FastAPI, HTTPException
from backend.schemas import SummaryInput, InputList, ClusteredInput
from collections import defaultdict
from backend.services import generate_title_from_summary, cluster_items, embedding_model, client
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler

app = FastAPI(title="Multilingual GPT Title Generator & Clustering API")

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
    dbscan = DBSCAN(eps=0.5, min_samples=2, metric='euclidean')
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

@app.get("/health-check")
def health_check():
    return {"status": "fixed2"}