# Third-party notices and provenance

Curated independently by faustoaguanor. The three submissions are attributed to DeepSeek V4.1 Flash, GLM-5.3 Flash and MiMo V2.6 Flash respectively. Model labels and development metrics were supplied by the experiment owner; provider identities/version availability were not independently authenticated. No provider, Z.ai, Xiaomi, DeepSeek or CommandCode endorses or sponsors this project.

No prior repository license, implementation license file or conflicting copyright declaration was found in the selected project material. At the owner's direction, the root MIT grant covers repository-owned material to the extent the owner can license it, including the curated AI-generated submissions. It does not establish exclusive copyright in generated output, guarantee its provenance or relicense third-party material. Applicable original notices continue to govern dependencies.

| Component | Observed locked/installed versions | License | Distribution |
|---|---|---|---|
| [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt) | 5.24.0 (DeepSeek/MiMo), 4.7.1 (GLM) | BSD-3-Clause | npm dependency, bundled in applications |
| [Turf.js](https://github.com/Turfjs/turf/blob/master/LICENSE) | 7.4.0 | MIT | npm dependency, selected modules bundled |
| [Vite](https://github.com/vitejs/vite/blob/main/LICENSE) | 7.3.7 (DeepSeek/MiMo), 5.4.21 (GLM) | MIT, with included third-party notices | npm build tool |
| [Vitest](https://github.com/vitest-dev/vitest/blob/main/LICENSE) | 3.2.7 (DeepSeek/MiMo), 2.1.9 (GLM) | MIT | npm test tool |

Versions were read from installed legal/package metadata after lockfile installation, not inferred from package.json version ranges. Full collected installed package license texts are in `docs/third-party-licenses.txt`; the build regenerates the site's copy from the lockfile installation. This includes transitive package notices; platform-specific optional packages absent from the installation are not redistributed by this static site.

DeepSeek and GLM request raster tiles from `tile.openstreetmap.org`. Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), available under ODbL; the raster service has its own [tile usage policy](https://operations.osmfoundation.org/policies/tiles/). MiMo uses the [OpenFreeMap Liberty style](https://openfreemap.org/quick_start/), whose attribution identifies OpenFreeMap, © OpenMapTiles and data from OpenStreetMap. Retain the original attribution controls; their rendered visibility was not verified. External basemaps/styles/glyphs are fetched at runtime, not owned by this repository. Their availability and service policies apply independently.

The applications use system font stacks; no standalone third-party font, icon pack or tile dataset was found among the inventoried source files. Library styles/assets bundled by npm remain under their original licenses. Synthetic GeoJSON and expected-issue files are model-generated demonstration material, not official municipal cadastre, survey data or administrative boundaries.
