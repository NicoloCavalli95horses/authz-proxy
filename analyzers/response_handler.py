# ===========
# Import
# ===========
import json
import re


# ===========
# Class
# ===========
class ResponseHandler:
    def __init__(self):
        self.MUTATION_RULES = {
            "premium": {"from": True, "to": False},
            "free": {"from": False, "to": True},
            "subscribed": {"from": False, "to": True},
            "enabled": {"from": False, "to": True},
            "active": {"from": False, "to": True},
            "access": {"from": False, "to": True},
            "entitled": {"from": False, "to": True},
            "locked": {"from": True, "to": False},
            "state": {"from": "locked", "to": "active"},
        }

    def analyze(self, flow):
        content_type = flow.response.headers.get("content-type", "")

        if "application/json" not in content_type:
            return

        try:
            data = flow.response.json()

        except Exception:
            return

        self.mutate_json(data)
        flow.response.text = json.dumps(data)

    def mutate_json(self, obj):
        if isinstance(obj, dict):
            for key, value in obj.items():
                tokens = self.tokenize_key(key)

                for token in tokens:
                    rule = self.MUTATION_RULES.get(token)

                    if rule is None:
                        continue

                    if value == rule["from"]:
                        print(f"{key}: {value} -> {rule['to']}")
                        obj[key] = rule["to"]

                    break

                if isinstance(value, (dict, list)):
                    self.mutate_json(value)

        elif isinstance(obj, list):

            for item in obj:
                self.mutate_json(item)

    def tokenize_key(self, key):
        # separate camelCase: isPremium -> is Premium
        key = re.sub(r"([a-z])([A-Z])", r"\1 \2", key)

        # replace separators
        key = key.replace("_", " ")
        key = key.replace("-", " ")
        tokens = key.lower().split()
        return tokens
