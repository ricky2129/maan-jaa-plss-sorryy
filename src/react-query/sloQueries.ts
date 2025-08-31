import { useMutation, useQuery } from "@tanstack/react-query";
import useSLOService from "services/slo..service";
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

function extractErrorMessage(error: any): string {
  if (error?.response?.data) {
    if (typeof error.response.data === "string") {
      return error.response.data;
    }
    if (error.response.data.detail) {
      return error.response.data.detail;
    }
    if (error.response.data.message) {
      return error.response.data.message;
    }
    return "An error occurred. Please try again.";
  }
  if (error?.message) {
    return error.message;
  }
  return "An unknown error occurred.";
}

export function useSetup() {
  const { setup } = useSLOService();
  const { data, isLoading, isError, refetch } = useQuery<ApiMessage>({
    queryKey: ["slo-setup"],
    queryFn: setup,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  return { data, isLoading, isError, refetch };
}

export function useGetApplicationSLO(project_slo_id: number, application_id: number) {
  const { getApplicationSLO } = useSLOService();
  const { data, isLoading, isError, refetch } = useQuery<ApplicationSlo[] | ApiMessage>({
    queryKey: ["application-slo", project_slo_id, application_id],
    queryFn: () => getApplicationSLO(project_slo_id, application_id),
    enabled: !!project_slo_id && !!application_id,
  });
  return { data, isLoading, isError, refetch };
}

export function useGetProjectSLO(project_id: number) {
  const { getProjectSLO } = useSLOService();
  const { data, isLoading, isError, refetch } = useQuery<ProjectSlo | ApiMessage>({
    queryKey: ["project-slo", project_id],
    queryFn: () => getProjectSLO(project_id),
    enabled: !!project_id,
  });
  return { data, isLoading, isError, refetch };
}

export function useGetProjectApplicationSLO(project_slo_id: number) {
  const { getProjectApplicationSLO } = useSLOService();
  const { data, isLoading, isError, refetch } = useQuery<ApplicationSlo | ApiError>({
    queryKey: ["project-application-slo", project_slo_id],
    queryFn: () => getProjectApplicationSLO(project_slo_id),
    enabled: !!project_slo_id,
  });
  return { data, isLoading, isError, refetch };
}

export function useGenerateGrafanaPanelUrl(application_slo_id: number, panel_id: number) {
  const { generateGrafanaPanelUrl } = useSLOService();
  const { data, isLoading, isError, refetch } = useQuery<GrafanaPanelUrlResponse | ApiError>({
    queryKey: ["grafana-panel-url", application_slo_id, panel_id],
    queryFn: () => generateGrafanaPanelUrl(application_slo_id, panel_id),
    enabled: !!application_slo_id && !!panel_id,
  });
  return { data, isLoading, isError, refetch };
}

export function useCreateApplicationSLO() {
  const { createApplicationSLO } = useSLOService();
  const { mutateAsync, isError, error, isPending } = useMutation({
    mutationFn: async (payload: Omit<ApplicationSlo, "id" | "panelurl">) => {
      try {
        return await createApplicationSLO(payload);
      } catch (error: any) {
        throw new Error(extractErrorMessage(error));
      }
    },
  });
  return { mutateAsync, isError, error, isLoading: isPending };
}

export function useCreateProjectSLO() {
  const { createProjectSLO } = useSLOService();
  const { mutateAsync, isError, error, isPending } = useMutation({
    mutationFn: async (payload: Omit<ProjectSlo, "id">) => {
      try {
        return await createProjectSLO(payload);
      } catch (error: any) {
        throw new Error(extractErrorMessage(error));
      }
    },
  });
  return { mutateAsync, isError, error, isLoading: isPending };
}

export function useGeneratePrometheusRules() {
  const { generatePrometheusRules } = useSLOService();

  const { mutateAsync, isError, error, isPending } = useMutation({
    mutationFn: async (slo_id: number) => {
      try {
        return await generatePrometheusRules({ slo_id });
      } catch (error: any) {
        throw new Error(extractErrorMessage(error));
      }
    },
  });

  return { mutateAsync, isError, error, isLoading: isPending };
}

export function useGenerateDashboard() {
  const { generateDashboard } = useSLOService();
  const { mutateAsync, isError, error, isPending } = useMutation({
    mutationFn: async (project_slo_id: number) => {
      try {
        return await generateDashboard({ project_slo_id });
      } catch (error: any) {
        throw new Error(extractErrorMessage(error));
      }
    },
  });
  return { mutateAsync, isError, error, isLoading: isPending };
}

export function useWebhook() {
  const { webhook } = useSLOService();
  const { mutateAsync, isError, error, isPending } = useMutation({
    mutationFn: async (payload: WebhookPayload) => {
      try {
        return await webhook(payload);
      } catch (error: any) {
        throw new Error(extractErrorMessage(error));
      }
    },
  });
  return { mutateAsync, isError, error, isLoading: isPending };
}
