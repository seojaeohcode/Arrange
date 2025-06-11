from openai import OpenAI
from .config import OPENAI_API_KEY
from sentence_transformers import SentenceTransformer
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
import numpy as np
from typing import List
from .schemas import InputItem

client = OpenAI(api_key=OPENAI_API_KEY)

embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

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
        max_tokens=15
    )

    return response.choices[0].message.content.strip()


def cluster_items(items: List[InputItem]) -> dict:
    texts = [f"{item.title} {item.summary}" for item in items]
    embeddings = embedding_model.encode(texts)
    embeddings_scaled = StandardScaler().fit_transform(embeddings)
    dbscan = DBSCAN(eps=0.5, min_samples=2, metric='euclidean')
    labels = dbscan.fit_predict(embeddings_scaled)

    result = []
    for item, label in zip(items, labels):
        result.append({
            "title": item.title,
            "summary": item.summary,
            "cluster": int(label)
        })
    return {"clusters": result}
