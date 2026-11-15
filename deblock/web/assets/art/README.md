# Reviewed CC0 image pool

Reviewed on 2026-11-03; painted iconography update reviewed on 2026-11-05;
resolution and screen-shape update reviewed on 2026-11-15.
The catalog contains 42 works from The Metropolitan Museum of Art and the
Smithsonian American Art Museum: 30 in rotation and 12 retained for saved
entries. This is a small curated pool, not an exhaustive representation of any culture.

The religious selection uses paintings and calligraphy:
- Krishna Rajagopalaswamy, king of the cowherds (858237), Hindu devotional painting.
- Scene from the Life of the Buddha (45213), Japanese Buddhist painting, now
  retained for saved entries because its original is only 1905 × 1307 pixels.
- Buddha Amitabha Descending from His Pure Land (40448), Chinese Buddhist painting.
- Icon of the Virgin and Child, Hodegetria variant (831188), Christian painted icon.
- Calligraphic Galleon (454611), Ottoman Islamic devotional calligraphy.

The official object pages document these subjects. Eligible works receive the same
shuffle weight within their screen-shape pool. The three earlier religious sculptures (39328, 39489,
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

The 2026-11-15 update replaces the 23 previously active small derivatives with
copies made from the Met API's `primaryImage` originals and the Smithsonian's
larger image delivery. Met records were checked again for `isPublicDomain: true`.
The Smithsonian collection page still labels *Mary* "Free to use".
Originals are resized down, never up, to a maximum 3840-pixel long edge, then
saved as progressive JPEGs (Pillow, quality 90, optimized, subsampling 2),
preserving embedded color profiles. There is no cropping, recoloring, or sharpening
in the bundled files. `sourceWidth`/`sourceHeight` record the downloaded dimensions;
`width`/`height`, `orientation`, and checksums describe the actual local files.

The 15 landscape prompts are at least 3200 × 1800 pixels, with aspect ratio
at least 1.1. The 15 portrait prompts are at least 1600 × 3000 pixels, with
aspect ratio at most .85. Smaller and nearly square originals are excluded from
new prompts. Their IDs and assets remain resolvable for older saved pieces.
Review crops at 16:10 and 9:19.5 were visually inspected before inclusion.

The second 2026-11-15 review adds 16 works (eight in each orientation):

| Landscape | Portrait |
| --- | --- |
| Church, *Heart of the Andes* (10481) | Sargent, *Madame X* (12127) |
| Bierstadt, *The Rocky Mountains, Lander's Peak* (10154) | Van Gogh, *Self-Portrait with a Straw Hat* (436532) |
| Van Gogh, *Oleanders* (436530) | Van Gogh, *Roses* (436534) |
| Van Gogh, *Sunflowers* (436524) | Moreau, *Oedipus and the Sphinx* (437153) |
| Cézanne, *Still Life with Apples and a Pot of Primroses* (435882) | Courbet, *Alphonse Promayet* (436008) |
| David, *The Death of Socrates* (436105) | Rembrandt, *Self-Portrait* (437397) |
| Hiroshige, *Sudden Shower at Shōno* (36521) | Hiroshige, *Sudden Shower over Shin-Ōhashi Bridge and Atake* (37386) |
| Manet, *The Monet Family in Their Garden at Argenteuil* (436965) | Hiroshige, *Plum Garden at Kamata* (53681) |

Each addition was checked against its official API record for public-domain
image rights, downloaded from `primaryImage`, and prepared with the same JPEG
settings above. Smaller originals and records with `isPublicDomain: false`
were excluded. All previous catalogue entries and files are retained.

The screen's current orientation selects a separate shuffled deck. The first
image and "another" use the matching deck; a screen rotation discards an
incompatible preload. Resizing does not silently replace an image already
attached to writing, and toggling off/on preserves that selection. The fullscreen
view still uses a centered cover crop; review and export retain the full image.

Serve these local copies: no third-party requests, keys, analytics,
or cross-origin canvas permissions are needed while writing/exporting. The info
control links to the current museum record. Saved Library entries retain the
artwork metadata and ID; rendering resolves IDs through this reviewed catalog.
Keep existing IDs/assets when extending the pool so older entries remain usable.

When adding works, verify image rights (not just metadata rights), preserve the
museum's source and rights evidence, inspect the actual image, and record its
checksum. Do not treat all images from a participating museum as CC0.
