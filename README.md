# pi-bun-reload

Makes pi's `/reload` load extension code fresh from disk when pi runs under
[bun](https://bun.sh).

## The problem

pi loads extensions through jiti. Under bun, jiti hands each import to bun's
native ESM loader (its `tryNative` option defaults to on there), and bun caches
every module by path for the life of the process. pi's own cache clearing
doesn't reach that cache, so after you update an extension, `/reload` re-runs
it with the code it first loaded. The extension starts up as normal, so nothing
looks wrong, but it's the old version until pi restarts. Under node, `/reload`
already loads the new code.

## What it does

At every `session_shutdown` that pi follows with a fresh load (any reason but
`quit`), it deletes bun's `require.cache` entries for every directory pi loads
extensions from, which also evicts them from bun's ESM cache. pi's next import
then reads them from disk. jiti and bun's native imports stay as they are.

The directories are:

- `npm/`, `git/`, `extensions/` and `tmp/extensions/` in pi's agent directory;
- `npm/`, `git/` and `extensions/` in the project's `.pi/`;
- every local-path entry in the global or project settings' `packages`.

pi's own packages (`@earendil-works/*`) are never flushed, even where an
extension installed its own copy. Under node the extension does nothing.

## Install

```sh
pi install npm:@geohar/pi-bun-reload
```

Restart pi once after installing: until it's loaded, `/reload` can't load it.

## Development

```sh
bun install
bun run check
bun test
bun run release:patch   # or release:minor / release:major
```

## License

MIT
