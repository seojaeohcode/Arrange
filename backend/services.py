from openai import OpenAI
from .config import OPENAI_API_KEY

client = OpenAI(api_key=OPENAI_API_KEY)

def generate_title_from_summary(summary: str) -> str:
    prompt = f"""
Detect the language of the following summary and generate a concise and appropriate title in the same language. 
Keep the title short and relevant.

Summary:
\"\"\"{summary}\"\"\"
"""
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are an assistant skilled at generating titles in multiple languages."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=50
    )

    return response.choices[0].message.content.strip()