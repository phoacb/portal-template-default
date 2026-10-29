import type { ComponentProps, ComponentType } from "react";

import { AudioPreviewer, VideoPreviewer } from "./previewers/iframe";
import { MarkdownPreviewer, TextPreviewer } from "./previewers/text";
import { ImagePreviewer } from "./previewers/image";
import { OfficePreviewer } from "./previewers/office";
import { PdfPreviewer } from "./previewers/pdf";
import { UnsupportedPreviewer } from "./previewers/unsupported";
import type {
  FileFieldDescriptor,
  FilePreviewMessages,
  FileUploadFieldValue,
  DigiforceFileRecord,
} from "./types";

export type FilePreviewFieldProps = Omit<ComponentProps<"div">, "children"> & {
  value: FileUploadFieldValue;
  descriptor?: FileFieldDescriptor;
  size?: number;
  showFileName?: boolean;
  messages?: Partial<FilePreviewMessages>;
};

export type FilePreviewerProps = {
  file: DigiforceFileRecord;
  index: number;
  list: DigiforceFileRecord[];
  descriptor?: FileFieldDescriptor;
  messages: FilePreviewMessages;
  onDownload: (file: DigiforceFileRecord) => void;
};

export type FilePreviewType = {
  key: string;
  match: (file: DigiforceFileRecord) => boolean;
  getThumbnailUrl?: (file: DigiforceFileRecord) => string | null;
  Previewer: ComponentType<FilePreviewerProps>;
};

const officeExtensions = new Set([
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".odt",
  ".ods",
  ".odp",
]);

const officeMimeTypes = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.presentation",
]);

const activeContentExtensions = new Set([".html", ".htm", ".xml", ".svg", ".xsl"]);
const activeContentMimeTypes = new Set([
  "text/html",
  "application/xml",
  "text/xml",
  "image/svg+xml",
]);

function normalizeExtname(value?: string) {
  if (!value) return "";
  const extname = value.trim().toLowerCase();
  return extname.startsWith(".") ? extname : `.${extname}`;
}

function getExtensionFromValue(value?: string) {
  if (!value) return "";

  const withoutQuery = value.split(/[?#]/, 1)[0];
  const lastSegment = withoutQuery.split("/").filter(Boolean).at(-1) ?? "";
  let decodedSegment = lastSegment;
  try {
    decodedSegment = decodeURIComponent(lastSegment);
  } catch {
    // Keep malformed URL segments unchanged and continue best-effort matching.
  }

  const dotIndex = decodedSegment.lastIndexOf(".");
  return dotIndex >= 0 ? decodedSegment.slice(dotIndex).toLowerCase() : "";
}

export function getFileExtension(file: DigiforceFileRecord) {
  const explicit = normalizeExtname(file.extname);
  if (explicit) return explicit;

  for (const value of [
    file.filename,
    file.title,
    file.url,
    file.path,
    file.preview,
  ]) {
    const extension = getExtensionFromValue(value);
    if (extension) return extension;
  }

  return "";
}

export function getFileMimeType(file: DigiforceFileRecord) {
  return file.mimetype?.split(";", 1)[0].trim().toLowerCase() ?? "";
}

export function isOfficeFile(file: DigiforceFileRecord) {
  return (
    officeMimeTypes.has(getFileMimeType(file)) ||
    officeExtensions.has(getFileExtension(file))
  );
}

export function isImageFile(file: DigiforceFileRecord) {
  const mimetype = getFileMimeType(file);
  return mimetype.startsWith("image/") && !isActiveContentFile(file);
}

export function isPdfFile(file: DigiforceFileRecord) {
  return getFileMimeType(file) === "application/pdf" || getFileExtension(file) === ".pdf";
}

export function isTextFile(file: DigiforceFileRecord) {
  const mimetype = getFileMimeType(file);
  const extension = getFileExtension(file);

  return (
    mimetype.startsWith("text/") ||
    mimetype === "application/json" ||
    extension === ".txt" ||
    extension === ".json"
  );
}

export function isMarkdownFile(file: DigiforceFileRecord) {
  const mimetype = getFileMimeType(file);
  const extension = getFileExtension(file);
  return mimetype === "text/markdown" || extension === ".md";
}

export function isAudioFile(file: DigiforceFileRecord) {
  return getFileMimeType(file).startsWith("audio/");
}

export function isVideoFile(file: DigiforceFileRecord) {
  return getFileMimeType(file).startsWith("video/");
}

export function isActiveContentFile(file: DigiforceFileRecord) {
  return (
    activeContentMimeTypes.has(getFileMimeType(file)) ||
    activeContentExtensions.has(getFileExtension(file))
  );
}

export const defaultPreviewTypes: FilePreviewType[] = [
  {
    key: "office",
    match: isOfficeFile,
    Previewer: OfficePreviewer,
  },
  {
    key: "image",
    match: isImageFile,
    Previewer: ImagePreviewer,
  },
  {
    key: "pdf",
    match: isPdfFile,
    Previewer: PdfPreviewer,
  },
  {
    key: "audio",
    match: isAudioFile,
    Previewer: AudioPreviewer,
  },
  {
    key: "video",
    match: isVideoFile,
    Previewer: VideoPreviewer,
  },
  {
    key: "markdown",
    match: (file) => isMarkdownFile(file) && !isActiveContentFile(file),
    Previewer: MarkdownPreviewer,
  },
  {
    key: "text",
    match: (file) => isTextFile(file) && !isActiveContentFile(file),
    Previewer: TextPreviewer,
  },
  {
    key: "active-content",
    match: isActiveContentFile,
    Previewer: UnsupportedPreviewer,
  },
  {
    key: "unsupported",
    match: () => true,
    Previewer: UnsupportedPreviewer,
  },
];

export function getPreviewType(file: DigiforceFileRecord) {
  return defaultPreviewTypes.find((previewType) => previewType.match(file))!;
}
