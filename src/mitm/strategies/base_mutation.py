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
    key = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1 \2", key)
    key = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", key)

    key = key.replace("_", " ")
    key = key.replace("-", " ")

    return key.lower().split()