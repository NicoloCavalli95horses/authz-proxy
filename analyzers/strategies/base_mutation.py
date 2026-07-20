# ===========
# Import
# ===========
import re


# ===========
# Class
# ===========
class BaseMutationStrategy:

  def apply(self, obj, key, context=None):
    raise NotImplementedError

  def tokenize(self, key):
    # separate camelCase: isPremium -> is Premium
    key = re.sub(r"([a-z])([A-Z])", r"\1 \2", key)

    # replace separators
    key = key.replace("_", " ")
    key = key.replace("-", " ")
    tokens = key.lower().split()
    return tokens