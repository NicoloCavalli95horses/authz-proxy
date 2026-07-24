# ===========
# Import
# ===========

# ===========
# Class
# ===========
class RequestHandler:
  def __init__(self, state):
    self.state = state

  def analyze(self, flow):
    if not self.state.enabled:
      return
    
    print(flow.request.pretty_url)
        