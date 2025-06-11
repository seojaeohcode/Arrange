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

def generate_title_from_summary(title: str, summary: str) -> str:
    user_prompt = f"""
    당신은 한국어 콘텐츠 제목 전문가입니다. 주어진 제목과 요약을 바탕으로 최적화된 제목을 생성해주세요.

    <instructions>
    <primary_rules>
    - 정확히 1-3개의 완전한 어절(띄어쓰기 단위)만 사용
    - 어절을 절대 중간에 끊거나 자르지 않음
    - 한국어로만 작성
    - 마침표, 쉼표, 따옴표 등 구두점 사용 금지
    - 한 줄로만 출력
    </primary_rules>

    <prioritization>
    1. 원본 제목(title)의 핵심 키워드를 우선적으로 활용 (가중치: 70%)
    2. 요약(summary)의 핵심 내용을 보조적으로 활용 (가중치: 30%)
    3. 길이 제한으로 인해 선택이 필요할 경우, 원본 제목의 핵심어를 우선 보존
    </prioritization>

    <quality_criteria>
    - 핵심 의미를 명확하게 전달
    - 검색 최적화를 고려한 키워드 포함
    - 읽기 쉽고 자연스러운 한국어 표현
    - 전문성과 신뢰성을 나타내는 용어 선택
    </quality_criteria>
    </instructions>

    <examples>
    <example_1>
    원본 제목: "트랜스포머 기반 다국어 악성 패키지 탐지 시스템 개발"
    요약: "딥러닝 트랜스포머 아키텍처를 활용하여 다국어 환경에서 악성 소프트웨어 패키지를 자동으로 탐지하는 새로운 방법론을 제안합니다."

    올바른 출력: "악성 패키지 탐지"
    잘못된 출력: "트랜스포머 악성 패" ← 어절 중간 절단으로 부자연스러움
    </example_1>

    <example_2>
    원본 제목: "블록체인 기반 IoT 보안 프레임워크 설계"
    요약: "사물인터넷 환경의 보안 취약점을 해결하기 위해 블록체인 기술을 활용한 새로운 보안 아키텍처를 제안합니다."

    올바른 출력: "IoT 보안 프레임워크"
    잘못된 출력: "블록체인 IoT 보안 아키텍처 설계 방법" ← 3어절 초과
    </example_2>

    <example_3>
    원본 제목: "머신러닝을 활용한 실시간 이상 거래 탐지"
    요약: "금융 거래 데이터에서 머신러닝 알고리즘을 사용하여 실시간으로 비정상적인 거래 패턴을 식별하고 분류하는 시스템"

    올바른 출력: "이상 거래 탐지"
    잘못된 출력: "머신러닝 기반" ← 원본 제목의 핵심어 누락
    </example_3>
    </examples>

    <task>
    <input_data>
    원본 제목: "{title}"
    요약: "{summary}"
    </input_data>

    <output_format>
    생성된 제목을 15토큰 이내로 어절이 잘리지 않게게 출력하세요. 추가 설명이나 메타데이터는 포함하지 마세요.
    </output_format>
    </task>

    위 지침을 정확히 따라 최적화된 제목을 생성해주세요:
    """

    messages = [
        {
            "role": "system",
            "content": (
                "당신은 한국어 콘텐츠 제목 최적화 전문가입니다. "
                "주어진 지침을 정확히 따라 간결하고 효과적인 제목을 생성하세요. "
                "출력은 반드시 15토큰 이내로 작성해야 합니다."
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
