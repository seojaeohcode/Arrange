from fastapi import FastAPI, HTTPException
from backend.schemas import SummaryInput, InputList
from backend.services import generate_title_from_summary, cluster_items

app = FastAPI(title="Multilingual GPT Title Generator & Clustering API")

@app.post("/generate_title")
def generate_title(data: SummaryInput):
    try:
        title = generate_title_from_summary(data.summary)
        return {"title": title}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/cluster")
def cluster(data: InputList):
    try:
        return cluster_items(data.items)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health-check")
def health_check():
    return {"status": "fixed2"}
