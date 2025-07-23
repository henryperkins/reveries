
Vite 7 Configuration: The Definitive Reference


Introduction: Architecting Modern Web Projects with Vite 7

Vite, the French word for "quick," has fundamentally reshaped the frontend development landscape since its inception.1 It operates on a core philosophy that prioritizes developer experience by providing a faster and leaner workflow for modern web projects.1 This is achieved through a dual-pronged approach: a development server that leverages native browser ES modules (ESM) for instantaneous server starts and incredibly fast Hot Module Replacement (HMR), and a production build command that uses the battle-tested bundler Rollup to generate highly optimized static assets.1
Vite is intentionally opinionated, shipping with sensible defaults that allow developers to be productive immediately.1 However, its true power lies in its extensibility. Through a comprehensive configuration file, a rich plugin API, and fully-typed JavaScript APIs, Vite can be precisely tailored to the needs of any project, from a simple static site to a complex, framework-driven application.1

The Evolution to Vite 7: Maturity, Modernization, and Performance

The release of Vite 7 marks a significant milestone in the project's lifecycle. While earlier versions focused on radical innovation, Vite 7 introduces changes that signal a strategic consolidation toward maturity, long-term stability, and a modernized core. This shift is not merely about adding new features but about refining the foundation upon which a vast ecosystem of frameworks and tools now depends.2
The key pillars of this evolution include:
Node.js and ESM Modernization: Vite 7 now requires Node.js version 20.19+ or 22.12+. This change was made to drop support for Node.js 18, which reached its end-of-life, and to leverage native Node.js support for require(esm). As a result, Vite 7 is distributed as an ESM-only package, a decisive move that sheds legacy constraints and aligns the tool with modern JavaScript standards.1 This transition reflects a broader trend in the ecosystem and allows for a cleaner, more future-proof codebase.
Predictable Browser Support: The default build target has been changed from the generic 'modules' to a new, more specific default: 'baseline-widely-available'.8 This keyword targets a set of browser versions that have been available for at least 30 months, providing developers with a stable and predictable compatibility baseline that will be updated with each major Vite release. This change moves away from ambiguity and toward a clear, dependable contract with developers regarding browser support.8
The Road to Rolldown: Vite 7 formally introduces the community to Rolldown, an experimental, high-performance bundler written in Rust.2 Positioned as the eventual successor to Rollup within Vite, Rolldown aims to dramatically improve build times, especially for large-scale projects. While still in development, developers can experiment with this future direction today by using the
rolldown-vite package as a drop-in replacement for the standard vite package.2
A Growing Ecosystem: The ecosystem surrounding Vite continues to flourish. A notable development is the creation of Vite DevTools, a project spearheaded by Anthony Fu in partnership between VoidZero and NuxtLabs. These tools promise to provide deeper debugging and analysis capabilities for all Vite-based projects, further enhancing the development experience.2
These changes underscore a deliberate strategy. By shedding legacy dependencies and standardizing its core contracts (like browser targets and module format), Vite is solidifying its position as a reliable "shared infrastructure".2 Major frameworks such as SvelteKit, Nuxt, and SolidStart can build upon this stable foundation, confident in its long-term predictability. This prioritization of ecosystem health, even at the cost of breaking changes for older environments, is a hallmark of a mature and market-leading project.

Navigating this Reference

This report is structured to serve as a definitive reference guide to every option available in the Vite 7 configuration file, vite.config.js. It mirrors the structure of the configuration object itself, with dedicated sections for shared options, server options, build options, and more. Each entry details the option's type, its default value, its purpose, and its relationship to other parts of the configuration, supplemented with code examples and contextual analysis. It is designed to be useful for both sequential learning and as a quick reference for specific tasks.

Critical Disambiguation: Vite the Build Tool vs. Vite the Blockchain

It is essential to establish a clear distinction at the outset. This document pertains exclusively to Vite (vite.dev), the next-generation frontend build tool created by Evan You and maintained by a global community.1
There is another, entirely unrelated project also named Vite (vite.org), which is a public blockchain platform featuring a Directed Acyclic Graph (DAG) ledger, smart contracts written in Solidity++, and its own cryptocurrency token.11 Information regarding snapshot chains, consensus algorithms, token models, or SDKs for Java and Javascript related to this blockchain 11 is
not relevant to the Vite frontend tool and will not be discussed further in this report. All configuration options and concepts detailed herein apply solely to the web development tool found at vite.dev.

Section 1: The vite.config.js File: Your Project's Command Center

The heart of a Vite project's customization lies in the vite.config.js file (or its TypeScript/MJS/CJS variants) located in the project root.13 This file is more than a static list of properties; it is a Node.js module that gives developers programmatic control over the entire build process.

The defineConfig Helper

To ensure a robust and maintainable configuration, it is highly recommended to wrap the configuration object in the defineConfig helper function, which is imported from vite.

JavaScript


// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  //... configuration options
})


While this function does not alter the configuration object itself, it provides two key benefits:
Type Safety: For projects using TypeScript or JavaScript with JSDoc, defineConfig provides full type definitions for the configuration object. This enables static analysis and prevents common typos or structural errors.
IntelliSense and Autocompletion: Modern IDEs leverage these type definitions to offer intelligent autocompletion for all available configuration options and their valid values, significantly improving the developer experience.13

Intelligent Configurations

The Vite configuration file's power stems from its dynamic nature. Instead of exporting a static object, it can export a function, allowing the configuration to adapt based on the context in which Vite is being run. This turns the config file from a simple data structure into a powerful programmatic API. This flexibility is a key reason why meta-frameworks can build on top of Vite, as they can programmatically inject their own logic and merge it with the user's configuration.

Mode-Based Logic

The exported function receives a context object containing the command ('serve' for the dev server or 'build' for production builds) and the mode (e.g., 'development' or 'production', which can be set via the --mode CLI flag). This allows for returning different configurations for different environments.13

JavaScript


// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig(({ command, mode }) => {
  if (command === 'serve') {
    return {
      // Dev-specific config
      server: {
        port: 3000
      }
    }
  } else {
    // Build-specific config
    return {
      build: {
        minify: 'terser'
      }
    }
  }
})



Conditional Logic

Because the config file is a standard JavaScript module, developers can use any Node.js logic to construct the configuration object. This is useful for conditionally enabling plugins or setting options based on environment variables.

JavaScript


// vite.config.js
import { defineConfig } from 'vite'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig(({ mode }) => {
  const plugins =
  if (process.env.ENABLE_LEGACY_SUPPORT === 'true') {
    plugins.push(legacy())
  }

  return {
    plugins: plugins
    //... other options
  }
})



Asynchronous Setups

Vite also supports exporting a Promise or an async function from the configuration file. This is a powerful feature that allows for asynchronous operations to be performed before the configuration is finalized. This could include fetching remote data, reading files from the disk, or interacting with a database to inform the build process.13

JavaScript


// vite.config.js
import { defineConfig } from 'vite'
import fs from 'node:fs/promises'

export default defineConfig(async ({ command, mode }) => {
  const version = await fs.readFile('./VERSION', 'utf-8');

  return {
    define: {
      __APP_VERSION__: JSON.stringify(version.trim())
    }
  }
})



Environment Variables

Vite has a built-in system for loading environment variables from .env files in the project root. It follows a specific loading priority:
.env.[mode].local
.env.[mode]
.env.local
.env
Variables loaded from files with higher priority will override those from files with lower priority. For security reasons, Vite implements a strict exposure model: only variables prefixed with the value of envPrefix (which defaults to VITE_) are exposed to the client-side source code via the import.meta.env object.13 This prevents accidental leakage of sensitive keys (like database credentials) to the browser. The directory from which these files are loaded can be customized with the
envDir option.13

Section 2: Shared Options: The Universal Configuration Layer

Shared options are the foundational settings in a Vite configuration. They apply universally across the development server, the production build, and the preview server, unless specifically overridden in a more specific configuration block.13

Core Project Setup

root
Type: string
Default: process.cwd()
This option defines the project's root directory. Vite uses this path as the base for resolving most other relative paths in the configuration. It is typically the directory containing the index.html file and the vite.config.js file. It can be an absolute path or a path relative to the current working directory.13
base
Type: string
Default: /
This defines the public base path from which assets will be served. It is a critical setting for projects that are not deployed to the root of a domain (e.g., https://example.com/my-app/). For such cases, base should be set to '/my-app/'. It can be an absolute path, a full URL, or an empty string ('') or './' for embedded deployments where paths need to be relative.13
publicDir
Type: string | false
Default: "public"
This specifies a directory for assets that should be served as-is during development and copied directly to the root of the output directory during the build, without any transformation. This is the correct place for files like robots.txt, favicon.ico, or other assets that must retain their exact name and content. Setting this to false disables the feature entirely.13
cacheDir
Type: string
Default: "node_modules/.vite"
This sets the directory where Vite stores cache files, most notably the pre-bundled dependencies generated by esbuild. Caching these dependencies significantly improves performance on subsequent server starts. The cache can be cleared by deleting this directory or by running Vite with the --force flag.13

Plugin Ecosystem

plugins
Type: (Plugin | Plugin | Promise<Plugin | Plugin>)
This is an array where all Vite plugins are registered. Vite's plugin system is a superset of Rollup's, adding Vite-specific hooks and properties. The array can contain plugin objects, arrays of plugins (which will be flattened), or even promises that resolve to a plugin. Falsy values in the array are ignored, allowing for conditional plugin registration.13

Global Variables

define
Type: Record<string, any>
This option allows for defining global constants that will be statically replaced in the source code during the build process. During development, they are exposed as global variables. The values must be strings containing a JSON-serializable value (e.g., a number, boolean, or a stringified object). For TypeScript users, it is essential to declare these global constants in a .d.ts file to get proper type checking and IntelliSense.13
Example:
JavaScript
// vite.config.js
define: {
  __API_URL__: JSON.stringify('https://api.example.com'),
  __IS_PROD__: 'process.env.NODE_ENV === "production"'
}

// vite-env.d.ts
declare const __API_URL__: string;
declare const __IS_PROD__: boolean;



Module Resolution (resolve)

alias
Type: Record<string, string> | Array<{ find: string | RegExp, replacement: string }>
This option configures import aliases, which are powerful for simplifying import paths in large projects (e.g., aliasing @ to the src directory). When aliasing to file system paths, it is crucial to use absolute paths to ensure they resolve correctly. This option is passed directly to @rollup/plugin-alias.13
dedupe
Type: string
A critical tool for projects within a monorepo or those using linked packages. If multiple versions of the same dependency exist in the dependency tree, it can lead to subtle bugs. This option forces Vite to always resolve the listed dependencies to the single copy located in the project's root node_modules directory, ensuring consistency.13
conditions
Type: string
Allows for specifying additional conditions to use when resolving a package's exports from the exports field in its package.json. This gives developers fine-grained control over which version of a module is imported (e.g., a 'browser' vs. 'node' version).13
extensions
Type: string
Default: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json']
This is a list of file extensions that Vite will attempt to resolve when an import statement omits the extension. It is generally not recommended to omit extensions for custom file types (like .vue or .svelte), as it can interfere with IDE and type-checking support.13

CSS Handling (css)

modules
Type: object
Configures the behavior of CSS Modules. Options passed here are forwarded to postcss-modules, allowing customization of scope generation, class name patterns (generateScopedName), and more. This has no effect if css.transformer is set to 'lightningcss'.13
postcss
Type: string | object
Allows for configuring PostCSS. This can be a path to a directory containing a PostCSS config file (e.g., postcss.config.js) or an inline configuration object. If an inline config is provided, Vite will not search for external config files.13
preprocessorOptions
Type: Record<string, object>
A nested object used to pass specific options to CSS pre-processors. The keys of the object are the pre-processor names (scss, less, styl), and the values are their respective options objects. A common use case is providing additionalData to inject global variables or mixins into every stylesheet.13
Example for Sass:
JavaScript
css: {
  preprocessorOptions: {
    scss: {
      additionalData: `@import "./src/styles/_variables.scss";`
    }
  }
}


devSourcemap
Type: boolean
Default: false
An experimental option to enable sourcemaps for CSS during development. This can make it significantly easier to trace styles back to their original source files (e.g., a specific .scss partial) in the browser's developer tools.13
The Future of CSS: Vite is experimenting with alternative, potentially faster CSS processing engines.
transformer: An experimental option to switch the CSS engine. The default is 'postcss', but it can be set to 'lightningcss' to use the Rust-based Lightning CSS library for processing.13
lightningcss: When transformer is set to 'lightningcss', this object is used to pass configuration options directly to Lightning CSS, such as targets for vendor prefixing or CSS Modules settings.13

Asset and Data Handling

json
Type: object
Provides options for handling .json file imports. namedExports allows for importing top-level properties from a JSON file as named exports. The stringify option, when true, transforms the JSON into JSON.parse("..."), which is significantly more performant for very large JSON files than generating a JavaScript object literal.13
assetsInclude
Type: string | RegExp | (string | RegExp)
Specifies additional file patterns (using picomatch) that should be treated as static assets. Files matching these patterns will be served directly and, when imported from JavaScript, will return their resolved URL string. This is useful for custom file types like 3D models (.gltf) or fonts (.woff2) that are not recognized by default.13

Controlling Console Output

logLevel
Type: 'info' | 'warn' | 'error' | 'silent'
Default: 'info'
Adjusts the verbosity of Vite's console output. 'silent' can be useful in CI/CD environments to reduce noise.13
customLogger
Type: Logger
Allows for providing a custom logger instance to intercept and handle Vite's log messages. This can be used to filter specific warnings, reformat messages, or pipe logs to an external monitoring service. Vite's createLogger API can be used to get the default logger and extend it.13
clearScreen
Type: boolean
Default: true
By default, Vite clears the terminal screen for certain messages (like when the server starts). Setting this to false prevents this behavior, which can be desirable when running Vite alongside other processes in the same terminal.13

Environment and Application Type

envDir
Type: string | false
Default: root
Specifies the directory from which to load .env files. Can be set to false to disable .env file loading entirely.13
envPrefix
Type: string | string
Default: VITE_
Defines the prefix that environment variables must have to be exposed to client-side code on import.meta.env. Setting this to '' is a security risk as it would expose all environment variables, and Vite will throw an error to prevent this.13
appType
Type: 'spa' | 'mpa' | 'custom'
Default: 'spa'
A high-level switch that configures Vite's server for different application architectures. This is a crucial setting that alters middleware behavior. 'spa' is for standard Single-Page Applications, 'mpa' is for Multi-Page Applications with multiple HTML entry points, and 'custom' is for advanced use cases like Server-Side Rendering (SSR) where the developer or a framework takes full control of the server and HTML rendering.13
The following table summarizes the behavior of the appType option.
appType Value
Description
Dev Server Middlewares
Preview Server Behavior
'spa' (Default)
For Single-Page Applications.
HTML middlewares are included to handle history fallback.
sirv is configured with single: true to serve index.html for any path not matching a file.
'mpa'
For Multi-Page Applications.
HTML middlewares are included, but without history fallback.
Serves files directly; a request to a non-existent path will result in a 404.
'custom'
For SSR or custom server integrations.
No HTML-serving middlewares are included.
The preview server is not applicable in the same way; control is handed to the custom server logic.


Opting into future Breaking Changes

future
Type: Record<string, 'warn' | undefined>
This object allows developers to opt into upcoming breaking changes on a feature-by-feature basis before a new major version of Vite is released. This provides a smoother migration path by allowing teams to adapt to changes incrementally.13

Section 3: Development Server Options (server)

These options are specific to the Vite development server, which is run with the vite or vite serve command. They control the server's network behavior, security, and developer experience features.13

Network Configuration

host, port, strictPort
These are standard options for network configuration. host specifies the IP address to listen on; setting it to '0.0.0.0' or true makes the server accessible on the local network. port sets the desired port, and strictPort: true will cause Vite to exit if that port is already in use, rather than trying the next available one.13
https
Type: boolean | https.ServerOptions
Enables TLS and HTTP/2 for the dev server. For basic local HTTPS, the @vitejs/plugin-basic-ssl plugin can automatically generate a self-signed certificate. For more advanced use cases, a custom certificate and key can be provided via the https.ServerOptions object.13
allowedHosts
Type: string | true
A critical security feature designed to prevent DNS rebinding attacks. It defines a whitelist of hostnames that the Vite dev server is allowed to respond to. Setting this to true disables the protection and is a significant security risk, as it could allow a malicious website to make requests to your dev server and access local files. It is strongly recommended to use an explicit list of allowed hosts.13 This focus on secure defaults, along with other features like
fs.strict, demonstrates a shift in Vite's evolution from just a "fast" tool to a "responsible" one, actively protecting developers from common security vulnerabilities.

Developer Experience

open
Type: boolean | string
When set to true, this option automatically opens the application in the default web browser when the server starts. If a string is provided, it is used as the URL pathname to open.13
cors
Type: boolean | CorsOptions
Configures Cross-Origin Resource Sharing for the dev server. The default setting is permissive for localhost access. Setting it to true allows requests from any origin, which, like allowedHosts: true, can be a security risk and should be used with caution.13
headers
Type: OutgoingHttpHeaders
Allows for specifying custom HTTP headers to be added to all responses from the dev server.13

The Proxy Powerhouse (proxy)

Type: Record<string, string | ProxyOptions>
One of the most powerful features of the dev server, the proxy option allows you to forward specific requests from the Vite server to another server, typically a backend API. This is the standard solution for avoiding CORS issues during development, as the browser sees all requests as same-origin. The configuration allows for path rewriting, changing the origin, and accessing the underlying http-proxy instance for advanced control.13
Example:
JavaScript
server: {
  proxy: {
    // Proxy requests from /api to http://localhost:8080/api
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true, // Needed for virtual hosted sites
      rewrite: (path) => path.replace(/^\/api/, '') // Optional: remove /api prefix
    }
  }
}



Hot Module Replacement (hmr)

Type: boolean | object
This option provides fine-grained control over the HMR connection. This can be necessary in complex network environments, such as when running Vite inside a Docker container or behind a reverse proxy, where the WebSocket connection for HMR may need to use a different port or protocol than the main HTTP server. Setting overlay: false can also be used to disable the error overlay that appears in the browser.13

File System Watching (watch)

Type: object | null
This option allows for passing custom options to chokidar, the underlying file system watcher library used by Vite. A common use case is to adjust polling settings. When running Vite on Windows Subsystem for Linux (WSL) 2, file changes made from Windows applications may not be detected. The recommended workaround is to edit files from within the WSL environment, but if that is not possible, setting watch: { usePolling: true } can resolve the issue, though it may lead to higher CPU usage.13

Security and File Access (fs)

strict
Type: boolean
Default: true
A key security feature that restricts file serving to only files within the defined workspace root. This prevents path traversal vulnerabilities where a malicious request could access sensitive files outside the project directory. It is enabled by default as part of Vite's "security by default" philosophy.13
allow
Type: string
When fs.strict is enabled, this option provides an explicit list of directories outside the workspace root that are safe to be served. This is necessary in monorepo setups where source files may be located in a shared package outside the current project's root.13
deny
Type: string
Default: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**']
Provides a blocklist of file patterns that should never be served by the dev server, even if they are within an allowed directory. This has higher priority than fs.allow and serves as an additional layer of protection for sensitive files.13

Advanced Integration

middlewareMode
Type: boolean
Default: false
When set to true, Vite runs in "middleware mode." In this mode, it does not create its own HTTP server or handle HTML serving. Instead, it provides a handler that can be integrated into a larger Node.js server framework like Express or Koa. This is the primary mechanism for integrating Vite's development capabilities into an existing server-side application.13

Section 4: Production Build Options (build)

These options configure the production build process, which is initiated with the vite build command. They control transpilation, bundling, optimization, and the format of the final output files.13

Transpilation and Compatibility

target
Type: string | string
Default: 'baseline-widely-available'
This option specifies the browser compatibility target for the final bundle. In Vite 7, the default was changed to 'baseline-widely-available', which corresponds to a specific set of browser versions (['chrome107', 'edge107', 'firefox104', 'safari16']) that have been widely available for at least 30 months.8 This provides a stable and predictable target. Another special value is
'esnext', which performs minimal transpilation and assumes a modern browser with full native ESM support. Developers can also provide an array of specific browser versions for fine-grained control.13
The following table compares the most common build.target values.
Keyword
Description
Transpilation Level
Example Use Case
'baseline-widely-available' (Vite 7 Default)
Targets browsers with ~30 months of support. Predictable and stable.
Modern but safe.
The recommended default for most web applications targeting the general public.
'esnext'
Minimal transpilation, assumes full modern JS and ESM support.
Very low.
Targeting Electron apps or other controlled environments with a known modern browser engine.
'es2022'
Transpiles language features down to the ES2022 standard.
Low.
When needing to support slightly older browsers that are not yet fully compliant with the latest ECMAScript standard.
['chrome107', 'safari16']
An array of specific browser versions.
Custom.
For projects that have precise browser support requirements, such as internal enterprise applications.


Output Management

outDir, assetsDir
outDir (default: 'dist') specifies the output directory for the build. assetsDir (default: 'assets') defines a subdirectory within outDir where generated assets like JavaScript, CSS, and images will be placed.13
emptyOutDir
Type: boolean
Default: true (if outDir is inside root)
By default, Vite clears the output directory before starting a new build to prevent leftover artifacts from previous builds. This behavior can be disabled by setting the option to false.13

Asset Optimization

assetsInlineLimit
Type: number
Default: 4096 (4 KiB)
Assets smaller than this threshold (in bytes) will be inlined into the JavaScript or CSS bundles as base64 data URLs. This can improve performance by reducing the number of HTTP requests, but it increases the size of the initial bundle. Setting this to 0 disables all inlining.13

CSS Bundling Strategy

cssCodeSplit
Type: boolean
Default: true
When enabled, CSS imported by asynchronously loaded JavaScript chunks will also be split into separate files and loaded on demand alongside the JavaScript. If disabled, all CSS from the entire project is extracted into a single CSS file.13
cssTarget
Type: string | string
Default: Same as build.target
Allows setting a different browser target for CSS minification and transformation than the one used for JavaScript. This is useful for edge cases where a browser might support modern JavaScript but have quirks with modern CSS syntax (e.g., older WebViews not supporting #RGBA color notation).13
cssMinify
Type: boolean | 'esbuild' | 'lightningcss'
Default: 'esbuild'
Specifies the minifier to use for CSS. The default, 'esbuild', is very fast. Alternatively, 'lightningcss' can be used for potentially better compression and more advanced CSS transformations, configured via the css.lightningcss option.13

Debugging in Production

sourcemap
Type: boolean | 'inline' | 'hidden'
Default: false
Controls the generation of source maps for the production build. true creates separate .map files, 'inline' appends the source map as a data URI to the end of the output files, and 'hidden' creates the map files but does not link to them in the source files, which is useful for error reporting services.13

Extending the Bundler

rollupOptions
Type: RollupOptions
This is the primary "escape hatch" for advanced customization. It allows you to pass any valid Rollup configuration options directly to the underlying bundler. This can be used to configure complex output formats, multiple entry points, or use Rollup-specific plugins that are not directly exposed by Vite.13

Library Mode (lib)

Type: object
This option configures Vite to build a library instead of an application. It requires an entry file (as HTML entries are not used for libraries) and allows specifying the library name (for UMD/IIFE formats), the output formats ('es', 'cjs', 'umd', 'iife'), and a fileName pattern for the output files. This is the standard way to use Vite for authoring and publishing packages to npm.13
Example for a library:
JavaScript
build: {
  lib: {
    entry: 'src/index.js',
    name: 'MyAwesomeLibrary',
    formats: ['es', 'umd'],
    fileName: (format) => `my-awesome-library.${format}.js`
  },
  rollupOptions: {
    // Externalize dependencies that shouldn't be bundled
    external: ['vue'],
    output: {
      globals: {
        vue: 'Vue'
      }
    }
  }
}



Backend Integration

manifest
Type: boolean | string
Default: false
When set to true, Vite generates a manifest.json file during the build. This file contains a mapping from non-hashed asset filenames to their final, hashed versions. This is essential for integrating Vite with backend frameworks (like Ruby on Rails, Laravel, or Django), as it allows the server-side templates to render the correct <script> and <link> tags with hashed URLs for proper caching.13
ssrManifest
Type: boolean | string
Default: false
When building for Server-Side Rendering (SSR), setting this to true generates an SSR manifest. This manifest is used on the server to determine the correct asset links (including preloads) that need to be injected into the server-rendered HTML, enabling efficient client-side hydration.13

Minification (minify)

Type: boolean | 'terser' | 'esbuild'
Default: 'esbuild'
This option controls JavaScript minification. Vite's default is 'esbuild' because it is extremely fast (20-40x faster than Terser) while providing good compression. For projects where the smallest possible bundle size is the absolute priority and build time is less of a concern, it can be set to 'terser', which requires terser to be installed as a dev dependency.13
The following table compares the build.minify options.
Option
Minifier Used
Relative Speed
Compression Quality
Notes
'esbuild' (Default)
esbuild
Very Fast
Good
The default choice, balancing excellent build speed with strong compression.
'terser'
Terser
Slow
Best
Use when every kilobyte of the final bundle matters. Requires npm add -D terser.
false
None
Instant
None
Disables minification completely, useful for debugging production builds.


Advanced Build Workflows

write
Type: boolean
Default: true
When set to false, Vite will run the entire build process but will not write the output files to disk. This is useful for programmatic builds where the resulting bundle needs to be further processed in memory before being written.13
watch
Type: WatcherOptions | null
Default: null
Setting this to an empty object ({}) enables Rollup's watch mode. Instead of running a single build and exiting, Vite will watch the source files for changes and trigger a rebuild automatically. This is useful for integration with other build processes or during library development.13

Section 5: Preview Server Options (preview)

The vite preview command starts a simple static web server to serve the files from your production build directory (dist by default). This is not a development server; it is a tool for locally previewing the final build output before deploying it. The options under the preview key in the config file allow for customizing this server.13
Most options, such as host, port, strictPort, https, open, proxy, and cors, mirror their counterparts in the server configuration. They default to the values set in the server block but can be overridden specifically for the preview environment.13
For example, you might run the dev server on port 5173 but want to preview the build on port 4173:

JavaScript


// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173
  },
  preview: {
    port: 4173
  }
})



Section 6: Dependency Pre-Bundling Options (optimizeDeps)

One of Vite's key performance features during development is its dependency pre-bundling step. Before starting the dev server, Vite scans the project for bare module imports (e.g., import React from 'react') and uses esbuild to process them. This serves two primary purposes:
CommonJS/UMD to ESM Conversion: Many older packages are published in CommonJS or UMD format, which cannot be natively imported by the browser. Vite converts these into standard ESM so the browser can handle them.14
Performance: Some packages consist of many small internal modules. A single import could trigger dozens or even hundreds of HTTP requests in the browser. Vite bundles these into a single or a few modules, drastically reducing the number of requests and improving page load performance during development.14
The optimizeDeps options provide control over this process.13

Controlling the Scanner

entries
Type: string | string
By default, Vite finds dependencies by crawling all .html files in the project root. This option allows you to specify custom entry points for the dependency scanner, which can be useful in projects with non-standard structures or non-HTML entries.13
include
Type: string
This option forces Vite to pre-bundle the listed dependencies. This is often necessary for linked packages in a monorepo (which are not in node_modules and thus not pre-bundled by default) or to manually resolve "new dependency found" full-page reloads that can occur if a dependency is discovered after the initial scan.13
exclude
Type: string
Prevents the listed dependencies from being pre-bundled. This should be used with caution, as excluding a CommonJS dependency will likely break the application.13

Advanced Tuning

esbuildOptions
Type: object
Allows passing custom options directly to the esbuild instance that performs the pre-bundling. This can be used to add esbuild plugins or configure loaders for specific file types within dependencies.13
force
Type: boolean
Setting this to true forces Vite to re-run the dependency pre-bundling, ignoring any cached results. This is equivalent to running vite --force from the command line and is useful when debugging caching issues or after making changes to a linked dependency.13

Section 7: Server-Side Rendering Options (ssr)

When building an application for Server-Side Rendering (SSR), the configuration needs to distinguish between dependencies that should be part of the server bundle and those that should be loaded from node_modules at runtime. The ssr options provide this control.13

The Core Concept: Managing Externalized Dependencies

By default, Vite externalizes all dependencies found in node_modules for the SSR build. This means the server bundle will contain require('some-package') statements, and it is the responsibility of the Node.js runtime to resolve these from node_modules. This is generally desirable as it keeps the server bundle small and leverages standard Node module resolution.
external
Type: string | true
This option allows you to explicitly add dependencies to the externalized list. This is most commonly used to externalize a linked package from a monorepo that would otherwise be bundled by default.13
noExternal
Type: string | RegExp | (string | RegExp) | true
This is the inverse of external. It forces the listed dependencies to be processed by Vite and included in the final server bundle. This is often necessary for packages that are written in ESM but need transpilation, use CSS or other assets that need to be handled by Vite plugins, or are not compatible with Node.js's native module resolution.13
The interaction between these two options can be complex. The following table provides a quick reference for common scenarios.
Goal
ssr.external Setting
ssr.noExternal Setting
Resulting Behavior
Default Behavior
undefined
undefined
All packages in node_modules are externalized; linked packages are bundled.
Bundle a specific CJS/ESM package
undefined
['my-dep']
The specified package is processed by Vite and included in the server bundle. Useful for component libraries with CSS.
Externalize a linked monorepo package
['@my-org/utils']
undefined
The linked package is treated like a normal node_modules dependency and externalized.
Bundle everything (except Node built-ins)
undefined
true
The entire application and its dependencies are bundled into a single file.


SSR Build Target and Resolution

target
Type: 'node' | 'webworker'
Default: 'node'
Specifies the environment target for the SSR build. 'node' is for standard Node.js environments, while 'webworker' is for modern edge computing runtimes like Cloudflare Workers.13
resolve
This object contains options like conditions that allow for customizing how module resolution is performed specifically for non-externalized dependencies within the SSR build pipeline.13

Section 8: Web Worker Options (worker)

Vite has first-class support for Web Workers. The worker options in the configuration file allow for customizing how worker scripts are bundled.13

Configuring Worker Bundles

format
Type: 'es' | 'iife'
Default: 'iife'
Determines the output format for the worker bundle. 'iife' (Immediately Invoked Function Expression) is the default for maximum compatibility, while 'es' produces a modern ES module, which can be used in environments that support module workers.13
plugins
Type: () => (Plugin | Plugin)
Specifies an array of Vite plugins to apply only to the worker bundle. This is crucial because the main config.plugins array is not applied to the worker build. The option must be a function that returns new plugin instances because worker builds may run in parallel.13
rollupOptions
Type: RollupOptions
Allows for passing custom Rollup options specifically for the worker build, providing the same level of deep customization available for the main build.13

Conclusion: Best Practices and Future Outlook

Mastering Vite's configuration is key to unlocking its full potential. While its defaults are excellent for getting started, real-world applications often require nuanced setups. For a standard SPA, the default configuration is often sufficient. For a multi-page marketing site, setting appType: 'mpa' and defining multiple entry points in build.rollupOptions.input is the correct approach. For authors publishing component libraries, build.lib is the designated tool. And for developers integrating with backend frameworks, build.manifest is the essential bridge.

The Future is Rust

Vite's initial architecture created a performance dichotomy: an extremely fast development experience powered by esbuild (written in Go), and a production build process constrained by the speed of Rollup (written in JavaScript).4 This was a pragmatic choice, leveraging
esbuild for raw speed where it excelled and Rollup for its mature plugin ecosystem and correctness where it was needed most.
The introduction of Rolldown, a new bundler written in Rust, represents the project's strategy to resolve this dichotomy.10 The goal of Rolldown is to create a single tool that is both exceptionally fast and API-compatible with Rollup. This would unify the dev and build pipelines on a high-performance, Rust-based foundation, potentially simplifying configuration by reducing the behavioral differences between the two environments. The transition to Rolldown is the project's long-term play for ultimate performance, aiming to make Vite's build process as revolutionary as its dev server was at its inception. The experimental
rolldown-vite package is the first step in this ambitious migration for the entire Vite ecosystem.8

A Richer Ecosystem

Vite 7 is not just a technical update; it is a testament to the health and momentum of its community. The announcement of the first in-person ViteConf and the development of official Vite DevTools are clear indicators of a project that has transcended being just a tool to become a collaborative platform.2 As Vite continues to mature, its focus on stability, security, and performance solidifies its role as the foundational layer for the next generation of web development.
Works cited
Getting Started - Vite, accessed July 23, 2025, https://vite.dev/guide/
Vite 7.0 Released - by Onix React - Medium, accessed July 23, 2025, https://medium.com/@onix_react/vite-7-0-released-00b6ecaf914c
Getting Started - Vite, accessed July 23, 2025, https://v2.vitejs.dev/guide/
vite - npm, accessed July 23, 2025, https://www.npmjs.com/package/vite
vitejs/vite: Next generation frontend tooling. It's fast! - GitHub, accessed July 23, 2025, https://github.com/vitejs/vite
Vite | Next Generation Frontend Tooling, accessed July 23, 2025, https://vite.dev/
Vite: Home, accessed July 23, 2025, https://v2.vitejs.dev/
Vite 7.0 is out!, accessed July 23, 2025, https://vite.dev/blog/announcing-vite7
Vite: " vite@7.0.0-beta.0 is out! - Browser Target Changed to Baseline Widely Available - Node 18 support dropped. Vite is now distributed as ESM only Plus fixes and deprecated feats removals, preparing for rolldown. Help us test the beta and report back github.com/vitejs/, accessed July 23, 2025, https://bsky.app/profile/vite.dev/post/3lqmibutpdc2w
Vite 7.0 Is Here: Rust-Powered Speed, Smarter Tooling & a Cleaner Build Experience, accessed July 23, 2025, https://dev.to/aggarwal_gaurav_1012/vite-70-is-here-rust-powered-speed-smarter-tooling-a-cleaner-build-experience-1k9j
Vite Documentation - Vite Documentation, accessed July 23, 2025, https://docs.vite.org/
Overview - Vite Documentation, accessed July 23, 2025, https://docs.vite.org/vite-basics/network/introduction/
Configuring Vite | Vite, accessed July 23, 2025, https://vite.dev/config/
Features | Vite, accessed July 23, 2025, https://v3.vitejs.dev/guide/features
