# ===========
# Import
# ===========
import os
import uvicorn
from fastapi import FastAPI
from .routes import create_router


# ===========
# Class
# ===========
class Server:
  def __init__(self, state):
    self.state = state
    self.app = FastAPI()
    self.app.include_router(create_router(self.state))

  def run(self):
    uvicorn.run(self.app, host=os.getenv("API_HOST"), port=int(os.getenv("API_PORT")), log_level="warning")
