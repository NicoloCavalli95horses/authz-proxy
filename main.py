# ===========
# Import
# ===========
from mitmproxy import http # type: ignore
from analyzers.request_handler import RequestHandler
from analyzers.response_handler import ResponseHandler


# ===========
# Functions
# ===========
class AuthorizationAnalyzer:

  def __init__(self):
    self.request_handler = RequestHandler()
    self.response_handler = ResponseHandler()

  def request(self, flow: http.HTTPFlow):
    self.request_handler.analyze(flow)

  def response(self, flow: http.HTTPFlow):
    self.response_handler.analyze(flow)
      
addons = [
  AuthorizationAnalyzer()
]
