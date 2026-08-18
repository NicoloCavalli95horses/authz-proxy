def save_to_txt(results, filename="network_comparison.txt"):
    with open(filename, "w", encoding="utf-8") as file:

        for i, result in enumerate(results, start=1):
            file.write(f"===== Comparison {i} =====\n")

            file.write(f"Interaction ID: {result['interaction_id']}\n")

            file.write(
                f"Exploration execution: " f"{result['exploration_execution_id']}\n"
            )

            file.write(f"Replay execution: " f"{result['replay_execution_id']}\n")

            # -------------------------------------------------
            # Exploration responses
            # -------------------------------------------------
            file.write("\n--- Exploration responses ---\n")

            for response in result["exploration_responses"]:
                file.write(
                    f"Response ID: {response.id}\n"
                    f"Request ID: {response.request_id}\n"
                    f"Status: {response.status_code}\n"
                    f"URL: {response.url}\n"
                    f"Body: {response.body}\n\n"
                )

            # -------------------------------------------------
            # Replay responses
            # -------------------------------------------------
            file.write("--- Replay responses ---\n")

            for response in result["replay_responses"]:
                file.write(
                    f"Response ID: {response.id}\n"
                    f"Request ID: {response.request_id}\n"
                    f"Status: {response.status_code}\n"
                    f"URL: {response.url}\n"
                    f"Body: {response.body}\n\n"
                )

            file.write("\n\n")
