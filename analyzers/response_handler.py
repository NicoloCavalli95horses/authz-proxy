# ===========
# Import
# ===========
import json

from analyzers.utils.json_walker import JsonWalker 
from analyzers.strategies.key_mutation import KeyMutationStrategy
from analyzers.strategies.value_mutation import ValueMutationStrategy

# ===========
# Class
# ===========
class ResponseHandler:
  def __init__(self):
    self.walker = JsonWalker()
    self.strategies = [
      KeyMutationStrategy(),
      # ValueMutationStrategy(),
    ]
    

  def analyze(self, flow):
    content_type = flow.response.headers.get("content-type", "")
    
    if "application/json" in content_type:
      try:
        data = flow.response.json()

      except Exception as e:
        print("JSON ERROR:", e)
        return

      self.walker.walk(data, self.apply_strategies)
      flow.response.text = json.dumps(data)
      
    elif "text/html" in content_type:
      print("text/html response")
      return #todo


  def apply_strategies(self, obj, key, context):
    for strategy in self.strategies:
        strategy.apply(obj, key, context)
