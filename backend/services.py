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
    """
    Detect the language of `summary` and return a short, relevant title
    in the same language.  Output must be a single line (4‒10 단어 / words),
    without quotation marks or trailing punctuation.
    """

    # ── Prompt engineering ──────────────────────────────────────────────
    user_prompt = f"""
    ## 규칙 / Rules
    1) Detect the language of the summary and reply in that language.  
    2) Use **4‒10 key words** only; drop stop-words, endings, punctuation.  
    3) Return **one line** with no quotes or period.
    ## 예시 1
    Summary:
    AI 기술이 최근 몇 년간 비약적으로 발전하며 산업 전반을 혁신하고 있다.
    Title: AI 기술 산업혁신
    ## Example 2
    Summary:
    Global oil prices have surged due to geopolitical tensions, impacting inflation worldwide.
    Title: Global Oil Price Surge
    ## Task
    Summary:
    \"\"\"{summary}\"\"\"
    Title:
    """

    messages = [
        {
            "role": "system",
            "content": (
                "You are an expert multilingual headline editor.  "
                "Given a passage, you detect its language and craft a concise, eye-catching title "
                "in the same language.  Do NOT output explanations, only the title line."
            ),
        },
        {"role": "user", "content": user_prompt},
    ]

    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=messages,
        temperature=0.5,  
        max_tokens=15,
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
