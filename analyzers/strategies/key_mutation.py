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
    "can": (False, True),
    "credit": (lambda v: isinstance(v, (int, float)), 999), # turn whatever int
    "credits": (lambda v: isinstance(v, (int, float)), 999),
    "code": ("premium", "public"), # test (l'express) was content_code
    "ad": (True, False),
    "disabled": (True, False),
    "eligible": (False, True),
    "enabled": (False, True),
    "entitled": (False, True),
    "f": (0, 1),
    "forsubscribers": (True, False),
    "free": (False, True),
    "full": (False, True),
    "has": (False, True),
    "is_subscriber": (False, True),
    "level": (0, 1),
    "locked": (True, False),
    "otp": (True, False),
    "paid": (True, False),
    "premium": (True, False),
    "policy": (1, 0),
    "payment": (True, False),
    "paying": (True, False),
    "paywall": (True, False),
    "pro": (True, False),
    "plus": (True, False),
    "restricted": (True, False),
    "role": (None, 1),
    "subscribed": (False, True),
    "subscription": (0, 1),
    "state": ("locked","active"),
    "title": ("free", "premium"),
    "unlock": (False, True),
    "unlocked": (False, True),
    "vip": (True, False)
  }


  # apply one or more rules, always on the original value
  def use_rule(self, obj, key, rule):
    original = obj[key]
    expected, replacement = rule
    match = expected(original) if callable(expected) else original == expected

    if match:
      print(f"{key}: {original} -> {replacement}")
      obj[key] = replacement
      return True

    return False


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