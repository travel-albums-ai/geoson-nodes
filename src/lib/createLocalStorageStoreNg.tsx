import React, { createContext, useContext, useRef, useSyncExternalStore } from 'react';

type Store<T> = {
  get: () => T
  set: (next: Partial<T> | ((prev: T) => T)) => void
  subscribe: (cb: () => void) => () => void
}

type StoreOptions<T> = {
  // Keys kept per tab in sessionStorage. Every other key is shared by all tabs of the origin through localStorage.
  tabKeys?: (keyof T)[]
}

function serialize(v: any): any {
  if (v instanceof Set) return Array.from(v)
  if (Array.isArray(v)) return v.map(serialize)
  if (v && typeof v === 'object') {
    const o: any = {}
    Object.keys(v).forEach((k) => { o[k] = serialize(v[k]) })
    return o
  }
  return v
}

function merge(def: any, val: any): any {
  if (def instanceof Set) {
    // parsed stored as array -> convert to Set
    if (Array.isArray(val)) return new Set(val)
    return new Set(Array.from(def))
  }

  if (def && typeof def === 'object' && !Array.isArray(def)) {
    const out: any = { ...def }
    const keys = new Set([...Object.keys(def), ...(val && typeof val === 'object' ? Object.keys(val) : [])])
    keys.forEach((k) => {
      if (val && Object.prototype.hasOwnProperty.call(val, k)) {
        out[k] = merge(def[k], val[k])
      } else {
        out[k] = def[k]
      }
    })
    return out
  }

  // primitives or arrays: prefer parsed value when present
  return val === undefined ? def : val
}

function readRaw(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

function parseRaw(raw: string | null): any {
  if (!raw) return undefined
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

function writeRaw(storage: Storage, key: string, raw: string) {
  try {
    storage.setItem(key, raw)
  } catch (error) {
    // Quota errors land here; the in-memory state still updates.
    console.error(`Could not save ${key}`, error)
  }
}

export function createLocalStorageStoreNg<T extends object>(
  defaults: T,
  storageKey: string,
  options: StoreOptions<T> = {},
) {
  const isBrowser = typeof window !== 'undefined'
  const tabKeys = new Set<string>((options.tabKeys ?? []).map(String))
  const tabStorageKey = `${storageKey}:tab`
  const listeners = new Set<() => void>()

  // Last raw strings read from or written to each storage. A different value in localStorage means another tab wrote it.
  let lastSharedRaw = isBrowser ? readRaw(localStorage, storageKey) : null
  let lastTabRaw = isBrowser ? readRaw(sessionStorage, tabStorageKey) : null

  function buildState(shared: any, tab: any): T {
    const out: any = {}
    for (const key of Object.keys(defaults) as (keyof T & string)[]) {
      const source = tabKeys.has(key) ? tab : shared
      out[key] = source && Object.prototype.hasOwnProperty.call(source, key)
        ? merge(defaults[key], source[key])
        : defaults[key]
    }
    return out as T
  }

  let state: T = isBrowser ? buildState(parseRaw(lastSharedRaw), parseRaw(lastTabRaw)) : defaults

  // Picks up shared keys another tab wrote. Per-tab keys stay as they are. Returns true when state changed.
  function refreshShared(): boolean {
    if (!isBrowser) return false

    const raw = readRaw(localStorage, storageKey)
    if (raw === lastSharedRaw) return false

    lastSharedRaw = raw
    const fresh = buildState(parseRaw(raw), undefined)
    const next: any = { ...state }
    for (const key of Object.keys(defaults)) {
      if (!tabKeys.has(key)) next[key] = fresh[key as keyof T]
    }
    state = next
    return true
  }

  function persist(current: T) {
    if (!isBrowser) return

    const shared: Record<string, unknown> = {}
    const tab: Record<string, unknown> = {}
    for (const key of Object.keys(current)) {
      if (tabKeys.has(key)) tab[key] = (current as any)[key]
      else shared[key] = (current as any)[key]
    }

    const sharedRaw = JSON.stringify(serialize(shared))
    if (sharedRaw !== lastSharedRaw) {
      lastSharedRaw = sharedRaw
      writeRaw(localStorage, storageKey, sharedRaw)
    }

    if (tabKeys.size > 0) {
      const tabRaw = JSON.stringify(serialize(tab))
      if (tabRaw !== lastTabRaw) {
        lastTabRaw = tabRaw
        writeRaw(sessionStorage, tabStorageKey, tabRaw)
      }
    }
  }

  const store: Store<T> = {
    get: () => state,

    set: (next) => {
      const refreshed = refreshShared()
      const prev = state
      const resolved =
        typeof next === 'function' ? (next as any)(prev) : { ...prev, ...next }

      if (Object.is(prev, resolved)) {
        if (refreshed) listeners.forEach((l) => l())
        return
      }

      state = resolved
      persist(state)

      listeners.forEach((l) => l())
    },

    subscribe: (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
  }

  if (isBrowser) {
    window.addEventListener('storage', (event) => {
      if (event.storageArea !== localStorage) return
      if (event.key !== null && event.key !== storageKey) return
      if (refreshShared()) listeners.forEach((l) => l())
    })
  }

  const Context = createContext<Store<T> | null>(null)

  function Provider({ children }: { children: React.ReactNode }) {
    return <Context.Provider value={store}>{children}</Context.Provider>
  }

  function useStore() {
    const s = useContext(Context)
    if (!s) throw new Error('StoreProvider missing')

    return useSyncExternalStore(
      s.subscribe,
      s.get,
      s.get
    )
  }

  function useStoreSelector<R>(
    selector: (state: T) => R
  ) {
    const s = useContext(Context)
    if (!s) throw new Error('StoreProvider missing')

    return useSyncExternalStore(
      s.subscribe,
      () => selector(s.get()),
      () => selector(s.get())
    )
  }

  function useSetStore() {
    const s = useContext(Context)
    if (!s) throw new Error('StoreProvider missing')

    const ref = useRef(s.set)
    return ref.current
  }

  return {
    Provider,
    useStore,
    useStoreSelector,
    useSetStore,
    getStore: store.get,
    setStore: store.set,
  }
}
