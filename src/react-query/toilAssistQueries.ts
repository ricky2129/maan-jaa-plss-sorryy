import { useMutation, useQuery } from "@tanstack/react-query";
import useToilAssistService from "services/toilassist.service";
import {
  ProjectTicket,
  Project,
  TicketRunbook,
  Ticket,
  RemediationResponse,
  TicketComment,
  GrafanaAlertRequest,
  JiraApprovalWebhookRequest,
} from "../interfaces/toilAssist";

export function useGetProjectTickets(projectKey: string) {
  const { getProjectTickets } = useToilAssistService();
  const { data, isLoading, isError, refetch } = useQuery<ProjectTicket[]>({
    queryKey: ["project-tickets", projectKey],
    queryFn: () => getProjectTickets(projectKey),
    enabled: !!projectKey,
  });
  return {
    data,
    isLoading,
    isError,
    refetch,
  };
}

export function useGetProjectOpenTickets(projectKey: string) {
  const { getProjectOpenTickets } = useToilAssistService();
  const { data, isLoading, isError, refetch } = useQuery<ProjectTicket[]>({
    queryKey: ["project-open-tickets", projectKey],
    queryFn: () => getProjectOpenTickets(projectKey),
    enabled: !!projectKey,
  });
  return {
    data,
    isLoading,
    isError,
    refetch,
  };
}

export function useGetProject(projectKey: string) {
  const { getProject } = useToilAssistService();
  const { data, isLoading, isError, refetch } = useQuery<Project>({
    queryKey: ["project", projectKey],
    queryFn: () => getProject(projectKey),
    enabled: !!projectKey,
  });
  return {
    data,
    isLoading,
    isError,
    refetch,
  };
}

export function useGetTicketRunbook(ticketKey: string) {
  const { getTicketRunbook } = useToilAssistService();
  const { data, isLoading, isError, error, refetch } = useQuery<TicketRunbook>({
    queryKey: ["ticket-runbook", ticketKey],
    queryFn: () => getTicketRunbook(ticketKey),
    enabled: !!ticketKey,
  });
  return {
    data,
    isLoading,
    isError,
    error,
    refetch,
  };
}

export function useGetTicket(ticketKey: string) {
  const { getTicket } = useToilAssistService();
  const { data, isLoading, isError, error, refetch } = useQuery<Ticket>({
    queryKey: ["ticket", ticketKey],
    queryFn: () => getTicket(ticketKey),
    enabled: !!ticketKey,
  });
  return { 
    data, 
    isLoading, 
    isError, 
    error, 
    refetch };
}

export function useApproveRemediation() {
  const { approveRemediation } = useToilAssistService();
  const { mutateAsync, isError, error, isPending } = useMutation({
    mutationFn: (ticketKey: string) => approveRemediation(ticketKey),
  });
   return { 
    mutateAsync, 
    isError, 
    error, 
    isLoading: isPending 
  };
}

export function useDeclineRemediation() {
  const { declineRemediation } = useToilAssistService();
  const { mutateAsync, isError, error, isPending } = useMutation({
    mutationFn: (ticketKey: string) => declineRemediation(ticketKey),
  });
   return { 
    mutateAsync, 
    isError, 
    error, 
    isLoading: isPending 
  };
}

export function useGetTicketComments(ticketKey: string) {
  const { getTicketComments } = useToilAssistService();
  const { data, isLoading, isError, refetch } = useQuery<TicketComment[]>({
    queryKey: ["ticket-comments", ticketKey],
    queryFn: () => getTicketComments(ticketKey),
    enabled: !!ticketKey,
  });
  return {
    data,
    isLoading,
    isError,
    refetch,
  };
}

export function usePostGrafanaAlert() {
  const { postGrafanaAlert } = useToilAssistService();
  const { mutateAsync, isError, error, isPending } = useMutation({
    mutationFn: (payload: GrafanaAlertRequest) => postGrafanaAlert(payload),
  });
  return { 
    mutateAsync, 
    isError, 
    error, 
    isLoading: isPending 
  };
}

export function usePostJiraApprovalWebhook() {
  const { postJiraApprovalWebhook } = useToilAssistService();
  const { mutateAsync, isError, error, isPending } = useMutation({
    mutationFn: (payload: JiraApprovalWebhookRequest) => postJiraApprovalWebhook(payload),
  });
   return { 
    mutateAsync, 
    isError, 
    error, 
    isLoading: isPending 
  };
}


export function useGetInjectFaultDisk(p0: { projectKey: string; enabled: boolean; }) {
  const { getInjectFaultDisk } = useToilAssistService();
  const { data, isLoading, isError, refetch } = useQuery<any>({
    queryKey: ["inject-fault-disk"],
    queryFn: () => getInjectFaultDisk(),
    enabled: p0.enabled, 
  });
  return {
    data,
    isLoading,
    isError,
    refetch,
  };
}
