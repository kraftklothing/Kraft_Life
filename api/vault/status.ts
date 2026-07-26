import { isStorageConfigured, vaultConfigured } from '../../lib/server/vault'

export const config = {
  runtime: 'nodejs',
}

export async function GET(): Promise<Response> {
  try {
    if (!isStorageConfigured()) {
      return Response.json(
        {
          configured: false,
          storageReady: false,
          message: 'Cloud storage is not set up on Vercel yet.',
        },
        { status: 503 },
      )
    }

    const configured = await vaultConfigured()
    return Response.json({ configured, storageReady: true })
  } catch (error) {
    console.error('vault status error', error)
    return Response.json({ error: 'Could not read vault status' }, { status: 500 })
  }
}
