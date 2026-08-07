# ===========
# Import
# ===========
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()


# ===========
# Var
# ===========
DATABASE_URL = (
    f"postgresql+psycopg://"
    f"{os.getenv('DB_USER')}:"
    f"{os.getenv('DB_PASSWORD')}@"
    f"localhost/"
    f"{os.getenv('DB_NAME')}"
)

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass