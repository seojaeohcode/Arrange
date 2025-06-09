import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
from openai import OpenAI
from sentence_transformers import SentenceTransformer
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
import numpy as np
import uvicorn
from collections import defaultdict


# ----------------------------------------
# 1. 환경 변수 로딩
# ----------------------------------------
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)

# ----------------------------------------
# 2. Pydantic 모델 정의
# ----------------------------------------
class SummaryInput(BaseModel):
    summary: str

class InputItem(BaseModel):
    title: str
    summary: str

class InputList(BaseModel):
    items: List[InputItem]

class ClusteredItem(BaseModel):
    title: str
    summary: str
    cluster: int

class ClusteredInput(BaseModel):
    items: List[ClusteredItem]

# ----------------------------------------
# 3. 타이틀 생성 함수
# ----------------------------------------
def generate_title_from_summary(summary: str) -> str:
    prompt = f"""
Detect the language of the following summary and generate a concise and appropriate title in the same language. 
Keep the title short and relevant.

Summary:
\"\"\"{summary}\"\"\"
"""
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are an assistant skilled at generating titles in multiple languages."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=50
    )
    return response.choices[0].message.content.strip()

# ----------------------------------------
# 4. 클러스터링 모델 초기화
# ----------------------------------------
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

# ----------------------------------------
# 5. FastAPI 앱 생성
# ----------------------------------------
app = FastAPI(title="Multilingual GPT Title Generator & Clustering API")

# ----------------------------------------
# 6. 라우터 설정
# ----------------------------------------

@app.post("/generate_title")
def generate_title(data: SummaryInput):
    try:
        title = generate_title_from_summary(data.summary)
        return {"title": title}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/cluster/")
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

# ----------------------------------------
# 7. 서버 실행
# ----------------------------------------
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
