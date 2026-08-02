import os

# Try to load .env manually or with python-dotenv
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env')
if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if '=' in line and not line.startswith('#'):
                k, v = line.split('=', 1)
                os.environ[k.strip()] = v.strip()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./goldvault.db")
JWT_SECRET = os.getenv("JWT_SECRET", "supersecretjwtkeyforgoldvaultforecastingapp2026!")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

GOLD_API_KEY = os.getenv("GOLD_API_KEY", "")
NEWS_API_KEY = os.getenv("NEWS_API_KEY", "")
