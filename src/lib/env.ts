export const SITE_DOMAIN = process.env.SITE_DOMAIN ?? 'bitcoinfrogs.art'
export const BITCOIN_NETWORK = (process.env.BITCOIN_NETWORK ?? 'mainnet') as 'mainnet' | 'testnet'
export const UNISAT_API_KEY = process.env.UNISAT_API_KEY
export const MOCK_VERIFICATION = process.env.MOCK_VERIFICATION === 'true'
export const MOCK_OWNER = process.env.MOCK_OWNER === 'true'
