// Under bun, pi's /reload re-runs extensions without re-reading their code.
// pi loads extensions through jiti, and jiti's tryNative defaults to on under
// bun, so the imports go to bun's native ESM loader, which caches each module
// by path for the life of the process; pi's own cache clearing doesn't reach
// it. Deleting a module's require.cache entry does: bun re-reads it, and all
// it imports, on the next import(). So at every shutdown that pi follows with
// a fresh load (anything but quit), this drops the cached modules of every
// extension directory, and the reload gets the code on disk, as under node.

import { createRequire } from "node:module"
import { getAgentDir, type ExtensionAPI } from "@earendil-works/pi-coding-agent"
import { extensionRoots, flushModules } from "./flush.js"

export default function bunFlush(pi: ExtensionAPI): void {
  // Under node, jiti compiles extensions itself and pi's reload already works.
  if (!("Bun" in globalThis)) return
  pi.on("session_shutdown", (event, ctx) => {
    if (event.reason === "quit") return
    const cache = createRequire(import.meta.url).cache as Record<string, unknown>
    flushModules(cache, extensionRoots(getAgentDir(), ctx.cwd))
  })
}
