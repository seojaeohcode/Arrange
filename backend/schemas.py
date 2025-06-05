from pydantic import BaseModel
from typing import List

class SummaryInput(BaseModel):
    summary: str

class InputItem(BaseModel):
    title: str
    summary: str

class InputList(BaseModel):
    items: List[InputItem]
