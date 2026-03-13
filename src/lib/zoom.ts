/**
 * Zoom Server-to-Server OAuth utility
 * Used to obtain access tokens for downloading cloud recordings.
 *
 * Required env vars:
 *   ZOOM_ACCOUNT_ID
 *   ZOOM_CLIENT_ID
 *   ZOOM_CLIENT_SECRET
 */

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getZoomAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const accountId = process.env.ZOOM_ACCOUNT_ID!;
  const clientId = process.env.ZOOM_CLIENT_ID!;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET!;

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Zoom OAuth failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token as string,
    expiresAt: Date.now() + (data.expires_in as number) * 1000,
  };
  return cachedToken.token;
}

export async function downloadZoomRecording(
  downloadUrl: string,
  accessToken: string
): Promise<Buffer> {
  const res = await fetch(`${downloadUrl}?access_token=${accessToken}`);
  if (!res.ok) {
    throw new Error(`Failed to download recording: ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

export interface ZoomRecordingFile {
  id: string;
  file_type: string;
  file_extension: string;
  file_size: number;
  download_url: string;
  recording_type: string;
  status: string;
}

export interface ZoomWebhookPayload {
  event: string;
  event_ts: number;
  payload: {
    account_id: string;
    object: {
      id: string;           // zoom meeting id
      uuid: string;
      host_id: string;
      host_email: string;
      topic: string;        // meeting title
      type: number;
      start_time: string;
      duration: number;
      recording_files: ZoomRecordingFile[];
    };
  };
}
