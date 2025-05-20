from fastapi import FastAPI
from mangum import Mangum

# 1) FastAPI 애플리케이션 정의
app = FastAPI()


@app.get("/health-check")
async def health_check():
    """간단한 헬스체크 엔드포인트"""
    return {"status": "ok"}


# 2) FastAPI → AWS Lambda 어댑터
asgi_handler = Mangum(app)


# 3) Lambda 기본 진입점과 이름 일치
def lambda_handler(event, context):
    """
    AWS Lambda가 기본으로 호출하는 핸들러.
    Mangum이 반환한 ASGI 어댑터에 이벤트·컨텍스트를 넘겨준다.
    """
    return asgi_handler(event, context)
