# ===========
# Import
# ===========

# ===========
# Class
# ===========
class RequestHandler:
  def analyze(self, flow):
    print(flow.request.pretty_url)
    return
        