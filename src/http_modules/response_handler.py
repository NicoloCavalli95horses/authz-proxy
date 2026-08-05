# ===========
# Import
# ===========
import json
import os
from .utils.json_walker import JsonWalker 
from .strategies.json.key_mutation import KeyMutationStrategy
from .strategies.json.value_mutation import ValueMutationStrategy
from dotenv import load_dotenv

load_dotenv()
FORCE_PROXY_ACTIVE = os.getenv("FORCE_PROXY_ACTIVE", "false").lower() == "true"

# ===========
# Class
# ===========
class ResponseHandler:
  def __init__(self, state):
    self.state = state
    self.walker = JsonWalker()
    self.strategies = [
      KeyMutationStrategy(),
      # ValueMutationStrategy(),
    ]
    
  def analyze(self, flow):
    # Prevent browser from caching data in any case
    flow.response.headers["cache-control"] = "no-store, no-cache, must-revalidate"
    flow.response.headers["pragma"] = "no-cache"
    flow.response.headers["expires"] = "0"
    flow.response.headers["vary"] = "*"
    
    content_type = flow.response.headers.get("content-type", "").lower()
    
    if "json" in content_type:
      print("=== Intercepted HTTP response of type: JSON ===")
      
      if not self.state.enabled and not FORCE_PROXY_ACTIVE:
        return
      
      try:
        data = flow.response.json()

      except Exception as e:
        print("JSON ERROR:", e)
        return

      self.walker.walk(data, self.apply_strategies)
      flow.response.text = json.dumps(data, ensure_ascii=False) # dumps uses escape by default, this prevents char trasformation
      
    else:
      print("=== Unknown format", content_type)

  def apply_strategies(self, obj, key, context):
    for strategy in self.strategies:
      strategy.apply(obj, key, context)
