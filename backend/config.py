import os
from dotenv import load_dotenv

# load_dotenv()
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")