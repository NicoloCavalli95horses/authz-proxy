# ===========
# Import
# ===========
from typing import Any
from pydantic import BaseModel


# ===========
# Class
# ===========
class GraphPayload(BaseModel):
  status: str
  timestamp: int
  data: dict[str, Any]
  config: dict[str, Any]