# ===========
# Import
# ===========
import os
from dotenv import load_dotenv

load_dotenv()
FORCE_PROXY_ACTIVE = os.getenv("FORCE_PROXY_ACTIVE", "false").lower() == "true"


# ===========
# Class
# ===========
class RequestHandler:
  def __init__(self, state):
    self.state = state

  def analyze(self, flow):
    if not self.state.enabled and not FORCE_PROXY_ACTIVE:
      return
    
    print(flow.request.pretty_url)
        