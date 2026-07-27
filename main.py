# ===========
# Import
# ===========
from mitmproxy import http # type: ignore
from src.http_modules.request_handler import RequestHandler
from src.http_modules.response_handler import ResponseHandler
from src.state import ProxyState
from src.server import Server
import threading


# ===========
# Services
# ===========
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
