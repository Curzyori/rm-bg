# Sample Asset Notes

- This directory stores primary regression sample inputs used by local benchmarks and removal tests.
- Files here should be source-like fixtures, not derived output snapshots.
- Do not commit `*-after.*` files here. Derived outputs should live in a separate archive location or under non-tracked local output directories.
- Local processed snapshots under `fix/` are optional manual regression artifacts and are intentionally not tracked by git.
- Extreme aspect-ratio samples are kept on purpose because the selector and preview-anchor logic must handle them, not just common photo sizes.
- `gold-manifest.json` stores human-maintained fixed-core expectations for benchmark samples. Add or update the manifest entry before changing catalog or scoring for a new sample.
- Use `shouldProcess: false` only for samples that are intentionally unsupported by the current fixed-core pipeline, not for temporary algorithm failures.
