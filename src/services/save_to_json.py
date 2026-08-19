# ===========
# Import
# ===========
import json
from datetime import datetime


# ===========
# Functions
# ===========
def save_to_json(results):
  today = datetime.today().strftime('%Y-%m-%d')
  filename= "BAC_REPORT_"+today+".json"
  
  with open(filename, "w", encoding="utf-8") as file:
    json.dump(results, file, indent=2, ensure_ascii=False)
    
