import { google } from "googleapis";
import fs from "fs";
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

/**
 * Upload and return both the Drive file id and the shareable URL. The id is
 * what the async resume worker needs to download the file back for processing.
 */
export async function uploadToGoogleDriveFile(
  buffer: Buffer,
  filename: string,
  mimetype: string
): Promise<{ fileId: string; url: string } | null> {
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

  return {
    fileId: response.data.id!,
    url:
      response.data.webViewLink ||
      `https://drive.google.com/file/d/${response.data.id}/view`,
  };
}

// Back-compat wrapper: existing callers only need the URL.
export async function uploadToGoogleDrive(
  buffer: Buffer,
  filename: string,
  mimetype: string
): Promise<string | null> {
  const result = await uploadToGoogleDriveFile(buffer, filename, mimetype);
  return result ? result.url : null;
}

/** Download a Drive file's bytes (used by the resume worker). */
export async function downloadFromGoogleDrive(fileId: string): Promise<Buffer> {
  const auth = getAuthClient();
  if (!auth) {
    throw new Error("Google Drive credentials not configured");
  }
  const drive = google.drive({ version: "v3", auth });
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(res.data as ArrayBuffer);
}

// ---------------------------------------------------------------------------
// Private files (database backups). Unlike the uploads above, these are NOT
// shared "anyone with the link" — they hold the whole database.
// ---------------------------------------------------------------------------

/** Folder for backups: GOOGLE_DRIVE_BACKUP_FOLDER_ID, else the main folder. */
function backupFolderId(): string | undefined {
  return process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID || process.env.GOOGLE_DRIVE_FOLDER_ID;
}

export function isDriveBackupConfigured(): boolean {
  return getAuthClient() !== null && !!backupFolderId();
}

/** Stream a local file to Drive as a private file; returns its Drive id. */
export async function uploadPrivateFileToDrive(
  filePath: string,
  name: string,
  mimeType: string,
): Promise<string> {
  const auth = getAuthClient();
  const folderId = backupFolderId();
  if (!auth || !folderId) {
    throw new Error("Google Drive credentials not configured");
  }
  const drive = google.drive({ version: "v3", auth });
  const res = await drive.files.create({
    requestBody: { name, parents: [folderId] },
    media: { mimeType, body: fs.createReadStream(filePath) },
    fields: "id",
  });
  return res.data.id!;
}

/** Readable stream of a Drive file's bytes (for proxying a download). */
export async function streamFromGoogleDrive(fileId: string): Promise<NodeJS.ReadableStream> {
  const auth = getAuthClient();
  if (!auth) throw new Error("Google Drive credentials not configured");
  const drive = google.drive({ version: "v3", auth });
  const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" });
  return res.data as unknown as NodeJS.ReadableStream;
}

export async function deleteFromGoogleDrive(fileId: string): Promise<void> {
  const auth = getAuthClient();
  if (!auth) throw new Error("Google Drive credentials not configured");
  const drive = google.drive({ version: "v3", auth });
  await drive.files.delete({ fileId });
}
