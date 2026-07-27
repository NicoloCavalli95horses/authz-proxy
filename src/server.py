# ===========
# Import
# ===========
import os
import json
import uvicorn
from pathlib import Path
from fastapi import FastAPI, APIRouter
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
      
      output_dir = Path("output") 
      output_dir.mkdir(exist_ok=True)
      output_path = output_dir / "results.json"
      
      if results:
        with output_path.open("w", encoding="utf-8") as f:
          json.dump(results, f, indent=2, ensure_ascii=False)
  
    self.app.include_router(router)

  def run(self):
    port = os.getenv("API_PORT")
    host=os.getenv("API_HOST")
    print(f"FastAPI server running on {host}:{port}")

    uvicorn.run(self.app, host=host, port=port, log_level="warning")