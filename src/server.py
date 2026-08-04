# ===========
# Import
# ===========
import os
import uvicorn
from fastapi import FastAPI, APIRouter


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
    
    @router.put("/proxy")
    def update_proxy_state(payload: dict):
      enabled = payload.get("enable", False)
      self.state.enabled = enabled
      print(f"Proxy state update: {self.state.enabled}")
      return {"enabled": self.state.enabled}
    
    @router.post("/analysis")
    def start_analysis(payload: dict):
      s = payload.get("status")
      if s != "start":
        return {"status": "not valid"}
      
      print("Result analysis launched")
      return {"status": s, "note": "not implemented yet"}
  
    self.app.include_router(router)

  def run(self):
    port = os.getenv("API_PORT")
    host=os.getenv("API_HOST")
    print(f"FastAPI server running on {host}:{port}")

    uvicorn.run(self.app, host=host, port=port, log_level="warning")