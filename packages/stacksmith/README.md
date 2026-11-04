# stacksmith

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

To type check:

```bash
bun check
```

To generate Dockerfiles from the host repository's `packages/**/service.yaml` files:

```bash
ss dockerfile
ss dockerfile --apps bakery-nuxt
ss dockerfile --apps bakery-ejs
```

The command uses the same Dockerfile template for every service: Bun `1.4.3-slim`, `bun ci` with a required `GH_TOKEN` BuildKit secret, `bun run build`, and copies the service's `.output` and `package.json` into the production runtime image. A service's `paths` list supplies additional workspace package directories to copy before the build. Run it from the host repository root.

This project was created using `bun init` in bun v1.4.3. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
