# Database Design

## Overview

The database stores the results of exploration runs, the logical interactions discovered during exploration, the concrete executions of those interactions, and the HTTP/DOM observations associated with each execution.

## Schema

```mermaid

flowchart TD

    runs["runs
    ─────────────
    id
    type
    config"]

    dom_states["dom_states
    ─────────────
    id
    run_id
    snapshot
    hash
    url"]

    interactions["interactions
    ─────────────
    id
    type
    element_fingerprint
    element_data"]

    interaction_exec["interaction_executions
    ─────────────────
    id
    run_id
    interaction_id"]

    http_requests["http_requests
    ─────────────
    id
    interaction_exec_id
    method
    url"]

    navigation["navigation
    ─────────────
    id
    interaction_exec_id
    type
    url"]

    http_responses["http_responses
    ──────────────
    id
    request_id
    status
    body"]


    runs --> dom_states
    runs --> interaction_exec

    dom_states <-->|"from / to"| interaction_exec
    interactions --> interaction_exec

    interaction_exec --> http_requests
    interaction_exec --> navigation
    http_requests --> http_responses

```