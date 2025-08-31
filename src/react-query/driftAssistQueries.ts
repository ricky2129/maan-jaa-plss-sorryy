import { useMutation, useQuery } from "@tanstack/react-query";
import { DriftAssistUrl } from "constant/url.constant";
import { QUERY_KEY } from "constant/queryKey.constants";

// Types based on original project
interface AWSCredentials {
  access_key: string;
  secret_key: string;
}

interface ConnectAWSRequest {
  provider: string;
  credentials: AWSCredentials;
  region: string;
}

interface ConnectAWSResponse {
  session_id: string;
}

interface S3Bucket {
  name: string;
  creation_date: string;
}

interface GetS3BucketsResponse {
  buckets: S3Bucket[];
}

interface StateFile {
  key: string;
  size: number;
  last_modified: string;
}

interface GetStateFilesResponse {
  state_files: StateFile[];
}

interface AnalyzeBucketRequest {
  session_id: string;
  bucket_name: string;
  selected_resources: string[];
}

interface AnalyzeBucketResponse {
  status: string;
  bucket_name: string;
  total_files: number;
  successful_analyses: number;
  failed_analyses: number;
  analysis_results: Array<{
    file_name: string;
    file_key: string;
    status: string;
    error?: string;
    size: number;
    last_modified: string;
    analysis_data?: any;
    terraform_analysis?: any;
  }>;
  type: string;
  intelligent_analysis: boolean;
}

// API Functions
const connectToAWS = async (data: ConnectAWSRequest): Promise<ConnectAWSResponse> => {
  console.log('🔐 DRIFT ASSIST DEBUG: connectToAWS called');
  console.log('📍 Backend URL:', DriftAssistUrl.CONNECT_AWS);
  console.log('📤 Request payload:', JSON.stringify(data, null, 2));
  console.log('📤 Request details:', {
    provider: data.provider,
    region: data.region,
    hasCredentials: !!data.credentials,
    hasAccessKey: !!data.credentials?.access_key,
    hasSecretKey: !!data.credentials?.secret_key,
    accessKeyLength: data.credentials?.access_key?.length,
    secretKeyLength: data.credentials?.secret_key?.length,
    accessKeyPrefix: data.credentials?.access_key?.substring(0, 4)
  });

  const response = await fetch(DriftAssistUrl.CONNECT_AWS, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  console.log('📥 Response status:', response.status);
  console.log('📥 Response headers:', response.headers);

  if (!response.ok) {
    const responseText = await response.text();
    console.error('❌ Error response body (raw):', responseText);
    
    let errorData;
    try {
      errorData = JSON.parse(responseText);
    } catch {
      errorData = { error: 'Invalid JSON response', raw: responseText };
    }
    
    console.error('❌ Parsed error:', errorData);
    console.error('❌ Request that failed:', {
      url: DriftAssistUrl.CONNECT_AWS,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data, null, 2)
    });
    
    throw new Error(errorData.detail || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();
  console.log('✅ Success response:', result);
  return result;
};

const getS3Buckets = async (sessionId: string): Promise<GetS3BucketsResponse> => {
  console.log('🪣 API: getS3Buckets called with:', {
    sessionId,
    url: `${DriftAssistUrl.GET_S3_BUCKETS}/${sessionId}`
  });

  const response = await fetch(`${DriftAssistUrl.GET_S3_BUCKETS}/${sessionId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  console.log('🪣 API: getS3Buckets response status:', response.status);

  if (!response.ok) {
    const errorData = await response.json();
    console.error('❌ API: getS3Buckets failed:', errorData);
    throw new Error(errorData.detail?.details || errorData.detail || errorData.error || 'Failed to load S3 buckets');
  }

  const result = await response.json();
  console.log('✅ API: getS3Buckets success:', { bucketCount: result.buckets?.length || 0 });
  return result;
};

const getStateFiles = async (sessionId: string, bucketName: string): Promise<GetStateFilesResponse> => {
  console.log('📄 API: getStateFiles called with:', {
    sessionId,
    bucketName,
    url: `${DriftAssistUrl.GET_STATE_FILES}/${sessionId}/${bucketName}/state-files`
  });

  const response = await fetch(`${DriftAssistUrl.GET_STATE_FILES}/${sessionId}/${bucketName}/state-files`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  console.log('📄 API: getStateFiles response status:', response.status);

  if (!response.ok) {
    const errorData = await response.json();
    console.error('❌ API: getStateFiles failed:', errorData);
    if (response.status === 404) {
      throw new Error(errorData.detail?.details || errorData.detail || `Selected bucket '${bucketName}' has no state files.`);
    }
    throw new Error(errorData.detail?.details || errorData.detail || errorData.error || 'Failed to scan bucket for state files');
  }

  const result = await response.json();
  console.log('✅ API: getStateFiles success:', { 
    stateFileCount: result.state_files?.length || 0,
    files: result.state_files?.map(f => f.key) || []
  });
  return result;
};

const analyzeBucket = async (data: AnalyzeBucketRequest): Promise<AnalyzeBucketResponse> => {
  console.log('🔍 API: analyzeBucket called with:', {
    sessionId: data.session_id,
    bucketName: data.bucket_name,
    selectedResources: data.selected_resources,
    resourceCount: data.selected_resources.length,
    url: DriftAssistUrl.ANALYZE_BUCKET
  });

  const response = await fetch(DriftAssistUrl.ANALYZE_BUCKET, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  console.log('🔍 API: analyzeBucket response status:', response.status);

  if (!response.ok) {
    const errorData = await response.json();
    console.error('❌ API: analyzeBucket failed:', errorData);
    throw new Error(errorData.details || errorData.error || 'Failed to analyze S3 state files');
  }

  const result = await response.json();
  console.log('✅ API: analyzeBucket success:', {
    status: result.status,
    totalFiles: result.total_files,
    successfulAnalyses: result.successful_analyses,
    failedAnalyses: result.failed_analyses,
    analysisResultsCount: result.analysis_results?.length || 0
  });
  return result;
};

// React Query Hooks
export const useConnectToAWS = () => {
  return useMutation({
    mutationFn: connectToAWS,
    mutationKey: [QUERY_KEY.CONNECT_AWS],
  });
};

export const useGetS3Buckets = (sessionId: string, enabled: boolean = true) => {
  console.log('🪣 useGetS3Buckets called:', { 
    sessionId, 
    enabled, 
    hasSessionId: !!sessionId,
    sessionIdType: typeof sessionId,
    sessionIdValue: sessionId
  });
  
  return useQuery({
    queryKey: [QUERY_KEY.GET_S3_BUCKETS, sessionId],
    queryFn: () => {
      console.log('🪣 Executing getS3Buckets for session:', sessionId);
      return getS3Buckets(sessionId);
    },
    enabled: enabled && !!sessionId && sessionId !== 'undefined' && sessionId !== 'null',
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useGetStateFiles = (sessionId: string, bucketName: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: [QUERY_KEY.GET_STATE_FILES, sessionId, bucketName],
    queryFn: () => getStateFiles(sessionId, bucketName),
    enabled: enabled && !!sessionId && !!bucketName,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useAnalyzeBucket = () => {
  return useMutation({
    mutationFn: analyzeBucket,
    mutationKey: [QUERY_KEY.ANALYZE_BUCKET],
  });
};

// Legacy hook for backward compatibility (if needed)
export const useCreateDriftAnalysis = () => {
  return useMutation({
    mutationFn: async (data: any) => {
      // This can be removed or adapted based on your needs
      throw new Error('Use the new AWS-based drift analysis flow');
    },
  });
};

// New types for stored analyses
interface StoredAnalysisItem {
  analysis_id: number;
  created_at: string;
}

interface AnalysisListResponse {
  analyses: StoredAnalysisItem[];
}

interface StoredAnalysisData {
  session_id: string;
  file_name: string;
  selected_resources: string[];
  analysis_data: any[];
  drift_results: any[];
  terraform_analysis?: any;
  session_summary: any;
  completed_at: string;
  project_id: string;
  application_id: string;
  analysis_id: number;
}

// API Functions for stored analyses
const listStoredAnalyses = async (projectId: string, applicationId: string): Promise<AnalysisListResponse> => {
  console.log('📋 API: listStoredAnalyses called with:', { projectId, applicationId });
  
  const response = await fetch(`${DriftAssistUrl.LIST_STORED_ANALYSES}/${projectId}/${applicationId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  console.log('📋 API: listStoredAnalyses response status:', response.status);

  if (!response.ok) {
    const errorData = await response.json();
    console.error('❌ API: listStoredAnalyses failed:', errorData);
    throw new Error(errorData.detail || errorData.error || 'Failed to fetch stored analyses');
  }

  const result = await response.json();
  console.log('✅ API: listStoredAnalyses success:', { analysesCount: result.analyses?.length || 0 });
  return result;
};

const getStoredAnalysis = async (projectId: string, applicationId: string, analysisId: number): Promise<StoredAnalysisData> => {
  console.log('📄 API: getStoredAnalysis called with:', { projectId, applicationId, analysisId });
  
  const response = await fetch(`${DriftAssistUrl.GET_STORED_ANALYSIS}/${projectId}/${applicationId}/${analysisId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  console.log('📄 API: getStoredAnalysis response status:', response.status);

  if (!response.ok) {
    const errorData = await response.json();
    console.error('❌ API: getStoredAnalysis failed:', errorData);
    throw new Error(errorData.detail || errorData.error || 'Failed to fetch analysis details');
  }

  const result = await response.json();
  console.log('✅ API: getStoredAnalysis success');
  return result;
};

// React Query Hooks for stored analyses
export const useListStoredAnalyses = (projectId: string, applicationId: string, enabled: boolean = true) => {
  console.log('📋 useListStoredAnalyses called:', { 
    projectId, 
    applicationId, 
    enabled,
    hasProjectId: !!projectId,
    hasApplicationId: !!applicationId
  });
  
  return useQuery({
    queryKey: [QUERY_KEY.LIST_STORED_ANALYSES, projectId, applicationId],
    queryFn: () => {
      console.log('📋 Executing listStoredAnalyses for:', { projectId, applicationId });
      return listStoredAnalyses(projectId, applicationId);
    },
    enabled: enabled && !!projectId && !!applicationId,
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
  });
};

export const useGetStoredAnalysis = (projectId: string, applicationId: string, analysisId: number, enabled: boolean = false) => {
  console.log('📄 useGetStoredAnalysis called:', { 
    projectId, 
    applicationId, 
    analysisId, 
    enabled,
    hasProjectId: !!projectId,
    hasApplicationId: !!applicationId,
    hasAnalysisId: !!analysisId
  });
  
  return useQuery({
    queryKey: [QUERY_KEY.GET_STORED_ANALYSIS, projectId, applicationId, analysisId],
    queryFn: () => {
      console.log('📄 Executing getStoredAnalysis for:', { projectId, applicationId, analysisId });
      return getStoredAnalysis(projectId, applicationId, analysisId);
    },
    enabled: enabled && !!projectId && !!applicationId && !!analysisId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

// New types for integration management
interface DriftAssistSecret {
  cloud_provider: string;
  access_key: string;
  secret_access_key: string;
  region: string;
}

interface Tag {
  key: string;
  value: string;
}

interface DriftAssistIntegrationRequest {
  name: string;
  project_id: number;
  secret: DriftAssistSecret;
  access: string;
  tags?: Tag[];
}

interface DriftAssistIntegration {
  id: number;
  name: string;
  infrastructure_id: number;
  secret_manager_key: string;
  org_id: number;
  project_id: number;
  access: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

interface DriftAssistSecretResponse {
  cloud_provider: string;
  access_key: string;
  secret_access_key: string;
  region: string;
}

// API Functions for integration management
const createDriftAssistSecret = async (data: DriftAssistIntegrationRequest): Promise<DriftAssistIntegration> => {
  console.log('🔐 API: createDriftAssistSecret called with:', {
    name: data.name,
    projectId: data.project_id,
    access: data.access,
    tagsCount: data.tags?.length || 0
  });

  const response = await fetch('/integration/createDriftAssistSecret', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
    },
    body: JSON.stringify(data),
  });

  console.log('🔐 API: createDriftAssistSecret response status:', response.status);

  if (!response.ok) {
    const errorData = await response.json();
    console.error('❌ API: createDriftAssistSecret failed:', errorData);
    throw new Error(errorData.detail || errorData.error || 'Failed to create drift assist secret');
  }

  const result = await response.json();
  console.log('✅ API: createDriftAssistSecret success:', { integrationId: result.id });
  return result;
};

const listDriftAssistSecrets = async (projectId: number): Promise<DriftAssistIntegration[]> => {
  console.log('📋 API: listDriftAssistSecrets called with:', { projectId });
  
  // Infrastructure ID 4 is hardcoded for Drift Assist as mentioned in requirements
  const infrastructureId = 4;
  
  const response = await fetch(`/integration/list_secrets/${infrastructureId}/${projectId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
    },
  });

  console.log('📋 API: listDriftAssistSecrets response status:', response.status);

  if (!response.ok) {
    const errorData = await response.json();
    console.error('❌ API: listDriftAssistSecrets failed:', errorData);
    throw new Error(errorData.detail || errorData.error || 'Failed to list drift assist secrets');
  }

  const result = await response.json();
  console.log('✅ API: listDriftAssistSecrets success:', { secretsCount: result.length });
  return result;
};

const getDriftAssistSecret = async (integrationId: number): Promise<DriftAssistSecretResponse> => {
  console.log('🔑 API: getDriftAssistSecret called with:', { integrationId });
  
  const response = await fetch(`/integration/getDriftAssistSecret/${integrationId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
    },
  });

  console.log('🔑 API: getDriftAssistSecret response status:', response.status);

  if (!response.ok) {
    const errorData = await response.json();
    console.error('❌ API: getDriftAssistSecret failed:', errorData);
    throw new Error(errorData.detail || errorData.error || 'Failed to get drift assist secret');
  }

  const result = await response.json();
  console.log('✅ API: getDriftAssistSecret success');
  return result;
};

const getSecretValues = async (integrationId: number): Promise<any> => {
  console.log('🔓 API: getSecretValues called with:', { integrationId });
  
  const response = await fetch(`/integration/get_secret_values/${integrationId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
    },
  });

  console.log('🔓 API: getSecretValues response status:', response.status);

  if (!response.ok) {
    const errorData = await response.json();
    console.error('❌ API: getSecretValues failed:', errorData);
    throw new Error(errorData.detail || errorData.error || 'Failed to get secret values');
  }

  const result = await response.json();
  console.log('✅ API: getSecretValues success');
  return result;
};

// React Query Hooks for integration management
export const useCreateDriftAssistSecret = () => {
  return useMutation({
    mutationFn: createDriftAssistSecret,
    mutationKey: [QUERY_KEY.CREATE_DRIFT_ASSIST_SECRET],
  });
};

export const useListDriftAssistSecrets = (projectId: number, enabled: boolean = true) => {
  console.log('📋 useListDriftAssistSecrets called:', { 
    projectId, 
    enabled,
    hasProjectId: !!projectId
  });
  
  return useQuery({
    queryKey: [QUERY_KEY.LIST_DRIFT_ASSIST_SECRETS, projectId],
    queryFn: () => {
      console.log('📋 Executing listDriftAssistSecrets for project:', projectId);
      return listDriftAssistSecrets(projectId);
    },
    enabled: enabled && !!projectId,
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
  });
};

export const useGetDriftAssistSecret = (integrationId: number, enabled: boolean = false) => {
  console.log('🔑 useGetDriftAssistSecret called:', { 
    integrationId, 
    enabled,
    hasIntegrationId: !!integrationId
  });
  
  return useQuery({
    queryKey: [QUERY_KEY.GET_DRIFT_ASSIST_SECRET, integrationId],
    queryFn: () => {
      console.log('🔑 Executing getDriftAssistSecret for integration:', integrationId);
      return getDriftAssistSecret(integrationId);
    },
    enabled: enabled && !!integrationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

export const useGetSecretValues = (integrationId: number, enabled: boolean = false) => {
  console.log('🔓 useGetSecretValues called:', { 
    integrationId, 
    enabled,
    hasIntegrationId: !!integrationId
  });
  
  return useQuery({
    queryKey: [QUERY_KEY.GET_SECRET_VALUES, integrationId],
    queryFn: () => {
      console.log('🔓 Executing getSecretValues for integration:', integrationId);
      return getSecretValues(integrationId);
    },
    enabled: enabled && !!integrationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

// Enhanced connectToAWS function that uses stored credentials
const connectToAWSWithIntegration = async (integrationId: number): Promise<ConnectAWSResponse> => {
  console.log('🔐 DRIFT ASSIST DEBUG: connectToAWSWithIntegration called');
  console.log('📍 Integration ID:', integrationId);

  // First, get the secret values from the integration
  const secretValues = await getSecretValues(integrationId);
  
  console.log('📤 Retrieved secret values:', {
    hasAccessKey: !!secretValues.AWS_ACCESS_KEY_ID,
    hasSecretKey: !!secretValues.AWS_SECRET_ACCESS_KEY,
    hasRegion: !!secretValues.AWS_DEFAULT_REGION,
    accessKeyLength: secretValues.AWS_ACCESS_KEY_ID?.length,
    secretKeyLength: secretValues.AWS_SECRET_ACCESS_KEY?.length,
    region: secretValues.AWS_DEFAULT_REGION
  });

  const connectRequest: ConnectAWSRequest = {
    provider: "aws",
    credentials: {
      access_key: secretValues.AWS_ACCESS_KEY_ID,
      secret_key: secretValues.AWS_SECRET_ACCESS_KEY,
    },
    region: secretValues.AWS_DEFAULT_REGION,
  };

  console.log('📤 Connect request prepared:', {
    provider: connectRequest.provider,
    region: connectRequest.region,
    hasCredentials: !!connectRequest.credentials,
    hasAccessKey: !!connectRequest.credentials?.access_key,
    hasSecretKey: !!connectRequest.credentials?.secret_key
  });

  const response = await fetch(DriftAssistUrl.CONNECT_AWS, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(connectRequest),
  });

  console.log('📥 Response status:', response.status);

  if (!response.ok) {
    const responseText = await response.text();
    console.error('❌ Error response body (raw):', responseText);
    
    let errorData;
    try {
      errorData = JSON.parse(responseText);
    } catch {
      errorData = { error: 'Invalid JSON response', raw: responseText };
    }
    
    console.error('❌ Parsed error:', errorData);
    throw new Error(errorData.detail || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();
  console.log('✅ Success response:', result);
  return result;
};

export const useConnectToAWSWithIntegration = () => {
  return useMutation({
    mutationFn: connectToAWSWithIntegration,
    mutationKey: [QUERY_KEY.CONNECT_AWS_WITH_INTEGRATION],
  });
};

// Export types for use in components
export type {
  AWSCredentials,
  ConnectAWSRequest,
  ConnectAWSResponse,
  S3Bucket,
  GetS3BucketsResponse,
  StateFile,
  GetStateFilesResponse,
  AnalyzeBucketRequest,
  AnalyzeBucketResponse,
  StoredAnalysisItem,
  AnalysisListResponse,
  StoredAnalysisData,
  DriftAssistSecret,
  Tag,
  DriftAssistIntegrationRequest,
  DriftAssistIntegration,
  DriftAssistSecretResponse,
};
