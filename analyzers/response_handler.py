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
        self.KEY_RULES = {
            "access": {"from": False, "to": True},
            "active": {"from": False, "to": True},
            "premium": {"from": True, "to": False},
            "pro": {"from": True, "to": False},
            "enabled": {"from": False, "to": True},
            "entitled": {"from": False, "to": True},
            "eligible": {"from": False, "to": True},
            "free": {"from": False, "to": True},
            "full": {"from": False, "to": True},
            "level": {"from": 0, "to": 1},
            "locked": {"from": True, "to": False},
            "role": {"from": None, "to": 1},
            "subscribed": {"from": False, "to": True},
            "subscription": {"from": 0, "to": 1},
            "state": {"from": "locked", "to": "active"},
            "title": {"from": "free", "to": "premium"},
        }

        self.VALUE_RULES = {
            "premium": "free",
            "pro": "none",
            "paid": "free",
            "gold": "free",
            "enterprise": "free",
            "locked": "active",
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
                self.apply_key_rules(obj, key, self.tokenize(key))

                if isinstance(value, str) and len(value) < 50:
                    self.apply_value_rules(obj, key, self.tokenize(value))

                elif isinstance(value, (dict, list)):
                    self.mutate_json(value)

        elif isinstance(obj, list):
            for item in obj:
                self.mutate_json(item)

    def apply_value_rules(self, obj, key, tokens):
        value = obj[key]

        for token in tokens:
            new_value = self.VALUE_RULES.get(token)

            if new_value is None:
                continue

            if value.lower() == token:
                print(f"{key}: {value} -> {new_value}")
                obj[key] = new_value

            break

    def apply_key_rules(self, obj, key, tokens):
        value = obj[key]
        for token in tokens:
            rule = self.KEY_RULES.get(token)

            if rule is None:
                continue

            if value == rule["from"]:
                print(f"{key}: {value} -> {rule['to']}")
                obj[key] = rule["to"]
            break

    def tokenize(self, key):
        # separate camelCase: isPremium -> is Premium
        key = re.sub(r"([a-z])([A-Z])", r"\1 \2", key)

        # replace separators
        key = key.replace("_", " ")
        key = key.replace("-", " ")
        tokens = key.lower().split()
        return tokens
