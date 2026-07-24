# ===========
# Import
# ===========
from fastapi import FastAPI, APIRouter
import uvicorn
import os


# ===========
# Class
# ===========
class Server:

  def __init__(self, state):
    self.state = state
    self.app = FastAPI()
    self.register_routes()

  def register_routes(self):
    router = APIRouter(prefix="/api")
    
    @router.post("/start")
    def start():
      self.state.enabled = True
      print(f"Proxy state update: {self.state.enabled}")
      return {"status": "enabled"}

    @router.post("/stop")
    def stop():
      self.state.enabled = False
      print(f"Proxy state update: {self.state.enabled}")
      return {"status": "disabled"}

  def run(self):
    port = os.getenv("API_PORT")
    host=os.getenv("API_HOST")
    print(f"FastAPI server running on {host}:{port}")

    uvicorn.run(self.app, host=host, port=port, log_level="warning")