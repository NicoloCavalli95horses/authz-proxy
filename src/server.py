# ===========
# Import
# ===========
from fastapi import FastAPI, APIRouter
import uvicorn
import os
from src.image_analysis.image_compare import ImageCompare


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
    
    @router.post("/start-proxy")
    def start_proxy():
      self.state.enabled = True
      print(f"Proxy state update: {self.state.enabled}")
      return {"status": "enabled"}

    @router.post("/stop-proxy")
    def stop_proxy():
      self.state.enabled = False
      print(f"Proxy state update: {self.state.enabled}")
      return {"status": "disabled"}
    
    @router.post("/start-analysis")
    def start_analysis():
      print("Image analysis launched")
      comparer = ImageCompare()
      results = comparer.compare()
      print(f"Results: {results}")
      return {"status": "ok", "data": results}
  
    self.app.include_router(router)

  def run(self):
    port = os.getenv("API_PORT")
    host=os.getenv("API_HOST")
    print(f"FastAPI server running on {host}:{port}")

    uvicorn.run(self.app, host=host, port=port, log_level="warning")