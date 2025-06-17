from fastapi import FastAPI, HTTPException
from backend.schemas import SummaryInput, InputList, ClusteredInput
from collections import defaultdict
from backend.services import generate_title_from_summary, embedding_model, client
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
import logging
from hdbscan import HDBSCAN
import umap
from sklearn.decomposition import PCA
import re

app = FastAPI(title="Multilingual GPT Title Generator & Clustering API")

@app.post("/generate_title")
def generate_title(data: SummaryInput):
    try:
        title = generate_title_from_summary(data.summary, data.title)
        return {"title": title}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/cluster")
async def process_bookmarks(data: InputList):
    # 1. 제목 생성 (입력 요약으로)
    generated_items = []
    for item in data.items:
        # 제목을 생성하지 않고 입력으로 받은 제목을 그대로 사용
        generated_items.append({"id": item.id, "title": item.title, "summary": item.summary})

    # 2. 클러스터링 (생성된 제목 + 요약 이용)
    texts = [f"{i['title']} {i['summary']}" for i in generated_items]
    embeddings = embedding_model.encode(texts)
    embeddings_scaled = StandardScaler().fit_transform(embeddings)

    # ① PCA (최대 30차원으로 축소)
    n_pca = min(10, embeddings_scaled.shape[1] - 1)
    if embeddings_scaled.shape[1] > 30:
        embeddings_scaled = PCA(n_components=n_pca, random_state=42).fit_transform(embeddings_scaled)

    # 4) UMAP 차원 축소
    # reducer = umap.UMAP(n_neighbors=5, min_dist=0.0, metric='cosine', n_components=20, init='random', random_state=42)
    reducer = umap.UMAP(n_neighbors=3, min_dist=0.1, metric='cosine', n_components=10, init='random', random_state=42)
    X_umap = reducer.fit_transform(embeddings_scaled)

    # 5) HDBSCAN 클러스터링 3 1
    clusterer = HDBSCAN(min_cluster_size=2, min_samples=2, metric='euclidean')
    labels = clusterer.fit_predict(X_umap)

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
        카테고리명:
        당신은 콘텐츠 분류 전문가입니다. 주어진 문서들의 공통 주제를 파악하여 대표 카테고리명을 생성해주세요.

        <instructions>
        <primary_rules>
        - 어절을 절대 중간에 끊거나 자르지 않음
        - 한국어로만 작성
        - 모든 구두점 및 특수문자 사용 금지 (예: 마침표 ., 쉼표 ,, 따옴표 ", ', 괄호 (), 물음표 ?, 느낌표 !, 콜론 :, 세미콜론 ;, 대시 -, 밑줄 _, 슬래시 /, \, 앰퍼샌드 &, 별표 *, 퍼센트 %, 달러 기호 $, 해시 #, 골뱅이 @, 캐럿 ^, 물결 ~, 등호 =, 더하기 +, 작은 따옴표 ' ', 큰 따옴표 " ",  백틱 `)
        - 한 줄로만 출력
        - 길이를 맞추기 위해 단어를 자를 바엔 핵심어만 선택할 것.
        - 카테고리명은 최대 10토큰 정도로 출력
        - 각 줄은 '제목: 요약' 형식이며, 그 내용을 보고 공통 주제를 대표하는 카테고리명을 생성할 것.
        - 한국어로만 작성
        </primary_rules>

        <analysis_approach>
        1. 각 문서의 핵심 키워드와 주제를 식별
        2. 공통된 기술/도메인/방법론을 파악
        3. 가장 포괄적이면서도 구체적인 상위 개념 추출
        4. 전문용어와 일반용어의 적절한 조합 선택
        </analysis_approach>

        <quality_criteria>
        - 해당 클러스터의 모든 문서를 아우를 수 있는 포괄성
        - 다른 카테고리와 명확히 구분되는 특수성
        - 직관적이고 이해하기 쉬운 명확성
        - 검색 및 분류에 유용한 실용성
        </quality_criteria>
        </instructions>

        <examples>
        <example_1>
        입력 문서들:
        "트랜스포머 기반 텍스트 분류: 자연어 처리에서 BERT 모델을 활용한 문서 분류 시스템"
        "딥러닝 언어모델 최적화: GPT 기반 텍스트 생성 모델의 성능 개선 방법"
        "자연어 처리 파이프라인: 토큰화부터 의미 분석까지의 전체 과정"

        올바른 출력: "자연어 처리 기술"
        잘못된 출력: "트랜스포머와 딥러닝을 활용한 자연어 처리" ← 20토큰 초과 및 부자연스러움
        </example_1>
        </examples>

        <좋은예시>
        문서그룹1: "React 컴포넌트 최적화", "Vue.js 성능 개선", "Angular 렌더링 기법"
        → "프론트엔드 개발"

        문서그룹2: "서울 맛집 투어", "부산 여행 코스", "제주도 관광지"  
        → "국내 여행 정보"

        문서그룹3: "iPhone 케이스 리뷰", "삼성 이어폰 후기", "맥북 액세서리"
        → "전자제품 리뷰"

        문서그룹4: "백트래킹 알고리즘", "다이나믹 프로그래밍", "그래프 탐색"
        → "알고리즘 이론"

        문서그룹5: "기생충 영화 리뷰", "포레스트 검프 감상", "어바웃 타임 분석"
        → "영화 감상 리뷰"
        </좋은예시>

        <나쁜예시>
        ❌ "소프트웨어 아키텍처 설" (단어 잘림)
        ❌ ""\"도시 여행 정보\"" (\" 특수문자 포함)
        </나쁜예시>

        <task>
        <input_documents>
        다음은 하나의 클러스터로 분류된 문서들입니다. 각 줄은 "제목: 요약" 형식입니다.

        {joined_text}
        </input_documents>

        <analysis_process>
        1. 위 문서들에서 반복되는 핵심 키워드들을 식별하세요
        2. 공통된 기술 영역이나 응용 분야를 파악하세요
        3. 이 문서들을 가장 잘 대표하는 상위 개념을 찾으세요
        4. 10토큰 정도로로 가장 적절한 카테고리명을 선택하세요
        </analysis_process>

        <output_format>
        분석 결과로 도출된 카테고리명을 10토큰 정도로 출력하세요. 추가 설명이나 분석 과정은 포함하지 마세요. 
        </output_format>
        </task>

        위 지침에 따라 최적의 카테고리명을 생성해주세요:
        """

        new_messages = [
            {
                "role": "system",
                "content": (
                    "당신은 문서 분류 및 카테고리 생성 전문가입니다. "
                    "주어진 문서들의 공통 주제를 정확히 파악하여 간결하고 명확한 카테고리명을 생성하세요. "
                    "출력은 반드시 카테고리명 한 줄만 포함해야 합니다."
                    "출력은 반드시 10토큰 정도로 작성해야 합니다."
                ),
            },
            {"role": "user", "content": user_prompt},
        ]
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=new_messages,
            temperature=0.5,
            max_tokens=40
        )
        # GPT가 생성한 카테고리명에서 특수문자 및 구두점 제거
        category_name = response.choices[0].message.content.strip()
        category_name = re.sub(r'[^\w\s]', '', category_name)
        categories[str(cluster_id)] = category_name

    # 결과 리턴
    result = []
    for item, label in zip(generated_items, labels):
        result.append({"id": item["id"], "cluster": int(label)})

    return {
        "clusters": result,
        "categories": categories
    }

@app.get("/health-check")
def health_check():
    return {"status": "test"}

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