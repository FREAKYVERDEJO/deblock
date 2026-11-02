import pytest

from deblock.exercises import get_exercise


def test_get_free_association_exercise() -> None:
    exercise = get_exercise("free_association")

    assert exercise["title"] == "The Signifier Chain"
    assert isinstance(exercise["instructions"], str)
    assert exercise["instructions"].strip()


def test_unknown_exercise_raises_clear_error() -> None:
    with pytest.raises(ValueError, match="Unknown exercise"):
        get_exercise("missing_exercise")
