import { Vino } from 'vino-sdk'

/**
 * Single shared client for the whole app. The server is expected to have CORS
 * enabled; the SDK default base URL points at the local vino-backend.
 */
export const vino = new Vino({ baseUrl: 'http://127.0.0.1:8080' })
