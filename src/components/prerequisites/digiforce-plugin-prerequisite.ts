import { useCallback, useEffect, useRef, useState } from "react";
import { digiforceClient } from "@digiforce/portal-sdk/client";

export type DigiforcePluginLane = "client" | "client-v2";

export type EnabledDigiforcePlugin = {
  name?: string;
  packageName?: string;
};

type DigiforcePluginProbeQueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean>;

export type DigiforcePluginProbe = {
  resource: string;
  action: string;
  query?: Record<string, DigiforcePluginProbeQueryValue>;
};

export type DigiforcePluginRequirement = {
  packageName: string;
  name?: string;
  label: string;
  /** Optional read-only fallback when a source/dev plugin is absent from the client manifest. */
  probe?: DigiforcePluginProbe;
};

export type DigiforcePluginRequirementMode = "all" | "any";
type CachedEnabledPlugins = {
  expiresAt: number;
  plugins?: EnabledDigiforcePlugin[];
  request?: Promise<EnabledDigiforcePlugin[]>;
};

type CachedPluginProbe = {
  expiresAt: number;
  available?: boolean;
  request?: Promise<boolean>;
};

type PluginPrerequisiteState =
  | { status: "checking"; missingPlugins: [] }
  | { status: "available"; missingPlugins: [] }
  | {
      status: "unavailable";
      missingPlugins: DigiforcePluginRequirement[];
    }
  | { status: "error"; missingPlugins: []; error: unknown };

const ENABLED_PLUGIN_CACHE_TTL = 60_000;
const enabledPluginCache = new Map<string, CachedEnabledPlugins>();
const pluginProbeCache = new Map<string, CachedPluginProbe>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function enabledPluginRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.rows)) return payload.rows;
  if (isRecord(payload.data)) {
    if (Array.isArray(payload.data.data)) return payload.data.data;
    if (Array.isArray(payload.data.rows)) return payload.data.rows;
  }
  return [];
}

function pluginRequirementsKey(requirements: DigiforcePluginRequirement[]) {
  return JSON.stringify(
    requirements.map(({ packageName, name, probe }) => ({ packageName, name, probe })),
  );
}

export function normalizeEnabledDigiforcePlugins(
  payload: unknown,
): EnabledDigiforcePlugin[] {
  return enabledPluginRows(payload).flatMap((value) => {
    if (!isRecord(value)) return [];
    const name = typeof value.name === "string" ? value.name : undefined;
    const packageName =
      typeof value.packageName === "string" ? value.packageName : undefined;
    return name || packageName ? [{ name, packageName }] : [];
  });
}

function matchesRequirement(
  plugin: EnabledDigiforcePlugin,
  requirement: DigiforcePluginRequirement,
) {
  const normalizePkg = (pkg?: string) => pkg?.replace(/^@(digiforce|digiforce)\//, "");
  return Boolean(
    plugin.packageName === requirement.packageName ||
    (plugin.packageName &&
      requirement.packageName &&
      normalizePkg(plugin.packageName) === normalizePkg(requirement.packageName)) ||
    (!!requirement.name && plugin.name === requirement.name)
  );
}

export function evaluateDigiforcePluginRequirements(
  enabledPlugins: EnabledDigiforcePlugin[],
  requirements: DigiforcePluginRequirement[],
  mode: DigiforcePluginRequirementMode = "all",
) {
  if (!requirements.length) {
    return { available: true, missingPlugins: [] };
  }

  const missingPlugins = requirements.filter(
    (requirement) =>
      !enabledPlugins.some((plugin) => matchesRequirement(plugin, requirement)),
  );
  const available =
    mode === "all"
      ? missingPlugins.length === 0
      : missingPlugins.length < requirements.length;

  return {
    available,
    missingPlugins: available ? [] : missingPlugins,
  };
}

function enabledPluginCacheKey(lane: DigiforcePluginLane) {
  return [digiforceClient.getApiUrl(), digiforceClient.getAppName(), lane].join(
    "\u0000",
  );
}

async function loadEnabledDigiforcePlugins(
  lane: DigiforcePluginLane,
  force: boolean,
) {
  const key = enabledPluginCacheKey(lane);
  const cached = enabledPluginCache.get(key);
  const now = Date.now();

  if (!force && cached?.plugins && cached.expiresAt > now) {
    return cached.plugins;
  }
  if (cached?.request) {
    return cached.request;
  }

  const action = lane === "client-v2" ? "listEnabledV2" : "listEnabled";
  const request = digiforceClient
    .action<unknown>("pm", action, { method: "GET" })
    .then(normalizeEnabledDigiforcePlugins)
    .then((plugins) => {
      enabledPluginCache.set(key, {
        plugins,
        expiresAt: Date.now() + ENABLED_PLUGIN_CACHE_TTL,
      });
      return plugins;
    })
    .catch((error: unknown) => {
      if (enabledPluginCache.get(key)?.request === request) {
        enabledPluginCache.delete(key);
      }
      throw error;
    });

  enabledPluginCache.set(key, {
    plugins: cached?.plugins,
    expiresAt: cached?.expiresAt ?? 0,
    request,
  });
  return request;
}

function pluginProbeCacheKey(probe: DigiforcePluginProbe) {
  return [
    digiforceClient.getApiUrl(),
    digiforceClient.getAppName(),
    probe.resource,
    probe.action,
    JSON.stringify(probe.query ?? {}),
  ].join("\u0000");
}

function isMissingPluginProbeError(error: unknown) {
  return isRecord(error) && error.status === 404;
}

async function loadPluginProbe(
  probe: DigiforcePluginProbe,
  force: boolean,
 ) {
  const key = pluginProbeCacheKey(probe);
  const cached = pluginProbeCache.get(key);
  const now = Date.now();

  if (!force && cached?.available !== undefined && cached.expiresAt > now) {
    return cached.available;
  }
  if (cached?.request) {
    return cached.request;
  }

  const request = (async () => {
    try {
      await digiforceClient.action<unknown>(probe.resource, probe.action, {
        method: "GET",
        query: probe.query,
      });
      return true;
    } catch (error) {
      if (isMissingPluginProbeError(error)) return false;
      throw error;
    }
  })()
    .then((available) => {
      pluginProbeCache.set(key, {
        available,
        expiresAt: Date.now() + ENABLED_PLUGIN_CACHE_TTL,
      });
      return available;
    })
    .catch((error: unknown) => {
      if (pluginProbeCache.get(key)?.request === request) {
        pluginProbeCache.delete(key);
      }
      throw error;
    });

  pluginProbeCache.set(key, {
    available: cached?.available,
    expiresAt: cached?.expiresAt ?? 0,
    request,
  });
  return request;
}

async function supplementEnabledPluginsWithProbes(
  enabledPlugins: EnabledDigiforcePlugin[],
  missingPlugins: DigiforcePluginRequirement[],
  force: boolean,
 ) {
  const probeResults = await Promise.all(
    missingPlugins.map(async (requirement) => ({
      requirement,
      available: requirement.probe
        ? await loadPluginProbe(requirement.probe, force)
        : false,
    })),
  );

  return [
    ...enabledPlugins,
    ...probeResults.flatMap(({ requirement, available }) =>
      available
        ? [
            {
              name: requirement.name,
              packageName: requirement.packageName,
            },
          ]
        : [],
    ),
  ];
}

export function clearDigiforcePluginPrerequisiteCache() {
  enabledPluginCache.clear();
  pluginProbeCache.clear();
}

export function useDigiforcePluginPrerequisite({
  requirements,
  mode = "all",
  lane = "client-v2",
}: {
  requirements: DigiforcePluginRequirement[];
  mode?: DigiforcePluginRequirementMode;
  lane?: DigiforcePluginLane;
}) {
  const requirementsRef = useRef(requirements);
  requirementsRef.current = requirements;
  const requestSequence = useRef(0);
  const requirementsKey = pluginRequirementsKey(requirements);
  const [state, setState] = useState<PluginPrerequisiteState>({
    status: "checking",
    missingPlugins: [],
  });

  const check = useCallback(
    async (force = false) => {
      const sequence = ++requestSequence.current;
      setState({ status: "checking", missingPlugins: [] });
      try {
        const enabledPlugins = await loadEnabledDigiforcePlugins(lane, force);
        if (sequence !== requestSequence.current) return;
        const currentRequirements = requirementsRef.current;
        if (pluginRequirementsKey(currentRequirements) !== requirementsKey) return;
        let result = evaluateDigiforcePluginRequirements(
          enabledPlugins,
          currentRequirements,
          mode,
        );
        if (
          !result.available &&
          result.missingPlugins.some((requirement) => requirement.probe)
        ) {
          const supplementedPlugins = await supplementEnabledPluginsWithProbes(
            enabledPlugins,
            result.missingPlugins,
            force,
          );
          if (sequence !== requestSequence.current) return;
          if (pluginRequirementsKey(requirementsRef.current) !== requirementsKey) return;
          result = evaluateDigiforcePluginRequirements(
            supplementedPlugins,
            currentRequirements,
            mode,
          );
        }
        setState(
          result.available
            ? { status: "available", missingPlugins: [] }
            : {
                status: "unavailable",
                missingPlugins: result.missingPlugins,
              },
        );
      } catch (error) {
        if (sequence !== requestSequence.current) return;
        setState({ status: "error", missingPlugins: [], error });
      }
    },
    [lane, mode, requirementsKey],
  );

  useEffect(() => {
    check();
    return () => {
      requestSequence.current += 1;
    };
  }, [check]);

  return {
    ...state,
    retry: () => check(true),
  };
}
