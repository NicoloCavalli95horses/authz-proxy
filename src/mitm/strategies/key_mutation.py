# ===========
# Import
# ===========
import requests
from .base_mutation import BaseMutationStrategy
import os

FORCE_PROXY_ACTIVE = os.getenv("FORCE_PROXY_ACTIVE", "false").lower() == "true"

# ===========
# Class
# ===========
class KeyMutationStrategy(BaseMutationStrategy):
  seen_json_keys = set()
  POST_URL = f"http://{os.getenv("API_HOST")}:{os.getenv("API_PORT")}/api/json-keys"
  RULES = {
    "access": (False, True),
    "accessible": (False, True),
    "active": (False, True), #this breaks Promova for some reason
    "admin": (False, True),
    "auth": (False, True),
    "can": (False, True),
    "credit": (lambda v: isinstance(v, (int, float)), 999), # turn whatever int
    "credits": (lambda v: isinstance(v, (int, float)), 999),
    "ad": (True, False),
    "disabled": (True, False),
    "eligible": (False, True),
    "enabled": (False, True),
    "entitled": (False, True),
    "subscribers": (True, False),
    "free": (False, True),
    "full": (False, True),
    "has": (False, True),
    "is_subscriber": (False, True),
    # "level": (False, True), # this breaks Lingualeo
    "locked": (True, False),
    "otp": (True, False),
    "paid": (True, False),
    "premium": (True, False),
    "policy": (True, False),
    "payment": (True, False),
    "paying": (True, False),
    "paywall": (True, False),
    "pro": (True, False),
    "price": (lambda v: isinstance(v, (int, float)), 0),
    "plus": (True, False),
    "restricted": (True, False),
    "role": (False, True),
    "secret": (True, False),
    "subscribed": (False, True),
    "subscription": (False, True),
    "unlock": (False, True),
    "unlocked": (False, True),
    "vip": (True, False),
  }


  # apply one or more rules, always on the original value
  def use_rule(self, obj, key, rule):
    original = obj[key]
    expected, replacement = rule

    # Lambda rule
    if callable(expected):
      if not expected(original):
        return False
      new_value = replacement

    # Boolean/integer toggle rule
    else:
      if isinstance(original, bool):
        if original != expected:
          return False
        new_value = replacement
        
      elif original is None:
        if expected is not False:
          return False
        new_value = replacement

      elif isinstance(original, int):
        if original == 0 and expected is False:
          new_value = 1
        elif original == 1 and expected is True:
          new_value = 0
        else:
          return False

      else:
        return False

    obj[key] = new_value
    
    # Save affected JSON key and mutated value
    entry = (key, new_value)
    print(f"key: {key}, original: {original}, mutated: {new_value}")
    
    if (entry not in self.seen_json_keys) and not (FORCE_PROXY_ACTIVE):
      self.seen_json_keys.add(entry)
      response = requests.post(self.POST_URL, json={"key": key, "original": original, "mutated": new_value}, timeout=2)
      print('Saving new JSON key to FastAPI')
      response.raise_for_status()
    
    return True

  def apply(self, obj, key, context=None):
    rule = self.RULES.get(key.lower())
    
    # search the complete key
    if rule is not None and self.use_rule(obj, key, rule):
      return

    # search the tokenized key
    for token in self.tokenize(key):
      rule = self.RULES.get(token)

      if rule is not None and self.use_rule(obj, key, rule):
        return