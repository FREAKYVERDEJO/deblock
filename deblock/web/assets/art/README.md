# Reviewed CC0 image pool

Reviewed on 2026-11-03. Twenty-two hand-selected works from The Metropolitan Museum
of Art and the Smithsonian American Art Museum. This is a small starting pool,
not an exhaustive representation of any culture.

The expansion adds ten works: six gardens, flowers, seascapes, and ceramics,
and four religious works spanning Hindu, Buddhist, Christian, and Islamic
traditions. The latter are Shiva as Lord of Dance (39328), Meditating Buddha
(39489), Icon with the Virgin and Child (463984), and Calligraphic Galleon
(454611). Their official object pages document the subjects; all receive the
same shuffle treatment as the rest of the pool, with no extra weighting.
Existing works and IDs are retained unchanged.

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
