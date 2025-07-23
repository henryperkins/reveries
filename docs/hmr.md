# [[HMR API]]

This note covers the **client-side HMR (Hot Module Replacement) API** in Vite. For handling HMR updates in plugins, refer to [`handleHotUpdate`](https://vite.dev/guide/api-plugin#handlehotupdate).

---

## **Overview**
The manual HMR API is primarily intended for **framework and tooling authors**. As an end user, HMR is likely already handled for you in framework-specific starter templates.

Vite exposes the HMR API via the special `import.meta.hot` object:

```typescript
interface ImportMeta {
  readonly hot?: ViteHotContext
}

interface ViteHotContext {
  readonly data: any

  accept(): void
  accept(cb: (mod: ModuleNamespace | undefined) => void): void
  accept(dep: string, cb: (mod: ModuleNamespace | undefined) => void): void
  accept(
    deps: readonly string[],
    cb: (mods: Array<ModuleNamespace | undefined>) => void,
  ): void

  dispose(cb: (data: any) => void): void
  prune(cb: (data: any) => void): void
  invalidate(message?: string): void

  on<T extends CustomEventName>(
    event: T,
    cb: (payload: InferCustomEventPayload<T>) => void,
  ): void
  off<T extends CustomEventName>(
    event: T,
    cb: (payload: InferCustomEventPayload<T>) => void,
  ): void
  send<T extends CustomEventName>(
    event: T,
    data?: InferCustomEventPayload<T>,
  ): void
}
```

---

## **Required Conditional Guard**
Always guard HMR API usage with a conditional block to ensure the code is tree-shaken in production:

```javascript
if (import.meta.hot) {
  // HMR code
}
```

---

## **IntelliSense for TypeScript**
Vite provides type definitions for `import.meta.hot` in [`vite/client.d.ts`](https://github.com/vitejs/vite/blob/main/packages/vite/client.d.ts). Create a `vite-env.d.ts` file in the `src` directory to enable TypeScript support:

```typescript
/// <reference types="vite/client" />
```

---

## **`hot.accept(cb)`**
Allows a module to self-accept updates. The callback receives the updated module.

```javascript
export const count = 1;

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (newModule) {
      console.log('updated: count is now', newModule.count);
    }
  });
}
```

A module that "accepts" hot updates is considered an **HMR boundary**.

**Notes:**
- Vite's HMR does not swap the originally imported module. If an HMR boundary module re-exports imports from a dependency, it must update those re-exports using `let`.
- Importers up the chain from the boundary module are not notified of the change.
- The call to `import.meta.hot.accept(` must appear whitespace-sensitive in the source code for Vite's static analysis to enable HMR support.

---

## **`hot.accept(deps, cb)`**
Accept updates from direct dependencies without reloading the module itself.

```javascript
import { foo } from './foo.js';

foo();

if (import.meta.hot) {
  import.meta.hot.accept('./foo.js', (newFoo) => {
    newFoo?.foo();
  });

  // Accept multiple dependencies:
  import.meta.hot.accept(['./foo.js', './bar.js'], ([newFoo, newBar]) => {
    // Only the updated module is non-null. If the update fails, the array is empty.
  });
}
```

---

## **`hot.dispose(cb)`**
Clean up persistent side effects when a module is updated.

```javascript
function setupSideEffect() {}

setupSideEffect();

if (import.meta.hot) {
  import.meta.hot.dispose((data) => {
    // Cleanup logic
  });
}
```

---

## **`hot.prune(cb)`**
Clean up side effects when a module is no longer imported on the page. Useful if the source code handles cleanup on updates, but additional cleanup is needed when the module is removed.

```javascript
function setupOrReuseSideEffect() {}

setupOrReuseSideEffect();

if (import.meta.hot) {
  import.meta.hot.prune((data) => {
    // Cleanup logic
  });
}
```

---

## **`hot.data`**
The `import.meta.hot.data` object persists across module updates. Use it to pass information from a previous module version to the next.

**Example:**
```javascript
// Mutate properties (supported)
import.meta.hot.data.someValue = 'hello';

// Reassigning `data` is not supported
import.meta.hot.data = { someValue: 'hello' }; // ❌
```

---

## **`hot.decline()`**
Currently a no-op, included for backward compatibility. Use `hot.invalidate()` to indicate a module is not hot-updatable.

---

## **`hot.invalidate(message?)`**
Forcefully propagate updates to importers if a self-accepting module cannot handle an HMR update. Logs a message in the browser console and terminal.

**Example:**
```javascript
import.meta.hot.accept((module) => {
  if (cannotHandleUpdate(module)) {
    import.meta.hot.invalidate('Reason for invalidation');
  }
});
```

**Note:** Always call `import.meta.hot.accept` before `invalidate` to ensure the HMR client listens for future changes.

---

## **`hot.on(event, cb)`**
Listen to HMR events dispatched by Vite:

- `'vite:beforeUpdate'`: Before an update is applied.
- `'vite:afterUpdate'`: After an update is applied.
- `'vite:beforeFullReload'`: Before a full reload occurs.
- `'vite:beforePrune'`: Before modules are pruned.
- `'vite:invalidate'`: When a module is invalidated.
- `'vite:error'`: When an error occurs.
- `'vite:ws:disconnect'`: WebSocket connection lost.
- `'vite:ws:connect'`: WebSocket connection (re-)established.

Custom HMR events can be sent from plugins. See [`handleHotUpdate`](https://vite.dev/guide/api-plugin#handlehotupdate) for details.

---

## **`hot.off(event, cb)`**
Remove a callback from event listeners.

---

## **`hot.send(event, data)`**
Send custom events to the Vite dev server. If called before the connection is established, data is buffered and sent later.

See [Client-server Communication](https://vite.dev/guide/api-plugin#client-server-communication) for details, including [Typing Custom Events](https://vite.dev/guide/api-plugin#typescript-for-custom-events).

---

## **Further Reading**
- [Hot Module Replacement is Easy](https://bjornlu.com/blog/hot-module-replacement-is-easy) for deeper insights into HMR.
