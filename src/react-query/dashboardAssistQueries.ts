import { useMutation, useQuery } from "@tanstack/react-query";
import useDashboardService from "services/dashboardassist.service";

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

export function useGenerateDashboard() {
  const { generateDashboard } = useDashboardService();

  const mutation = useMutation({
    mutationFn: (payload: GenerateDashboardPayload) => generateDashboard(payload),
  });

  return {
    mutateAsync: mutation.mutateAsync,
    isError: mutation.isError,
    error: mutation.error,
    isLoading: mutation.isPending,
  };
}

export function useUploadDashboard() {
  const { uploadDashboard } = useDashboardService();

  const mutation = useMutation({
    mutationFn: (payload: UploadDashboardPayload) => uploadDashboard(payload),
  });

  return {
    mutateAsync: mutation.mutateAsync,
    isError: mutation.isError,
    error: mutation.error,
    isLoading: mutation.isPending,
  };
}

export function useGetDashboardHistory(payload: DashboardHistoryPayload) {
  const { getHistory } = useDashboardService();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard-history", payload],
    queryFn: () => getHistory(payload),
    enabled: !!payload.project_id && !!payload.application_id,
  });

  return {
    data,
    isLoading,
    isError,
    error,
    refetch,
  };
}

export function useGetDeployments(payload: GetDeploymentsPayload) {
  const { getDeployments } = useDashboardService();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey:["deployments", payload],
    queryFn: () => getDeployments(payload),
    enabled: !!payload.project_id && !!payload.application_id,
  });

  return {
    data, 
    isLoading,
    isError,
    error,
    refetch,
  };
}
