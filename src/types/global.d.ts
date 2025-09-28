export {}

declare global {
  interface Window {
    unisat?: {
      requestAccounts?: () => Promise<string[]>
      getAccounts?: () => Promise<string[]>
      getPublicKey?: (type?: string) => Promise<string>
      signMessage?: (message: string) => Promise<string>
      getNetwork?: () => Promise<{ network: 'livenet' | 'testnet' }>
    }
  }
}
