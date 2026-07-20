# ===========
# Import
# ===========
from analyzers.strategies.base_mutation import BaseMutationStrategy


# ===========
# Class
# ===========

# Applies dynamic substitution based on alternative values found in the same context (dictionary). Example:
# From: [ { "a": "premium" }, { "a": "free" }, {  "a": "free"  }]
# To:   [ { "a": "free" }, { "a": "free" }, {  "a": "free"  }] 



class ValueMutationStrategy(BaseMutationStrategy):
  CANDIDATES = {
    "access",
    "active",
    "enabled",
    "free",
    "locked",
    "gold",
    "premium",
    "pro",
    "subscribed"
  }

  def apply(self, obj, key, context):
    value = obj[key]

    if not isinstance(value, str):
      return

    if value.lower() not in self.CANDIDATES:
      return

    if not isinstance(context, list):
      return

    alternatives = [
      item[key]
      for item in context
      if (
        isinstance(item, dict)
        and key in item
        and isinstance(item[key], str)
        and item[key] != value
      )
    ]

    if alternatives:
      replacement = alternatives[0]

      print(f"{key}: {value} -> {replacement}")
      obj[key] = replacement