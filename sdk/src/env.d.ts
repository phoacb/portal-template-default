interface ImportMetaEnv {
  readonly BASE_URL?: string;
  readonly DEV?: boolean;
  readonly DIGIFORCE_PORTAL_BASE?: string;
  readonly DIGIFORCE_API_URL?: string;
  readonly DIGIFORCE_API_TOKEN?: string;
  readonly DIGIFORCE_AUTHENTICATOR?: string;
  readonly DIGIFORCE_WS_PATH?: string;
  readonly DIGIFORCE_WS_URL?: string;
  readonly API_CLIENT_STORAGE_PREFIX?: string;
  readonly API_CLIENT_STORAGE_TYPE?: string;
  readonly API_CLIENT_SHARE_TOKEN?: string;
}

interface ImportMeta {
  readonly env?: ImportMetaEnv;
}

interface Window {
  DIGIFORCE_PORTAL_BASE?: string;
  DIGIFORCE_API_URL?: string;
  DIGIFORCE_WS_PATH?: string;
  DIGIFORCE_WS_URL?: string;
  __digiforce_api_client_storage_prefix__?: string;
  __digiforce_api_client_storage_type__?: string;
  __digiforce_api_client_share_token__?: boolean | string;
  __digiforce_ws_path__?: string;
  __digiforce_ws_url__?: string;
}
