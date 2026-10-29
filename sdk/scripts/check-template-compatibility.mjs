import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import semver from "semver";

const sdkRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

const readPackage = (directory) => {
  const packagePath = path.join(directory, "package.json");
  if (!fs.existsSync(packagePath)) return undefined;
  try {
    return {
      directory,
      path: packagePath,
      value: JSON.parse(fs.readFileSync(packagePath, "utf8")),
    };
  } catch {
    return undefined;
  }
};

const findProjectPackage = () => {
  const starts = [
    process.env.INIT_CWD,
    process.env.npm_config_local_prefix,
    process.cwd(),
  ].filter(Boolean);
  const visited = new Set();
  let fallback;

  for (const start of starts) {
    let directory = path.resolve(start);
    while (!visited.has(directory)) {
      visited.add(directory);
      const candidate = readPackage(directory);
      if (candidate && candidate.directory !== sdkRoot) {
        fallback ??= candidate;
        const pkg = candidate.value;
        if (
          pkg?.digiforce?.defaultTemplateVersion ||
          pkg?.name === "@digiforce/portal-template-default"
        ) {
          return candidate;
        }
      }
      const parent = path.dirname(directory);
      if (parent === directory) break;
      directory = parent;
    }
  }

  return fallback;
};

export const checkTemplateCompatibility = ({ silent = false } = {}) => {
  const sdkPackage = readPackage(sdkRoot)?.value;
  const projectPackage = findProjectPackage();
  const supportedRange =
    sdkPackage?.digiforce?.supportedDefaultTemplateRange;
  const project = projectPackage?.value;
  const templateVersion =
    project?.digiforce?.defaultTemplateVersion ??
    (project?.name === "@digiforce/portal-template-default"
      ? project.version
      : undefined);

  if (!supportedRange) {
    throw new Error(
      "@digiforce/portal-sdk does not declare digiforce.supportedDefaultTemplateRange."
    );
  }
  if (!templateVersion) {
    throw new Error(
      [
        "Unable to determine the Digiforce Default Template version.",
        `Project: ${projectPackage?.path ?? "not found"}`,
        "Add digiforce.defaultTemplateVersion to the project package.json before installing the SDK.",
      ].join("\n")
    );
  }
  if (!semver.valid(templateVersion)) {
    throw new Error(
      `Invalid digiforce.defaultTemplateVersion: ${templateVersion}`
    );
  }
  if (!semver.validRange(supportedRange)) {
    throw new Error(
      `Invalid SDK supportedDefaultTemplateRange: ${supportedRange}`
    );
  }

  const compatible = semver.satisfies(templateVersion, supportedRange);
  if (!compatible) {
    throw new Error(
      [
        "Incompatible Digiforce Portal SDK.",
        `Current Default Template: ${templateVersion}`,
        `Installing Portal SDK: ${sdkPackage.version}`,
        `Supported Default Template range: ${supportedRange}`,
        "Upgrade the base template first, or install a compatible @digiforce/portal-sdk version.",
      ].join("\n")
    );
  }

  if (!silent) {
    process.stdout.write(
      `Portal SDK ${sdkPackage.version} supports Default Template ${templateVersion} (${supportedRange}).\n`
    );
  }

  return {
    compatible,
    defaultTemplateVersion: templateVersion,
    supportedDefaultTemplateRange: supportedRange,
  };
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    checkTemplateCompatibility();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
    process.exitCode = 1;
  }
}
