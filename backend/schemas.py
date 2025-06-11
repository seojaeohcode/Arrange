from pydantic import BaseModel
from typing import List

class SummaryInput(BaseModel):
    summary: str
    title: str

class InputItem(BaseModel):
    id: int
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