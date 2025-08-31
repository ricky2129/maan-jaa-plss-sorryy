import { ApiUrl } from "constant";
import { resolveUrlParams } from "helpers";
import { get, post } from "network/query";
import {
  ApplicationSlo,
  ProjectSlo,
  GrafanaPanelUrlResponse,
  PrometheusRulesResponse,
  DashboardResponse,
  WebhookPayload,
  ApiMessage,
  ApiError,
} from "interfaces/slo";

const useSLOService = () => {
  const setup = async (): Promise<ApiMessage> => {
    return await get(ApiUrl.SETUP);
  };

  const getApplicationSLO = async (
    project_slo_id: number,
    application_id: number
  ): Promise<ApplicationSlo[] | ApiMessage> => {
    return await get(ApiUrl.GET_APPLICATION_SLO, {
      project_slo_id: project_slo_id.toString(),
      application_id: application_id.toString(),
    });
  };

  const getProjectSLO = async (
    project_id: number
  ): Promise<ProjectSlo | ApiMessage> => {
    return await get(ApiUrl.GET_PROJECT_SLO, {
      project_id: project_id.toString(),
    });
  };

  const getProjectApplicationSLO = async (
    project_slo_id: number
  ): Promise<ApplicationSlo | ApiError> => {
    const url = resolveUrlParams(ApiUrl.GET_PROJECT_APPLICATION_SLO, {
      project_slo_id: project_slo_id.toString(),
    });
    return await get(url);
  };

  const generateGrafanaPanelUrl = async (
    application_slo_id: number,
    panel_id: number
  ): Promise<GrafanaPanelUrlResponse | ApiError> => {
    return await get(ApiUrl.GENERATE_GRAFANA_PANEL_URL, {
      application_slo_id: application_slo_id.toString(),
      panel_id: panel_id.toString(),
    });
  };

  const createApplicationSLO = async (
    payload: Omit<ApplicationSlo, "id" | "panelurl">
  ): Promise<{ message: string; slo_id: number; panelurl: string } | ApiError> => {
    return await post(ApiUrl.CREATE_APPLICATION_SLO, payload);
  };

  const createProjectSLO = async (
    payload: Omit<ProjectSlo, "id">
  ): Promise<{ message: string; project_slo_id: number } | ApiError> => {
    return await post(ApiUrl.CREATE_PROJECT_SLO, payload);
  };

 const generatePrometheusRules = async (
  body: { slo_id: number }
): Promise<{ blob: Blob; filename: string }> => {
  const response = await post(
    ApiUrl.GENERATE_PROMETHEUS_RULES,
    { slo_id: body.slo_id.toString() },
    "blob"
  );
  return { blob: response, filename: "slo_rules.yaml" };
};



  const generateDashboard = async (
    body: { project_slo_id: number }
  ): Promise<DashboardResponse | ApiError> => {
    return await post(ApiUrl.GENERATE_DASHBOARD, {
      project_slo_id: body.project_slo_id.toString(),
    });
  };

  const webhook = async (
    payload: WebhookPayload
  ): Promise<ApiMessage | ApiError> => {
    return await post(ApiUrl.WEBHOOK, payload);
  };

  return {
    setup,
    getApplicationSLO,
    getProjectSLO,
    getProjectApplicationSLO,
    generateGrafanaPanelUrl,
    createApplicationSLO,
    createProjectSLO,
    generatePrometheusRules,
    generateDashboard,
    webhook,
  };
};

export default useSLOService;
