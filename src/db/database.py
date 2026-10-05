# ===========
# Import
# ===========
from sqlalchemy import create_engine, text
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

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
  pass

  def test_connection():
    try:
      with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

      print("[DB] Connection successful")

    except Exception as e:
      print(f"[DB] Connection failed: {e}")
      
  def get_db():
    db = SessionLocal()

    try:
      yield db
    finally:
      db.close()