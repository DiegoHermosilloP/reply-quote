declare module 'claude-code' {
  interface PluginState {
    'reply-quote': { quotes: string[]; selected: string | null; open: number[] }
  }
}
