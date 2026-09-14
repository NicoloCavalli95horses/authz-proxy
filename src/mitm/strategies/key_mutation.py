# ===========
# Import
# ===========
from .base_mutation import BaseMutationStrategy


# ===========
# Class
# ===========
class KeyMutationStrategy(BaseMutationStrategy):
  RULES = {
    "access": (False, True),
    "accessible": (False, True),
    "active": (False, True),
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
    "level": (False, True),
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

    print(f"{key}: {original} -> {new_value}")
    obj[key] = new_value
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