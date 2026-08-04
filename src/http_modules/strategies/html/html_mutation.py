# ===========
# Import
# ===========
from bs4 import BeautifulSoup


# ===========
# Class
# ===========
class HTMLMutationStrategy:
  def __init__(self):
    pass

  def mutate(self, html):
    soup = BeautifulSoup(html, "html.parser")

    for idx, element in enumerate(soup.find_all(True)):
      element["data-mitm-id"] = str(idx)

    return str(soup)
