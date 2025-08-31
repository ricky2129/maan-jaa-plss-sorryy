import { useMutation, useQuery } from "@tanstack/react-query";
import { DriftAssistUrl } from "constant/url.constant";
import { QUERY_KEY } from "constant/queryKey.constants";
import { useIntegrationService } from "services";

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
  const response = await fetch(DriftAssistUrl.CONNECT_AWS, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const responseText = await response.text();
    
    let errorData;
    try {
      errorData = JSON.parse(responseText);
    } catch {
      errorData = { error: 'Invalid JSON response', raw: responseText };
    }
    
    throw new Error(errorData.detail || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();
  return result;
};

const getS3Buckets = async (sessionId: string): Promise<GetS3BucketsResponse> => {
  const response = await fetch(`${DriftAssistUrl.GET_S3_BUCKETS}/${sessionId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail?.details || errorData.detail || errorData.error || 'Failed to load S3 buckets');
  }

  const result = await response.json();
  return result;
};

const getStateFiles = async (sessionId: string, bucketName: string): Promise<GetStateFilesResponse> => {
  const response = await fetch(`${DriftAssistUrl.GET_STATE_FILES}/${sessionId}/${bucketName}/state-files`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    if (response.status === 404) {
      throw new Error(errorData.detail?.details || errorData.detail || `Selected bucket '${bucketName}' has no state files.`);
    }
    throw new Error(errorData.detail?.details || errorData.detail || errorData.error || 'Failed to scan bucket for state files');
  }

  const result = await response.json();
  return result;
};

const analyzeBucket = async (data: AnalyzeBucketRequest): Promise<AnalyzeBucketResponse> => {
  const response = await fetch(DriftAssistUrl.ANALYZE_BUCKET, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.details || errorData.error || 'Failed to analyze S3 state files');
  }

  const result = await response.json();
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
  return useQuery({
    queryKey: [QUERY_KEY.GET_S3_BUCKETS, sessionId],
    queryFn: () => getS3Buckets(sessionId),
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
  const response = await fetch(`${DriftAssistUrl.LIST_STORED_ANALYSES}/${projectId}/${applicationId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || errorData.error || 'Failed to fetch stored analyses');
  }

  const result = await response.json();
  return result;
};

const getStoredAnalysis = async (projectId: string, applicationId: string, analysisId: number): Promise<StoredAnalysisData> => {
  const response = await fetch(`${DriftAssistUrl.GET_STORED_ANALYSIS}/${projectId}/${applicationId}/${analysisId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || errorData.error || 'Failed to fetch analysis details');
  }

  const result = await response.json();
  return result;
};

// React Query Hooks for stored analyses
export const useListStoredAnalyses = (projectId: string, applicationId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: [QUERY_KEY.LIST_STORED_ANALYSES, projectId, applicationId],
    queryFn: () => listStoredAnalyses(projectId, applicationId),
    enabled: enabled && !!projectId && !!applicationId,
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
  });
};

export const useGetStoredAnalysis = (projectId: string, applicationId: string, analysisId: number, enabled: boolean = false) => {
  return useQuery({
    queryKey: [QUERY_KEY.GET_STORED_ANALYSIS, projectId, applicationId, analysisId],
    queryFn: () => getStoredAnalysis(projectId, applicationId, analysisId),
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

// React Query Hooks for integration management
export const useCreateDriftAssistSecret = () => {
  const { createDriftAssistSecret } = useIntegrationService();

  return useMutation({
    mutationFn: createDriftAssistSecret,
    mutationKey: [QUERY_KEY.CREATE_DRIFT_ASSIST_SECRET],
  });
};

export const useListDriftAssistSecrets = (projectId: number, enabled: boolean = true) => {
  const { getSecretKeysByProjectId } = useIntegrationService();
  
  console.log('🔍 ACCOUNT SELECTION DEBUG: useListDriftAssistSecrets called:', { 
    projectId, 
    enabled,
    hasProjectId: !!projectId,
    infrastructureId: 4
  });
  
  return useQuery({
    queryKey: [QUERY_KEY.LIST_DRIFT_ASSIST_SECRETS, projectId],
    queryFn: async () => {
      console.log('🔍 ACCOUNT SELECTION DEBUG: Executing getSecretKeysByProjectId with:', {
        infrastructureId: 4,
        projectId: projectId.toString(),
        url: `/integration/list_secrets/4/${projectId}`
      });
      
      try {
        const result = await getSecretKeysByProjectId(4, projectId.toString());
        console.log('🔍 ACCOUNT SELECTION DEBUG: getSecretKeysByProjectId result:', {
          success: true,
          resultType: typeof result,
          isArray: Array.isArray(result),
          length: Array.isArray(result) ? result.length : 'N/A',
          result: result
        });
        return result;
      } catch (error) {
        console.error('🔍 ACCOUNT SELECTION DEBUG: getSecretKeysByProjectId failed:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error?.constructor?.name || 'Unknown',
          stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
      }
    },
    enabled: enabled && !!projectId,
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
  });
};

export const useGetDriftAssistSecret = (integrationId: number, enabled: boolean = false) => {
  const { getDriftAssistSecret } = useIntegrationService();
  
  return useQuery({
    queryKey: [QUERY_KEY.GET_DRIFT_ASSIST_SECRET, integrationId],
    queryFn: () => getDriftAssistSecret(integrationId.toString()),
    enabled: enabled && !!integrationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

export const useGetSecretValues = (integrationId: number, enabled: boolean = false) => {
  const { getSecretValues } = useIntegrationService();
  
  return useQuery({
    queryKey: [QUERY_KEY.GET_SECRET_VALUES, integrationId],
    queryFn: () => getSecretValues(integrationId.toString()),
    enabled: enabled && !!integrationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

// Enhanced connectToAWS function that uses stored credentials
export const useConnectToAWSWithIntegration = () => {
  const { getDriftAssistSecret } = useIntegrationService();
  
  const connectToAWSWithIntegration = async (integrationId: number): Promise<ConnectAWSResponse> => {
    console.log('🔐 DRIFT ASSIST DEBUG: connectToAWSWithIntegration called');
    console.log('📍 Integration ID:', integrationId);

    try {
      // Get the drift assist secret values from the integration
      console.log('🔍 Fetching secret values from ressuite backend...');
      const secretValues = await getDriftAssistSecret(integrationId.toString());
      
      console.log('📤 Retrieved secret values:', {
        rawResponse: secretValues,
        hasAccessKey: !!secretValues?.access_key,
        hasSecretKey: !!secretValues?.secret_access_key,
        hasRegion: !!secretValues?.region,
        cloudProvider: secretValues?.cloud_provider,
        accessKeyLength: secretValues?.access_key?.length,
        secretKeyLength: secretValues?.secret_access_key?.length,
        region: secretValues?.region,
        accessKeyPrefix: secretValues?.access_key?.substring(0, 4)
      });

      // Validate that we have all required fields
      if (!secretValues) {
        console.error('❌ No secret values returned from backend');
        throw new Error('No secret values returned from backend. Please check if the integration exists and has valid credentials.');
      }

      // Check if secretValues is an error response
      if (typeof secretValues === 'string' && secretValues.includes('error')) {
        console.error('❌ Backend returned error string:', secretValues);
        throw new Error(`Backend error: ${secretValues}`);
      }

      // Handle case where backend returns empty string or invalid data
      if (typeof secretValues === 'string' && secretValues === '') {
        console.error('❌ Backend returned empty string');
        throw new Error('Backend returned empty response. Please check if the integration has valid credentials.');
      }

      // Validate required fields exist
      if (!secretValues.access_key || !secretValues.secret_access_key) {
        console.error('❌ Missing required credentials in secret:', {
          hasAccessKey: !!secretValues.access_key,
          hasSecretKey: !!secretValues.secret_access_key,
          secretKeys: Object.keys(secretValues),
          secretValues: secretValues
        });
        throw new Error('Invalid credentials: Missing access_key or secret_access_key. Please check your stored AWS credentials.');
      }

      const connectRequest: ConnectAWSRequest = {
        provider: "aws",
        credentials: {
          access_key: secretValues.access_key,
          secret_key: secretValues.secret_access_key,
        },
        region: secretValues.region || 'us-east-1', // Default region if not specified
      };

      console.log('📤 Connect request prepared:', {
        provider: connectRequest.provider,
        region: connectRequest.region,
        hasCredentials: !!connectRequest.credentials,
        hasAccessKey: !!connectRequest.credentials?.access_key,
        hasSecretKey: !!connectRequest.credentials?.secret_key,
        accessKeyLength: connectRequest.credentials?.access_key?.length,
        secretKeyLength: connectRequest.credentials?.secret_key?.length,
        accessKeyPrefix: connectRequest.credentials?.access_key?.substring(0, 4)
      });

      console.log('🌐 Sending request to Drift Assist backend:', DriftAssistUrl.CONNECT_AWS);

      const response = await fetch(DriftAssistUrl.CONNECT_AWS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(connectRequest),
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

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
        console.error('❌ Full request details:', {
          url: DriftAssistUrl.CONNECT_AWS,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(connectRequest, null, 2)
        });
        
        // Provide more specific error messages based on status code
        let errorMessage = errorData.detail || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        
        if (response.status === 401 || response.status === 403) {
          errorMessage = 'Invalid AWS credentials. Please check your stored access key and secret key.';
        } else if (response.status === 422) {
          errorMessage = 'Invalid request format. Please check your credentials format.';
        } else if (response.status >= 500) {
          errorMessage = 'DriftAssist backend server error. Please try again later.';
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Success response:', result);
      return result;
      
    } catch (error) {
      console.error('❌ connectToAWSWithIntegration failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error?.constructor?.name || 'Unknown',
        integrationId,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Re-throw with more context but preserve the original error message
      if (error instanceof Error) {
        // Don't wrap the error message if it's already descriptive
        if (error.message.includes('Failed to retrieve connection details')) {
          throw error;
        } else {
          throw new Error(error.message);
        }
      } else {
        throw new Error('Failed to retrieve connection details: Unknown error occurred');
      }
    }
  };

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
