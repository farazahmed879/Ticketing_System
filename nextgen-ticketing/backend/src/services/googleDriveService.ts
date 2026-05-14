import { google } from "googleapis";
import { Readable } from "stream";

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

function getAuthClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!clientId || !clientSecret || !refreshToken || !folderId) {
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
    scope: SCOPES.join(" "),
  });

  return oauth2Client;
}

export async function uploadToGoogleDrive(
  buffer: Buffer,
  filename: string,
  mimetype: string
): Promise<string | null> {
  const auth = getAuthClient();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!auth || !folderId) {
    console.warn("Google Drive OAuth credentials not configured — skipping upload");
    return null;
  }

  const drive = google.drive({ version: "v3", auth });

  const fileMetadata = {
    name: `${Date.now()}_${filename}`,
    parents: [folderId],
  };

  const media = {
    mimeType: mimetype,
    body: Readable.from(buffer),
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: "id, webViewLink",
  });

  // Make the file readable by anyone with the link
  await drive.permissions.create({
    fileId: response.data.id!,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  return response.data.webViewLink || `https://drive.google.com/file/d/${response.data.id}/view`;
}
