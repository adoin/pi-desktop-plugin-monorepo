# Repository workflow

- This is a PI-Desktop plugin monorepo, not a plugin at its root.
- Existing theme source: `plugins/sax-design-theme/`; shared development utilities: `packages/`.
- The theme's display name is `sax-design-theme`. All manifest IDs use `${PLUGIN_NAMESPACE}.<plugin-folder>` templates, resolved at build time from root `.env` (`PLUGIN_NAMESPACE=adoin`; environment override allowed). Never hardcode a local.* ID. The theme migrates to `adoin.sax-design-theme`; this is a new installation identity. Keep command/theme IDs unless explicitly requested.
- Provide `.env.example`, never commit or package `.env`. Runtime self-ID references must use the resolved manifest identity injected at build time. Missing/invalid namespace must fail clearly.
- Release collection produces only `.piplug` files, no JSON metadata sidecars; preserve byte verification and same-version conflict protection.
- Use PluginScaffold for a new plugin directory, then add workspace package.json and plugin.project.json and migrate executable code to TypeScript. Do not fabricate a separate installer/package format.
- Run `pnpm typecheck`, `pnpm build [plugin]`, `pnpm test [plugin]`, `pnpm test:browser [plugin]` as relevant. Use `PI_TEST_BROWSER` for a local Chrome/Edge executable; no external project node_modules are required.
- `pnpm run stage [plugin]` is a compatibility alias for build + test, not a separate copy. Run `pnpm test:workspace` after building.
- Run PluginCheck and PluginPack on `.artifacts/plugins/<plugin>/`, never on the monorepo root. Collect with `pnpm release:collect <plugin>`.
- Publishing is manual submission of the resulting .piplug to the user's publishing website, not a PR to the official plugins repository. Do not auto-publish or invent credentials.
- Shared runtime dependencies must be bundled/copied into each plugin's runtime files before staging. Workspace links are development-only.
- All plugins emit artifacts under root `.artifacts/`: `plugins/<plugin>/` is the ONLY runtime directory for development, preview and packaging; `releases/` holds collected packages. Do not create a duplicate build/stage tree or plugin-local dist. PluginPack's temporary dist package is removed after verified collect.
- Build tasks receive `PI_PLUGIN_OUTPUT_DIR`; declare static `assets`, output-only `generated`, and complete `runtime` allowlists in plugin.project.json. Never copy TypeScript sources or development dependencies into output. Forward subproject scripts to `tsx ../../scripts/workspace.ts`.
- Use strict TypeScript for runtime, build and tests. Shared plugin API and project interfaces belong in `packages/plugin-types/src/`; import API types via `@pi-plugins/plugin-types` with `import type`. Do not use ts-nocheck or blanket any. Theme-private types stay in the theme.
- Generated themes and JavaScript exist only in `.artifacts/plugins/<plugin>/`; edit TS/CSS sources and rebuild. Do not commit node_modules, .artifacts, dist or credentials.
- Versions are independent per plugin; keep each plugin's package.json and manifest.json versions equal.
