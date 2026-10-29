import { digiforceClient } from "@digiforce/portal-sdk/client";

import { getDataSourceHeaders } from "./storage";
import { isDigiforceManagedFileUrl } from "./file-url-policy";
import type { FileFieldDescriptor, DigiforceFileRecord } from "./types";

type TemporaryUrlResponse = {
  url?: string;
  data?: { url?: string; data?: { url?: string } };
};

function resolveFileUrl(value?: string | null) {
  return value ? digiforceClient.resolveUrl(value) : "";
}

function getFileUrlSource(file: DigiforceFileRecord) {
  return file.url || file.preview || file.path || "";
}

export function isDigiforceFileUrl(value: string) {
  return isDigiforceManagedFileUrl(
    value,
    digiforceClient.getApiUrl(),
    typeof window === "undefined" ? undefined : window.location.href
  );
}

function appendUrlFlag(value: string, flag: "download" | "preview") {
  if (!value) return value;

  try {
    const url = new URL(
      value,
      typeof window === "undefined" ? undefined : window.location.href
    );
    url.searchParams.set(flag, "1");
    return url.toString();
  } catch {
    const separator = value.includes("?") ? "&" : "?";
    return `${value}${separator}${flag}=1`;
  }
}

export function getFileUrl(file: DigiforceFileRecord) {
  return resolveFileUrl(getFileUrlSource(file));
}

export function getPreviewFileUrl(file: DigiforceFileRecord) {
  const source = getFileUrlSource(file);
  const url = getFileUrl(file);
  return isDigiforceFileUrl(source) ? appendUrlFlag(url, "preview") : url;
}

export function getThumbnailUrl(file: DigiforceFileRecord) {
  const source = file.preview || getFileUrlSource(file);
  const url = resolveFileUrl(source);
  return isDigiforceFileUrl(source) ? appendUrlFlag(url, "preview") : url;
}

export function getFileName(file: DigiforceFileRecord) {
  return file.title || file.filename || `file-${file.id}`;
}

export function getDownloadFileName(file: DigiforceFileRecord) {
  const filename = getFileName(file);
  if (file.extname && !filename.toLowerCase().endsWith(file.extname)) {
    return `${filename}${file.extname.startsWith(".") ? "" : "."}${
      file.extname
    }`;
  }
  return filename;
}

export function getDownloadUrl(file: DigiforceFileRecord) {
  const source = getFileUrlSource(file);
  const url = getFileUrl(file);
  return isDigiforceFileUrl(source) ? appendUrlFlag(url, "download") : url;
}

export function triggerFileDownload(file: DigiforceFileRecord) {
  const url = getDownloadUrl(file);
  if (!url || typeof document === "undefined") return;

  const link = document.createElement("a");
  link.href = url;
  link.download = getDownloadFileName(file);
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function createTemporaryFileUrl(
  file: DigiforceFileRecord,
  descriptor: FileFieldDescriptor
) {
  const response = await digiforceClient.action<TemporaryUrlResponse>(
    descriptor.fileCollection,
    `createTemporaryURL/${file.id}`,
    {
      method: "POST",
      headers: getDataSourceHeaders(descriptor.dataSourceKey),
      unwrap: "none",
    }
  );

  const url =
    response.url ?? response.data?.url ?? response.data?.data?.url ?? "";
  return resolveFileUrl(url);
}
