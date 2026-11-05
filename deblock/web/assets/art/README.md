# Reviewed CC0 image pool

Reviewed on 2026-11-03; painted iconography update reviewed on 2026-11-05.
The catalog contains 26 works from The Metropolitan Museum of Art and the
Smithsonian American Art Museum: 23 in rotation and three retained for saved
entries. This is a small curated pool, not an exhaustive representation of any culture.

The religious selection in rotation uses paintings and calligraphy:
- Krishna Rajagopalaswamy, king of the cowherds (858237), Hindu devotional painting.
- Scene from the Life of the Buddha (45213), Japanese Buddhist painting.
- Buddha Amitabha Descending from His Pure Land (40448), Chinese Buddhist painting.
- Icon of the Virgin and Child, Hodegetria variant (831188), Christian painted icon.
- Calligraphic Galleon (454611), Ottoman Islamic devotional calligraphy.

The official object pages document these subjects. All receive the same shuffle
weight as other prompts. The three earlier religious sculptures (39328, 39489,
463984) have `inRotation: false`: they are excluded from new prompts, while their
IDs, metadata, and image files remain available for Library entries and exports.
Do not remove archived images when updating the selection.

Every Met selection had `isPublicDomain: true` and a nonempty image URL in its
individual official API record. Several candidates with false flags were excluded.
The Smithsonian selection, Henry Ossawa Tanner's *Mary*, has `Restrictions &
Rights: CC0` in its Smithsonian object record; its image URL is linked from the
American Art Museum's current collection page.

- Met CC0 image policy: https://www.metmuseum.org/hubs/open-access
- Smithsonian policy: https://www.si.edu/openaccess/faq
- CC0 dedication: https://creativecommons.org/publicdomain/zero/1.0/

`catalog.json` records titles, makers, dates, cultural/geographic descriptions,
medium, museum, credit line, object links, image URLs, rights evidence, review date,
and SHA-256 checksums. Labels follow museum metadata; unrecorded makers are marked
as such. The Egyptian work's geography comes from the API `region` field. These
short catalog facts are used rather than copied curatorial essays.

JPEG files are the museums' supplied derivatives, downloaded without cropping or
recolouring. Serve these local copies: no third-party requests, keys, analytics,
or cross-origin canvas permissions are needed while writing/exporting. The info
control links to the current museum record. Saved Library entries retain the
artwork metadata and ID; rendering resolves IDs through this reviewed catalog.
Keep existing IDs/assets when extending the pool so older entries remain usable.

When adding works, verify image rights (not just metadata rights), preserve the
museum's source and rights evidence, inspect the actual image, and record its
checksum. Do not treat all images from a participating museum as CC0.
