export interface ApplicationSlo {
  id: number;
  application_id: number;
  project_slo_id: number;
  name: string;
  target_value: string;
  service_name: string;
  alert_name: string;
  slo_type: string;
  pod_name?: string | null;
  sli?: string | null;
  panelurl?: string | null;
}

export interface ProjectSlo {
  id: number;
  project_id: number;
  name: string;
  release_namespace: string;
  release_name: string;
  grafana_url: string;
  graf_pat: string;
}

export interface GrafanaPanelUrlResponse {
  grafana_panel_url: string;
}

export interface PrometheusRulesResponse {
  rules: string; // YAML as string
}

export interface DashboardResponse {
  message: string;
  grafana_data: {
    id: number;
    dashboard_id: number;
    uid: string;
    url: string;
    version: number;
  };
}

export interface WebhookPayload {
  slo_id: number;
  application_id: number;
  name: string;
  target_value: string;
}

export interface ApiMessage {
  message: string;
}

export interface ApiError {
  detail: string;
}
