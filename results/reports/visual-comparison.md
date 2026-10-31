# Visual comparison — unverified

No genuine browser screenshots were captured. Chromium/Chrome and browser automation tools were unavailable; attempted Vite previews were also blocked by `listen EPERM`. Firefox's presence did not provide a usable browser rendering session. The comparison website therefore does not include fabricated application images or assign visual/UX scores.

Source-only observations: DeepSeek provides a dense dashboard and several map controls; GLM uses a compact light dashboard; MiMo separates map loading and presents a simpler control/table structure. These describe selected HTML/CSS/module organization, **not verified visual quality**, responsive usability, accessible contrast or functional performance. No visual or UX winner is justified.

To complete evaluation on an unrestricted machine:

1. Build isolated copies; serve the assembled output at `/geospatial-flash-benchmark/`.
2. Open all three in Chromium with the same desktop viewport (1440×1000) and mobile viewport (390×844), device scale 1.
3. Confirm WebGL initialization, basemap and parcel loading; inspect network and console errors separately from external tile failures.
4. Execute evaluation, search, severity/rule/sector filters, parcel navigation, popup interaction, invalid-file feedback, rule/tolerance changes and all three exports.
5. Check keyboard operation, labels, focus, spacing, hierarchy, type size, contrast, map/table readability and horizontal overflow. Confirm attribution is visible.
6. Save genuine desktop/mobile screenshots to `results/screenshots/{model}-{viewport}.png`, record browser/environment details and update the 20-point visual/UX criterion with specific evidence.

No screenshot files are provided for this session. The landing page itself also requires rendered desktop/mobile QA before any claim of visual verification.
