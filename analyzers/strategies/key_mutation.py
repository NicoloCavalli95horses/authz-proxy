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
    "active": (False, True),
    "ad": (True, False),
    "premium": (True, False),
    "pro": (True, False),
    "locked": (True, False),
    "enabled": (False, True),
    "entitled": (False, True),
    "eligible": (False, True),
    "free": (False, True),
    "full": (False, True),
    "level": (0, 1),
    "role": (None, 1),
    "subscribed": (False, True),
    "subscription": (0, 1),
    "state": ("locked","active"),
    "title": ("free", "premium"),
  }


  # apply one or more rules, always on the original value
  def apply(self, obj, key, context=None):
    original = obj[key]
    
    for token in self.tokenize(key):
      rule = self.RULES.get(token)

      if rule is None:
        continue

      expected, replacement = rule

      if original == expected:
        print(f"{key}: {obj[key]} -> {replacement}")
        obj[key] = replacement
