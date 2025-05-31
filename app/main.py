from fastapi import FastAPI, HTTPException
from .schemas import SummaryInput
from .services import generate_title_from_summary

app = FastAPI(title="Multilingual GPT Title Generator")

@app.post("/generate_title")
def generate_title(data: SummaryInput):
    try:
        title = generate_title_from_summary(data.summary)
        return {"title": title}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
