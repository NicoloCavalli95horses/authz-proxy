# ===========
# Import
# ===========
from analyzers.strategies.base_mutation import BaseMutationStrategy


# ===========
# Class
# ===========
class KeyMutationStrategy(BaseMutationStrategy):
  RULES = {
    "access": (False, True),
    "accessible": (False, True),
    "active": (False, True),
    "content_code": ("premium", "public"), # test (l'express)
    "ad": (True, False),
    "disabled": (True, False),
    "eligible": (False, True),
    "enabled": (False, True),
    "entitled": (False, True),
    "f": (0, 1),
    "has": (False, True),
    "forsubscribers": (True, False),
    "free": (False, True),
    "full": (False, True),
    "level": (0, 1),
    "locked": (True, False),
    "premium": (True, False),
    "paywall": (True, False),
    "pro": (True, False),
    "restricted": (True, False),
    "role": (None, 1),
    "subscribed": (False, True),
    "subscription": (0, 1),
    "state": ("locked","active"),
    "title": ("free", "premium"),
    "vip": (True, False)
  }


  # apply one or more rules, always on the original value
  def apply(self, obj, key, context=None):
    original = obj[key]
    
    # search the complete key
    rule = self.RULES.get(key.lower())
    if rule is not None:
      expected, replacement = rule
      if original == expected:
        obj[key] = replacement
        return
      
    # search the tokenize key 
    for token in self.tokenize(key):
      rule = self.RULES.get(token)

      if rule is None:
        continue

      expected, replacement = rule

      if original == expected:
        print(f"{key}: {obj[key]} -> {replacement}")
        obj[key] = replacement
