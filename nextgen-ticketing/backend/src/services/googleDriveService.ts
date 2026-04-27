import { google } from "googleapis";
import { Readable } from "stream";

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

function getAuthClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!email || !key || !folderId) {
    return null;
  }

  const auth = new google.auth.JWT({
    email,
    key: key.replace(/\\n/g, "\n"),
    scopes: SCOPES,
  });

  return auth;
}

export async function uploadToGoogleDrive(
  buffer: Buffer,
  filename: string,
  mimetype: string
): Promise<string | null> {
  const auth = getAuthClient();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!auth || !folderId) {
    console.warn("Google Drive credentials not configured — skipping upload");
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
