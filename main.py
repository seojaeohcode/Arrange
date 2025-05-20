from fastapi import FastAPI
from mangum import Mangum

app = FastAPI()

@app.get("/health")
async def health_check():
    return {"status": "ok"}

handler = Mangum(app)  # Lambda용 엔트리포인트
