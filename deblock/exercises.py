"""Creative writing exercises available in deblock."""


def get_exercise(exercise_id: str) -> dict[str, str]:
    """Return an exercise's title and instructions, or raise ValueError."""
    if exercise_id != "free_association":
        raise ValueError(f"Unknown exercise: {exercise_id!r}")

    return {
        "title": "The Signifier Chain",
        "instructions": (
            "Begin with any word. Write the next word or phrase that comes to mind, "
            "without censoring yourself or searching for a clever answer. "
            "Use that new word or phrase as the starting point for your next "
            "association, and keep following the chain. Sounds, memories, and "
            "unexpected connections are all welcome. If you wish, choose a link "
            "that surprises you and write a few sentences about it. "
            "You can pause, stop, or change your starting word at any time. "
            "There is no correct interpretation."
        ),
    }
