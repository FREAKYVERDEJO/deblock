"""Validate optional, versioned writing documents without changing their authorship."""
import json
import re
from pathlib import Path


_APHORISM_IDS = {item["id"] for item in json.loads(
    (Path(__file__).parents[1] / "web/assets/deblock_aotd_100_curated.json").read_text()
)["items"]}


def validate_aphorism(value: object) -> dict | None:
    """Keep a known prompt and editor choice; quote text stays in the catalog."""
    if value is None:
        return None
    if (not isinstance(value, dict) or type(value.get("version")) is not int
            or value["version"] != 1 or not isinstance(value.get("id"), str)
            or value["id"] not in _APHORISM_IDS or value.get("mode") not in ("word", "text")):
        raise ValueError("Choose a known aphorism and word or text mode.")
    return {"version": 1, "id": value["id"], "mode": value["mode"]}


def _text(value: object, maximum: int) -> bool:
    return isinstance(value, str) and len(value) <= maximum and '\x00' not in value


def validate_story(value: object) -> dict | None:
    """Return a normalized story or raise ValueError for an unsafe/invalid shape."""
    if value is None:
        return None
    if not isinstance(value, dict) or type(value.get('version')) is not int or value['version'] != 1:
        raise ValueError('Unsupported story format.')
    beats, passages, active = value.get('beats'), value.get('passages'), value.get('active')
    if not isinstance(beats, list) or not 2 <= len(beats) <= 100:
        raise ValueError('A story needs between two and 100 beats.')
    clean_beats, ids = [], set()
    characters = 0
    for beat in beats:
        if not isinstance(beat, dict):
            raise ValueError('Each beat needs its original ID and text.')
        key, text = beat.get('id'), beat.get('text')
        if not isinstance(key, str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,80}', key) or key in ids:
            raise ValueError('Each beat needs a unique ID.')
        if not _text(text, 1000) or not text.strip():
            raise ValueError('Each beat needs nonempty text of at most 1,000 characters.')
        ids.add(key)
        characters += len(text)
        clean_beats.append({'id': key, 'text': text})
    if not isinstance(passages, list) or len(passages) != len(beats) - 1:
        raise ValueError('Keep one passage between each pair of beats.')
    if type(active) is not int or not 0 <= active < len(passages):
        raise ValueError('Choose an existing story passage.')
    clean_passages, word_count = [], 0
    for index, passage in enumerate(passages):
        if not isinstance(passage, dict) or passage.get('from') != clean_beats[index]['id'] or passage.get('to') != clean_beats[index + 1]['id']:
            raise ValueError('Each passage must stay attached to its adjacent beats.')
        words, draft = passage.get('words'), passage.get('draft')
        if not isinstance(words, list) or any(not _text(word, 250000) for word in words) or not _text(draft, 250000):
            raise ValueError('Story passages must contain text words and unfinished text.')
        word_count += len(words) + bool(draft)
        characters += sum(len(word) for word in words) + len(draft)
        clean_passages.append({'from': clean_beats[index]['id'], 'to': clean_beats[index + 1]['id'], 'words': list(words), 'draft': draft})
    if word_count > 20000 or characters > 250000:
        raise ValueError('A story can contain at most 20,000 text items and 250,000 characters, including its outline.')
    return {'version': 1, 'beats': clean_beats, 'passages': clean_passages, 'active': active}


def validate_blackout(value: object, words: list[str], draft: str) -> dict | None:
    """Validate a view over original words; never replace those words with a poem."""
    if value is None:
        return None
    if not isinstance(value, dict) or type(value.get('version')) is not int or value['version'] != 1:
        raise ValueError('Unsupported poetry format.')
    style, kept = value.get('style'), value.get('kept')
    count = sum(len(word.split()) for word in [*words, draft])
    if style not in ('highlight', 'blackout') or not isinstance(kept, list) or len(kept) > 20000:
        raise ValueError('Choose highlight or blackout and the words to keep.')
    if any(type(index) is not int or not 0 <= index < count for index in kept) or len(set(kept)) != len(kept):
        raise ValueError('Poetry selections must refer to distinct words in the original chain.')
    return {'version': 1, 'style': style, 'kept': sorted(kept)}
