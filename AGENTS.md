# Repository workflow

- This is a PI-Desktop plugin monorepo, not a plugin at its root.
- Existing theme source: `plugins/sax-design-theme/`; shared development utilities: `packages/`.
- The theme's display name is `sax-design-theme`. Keep its legacy manifest ID and command/theme IDs unless an explicit breaking migration is requested.
- Use PluginScaffold for a new plugin directory, then add workspace package.json and plugin.project.json. Do not fabricate a separate installer/package format.
- Run `pnpm build [plugin]`, `pnpm test [plugin]`, `pnpm test:browser [plugin]` as relevant. Use `PI_TEST_BROWSER` for a local Chrome/Edge executable; no external project node_modules are required.
- Use `pnpm run stage [plugin]` (explicit run: pnpm 12 has its own stage command). Run `pnpm test:workspace` after staging.
- Run PluginCheck and PluginPack on `.artifacts/plugins/<plugin>/`, never on the monorepo root. Collect with `pnpm release:collect <plugin>`.
- Publishing is manual submission of the resulting .piplug to the user's publishing website, not a PR to the official plugins repository. Do not auto-publish or invent credentials.
- Shared runtime dependencies must be bundled/copied into each plugin's runtime files before staging. Workspace links are development-only.
- Build outputs in themes and dissolve preview scripts are generated; edit sources and rebuild. Do not commit node_modules, .artifacts, dist or credentials.
- Versions are independent per plugin; keep each plugin's package.json and manifest.json versions equal.
