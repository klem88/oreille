import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import yamlImport from '@rollup/plugin-yaml'

// Les types du plugin (CJS, export =) ne sont pas appelables sous module nodenext : on les contourne.
const yaml = yamlImport as unknown as typeof yamlImport.default

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte(), yaml()],
})
