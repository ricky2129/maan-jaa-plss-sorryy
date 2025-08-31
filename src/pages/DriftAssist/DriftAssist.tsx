import React, { useState, useEffect } from "react";
import { useDriftAssist } from "context";
import { 
  Card, 
  Button, 
  Select, 
  Alert, 
  Row, 
  Col, 
  Typography, 
  Space,
  message,
  Form,
  Steps,
  Input as AntInput
} from "antd";
import {
  CloudOutlined,
  DisconnectOutlined,
  DatabaseOutlined,
  SecurityScanOutlined,
  DesktopOutlined,
  FunctionOutlined,
  GlobalOutlined,
  UserOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  BarChartOutlined,
  ReloadOutlined,
  RightOutlined,
  SettingOutlined,
  HistoryOutlined,
  ArrowLeftOutlined
} from "@ant-design/icons";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { 
  useGetS3Buckets, 
  useGetStateFiles, 
  useAnalyzeBucket,
  useConnectToAWS,
  useListStoredAnalyses,
  useGetStoredAnalysis,
  type S3Bucket,
  type StateFile,
  type ConnectAWSRequest
} from "react-query/driftAssistQueries";
import { S3StreamingAnalysis, UnifiedResultsDisplay, StoredAnalysesCard, StoredAnalysisDisplay } from "components/DriftAssist";
import { ConfigureDriftAssist, Drawer } from "components";
import "./DriftAssist.styles.scss";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Step } = Steps;

interface DriftAssistProps {
  onClose?: () => void;
  onNavigateToWorkflow?: () => void;
  initialSessionId?: string;
  initialAwsCredentials?: any;
}

const DriftAssist: React.FC<DriftAssistProps> = ({ 
  onClose, 
  onNavigateToWorkflow, 
  initialSessionId, 
  initialAwsCredentials 
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  
  // Extract project_id and application_id from URL parameters
  const projectId = params.project;
  const applicationId = params.application;
  
  // Get sessionId from navigation state or props (for workflow integration)
  const sessionId = initialSessionId || location.state?.sessionId;
  const awsCredentials = initialAwsCredentials || location.state?.awsCredentials;

  // Use persistent state from context
  const {
    currentAnalysisData,
    analysisResults,
    isAnalyzing,
    setCurrentAnalysisData,
    setAnalysisResults,
    setIsAnalyzing,
    hasPersistedState,
    loadStateFromStorage,
    hasStarted,
    setHasStarted,
    clearAnalysisState
  } = useDriftAssist();

  const [selectedBucket, setSelectedBucket] = useState<string | undefined>();
  const [stateFiles, setStateFiles] = useState<StateFile[]>([]);
  const [activePreset, setActivePreset] = useState("common");
  const [showDetails, setShowDetails] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerForm] = Form.useForm();
  
  // Initialize step - will be set properly in useEffect
  const [currentStep, setCurrentStep] = useState(0);
  
  // Stored analyses state
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<number | null>(null);

  // Debug logging for state changes
  useEffect(() => {
    console.log('🔍 DriftAssist: State changed:', {
      hasCurrentAnalysisData: !!currentAnalysisData,
      hasAnalysisResults: !!analysisResults && Object.keys(analysisResults).length > 0,
      isAnalyzing,
      hasStarted,
      currentStep
    });
  }, [currentAnalysisData, analysisResults, isAnalyzing, hasStarted, currentStep]);
  
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(
    sessionId || initialSessionId
  );
  const [currentAwsCredentials, setCurrentAwsCredentials] = useState<any>(
    awsCredentials || initialAwsCredentials
  );

  // Handle sessionId and credentials from navigation state or props
  useEffect(() => {
    const finalSessionId = sessionId || initialSessionId;
    const finalCredentials = awsCredentials || initialAwsCredentials;
    
    console.log('🔄 DriftAssist: useEffect triggered');
    console.log('📊 DriftAssist: Checking persisted state...');
    
    // First check if we have persisted analysis state
    if (hasPersistedState()) {
      console.log('✅ DriftAssist: Found persisted state, loading...');
      const loaded = loadStateFromStorage();
      console.log('📥 DriftAssist: State loaded successfully:', loaded);
      console.log('📋 DriftAssist: Current analysis data after load:', currentAnalysisData);
      setCurrentStep(3); // Go directly to analysis view
      return;
    } else {
      console.log('❌ DriftAssist: No persisted state found');
    }
    
    // Then check props/navigation state
    if (finalSessionId && finalCredentials?.access_key && finalCredentials?.secret_key) {
      setCurrentSessionId(finalSessionId);
      setCurrentAwsCredentials(finalCredentials);
      setCurrentStep(0); // Go to bucket selection
    } 
    // Then check session storage
    else {
      try {
        const storedSession = sessionStorage.getItem('driftAssistSession');
        if (storedSession) {
          const session = JSON.parse(storedSession);
          
          if (session.sessionId && 
              session.awsCredentials?.access_key && 
              session.awsCredentials?.secret_key) {
            
            // Check if session is still fresh (less than 1 hour old)
            if (Date.now() - session.timestamp < 3600000) {
              setCurrentSessionId(session.sessionId);
              setCurrentAwsCredentials(session.awsCredentials);
              setCurrentStep(0); // Go to bucket selection
            } else {
              setCurrentStep(0); // Force to bucket selection
            }
          } else {
            setCurrentStep(0); // Force to bucket selection
          }
        } else {
          setCurrentStep(0); // Force to bucket selection
        }
      } catch (error) {
        console.error('Error reading from session storage:', error);
        setCurrentStep(0); // Force to bucket selection
      }
    }
  }, [sessionId, awsCredentials, initialSessionId, initialAwsCredentials, hasPersistedState, loadStateFromStorage]);

  // Add backend health check
  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        const driftAssistUrl = (import.meta as any).env?.VITE_DRIFT_ASSIST_URL || 'http://localhost:8004';
        const healthUrl = `${driftAssistUrl}/api/health`;
        const response = await fetch(healthUrl);
        
        if (!response.ok) {
          console.error('Backend health check failed with status:', response.status);
        }
      } catch (error) {
        console.error('Backend health check failed:', error);
      }
    };
    
    checkBackendHealth();
  }, []);

  // API hooks
  const { data: s3BucketsData, isLoading: isLoadingBuckets, error: bucketsError } = useGetS3Buckets(currentSessionId, !!currentSessionId);
  const { data: stateFilesData, isLoading: isLoadingStateFiles } = useGetStateFiles(currentSessionId, selectedBucket || "", !!currentSessionId && !!selectedBucket);
  const analyzeBucketMutation = useAnalyzeBucket();
  
  // Stored analyses hooks
  const { data: storedAnalysesData, isLoading: isLoadingStoredAnalyses, error: storedAnalysesError } = useListStoredAnalyses(
    projectId || '', 
    applicationId || '', 
    !!(projectId && applicationId)
  );
  const { data: selectedStoredAnalysis, isLoading: isLoadingSelectedAnalysis } = useGetStoredAnalysis(
    projectId || '', 
    applicationId || '', 
    selectedAnalysisId || 0, 
    !!(projectId && applicationId && selectedAnalysisId)
  );

  // Update state files when data changes
  useEffect(() => {
    if (stateFilesData?.state_files) {
      setStateFiles(stateFilesData.state_files);
    } else if (selectedBucket && stateFilesData && !stateFilesData.state_files) {
      setStateFiles([]);
    }
  }, [stateFilesData, selectedBucket]);

  const [resourceTypes, setResourceTypes] = useState([
    {
      id: "ec2",
      name: "EC2 Instances",
      description: "Virtual compute instances",
      category: "Compute",
      priority: "Medium",
      color: "#ff9500",
      icon: <DesktopOutlined />,
      selected: true
    },
    {
      id: "s3",
      name: "S3 Buckets", 
      description: "Object storage buckets",
      category: "Storage",
      priority: "Low",
      color: "#52c41a",
      icon: <DatabaseOutlined />,
      selected: true
    },
    {
      id: "iam",
      name: "IAM Users & Roles",
      description: "Identity and access management",
      category: "Security",
      priority: "High",
      color: "#f5222d",
      icon: <UserOutlined />,
      selected: true
    },
    {
      id: "rds",
      name: "RDS Databases",
      description: "Relational database instances",
      category: "Database",
      priority: "Medium",
      color: "#1890ff",
      icon: <DatabaseOutlined />,
      selected: false
    },
    {
      id: "lambda",
      name: "Lambda Functions",
      description: "Serverless compute functions",
      category: "Compute",
      priority: "Low",
      color: "#faad14",
      icon: <FunctionOutlined />,
      selected: false
    },
    {
      id: "vpc",
      name: "VPC Networks",
      description: "Virtual private cloud networks",
      category: "Networking",
      priority: "High",
      color: "#722ed1",
      icon: <GlobalOutlined />,
      selected: false
    }
  ]);

  const presets = [
    { id: "common", name: "Common Resources" },
    { id: "compute", name: "Compute Focus" },
    { id: "security", name: "Security Audit" },
    { id: "storage", name: "Storage & Data" }
  ];

  const selectedCount = resourceTypes.filter(r => r.selected).length;
  const totalCount = resourceTypes.length;
  const estimatedTime = selectedCount * 2; // 2 minutes per resource

  const handleResourceToggle = (resourceId: string) => {
    setResourceTypes(prev => 
      prev.map(resource => 
        resource.id === resourceId 
          ? { ...resource, selected: !resource.selected }
          : resource
      )
    );
  };

  const handlePresetSelect = (presetId: string) => {
    setActivePreset(presetId);
    
    // Apply preset logic
    setResourceTypes(prev => prev.map(resource => {
      switch (presetId) {
        case "common":
          return { ...resource, selected: ["ec2", "s3", "iam"].includes(resource.id) };
        case "compute":
          return { ...resource, selected: ["ec2", "lambda"].includes(resource.id) };
        case "security":
          return { ...resource, selected: ["iam", "vpc"].includes(resource.id) };
        case "storage":
          return { ...resource, selected: ["s3", "rds"].includes(resource.id) };
        default:
          return resource;
      }
    }));
  };

  const handleSelectAll = () => {
    setResourceTypes(prev => prev.map(resource => ({ ...resource, selected: true })));
  };

  const handleClearAll = () => {
    setResourceTypes(prev => prev.map(resource => ({ ...resource, selected: false })));
  };

  const handleBucketSelect = (bucketName: string) => {
    setSelectedBucket(bucketName);
    setStateFiles([]); // Clear previous state files
  };

  const handleAnalyze = async () => {
    if (!currentSessionId || !selectedBucket || selectedCount === 0) {
      message.error('Please select a bucket and at least one resource type');
      return;
    }

    if (stateFiles.length === 0) {
      message.error(`Selected bucket '${selectedBucket}' has no state files.`);
      return;
    }

    try {
      setIsAnalyzing(true);
      
      const selectedResources = resourceTypes
        .filter(resource => resource.selected)
        .map(resource => resource.id);

      // Show immediate feedback
      message.loading('Initializing drift analysis...', 2);

      // First, call the bucket analysis API to prepare all state files
      const bucketAnalysisResult = await analyzeBucketMutation.mutateAsync({
        session_id: currentSessionId,
        bucket_name: selectedBucket,
        selected_resources: selectedResources
      });

      // Set the analysis results for the results tab
      setAnalysisResults(bucketAnalysisResult);

      // Find the first ready state file for streaming analysis
      const readyFile = bucketAnalysisResult.analysis_results?.find(
        (file: any) => file.status === 'ready_for_analysis'
      );

      if (readyFile && readyFile.analysis_data) {
        setCurrentAnalysisData(readyFile.analysis_data);
        
        // Skip loading page and go directly to streaming analysis
        setCurrentStep(3);
        
        // Navigate to workflow tab if callback is provided
        if (onNavigateToWorkflow) {
          setTimeout(() => {
            onNavigateToWorkflow();
            message.success('Analysis started! Monitoring live progress...');
          }, 1000);
        } else {
          message.success('Starting drift analysis...');
        }
      } else {
        setCurrentStep(4); // Move to results step
        message.warning('No state files ready for analysis. Check results for details.');
      }
      
    } catch (error) {
      console.error('Analysis error:', error);
      
      // Enhanced error handling with specific error messages
      let errorMessage = 'Failed to start analysis';
      
      if (error instanceof Error) {
        // Extract specific error messages based on known error patterns
        const errorText = error.message.toLowerCase();
        
        if (errorText.includes('access denied') || errorText.includes('not authorized')) {
          errorMessage = 'AWS access denied. Please check your credentials and permissions.';
        } else if (errorText.includes('timeout') || errorText.includes('timed out')) {
          errorMessage = 'Analysis timed out. The operation took too long to complete.';
        } else if (errorText.includes('bucket') && errorText.includes('not found')) {
          errorMessage = `Bucket '${selectedBucket}' not found or inaccessible.`;
        } else if (errorText.includes('rate limit') || errorText.includes('throttling')) {
          errorMessage = 'AWS API rate limit exceeded. Please try again in a few minutes.';
        } else if (errorText.includes('network')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else {
          // Use the actual error message if available
          errorMessage = `Analysis error: ${error.message}`;
        }
      }
      
      // Show error message with more details
      message.error({
        content: errorMessage,
        duration: 8, // Show for longer time
        style: { 
          borderRadius: '8px',
          padding: '12px 16px',
          boxShadow: '0 3px 6px -4px rgba(0, 0, 0, 0.12)'
        }
      });
      
      // Return to resource selection step instead of showing empty results
      setCurrentStep(2);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleResetAnalysis = () => {
    setAnalysisResults(null);
    setCurrentAnalysisData(null);
    setCurrentStep(1);
    setIsAnalyzing(false);
  };
  
  // Handle disconnect with confirmation
  const handleDisconnect = () => {
    // Show confirmation dialog
    if (window.confirm('Are you sure you want to disconnect? This will reset your current session and any unsaved analysis progress will be lost.')) {
      // Clear state
      setCurrentSessionId(undefined);
      setCurrentAwsCredentials(undefined);
      setCurrentStep(0);
      setAnalysisResults(null);
      setCurrentAnalysisData(null);
      setSelectedBucket(undefined);
      setStateFiles([]);
      
      // Clear session storage
      try {
        sessionStorage.removeItem('driftAssistSession');
      } catch (error) {
        console.error('Error clearing session storage:', error);
      }
      
      message.info('Disconnected from AWS');
    }
  };

  const connectToAWSMutation = useConnectToAWS();

  const handleAwsConnected = (sessionId: string, credentials: any) => {
    setCurrentSessionId(sessionId);
    setCurrentAwsCredentials(credentials);
    setCurrentStep(0); // Move to S3 bucket selection
    message.success('Successfully connected to AWS!');
    
    // Navigate to workflow tab if callback is provided
    if (onNavigateToWorkflow) {
      setTimeout(() => {
        onNavigateToWorkflow();
        message.success('Connected to AWS! Continue setup in Workflows tab.');
      }, 1000);
    }
  };

  const handleConnectToAWS = async (values: any) => {
    // Validate inputs before sending
    if (!values.access_key || !values.secret_key) {
      message.error('Please enter both access key and secret key');
      return;
    }
    
    try {
      const connectRequest: ConnectAWSRequest = {
        provider: values.provider || "aws",
        credentials: {
          access_key: values.access_key.trim(),
          secret_key: values.secret_key.trim(),
        },
        region: values.region || "us-east-1",
      };

      const response = await connectToAWSMutation.mutateAsync(connectRequest);
      
      handleAwsConnected(response.session_id, {
        region: connectRequest.region,
        provider: connectRequest.provider,
        access_key: connectRequest.credentials.access_key,
        secret_key: connectRequest.credentials.secret_key
      });
    } catch (error) {
      console.error('AWS connection failed:', error);
      
      // Better error messages based on error type
      let errorMessage = 'Failed to connect to AWS';
      if (error instanceof Error) {
        if (error.message.includes('422')) {
          errorMessage = 'Invalid request format. Please check your credentials.';
        } else if (error.message.includes('401') || error.message.includes('403')) {
          errorMessage = 'Invalid AWS credentials. Please check your access key and secret key.';
        } else {
          errorMessage = error.message;
        }
      }
      
      message.error(errorMessage);
    }
  };

  const handleDrawerConnectToAWS = async (values: any) => {
    // Validate inputs before sending
    if (!values.AWS_ACCESS_KEY || !values.AWS_SECRET_KEY) {
      message.error('Please enter both access key and secret key');
      return;
    }
    
    try {
      const connectRequest: ConnectAWSRequest = {
        provider: "aws",
        credentials: {
          access_key: values.AWS_ACCESS_KEY.trim(),
          secret_key: values.AWS_SECRET_KEY.trim(),
        },
        region: values.AWS_REGION || "us-east-1",
      };

      const response = await connectToAWSMutation.mutateAsync(connectRequest);
      
      // Close drawer first
      setIsDrawerOpen(false);
      
      // Update session and credentials
      setCurrentSessionId(response.session_id);
      setCurrentAwsCredentials({
        region: connectRequest.region,
        provider: connectRequest.provider,
        access_key: connectRequest.credentials.access_key,
        secret_key: connectRequest.credentials.secret_key
      });
      
      // Reset to bucket selection step
      setCurrentStep(0);
      setSelectedBucket(undefined);
      setStateFiles([]);
      
      message.success('Successfully connected to AWS! You can now select a bucket.');
    } catch (error) {
      console.error('AWS connection failed:', error);
      
      // Better error messages based on error type
      let errorMessage = 'Failed to connect to AWS';
      if (error instanceof Error) {
        if (error.message.includes('422')) {
          errorMessage = 'Invalid request format. Please check your credentials.';
        } else if (error.message.includes('401') || error.message.includes('403')) {
          errorMessage = 'Invalid AWS credentials. Please check your access key and secret key.';
        } else {
          errorMessage = error.message;
        }
      }
      
      message.error(errorMessage);
    }
  };

  const AWS_REGIONS = [
    { label: "US East (N. Virginia) - us-east-1", value: "us-east-1" },
    { label: "US East (Ohio) - us-east-2", value: "us-east-2" },
    { label: "US West (N. California) - us-west-1", value: "us-west-1" },
    { label: "US West (Oregon) - us-west-2", value: "us-west-2" },
    { label: "Europe (Ireland) - eu-west-1", value: "eu-west-1" },
    { label: "Europe (London) - eu-west-2", value: "eu-west-2" },
    { label: "Europe (Frankfurt) - eu-central-1", value: "eu-central-1" },
    { label: "Asia Pacific (Singapore) - ap-southeast-1", value: "ap-southeast-1" },
    { label: "Asia Pacific (Sydney) - ap-southeast-2", value: "ap-southeast-2" },
    { label: "Asia Pacific (Tokyo) - ap-northeast-1", value: "ap-northeast-1" },
  ];

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const steps = [
    {
      title: 'S3 Bucket',
      description: 'Select bucket',
      icon: <DatabaseOutlined />
    },
    {
      title: 'Scan Files',
      description: 'Find state files',
      icon: <SecurityScanOutlined />
    },
    {
      title: 'Resources',
      description: 'Choose resources',
      icon: <SettingOutlined />
    },
    {
      title: 'Analysis',
      description: 'Drift detection',
      icon: <BarChartOutlined />
    },
    {
      title: 'Report',
      description: 'Export results',
      icon: <CheckCircleOutlined />
    }
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case -1:
        // AWS Credentials Input Form
        return (
          <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 24px' }}>
            <Card style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <CloudOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
                <Title level={3}>Connect to AWS</Title>
                <Text type="secondary">Enter your AWS credentials to begin drift analysis</Text>
                
                <Form
                  layout="vertical"
                  onFinish={handleConnectToAWS}
                  style={{ marginTop: 32, textAlign: 'left' }}
                >
                  <Form.Item
                    label="AWS Access Key"
                    name="access_key"
                    rules={[{ required: true, message: 'Please enter your AWS access key' }]}
                  >
                    <AntInput placeholder="AKIA..." />
                  </Form.Item>
                  
                  <Form.Item
                    label="AWS Secret Key"
                    name="secret_key"
                    rules={[{ required: true, message: 'Please enter your AWS secret key' }]}
                  >
                    <AntInput.Password placeholder="Enter secret key" />
                  </Form.Item>
                  
                  <Form.Item
                    label="AWS Region"
                    name="region"
                    initialValue="us-east-1"
                    rules={[{ required: true, message: 'Please select a region' }]}
                  >
                    <Select>
                      {AWS_REGIONS.map(region => (
                        <Option key={region.value} value={region.value}>
                          {region.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                  
                  <Form.Item style={{ marginTop: 32, textAlign: 'center' }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      size="large"
                      loading={connectToAWSMutation.isLoading}
                      style={{ minWidth: 200 }}
                    >
                      Connect to AWS
                    </Button>
                  </Form.Item>
                </Form>
              </div>
            </Card>
          </div>
        );

      case 0:
        return (
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
            <Card 
              style={{ 
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                border: '1px solid #f0f0f0',
                marginBottom: 32,
                background: 'white'
              }}
            >
              <div style={{ 
                padding: '24px 32px',
                borderBottom: '1px solid #f0f0f0',
                background: '#f8f9fa',
                borderRadius: '12px 12px 0 0',
                marginBottom: 24
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <DatabaseOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                  <div>
                    <Title level={3} style={{ margin: 0, color: '#1f2937', fontWeight: 600 }}>
                      Select S3 Bucket
                    </Title>
                    <Text type="secondary" style={{ fontSize: 14 }}>
                      Choose an S3 bucket to scan for Terraform state files
                    </Text>
                  </div>
                </div>
              </div>

              <div style={{ padding: '0 32px 32px 32px' }}>
                <div style={{ marginBottom: 24 }}>
                  <Text strong style={{ fontSize: 16, color: '#262626', display: 'block', marginBottom: 12 }}>
                    Available S3 Buckets
                  </Text>
                  <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
                    Select a bucket that contains your Terraform state files for analysis.
                  </Text>

                  <Select
                    size="large"
                    placeholder={isLoadingBuckets ? "Loading buckets..." : "Select a bucket"}
                    style={{ width: '100%', marginBottom: 16 }}
                    value={selectedBucket}
                    onChange={handleBucketSelect}
                    loading={isLoadingBuckets}
                    status={bucketsError ? 'error' : undefined}
                  >
                    {s3BucketsData?.buckets?.map((bucket: S3Bucket) => (
                      <Option key={bucket.name} value={bucket.name}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <DatabaseOutlined />
                          {bucket.name} (Created: {formatDate(bucket.creation_date)})
                        </div>
                      </Option>
                    ))}
                  </Select>

                  {bucketsError && (
                    <Alert
                      message="Failed to load S3 buckets"
                      description={bucketsError instanceof Error ? bucketsError.message : 'Unknown error'}
                      type="error"
                      showIcon
                      style={{ marginBottom: 16, borderRadius: 8 }}
                    />
                  )}

                  {/* State Files Display */}
                  {selectedBucket && isLoadingStateFiles && (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '32px', 
                      color: '#666',
                      background: '#fafafa',
                      borderRadius: 8,
                      border: '1px dashed #d9d9d9'
                    }}>
                      <DatabaseOutlined style={{ fontSize: 24, marginBottom: 8, color: '#1890ff' }} />
                      <div>Scanning bucket for state files...</div>
                    </div>
                  )}

                  {selectedBucket && stateFiles.length > 0 && (
                    <div style={{ 
                      background: '#f6ffed', 
                      padding: '16px', 
                      borderRadius: '8px', 
                      marginTop: '16px',
                      border: '1px solid #b7eb8f'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                        <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16, marginRight: 8 }} />
                        <Text strong style={{ color: '#389e0d' }}>
                          Found {stateFiles.length} State File{stateFiles.length !== 1 ? 's' : ''}
                        </Text>
                      </div>
                      <div style={{ 
                        maxHeight: '200px', 
                        overflowY: 'auto', 
                        background: 'white',
                        border: '1px solid #d9f7be', 
                        borderRadius: '6px'
                      }}>
                        {stateFiles.map((file, index) => (
                          <div 
                            key={index} 
                            style={{ 
                              padding: '12px 16px', 
                              borderBottom: index < stateFiles.length - 1 ? '1px solid #f0f0f0' : 'none'
                            }}
                          >
                            <div style={{ 
                              fontWeight: 500, 
                              color: '#262626', 
                              marginBottom: '4px',
                              fontSize: 14
                            }}>
                              📄 {file.key}
                            </div>
                            <div style={{ 
                              display: 'flex', 
                              gap: '16px', 
                              fontSize: '12px', 
                              color: '#8c8c8c'
                            }}>
                              <span>{formatFileSize(file.size)}</span>
                              <span>Modified: {formatDate(file.last_modified)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedBucket && !isLoadingStateFiles && stateFiles.length === 0 && (
                    <Alert
                      message="No state files found"
                      description={`The selected bucket '${selectedBucket}' does not contain any Terraform state files.`}
                      type="warning"
                      showIcon
                      style={{ marginTop: 16, borderRadius: 8 }}
                    />
                  )}
                </div>

                  {/* Action Buttons */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginTop: 24,
                    flexWrap: 'wrap',
                    gap: 16
                  }}>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {/* New Connection Button */}
                      <Button
                        type="default"
                        size="large"
                        onClick={() => setIsDrawerOpen(true)}
                        icon={<CloudOutlined />}
                        style={{ 
                          minWidth: 180,
                          height: 48,
                          borderRadius: 8,
                          fontWeight: 500,
                          borderColor: '#1890ff',
                          color: '#1890ff'
                        }}
                      >
                        New Connection
                      </Button>

                      {/* View Stored Analyses Button */}
                      {projectId && applicationId && (
                        <Button
                          type="default"
                          size="large"
                          onClick={() => setCurrentStep(5)}
                          icon={<HistoryOutlined />}
                          style={{ 
                            minWidth: 180,
                            height: 48,
                            borderRadius: 8,
                            fontWeight: 500,
                            borderColor: '#52c41a',
                            color: '#52c41a'
                          }}
                        >
                          View Stored Analyses
                        </Button>
                      )}
                    </div>


                    {/* Next Step Button */}
                    {selectedBucket && stateFiles.length > 0 && (
                      <Button
                        type="primary"
                        size="large"
                        onClick={() => setCurrentStep(1)}
                        icon={<RightOutlined />}
                        style={{ 
                          minWidth: 180,
                          height: 48,
                          borderRadius: 8,
                          fontWeight: 500
                        }}
                      >
                        Continue to Resource Selection
                      </Button>
                    )}
                  </div>
              </div>
            </Card>
          </div>
        );

      case 1:
        return (
          <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px' }}>
            <Card 
              style={{ 
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                border: '1px solid #f0f0f0',
                marginBottom: 32,
                background: 'white'
              }}
            >
              <div style={{ 
                padding: '32px 32px 20px 32px',
                borderBottom: '1px solid #f0f0f0',
                background: '#f8f9fa',
                borderRadius: '12px 12px 0 0',
                marginBottom: 32
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <SecurityScanOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                  <div>
                    <Title level={3} style={{ margin: 0, color: '#1f2937', fontWeight: 600, fontSize: '20px' }}>
                      Select AWS Resources
                    </Title>
                    <Paragraph style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>
                      Choose which AWS resources you want to analyze for drift
                    </Paragraph>
                  </div>
                </div>
              </div>

              <div style={{ padding: '0 32px 32px 32px' }}>
                {/* Selection Summary */}
                <div style={{ 
                  background: '#f8f9fa', 
                  padding: '24px', 
                  borderRadius: '12px', 
                  marginBottom: 32,
                  border: '1px solid #e9ecef'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                    <InfoCircleOutlined style={{ color: '#1890ff', fontSize: 20, marginRight: 12 }} />
                    <Text strong style={{ fontSize: 18, color: '#1f2937' }}>
                      {selectedCount} of {totalCount} Resources Selected
                    </Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: 16 }}>
                    Estimated analysis time: {estimatedTime} minutes
                  </Text>
                </div>

                {/* Quick Selection Presets */}
                <div style={{ marginBottom: 32 }}>
                  <div style={{ marginBottom: 16 }}>
                    <Text strong style={{ fontSize: 16, color: '#262626' }}>
                      <InfoCircleOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                      Quick Selection Presets
                    </Text>
                  </div>
                  <Space wrap size="large">
                    {presets.map(preset => (
                      <Button
                        key={preset.id}
                        type={activePreset === preset.id ? "primary" : "default"}
                        size="large"
                        onClick={() => handlePresetSelect(preset.id)}
                        style={{ 
                          borderRadius: 12,
                          fontWeight: 500,
                          minWidth: 140,
                          height: 48
                        }}
                      >
                        {preset.name}
                      </Button>
                    ))}
                  </Space>
                </div>

                {/* Selection Controls */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'flex-start', 
                  alignItems: 'center', 
                  marginBottom: 24,
                  padding: '16px 20px',
                  background: '#f8f9fa',
                  borderRadius: 8,
                  border: '1px solid #e9ecef'
                }}>
                  <Space size="medium">
                    <Button 
                      icon={<CheckCircleOutlined />} 
                      onClick={handleSelectAll}
                      style={{ borderRadius: 6, height: 36, fontSize: 14 }}
                    >
                      Select All
                    </Button>
                    <Button 
                      onClick={handleClearAll}
                      style={{ borderRadius: 6, height: 36, fontSize: 14 }}
                    >
                      Clear All
                    </Button>
                  </Space>
                </div>

                {/* Resource Cards */}
                <Row gutter={[24, 24]}>
                  {resourceTypes.map(resource => (
                    <Col xs={24} sm={12} key={resource.id}>
                      <Card
                        className={`resource-card ${resource.selected ? 'selected' : ''}`}
                        style={{ 
                          borderColor: resource.selected ? resource.color : '#e8e8e8',
                          borderWidth: resource.selected ? 2 : 1,
                          cursor: 'pointer',
                          borderRadius: 8,
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          background: resource.selected ? '#f8fafc' : 'white',
                          height: '100%',
                          boxShadow: resource.selected ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 4px rgba(0,0,0,0.04)'
                        }}
                        onClick={() => handleResourceToggle(resource.id)}
                        hoverable
                        size="small"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', padding: '20px' }}>
                          <div 
                            style={{ 
                              backgroundColor: resource.selected ? resource.color : '#f8fafc',
                              color: resource.selected ? 'white' : resource.color,
                              padding: '16px',
                              borderRadius: '12px',
                              marginRight: '16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 20,
                              minWidth: '48px',
                              height: '48px',
                              transition: 'all 0.3s ease',
                              boxShadow: resource.selected ? `0 4px 12px ${resource.color}40` : '0 2px 4px rgba(0,0,0,0.05)'
                            }}
                          >
                            {resource.icon}
                          </div>
                          <div style={{ flex: 1 }}>
                            <Title level={5} style={{ margin: 0, marginBottom: 6, fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
                              {resource.name}
                            </Title>
                            <Text style={{ fontSize: '14px', color: '#6b7280', display: 'block', marginBottom: 8, lineHeight: 1.4 }}>
                              {resource.description}
                            </Text>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'nowrap' }}>
                              <Text type="secondary" style={{ 
                                fontSize: '11px', 
                                background: '#f3f4f6', 
                                padding: '3px 8px', 
                                borderRadius: '6px', 
                                fontWeight: 500,
                                whiteSpace: 'nowrap',
                                lineHeight: '1.2'
                              }}>
                                {resource.category}
                              </Text>
                              <Text type="secondary" style={{ 
                                fontSize: '11px', 
                                background: resource.priority === 'High' ? '#fef2f2' : resource.priority === 'Medium' ? '#fffbeb' : '#f0fdf4', 
                                color: resource.priority === 'High' ? '#dc2626' : resource.priority === 'Medium' ? '#d97706' : '#059669', 
                                padding: '3px 8px', 
                                borderRadius: '6px', 
                                fontWeight: 500,
                                whiteSpace: 'nowrap',
                                lineHeight: '1.2'
                              }}>
                                {resource.priority}
                              </Text>
                            </div>
                          </div>
                          {resource.selected && (
                            <div style={{ 
                              background: `linear-gradient(135deg, ${resource.color}, ${resource.color}dd)`,
                              color: 'white',
                              borderRadius: '50%',
                              width: 24,
                              height: 24,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginLeft: '12px',
                              boxShadow: `0 2px 8px ${resource.color}40`
                            }}>
                              <CheckCircleOutlined style={{ fontSize: 14 }} />
                            </div>
                          )}
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>

                {/* Start Analysis Button */}
                <div style={{ textAlign: 'center', marginTop: 48 }}>
                  <div style={{ 
                    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                    padding: '32px',
                    borderRadius: '20px',
                    border: '1px solid #bae7ff',
                    marginBottom: 24
                  }}>
                    <div style={{ marginBottom: 24 }}>
                      <Text strong style={{ fontSize: 20, color: '#262626' }}>
                        🚀 Ready to Start Analysis?
                      </Text>
                      <div style={{ marginTop: 12 }}>
                        <Text type="secondary" style={{ fontSize: 16 }}>
                          {selectedCount > 0 && stateFiles.length > 0 
                            ? `Analyzing ${stateFiles.length} state files across ${selectedCount} resource types`
                            : 'Select resources above to begin analysis'
                          }
                        </Text>
                      </div>
                    </div>

                    <Button
                      type="primary"
                      size="large"
                      loading={isAnalyzing}
                      disabled={selectedCount === 0}
                      onClick={handleAnalyze}
                      icon={isAnalyzing ? <ReloadOutlined spin /> : <BarChartOutlined />}
                      style={{ 
                        minWidth: 280,
                        height: 64,
                        borderRadius: 16,
                        background: selectedCount > 0 
                          ? 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)'
                          : 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                        border: 'none',
                        fontWeight: 600,
                        fontSize: 18,
                        boxShadow: selectedCount > 0 
                          ? '0 6px 16px rgba(82, 196, 26, 0.4)'
                          : '0 4px 12px rgba(24, 144, 255, 0.3)',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {isAnalyzing ? 'Starting Analysis...' : 
                       selectedCount > 0 ? '🎯 Start Drift Analysis' : 'Select Resources First'}
                    </Button>
                    
                    {selectedCount === 0 && (
                      <div style={{ marginTop: 16 }}>
                        <Alert
                          message="Please select at least one resource type to analyze"
                          type="warning"
                          showIcon={false}
                          style={{ 
                            borderRadius: 12,
                            background: '#fff7e6',
                            border: '1px solid #ffd591'
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        );

      case 3:
        return currentAnalysisData ? (
          <div>
            {/* Start New Analysis Button */}
            <div style={{ 
              margin: '24px 24px 0 24px', 
              display: 'flex', 
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 16
            }}>
              <Button
                type="default"
                size="large"
                onClick={() => {
                  clearAnalysisState();
                  setCurrentStep(0);
                  message.success('Analysis cleared! You can now start a new analysis.');
                }}
                icon={<ReloadOutlined />}
                style={{ 
                  borderRadius: 8,
                  fontWeight: 500,
                  background: '#fff',
                  borderColor: '#d9d9d9',
                  color: '#595959'
                }}
              >
                Start New Analysis
              </Button>
            </div>
            
            <S3StreamingAnalysis
              analysisData={currentAnalysisData}
              apiBaseUrl={(import.meta as any).env?.VITE_DRIFT_ASSIST_URL || 'http://localhost:8004'}
              fileName={currentAnalysisData.fileName}
            />
          </div>
        ) : (
          <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px' }}>
            <Card style={{ borderRadius: 16, textAlign: 'center', padding: '40px' }}>
              <div style={{ marginBottom: 24 }}>
                <InfoCircleOutlined style={{ fontSize: 64, color: '#faad14', marginBottom: 16 }} />
                <Title level={3} style={{ color: '#d46b08' }}>No Analysis Data Available</Title>
                <Text type="secondary" style={{ fontSize: 16 }}>
                  The analysis session has expired or the data is no longer available.
                </Text>
              </div>
              <Button
                type="primary"
                size="large"
                onClick={() => setCurrentStep(0)}
                icon={<DatabaseOutlined />}
                style={{ 
                  minWidth: 200,
                  height: 48,
                  borderRadius: 8,
                  fontWeight: 500
                }}
              >
                Start New Analysis
              </Button>
            </Card>
          </div>
        );

      case 4:
        return analysisResults ? (
          <UnifiedResultsDisplay
            data={analysisResults}
            onReset={handleResetAnalysis}
            apiBaseUrl={(import.meta as any).env?.VITE_DRIFT_ASSIST_URL || 'http://localhost:8004'}
          />
        ) : (
          <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px' }}>
            <Card 
              style={{ 
                borderRadius: 16,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                border: '1px solid #e8e8e8',
                marginBottom: 32
              }}
            >
              <div style={{ 
                padding: '32px 32px 20px 32px',
                borderBottom: '1px solid #f0f0f0',
                background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
                color: 'white',
                borderRadius: '16px 16px 0 0',
                marginBottom: 32
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <CheckCircleOutlined style={{ fontSize: 32 }} />
                  <div>
                    <Title level={2} style={{ margin: 0, color: 'white' }}>
                      Analysis Results
                    </Title>
                    <Paragraph style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: 16 }}>
                      View and manage your infrastructure drift analysis
                    </Paragraph>
                  </div>
                </div>
              </div>

              <div style={{ padding: '0 32px 32px 32px' }}>
                <div style={{ 
                  background: 'linear-gradient(135deg, #f6ffed 0%, #f0f9e8 100%)', 
                  padding: '32px', 
                  borderRadius: '16px', 
                  marginBottom: 32,
                  border: '1px solid #b7eb8f',
                  textAlign: 'center'
                }}>
                  <div style={{ marginBottom: 24 }}>
                    <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a', marginBottom: 16 }} />
                    <Title level={3} style={{ color: '#389e0d', marginBottom: 16 }}>No Analysis Results Yet</Title>
                    <Paragraph style={{ fontSize: 16, color: '#8c8c8c', maxWidth: 600, margin: '0 auto' }}>
                      Complete an infrastructure drift analysis to view detailed results here. 
                      The analysis will identify differences between your Terraform state and actual AWS resources.
                    </Paragraph>
                  </div>
                  
                  <Button
                    type="primary"
                    size="large"
                    onClick={() => setCurrentStep(1)}
                    icon={<DatabaseOutlined />}
                    style={{ 
                      minWidth: 240,
                      height: 56,
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: 16
                    }}
                  >
                    Start New Analysis
                  </Button>
                </div>

                {/* What to expect section */}
                <div style={{ 
                  background: 'white',
                  border: '1px solid #f0f0f0',
                  borderRadius: '16px',
                  padding: '32px',
                  marginBottom: 32
                }}>
                  <Title level={4} style={{ marginBottom: 24, color: '#262626', fontWeight: 600 }}>
                    <InfoCircleOutlined style={{ marginRight: 8, color: '#52c41a' }} />
                    What to Expect in Analysis Results
                  </Title>
                  
                  <Row gutter={[24, 24]}>
                    <Col xs={24} md={8}>
                      <div style={{ 
                        padding: '24px', 
                        background: '#f6ffed', 
                        borderRadius: '12px',
                        height: '100%',
                        border: '1px solid #b7eb8f'
                      }}>
                        <div style={{ 
                          backgroundColor: '#52c41a',
                          color: 'white',
                          padding: '12px',
                          borderRadius: '8px',
                          width: 'fit-content',
                          marginBottom: '16px'
                        }}>
                          <BarChartOutlined style={{ fontSize: 20 }} />
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8, color: '#389e0d' }}>
                          Drift Statistics
                        </div>
                        <div style={{ color: '#8c8c8c', fontSize: 14 }}>
                          Comprehensive metrics on detected drift across your infrastructure resources
                        </div>
                      </div>
                    </Col>
                    <Col xs={24} md={8}>
                      <div style={{ 
                        padding: '24px', 
                        background: '#e6f7ff', 
                        borderRadius: '12px',
                        height: '100%',
                        border: '1px solid #91d5ff'
                      }}>
                        <div style={{ 
                          backgroundColor: '#1890ff',
                          color: 'white',
                          padding: '12px',
                          borderRadius: '8px',
                          width: 'fit-content',
                          marginBottom: '16px'
                        }}>
                          <SecurityScanOutlined style={{ fontSize: 20 }} />
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8, color: '#096dd9' }}>
                          Resource Changes
                        </div>
                        <div style={{ color: '#8c8c8c', fontSize: 14 }}>
                          Detailed comparison between expected and actual resource configurations
                        </div>
                      </div>
                    </Col>
                    <Col xs={24} md={8}>
                      <div style={{ 
                        padding: '24px', 
                        background: '#fff2e8', 
                        borderRadius: '12px',
                        height: '100%',
                        border: '1px solid #ffbb96'
                      }}>
                        <div style={{ 
                          backgroundColor: '#fa8c16',
                          color: 'white',
                          padding: '12px',
                          borderRadius: '8px',
                          width: 'fit-content',
                          marginBottom: '16px'
                        }}>
                          <InfoCircleOutlined style={{ fontSize: 20 }} />
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8, color: '#d46b08' }}>
                          Recommendations
                        </div>
                        <div style={{ color: '#8c8c8c', fontSize: 14 }}>
                          AI-powered suggestions to resolve drift and improve infrastructure management
                        </div>
                      </div>
                    </Col>
                  </Row>
                </div>

                {/* Tips section */}
                <Alert
                  message="Pro Tip: Regular Drift Analysis"
                  description="Regular infrastructure drift analysis helps maintain consistency between your IaC definitions and actual cloud resources, preventing unexpected behavior and security issues."
                  type="info"
                  showIcon
                  style={{ 
                    borderRadius: 12,
                    marginBottom: 0
                  }}
                />
              </div>
            </Card>
          </div>
        );

      case 5:
        // Stored Analyses List
        return (
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
            <Card 
              style={{ 
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                border: '1px solid #f0f0f0',
                marginBottom: 32,
                background: 'white'
              }}
            >
              <div style={{ 
                padding: '24px 32px',
                borderBottom: '1px solid #f0f0f0',
                background: '#f8f9fa',
                borderRadius: '12px 12px 0 0',
                marginBottom: 24
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <HistoryOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                    <div>
                      <Title level={3} style={{ margin: 0, color: '#1f2937', fontWeight: 600 }}>
                        Stored Analyses
                      </Title>
                      <Text type="secondary" style={{ fontSize: 14 }}>
                        View and manage your previously saved drift analyses
                      </Text>
                    </div>
                  </div>
                  <Button
                    type="default"
                    size="large"
                    onClick={() => setCurrentStep(0)}
                    icon={<ArrowLeftOutlined />}
                    style={{ 
                      borderRadius: 8,
                      fontWeight: 500,
                      borderColor: '#d9d9d9',
                      color: '#595959'
                    }}
                  >
                    Back to Analysis
                  </Button>
                </div>
              </div>

              <div style={{ padding: '0 32px 32px 32px' }}>
                <StoredAnalysesCard
                  projectId={projectId || ''}
                  applicationId={applicationId || ''}
                  onSelectAnalysis={(analysisId) => {
                    setSelectedAnalysisId(analysisId);
                    setCurrentStep(6);
                  }}
                  onClose={() => setCurrentStep(0)}
                />
              </div>
            </Card>
          </div>
        );

      case 6:
        // Individual Stored Analysis Display
        return (
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
            <Card 
              style={{ 
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                border: '1px solid #f0f0f0',
                marginBottom: 32,
                background: 'white'
              }}
            >
              <div style={{ 
                padding: '24px 32px',
                borderBottom: '1px solid #f0f0f0',
                background: '#f8f9fa',
                borderRadius: '12px 12px 0 0',
                marginBottom: 24
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <BarChartOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                    <div>
                      <Title level={3} style={{ margin: 0, color: '#1f2937', fontWeight: 600 }}>
                        Analysis Details
                      </Title>
                      <Text type="secondary" style={{ fontSize: 14 }}>
                        {selectedStoredAnalysis ? `Analysis ID: ${selectedAnalysisId}` : 'Loading analysis details...'}
                      </Text>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <Button
                      type="default"
                      size="large"
                      onClick={() => setCurrentStep(5)}
                      icon={<ArrowLeftOutlined />}
                      style={{ 
                        borderRadius: 8,
                        fontWeight: 500,
                        borderColor: '#d9d9d9',
                        color: '#595959'
                      }}
                    >
                      Back to List
                    </Button>
                    <Button
                      type="default"
                      size="large"
                      onClick={() => setCurrentStep(0)}
                      icon={<ReloadOutlined />}
                      style={{ 
                        borderRadius: 8,
                        fontWeight: 500,
                        borderColor: '#52c41a',
                        color: '#52c41a'
                      }}
                    >
                      New Analysis
                    </Button>
                  </div>
                </div>
              </div>

              <div style={{ padding: '0 32px 32px 32px' }}>
                <StoredAnalysisDisplay
                  analysisId={selectedAnalysisId || 0}
                  projectId={projectId || ''}
                  applicationId={applicationId || ''}
                  onBack={() => setCurrentStep(5)}
                />
              </div>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="drift-assist-container" style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #fafbfc 0%, #f1f5f9 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>

      
      {/* Connection Status */}
      {currentSessionId && (
        <Alert
          message={`Connected to AWS (${currentAwsCredentials?.region || 'Unknown Region'})`}
          type="info"
          showIcon
          icon={<CloudOutlined />}
          action={
            <Button 
              size="small" 
              icon={<DisconnectOutlined />} 
              onClick={onClose || handleDisconnect}
              title="Disconnect from AWS"
              aria-label="Disconnect from AWS"
              style={{
                borderRadius: 6,
                fontWeight: 500,
                background: '#1890ff',
                borderColor: '#1890ff',
                color: 'white'
              }}
            >
              Disconnect
            </Button>
          }
          style={{ 
            margin: '24px 24px 0 24px', 
            borderRadius: 12,
            border: '1px solid #1890ff',
            background: 'linear-gradient(135deg, #e6f7ff 0%, #f0f8ff 100%)',
            boxShadow: '0 2px 8px rgba(24, 144, 255, 0.15)'
          }}
        />
      )}

      {/* Step Content */}
      <div style={{ padding: '24px' }}>
        {renderStepContent()}
      </div>

      {/* New Connection Drawer */}
      <Drawer
        title="Configure Drift Assist"
        open={isDrawerOpen}
        hideFooter={true}
        onClose={() => setIsDrawerOpen(false)}
        onCancel={() => setIsDrawerOpen(false)}
        disabled={false}
        loading={false}
      >
        <ConfigureDriftAssist
          configureDriftAssistForm={drawerForm}
          setDisabledSave={() => {}}
          skipNavigation={true}
          onFinish={() => {
            console.log('🎯 DriftAssist onFinish: Called from ConfigureDriftAssist');
            
            // The ConfigureDriftAssist component handles the connection logic
            // and stores the session data. We just need to close the drawer
            // and update our local state from the stored session data.
            setIsDrawerOpen(false);
            
            // Read the session data that ConfigureDriftAssist stored
            try {
              const storedSession = sessionStorage.getItem('driftAssistSession');
              console.log('🎯 DriftAssist onFinish: Retrieved session data:', storedSession);
              
              if (storedSession) {
                const session = JSON.parse(storedSession);
                console.log('🎯 DriftAssist onFinish: Parsed session:', session);
                
                // Handle both direct credentials and integration-based connections
                if (session.sessionId) {
                  setCurrentSessionId(session.sessionId);
                  
                  // For direct credentials
                  if (session.awsCredentials) {
                    setCurrentAwsCredentials(session.awsCredentials);
                    console.log('✅ DriftAssist onFinish: Using direct credentials mode');
                  }
                  // For integration-based credentials, we don't need awsCredentials
                  // as they're retrieved from the backend when needed
                  else if (session.integrationId) {
                    console.log('✅ DriftAssist onFinish: Using integration mode with ID:', session.integrationId);
                    // Set a placeholder for credentials to indicate we're connected
                    setCurrentAwsCredentials({ 
                      integration_mode: true, 
                      integration_id: session.integrationId 
                    });
                  }
                  
                  // Reset to bucket selection step
                  setCurrentStep(0);
                  setSelectedBucket(undefined);
                  setStateFiles([]);
                  
                  message.success('Successfully connected to AWS! You can now select a bucket.');
                } else {
                  console.error('❌ DriftAssist onFinish: No sessionId found in session data');
                  message.error('Failed to retrieve connection details. Please try again.');
                }
              } else {
                console.error('❌ DriftAssist onFinish: No session data found in sessionStorage');
                message.error('Connection data not found. Please try again.');
              }
            } catch (error) {
              console.error('❌ DriftAssist onFinish: Error reading session data:', error);
              message.error('Failed to process connection. Please try again.');
            }
          }}
        />
      </Drawer>
    </div>
  );
};

export default DriftAssist;
