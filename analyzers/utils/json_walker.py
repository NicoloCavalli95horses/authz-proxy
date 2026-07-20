# Recursively traverse JSON (dict/list) and execute a callback
# ===========
# Import
# ===========

# ===========
# Class
# ===========
class JsonWalker:

  def walk(self, obj, callback, context=None):
    if isinstance(obj, dict): # {"premium": true}

      for key in list(obj.keys()):
        callback(obj, key, context)
        value = obj[key]

        if isinstance(value, (dict, list)):
          self.walk(value, callback, context)

    elif isinstance(obj, list): # "items": [ {"premium": true}, {"premium": false}]
      for item in obj:
        self.walk(item, callback, obj)