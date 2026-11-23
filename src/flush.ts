import { existsSync, readFileSync, realpathSync } from "node:fs"
import { homedir } from "node:os"
import { isAbsolute, join, resolve, sep } from "node:path"

/** The directories pi loads extension code from: its npm and git package
 *  installs and extensions dirs, globally (`agentDir`) and for the project
 *  (`<cwd>/.pi`), plus every local-path entry in either settings file's
 *  `packages` list. Paths are resolved through symlinks, as bun's
 *  require.cache keys are; ones that don't exist are left out. */
export function extensionRoots(agentDir: string, cwd: string): string[] {
  const projectDir = join(cwd, ".pi")
  const candidates = [
    ...["npm", "git", "extensions", join("tmp", "extensions")].map((d) => join(agentDir, d)),
    ...["npm", "git", "extensions"].map((d) => join(projectDir, d)),
    ...localPackages(join(agentDir, "settings.json"), agentDir),
    ...localPackages(join(projectDir, "settings.json"), projectDir),
  ]
  const roots = new Set<string>()
  for (const dir of candidates) {
    if (!existsSync(dir)) continue
    try {
      roots.add(realpathSync(dir))
    } catch {
      /* unreadable: nothing of ours can be cached under it */
    }
  }
  return [...roots]
}

/** Local-path `packages` entries (not npm:, git: or a URL), resolved against
 *  the settings file's own directory. An entry is a string or `{ source }`. */
function localPackages(settingsPath: string, baseDir: string): string[] {
  let packages: unknown
  try {
    packages = (JSON.parse(readFileSync(settingsPath, "utf8")) as { packages?: unknown }).packages
  } catch {
    return []
  }
  if (!Array.isArray(packages)) return []
  const out: string[] = []
  for (const entry of packages) {
    const source = typeof entry === "string" ? entry : (entry as { source?: unknown })?.source
    if (typeof source !== "string" || /^(npm|git|https?|ssh):/.test(source)) continue
    const expanded = source.startsWith("~/") ? join(homedir(), source.slice(2)) : source
    out.push(isAbsolute(expanded) ? expanded : resolve(baseDir, expanded))
  }
  return out
}

/** pi's own packages, wherever an extension pulled in a copy: never flushed,
 *  so a reload can't re-instantiate them. */
const KEEP = `${sep}node_modules${sep}@earendil-works${sep}`

/** Delete every `cache` entry under one of `roots`. Returns how many went. */
export function flushModules(cache: Record<string, unknown>, roots: readonly string[]): number {
  const prefixes = roots.map((r) => (r.endsWith(sep) ? r : r + sep))
  let removed = 0
  for (const key of Object.keys(cache)) {
    if (key.includes(KEEP) || !prefixes.some((p) => key.startsWith(p))) continue
    delete cache[key]
    removed++
  }
  return removed
}
