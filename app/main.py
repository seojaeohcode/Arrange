from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

from app.clustering import cluster_documents

app = FastAPI()

# 입력 데이터 정의
class InputItem(BaseModel):
    title: str
    summary: str

class InputList(BaseModel):
    items: List[InputItem]

@app.post("/cluster/")
async def cluster_items(data: InputList):
    result = cluster_documents(data.items)
    return {"clusters": result}
