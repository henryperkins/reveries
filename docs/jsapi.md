# [[JavaScript API]]

Vite's JavaScript APIs are fully typed, and it's recommended to use TypeScript or enable JS type checking in VS Code to leverage the intellisense and validation.

## `createServer`

**Type Signature:**

```typescript
async function createServer(inlineConfig?: InlineConfig): Promise<ViteDevServer>
```

**Example Usage:**

```typescript
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

const server = await createServer({
  // any valid user config options, plus `mode` and `configFile`
  configFile: false,
  root: __dirname,
  server: {
    port: 1337,
  },
})
await server.listen()

server.printUrls()
server.bindCLIShortcuts({ print: true })
```

**Notes:**

- When using `createServer` and `build` in the same Node.js process, ensure `process.env.NODE_ENV` or the `mode` of both APIs is set to `development` to prevent conflicts. Alternatively, spawn a child process to run them separately.
- In [middleware mode](https://vite.dev/config/server-options#server-middlewaremode) with WebSocket proxy, provide the parent HTTP server in `middlewareMode` to bind the proxy correctly.

**Middleware Mode Example:**

```typescript
import http from 'http'
import { createServer } from 'vite'

const parentServer = http.createServer() // or express, koa, etc.

const vite = await createServer({
  server: {
    middlewareMode: {
      server: parentServer,
    },
    proxy: {
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
})

parentServer.use(vite.middlewares)
```

## `InlineConfig`

The `InlineConfig` interface extends `UserConfig` with additional properties:

- `configFile`: Specify the config file to use. If not set, Vite auto-resolves from the project root. Set to `false` to disable auto-resolution.

## `ResolvedConfig`

The `ResolvedConfig` interface extends `UserConfig` with resolved properties and utilities:

- `config.assetsInclude`: Function to check if an `id` is considered an asset.
- `config.logger`: Vite's internal logger object.

## `ViteDevServer`

```typescript
interface ViteDevServer {
  /** Resolved Vite config object. */
  config: ResolvedConfig
  /** Connect app instance for custom middlewares. */
  middlewares: Connect.Server
  /** Native Node HTTP server instance (null in middleware mode). */
  httpServer: http.Server | null
  /** Chokidar watcher instance. */
  watcher: FSWatcher
  /** WebSocket server with `send(payload)` method. */
  ws: WebSocketServer
  /** Rollup plugin container for running hooks. */
  pluginContainer: PluginContainer
  /** Module graph tracking import relationships and HMR state. */
  moduleGraph: ModuleGraph
  /** Resolved URLs printed on CLI (null in middleware mode or no port). */
  resolvedUrls: ResolvedServerUrls | null
  /** Transform a URL without HTTP request pipeline. */
  transformRequest(url: string, options?: TransformOptions): Promise<TransformResult | null>
  /** Apply HTML transforms. */
  transformIndexHtml(url: string, html: string, originalUrl?: string): Promise<string>
  /** Load a module for SSR. */
  ssrLoadModule(url: string, options?: { fixStacktrace?: boolean }): Promise<Record<string, any>>
  /** Fix SSR error stacktrace. */
  ssrFixStacktrace(e: Error): void
  /** Trigger HMR for a module. */
  reloadModule(module: ModuleNode): Promise<void>
  /** Start the server. */
  listen(port?: number, isRestart?: boolean): Promise<ViteDevServer>
  /** Restart the server. */
  restart(forceOptimize?: boolean): Promise<void>
  /** Stop the server. */
  close(): Promise<void>
  /** Bind CLI shortcuts. */
  bindCLIShortcuts(options?: BindCLIShortcutsOptions<ViteDevServer>): void
  /** Wait for static imports to be processed. */
  waitForRequestsIdle: (ignoredId?: string) => Promise<void>
}
```

**Info:**
`waitForRequestsIdle` is an escape hatch for tools like Tailwind to delay CSS generation until all static imports are processed, avoiding flashes of style changes.

## `build`

**Type Signature:**

```typescript
async function build(inlineConfig?: InlineConfig): Promise<RollupOutput | RollupOutput[]>
```

**Example Usage:**

```typescript
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

await build({
  root: path.resolve(__dirname, './project'),
  base: '/foo/',
  build: {
    rollupOptions: {
      // ...
    },
  },
})
```

## `preview`

**Type Signature:**

```typescript
async function preview(inlineConfig?: InlineConfig): Promise<PreviewServer>
```

**Example Usage:**

```typescript
import { preview } from 'vite'

const previewServer = await preview({
  preview: {
    port: 8080,
    open: true,
  },
})

previewServer.printUrls()
previewServer.bindCLIShortcuts({ print: true })
```

## `PreviewServer`

```typescript
interface PreviewServer {
  /** Resolved Vite config object. */
  config: ResolvedConfig
  /** Connect app instance for custom middlewares. */
  middlewares: Connect.Server
  /** Native Node HTTP server instance. */
  httpServer: http.Server
  /** Resolved URLs printed on CLI (null if no port). */
  resolvedUrls: ResolvedServerUrls | null
  /** Print server URLs. */
  printUrls(): void
  /** Bind CLI shortcuts. */
  bindCLIShortcuts(options?: BindCLIShortcutsOptions<PreviewServer>): void
}
```

## `resolveConfig`

**Type Signature:**

```typescript
async function resolveConfig(
  inlineConfig: InlineConfig,
  command: 'build' | 'serve',
  defaultMode = 'development',
  defaultNodeEnv = 'development',
  isPreview = false,
): Promise<ResolvedConfig>
```

- `command`: `'serve'` for dev/preview, `'build'` for production.

## `mergeConfig`

**Type Signature:**

```typescript
function mergeConfig(
  defaults: Record<string, any>,
  overrides: Record<string, any>,
  isRoot = true,
): Record<string, any>
```

Deeply merges two Vite configs. Set `isRoot` to `false` for merging nested options like `build`.

**Note:**
Accepts only object form. Use `defineConfig` to merge callback-based configs:

```typescript
export default defineConfig((configEnv) =>
  mergeConfig(configAsCallback(configEnv), configAsObject),
)
```

## `searchForWorkspaceRoot`

**Type Signature:**

```typescript
function searchForWorkspaceRoot(
  current: string,
  root = searchForPackageRoot(current),
): string
```

Searches for workspace root if it contains:
- `workspaces` in `package.json`
- `lerna.json` or `pnpm-workspace.yaml`

Fallback to `root` if conditions not met.

## `loadEnv`

**Type Signature:**

```typescript
function loadEnv(
  mode: string,
  envDir: string,
  prefixes: string | string[] = 'VITE_',
): Record<string, string>
```

Loads `.env` files from `envDir`. Only variables prefixed with `VITE_` (or custom `prefixes`) are loaded.

## `normalizePath`

**Type Signature:**

```typescript
function normalizePath(id: string): string
```

Normalizes paths for interoperability between Vite plugins.

## `transformWithEsbuild`

**Type Signature:**

```typescript
async function transformWithEsbuild(
  code: string,
  filename: string,
  options?: EsbuildTransformOptions,
  inMap?: object,
): Promise<ESBuildTransformResult>
```

Transforms JavaScript/TypeScript using esbuild, matching Vite's internal transform.

## `loadConfigFromFile`

**Type Signature:**

```typescript
async function loadConfigFromFile(
  configEnv: ConfigEnv,
  configFile?: string,
  configRoot: string = process.cwd(),
  logLevel?: LogLevel,
  customLogger?: Logger,
): Promise<{
  path: string
  config: UserConfig
  dependencies: string[]
} | null>
```

Loads a Vite config file manually with esbuild.

## `preprocessCSS`

**Experimental**
[Give Feedback](https://github.com/vitejs/vite/discussions/13815)

**Type Signature:**

```typescript
async function preprocessCSS(
  code: string,
  filename: string,
  config: ResolvedConfig,
): Promise<PreprocessCSSResult>

interface PreprocessCSSResult {
  code: string
  map?: SourceMapInput
  modules?: Record<string, string>
  deps?: Set<string>
}
```

Pre-processes CSS and pre-processors (Sass, Less, Stylus) to plain CSS. Infers CSS modules if `filename` ends with `.module.{ext}`.

**Note:** Does not resolve URLs in `url()` or `image-set()`.
