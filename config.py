import os
from dotenv import load_dotenv

load_dotenv()

MOONSHOT_API_KEY = os.getenv("MOONSHOT_API_KEY", "")
MOONSHOT_BASE_URL = os.getenv("MOONSHOT_BASE_URL", "https://api.moonshot.cn/v1")
PORT = int(os.getenv("PORT", "8000"))
