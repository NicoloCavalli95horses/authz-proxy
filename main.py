# ===========
# Import
# ===========
from mitmproxy import http # type: ignore
from analyzers.request_handler import RequestHandler
from analyzers.response_handler import ResponseHandler
from state import ProxyState
from server import Server
import threading


state = ProxyState()
server = Server(state)

threading.Thread(target=server.run, daemon=True).start()


# ===========
# mitmproxy
# ===========
class AuthorizationAnalyzer:

  def __init__(self, state):
    self.request_handler = RequestHandler(state)
    self.response_handler = ResponseHandler(state)

  def request(self, flow: http.HTTPFlow):
    self.request_handler.analyze(flow)

  def response(self, flow: http.HTTPFlow):
    self.response_handler.analyze(flow)
      

addons = [
  AuthorizationAnalyzer(state)
]
