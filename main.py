# ===========
# Import
# ===========
from mitmproxy import http # type: ignore
from src.mitm.request_handler import RequestHandler
from src.mitm.response_handler import ResponseHandler
from src.mitm.state import ProxyState
from src.api.server import Server
from src.db.database import engine, Base
from src.db import models
import threading


# ===========
# Services
# ===========
state = ProxyState()
server = Server(state)

threading.Thread(target=server.run, daemon=True).start()
Base.test_connection()


print("[DB] Tables:", Base.metadata.tables.keys())
Base.metadata.create_all(bind=engine)
print("[DB] create_all completed")

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
