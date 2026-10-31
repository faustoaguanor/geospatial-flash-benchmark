# Contributing

Keep the benchmark reproducible and courteous. Discuss findings with a small input, expected behavior, observed behavior, environment and command output. Label source inference separately from executed verification.

`implementations/deepseek`, `implementations/glm` and `implementations/mimo` are frozen historical submissions. Do not repair, format, regenerate data in, or upgrade them. Proposed improvements belong in a separate experiment or fork with clear provenance. Never change expectations to hide failures.

Changes to the comparison site, documentation, external audit scripts and deployment workflow are welcome. Run `python3 scripts/verify-integrity.py` and `bash scripts/build-site.sh /tmp/benchmark-site-new` with Node 24 and Python 3. Build output must not exist beforehand. Review relative links and test the site with Chromium at 1440×1000 and 390×844 before making visual claims.

Do not submit real cadastral records, personal data, credentials or private evaluation fixtures. Disclose whether metrics are reported or independently observed. Preserve third-party notices. Contributions to repository-owned material use the MIT License.
