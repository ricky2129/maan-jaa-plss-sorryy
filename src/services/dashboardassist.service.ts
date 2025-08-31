import { DashboardAssistUrl } from "constant";
import { get, post } from "../network/query";

type GenerateDashboardPayload = {
  prompt: string;
  preview: boolean;
  pod_name: string | null;
};

type UploadDashboardPayload = {
  prompt: string;
  dashboard: any;
  project_id: string;
  application_id: string;
};

type DashboardHistoryPayload = {
  project_id: string;
  application_id: string;
};

type GetDeploymentsPayload = {
  project_id: string;
  application_id: string;
};

const useDashboardService = () => {
  const generateDashboard = async (payload: GenerateDashboardPayload): Promise<any> => {
    return await post(DashboardAssistUrl.GENERATE_DASHBOARD, payload, "json", {});
  };

  const uploadDashboard = async (payload: UploadDashboardPayload): Promise<any> => {
    return await post(DashboardAssistUrl.UPLOAD_DASHBOARD, payload, "json", {});
  };

  const getHistory = async (payload: DashboardHistoryPayload): Promise<any[]> => {
    return await post(DashboardAssistUrl.HISTORY, payload, "json", {});
  };

  const getDeployments = async (payload: GetDeploymentsPayload): Promise<any[]> => {
    return await get(DashboardAssistUrl.DISCOVER_DEPLOYMENTS, payload, {}, null, "json");
  };

  return {
    generateDashboard,
    uploadDashboard,
    getHistory,
    getDeployments,
  };
};

export default useDashboardService;
