// Resend integration - provides email client via Replit connector
import { Resend } from 'resend';

interface ResendCredentials {
  apiKey: string;
  fromEmail: string;
}

async function getCredentials(): Promise<ResendCredentials> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X-Replit-Token not found for repl/depl');
  }

  const response = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X-Replit-Token': xReplitToken
      }
    }
  ).then(res => res.json());

  const settings = response?.items?.[0]?.settings as { api_key?: string; from_email?: string } | undefined;

  if (!settings?.api_key) {
    throw new Error('Resend not connected');
  }

  return {
    apiKey: settings.api_key,
    fromEmail: settings.from_email ?? ''
  };
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableResendClient(): Promise<{ client: Resend; fromEmail: string }> {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}
