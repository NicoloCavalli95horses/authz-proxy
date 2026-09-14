# ===========
# Import
# ===========
from sqlalchemy.orm import Session
from .save_to_json import save_to_json
from .get_from_db import get_pairs
from .find_server_bac import compare_network_pairs
from .find_client_bac import compare_dom_pairs

from collections import Counter


# ===========
# Functions
# ===========
def run_analysis(db: Session, exploration_run_id: int, replay_run_id: int):
  network_results = find_network_differences(db, exploration_run_id, replay_run_id)
  dom_results = find_dom_differences(db, exploration_run_id, replay_run_id)
  bac = network_results + dom_results
  save_to_json(bac)
  
  counts = Counter(item["type"] for item in bac)
  return counts

    

def find_network_differences(db: Session, exploration_run_id: int, replay_run_id: int):
  pairs = get_pairs(db, "network", exploration_run_id, replay_run_id)
  return compare_network_pairs(pairs)



def find_dom_differences(db: Session, exploration_run_id: int, replay_run_id: int):
  pairs = get_pairs(db, "dom", exploration_run_id, replay_run_id)
  return compare_dom_pairs(pairs)
