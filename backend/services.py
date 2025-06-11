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
    in the same language. Output must be a single, complete line
    (1‒8 어절 / words), with no punctuation or quotes.
    """

    user_prompt = f"""
    ## 규칙 / Rules
    1) Detect the language of the summary and respond in that language.  
    2) **1‒8개의 ‘완전한 어절(띄어쓰기 단위)’**만 사용. **어절을 중간에 끊지 말 것.**  
    3) 출력은 한 줄, 마침표·따옴표·쉼표 금지.  
    4) 길이를 맞추기 위해 단어를 자를 바엔 핵심어만 선택하세요.

    ## Bad vs. Good 예시
    Summary:
    트랜스포머 기반 다국어 악성 패키지 탐지 방법을 제안한다.
    Bad Title: 트랜스포머 악성 패   ← 어절 잘림 ⚠️
    Good Title: 악성 패키지 탐지

    ## Example (English)
    Summary:
    Global oil prices have surged due to geopolitical tensions.
    Good Title: Global Oil Price Surge

    ## Task
    Summary:
    \"\"\"{summary}\"\"\"
    Title:
    """

    messages = [
        {
            "role": "system",
            "content": (
                "You are an expert multilingual headline editor. "
                "Craft a concise, eye-catching title in the same language. "
                "Return ONLY the title line, no extra text."
            ),
        },
        {"role": "user", "content": user_prompt},
    ]

    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=messages,
        temperature=0.5,   # 자연스러우면서도 일관성 확보
        max_tokens=15,     # 그대로 유지
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
