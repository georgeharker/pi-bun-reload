import { expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { extensionRoots, flushModules } from "./flush.js"

test("roots cover pi's package dirs and local-path packages", () => {
  const home = realpathSync(mkdtempSync(join(tmpdir(), "bunflush-")))
  const agent = join(home, "agent")
  const project = join(home, "proj")
  const local = join(home, "my-ext")
  for (const d of [join(agent, "npm"), join(agent, "git"), join(project, ".pi", "extensions"), local]) {
    mkdirSync(d, { recursive: true })
  }
  writeFileSync(join(agent, "settings.json"), JSON.stringify({ packages: ["npm:x", { source: "../my-ext" }] }))
  expect(extensionRoots(agent, project).sort()).toEqual(
    [join(agent, "npm"), join(agent, "git"), join(project, ".pi", "extensions"), local].sort(),
  )
})

test("flushes only entries under a root, never pi's own packages", () => {
  const cache: Record<string, unknown> = {
    "/a/npm/node_modules/ext/index.js": 1,
    "/a/npm/node_modules/@earendil-works/pi-tui/dist/index.js": 1,
    "/a/npm-other/x.js": 1,
    "/pi/dist/core/loader.js": 1,
  }
  expect(flushModules(cache, ["/a/npm"])).toBe(1)
  expect(Object.keys(cache)).not.toContain("/a/npm/node_modules/ext/index.js")
  expect(Object.keys(cache)).toHaveLength(3)
})
