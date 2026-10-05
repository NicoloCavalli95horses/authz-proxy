# [TODO]
[x] Test existing GUI explorers
- Crawljax (2008) (https://github.com/crawljax/crawljax) State-of-the-art web explorer, not well maintained, not compatible with modern browsers (has an outdated version of ChromeDriver)
- htcap (2020) (https://github.com/fcavallarin/htcap) SPA crawler, runs on old versions of Puppeteers, not maintained, cannot solve CAPTCHAS

[x] Modify HTML in HTTP response via proxy server, adding data-id-N tag (removed, not reliable)
[x] Instrument browser APIs used for DOM element creation via js to add this attribute (removed, not reliable)
[x] Simplify fn for selecting and searching for clickable elements
[x] Instrument date API to ensure all timestamps used on the client side are blocked to prevent behavior based on the current time (e.g., pop-ups)
[x] Introduce click Preliminary steps before starting the analysis
[x] Make the selection of clickable areas configurable (e.g., exclude the navbar by considering only items at the top 300px)
[x] Use safePageEvalute wherever possible to make sure we do not have blocking errors
[x] Configurable navigation guard
[x] Configurable clock mocking
[x] Design tables in MySQL/PostgreSQL
[x] Design APIs
[x] Design post-replay analysis pipelines
[x] test on localhost:3456 -> proxy server must change client state (make sure local web server is intercepted by MITM)
[x] Save to DB the absolute list of JSON keys altered by the proxy server
[x] Save the number of unique keys altered by the proxy server in the DATA_COUNT JSON file 

## Sorted by priority:
[] HTTP parameter tampering is not flagged anymore (?)