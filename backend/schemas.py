from pydantic import BaseModel

class SummaryInput(BaseModel):
    summary: str