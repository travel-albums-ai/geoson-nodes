/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_UNSPLASH_ACCESS_KEY?: string
	readonly VITE_GOOGLE_CLIENT_ID?: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
