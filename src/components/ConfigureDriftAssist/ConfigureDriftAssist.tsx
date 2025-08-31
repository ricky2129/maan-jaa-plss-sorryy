import React, { useEffect, useState } from "react";
import { Form, FormInstance, Button, message, Flex, Select, Input as AntInput } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone, PlusOutlined } from "@ant-design/icons";
import { Input, Text, DriftAssistSignInDrawer, IconViewer } from "components";
import { Metrics, Colors } from "themes";
import { useNavigate, useParams } from "react-router-dom";
import { 
  useConnectToAWS,
  useListDriftAssistSecrets,
  useConnectToAWSWithIntegration,
  type ConnectAWSRequest
} from "react-query/driftAssistQueries";

// AWS Regions from original project
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

interface ConfigureDriftAssistFormField {
  CLOUD_PROVIDER: string;
  AWS_ACCESS_KEY: string;
  AWS_SECRET_KEY: string;
  AWS_REGION: string;
  ACCOUNT_SELECTION?: number; // For stored account selection
}

interface ConfigureDriftAssistProps {
  configureDriftAssistForm: FormInstance<ConfigureDriftAssistFormField>;
  setDisabledSave: (disabled: boolean) => void;
  onFinish?: () => void;
  skipNavigation?: boolean; // New prop to control navigation behavior
}

const ConfigureDriftAssist: React.FC<ConfigureDriftAssistProps> = ({
  configureDriftAssistForm,
  setDisabledSave,
  onFinish,
  skipNavigation = false,
}) => {
  const navigate = useNavigate();
  const { project, application } = useParams();

  // State for account selection
  const [isOpenAddDriftAssist, setIsOpenAddDriftAssist] = useState<boolean>(false);
  const [connectionMode, setConnectionMode] = useState<'stored' | 'direct'>('stored');

  // API hooks
  const connectToAWSMutation = useConnectToAWS();
  const connectToAWSWithIntegrationMutation = useConnectToAWSWithIntegration();
  const listDriftAssistSecretsQuery = useListDriftAssistSecrets(parseInt(project || '0'));

  // Form validation
  useEffect(() => {
    const hasErrors = configureDriftAssistForm
      ?.getFieldsError()
      .filter(({ errors }) => errors.length).length > 0;
    setDisabledSave(hasErrors);
  }, [configureDriftAssistForm, setDisabledSave]);

  // Initialize form with defaults
  useEffect(() => {
    configureDriftAssistForm.setFieldsValue({
      CLOUD_PROVIDER: 'aws',
      AWS_REGION: 'us-east-1'
    });
  }, [configureDriftAssistForm]);

  const handleConnectToAWS = async () => {
    try {
      console.log('🔧 ConfigureDriftAssist: Starting AWS connection process...');
      
      const values = await configureDriftAssistForm.validateFields();
      
      if (connectionMode === 'direct') {
        // Direct connection with manually entered credentials
        console.log('📝 ConfigureDriftAssist: Using direct connection mode');
        
        const connectRequest: ConnectAWSRequest = {
          provider: values.CLOUD_PROVIDER,
          credentials: {
            access_key: values.AWS_ACCESS_KEY,
            secret_key: values.AWS_SECRET_KEY,
          },
          region: values.AWS_REGION,
        };

        const response = await connectToAWSMutation.mutateAsync(connectRequest);
        
        // Store credentials in session storage for persistence
        const sessionData = {
          sessionId: response.session_id,
          awsCredentials: {
            region: values.AWS_REGION,
            provider: values.CLOUD_PROVIDER,
            access_key: values.AWS_ACCESS_KEY,
            secret_key: values.AWS_SECRET_KEY
          },
          timestamp: Date.now()
        };
        
        sessionStorage.setItem('driftAssistSession', JSON.stringify(sessionData));
        
        const navigationState = {
          sessionId: response.session_id,
          awsCredentials: sessionData.awsCredentials
        };
        
        // Only navigate if skipNavigation is false (default behavior for workflow)
        if (!skipNavigation) {
          navigate(`/project/${project}/application/${application}/workflow`, {
            state: navigationState
          });
        }

        if (onFinish) onFinish();
      } else {
        // Stored account connection
        console.log('📝 ConfigureDriftAssist: Using stored account connection mode');
        
        if (!values.ACCOUNT_SELECTION) {
          message.error('Please select an account');
          return;
        }

        const response = await connectToAWSWithIntegrationMutation.mutateAsync(values.ACCOUNT_SELECTION);
        
        // Store session data
        const sessionData = {
          sessionId: response.session_id,
          integrationId: values.ACCOUNT_SELECTION,
          timestamp: Date.now()
        };
        
        sessionStorage.setItem('driftAssistSession', JSON.stringify(sessionData));
        
        const navigationState = {
          sessionId: response.session_id,
          integrationId: values.ACCOUNT_SELECTION
        };
        
        // Only navigate if skipNavigation is false (default behavior for workflow)
        if (!skipNavigation) {
          navigate(`/project/${project}/application/${application}/workflow`, {
            state: navigationState
          });
        }

        if (onFinish) onFinish();
      }
    } catch (error) {
      console.error('❌ ConfigureDriftAssist: AWS connection failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error?.constructor?.name || 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Safely extract error message
      let errorMessage = 'Failed to connect to AWS';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }
      
      message.error(errorMessage);
    }
  };

  return (
    <>
      <Flex vertical gap={Metrics.SPACE_LG}>
        <Form
          form={configureDriftAssistForm}
          layout="vertical"
          onFinish={handleConnectToAWS}
          initialValues={{ 
            CLOUD_PROVIDER: 'aws', 
            AWS_REGION: 'us-east-1'
          }}
        >
          {/* Connection Mode Selection */}
          <div style={{ marginBottom: 24 }}>
            <Text text="Connect to AWS" weight="semibold" style={{ fontSize: '16px', marginBottom: '12px', display: 'block' }} />
            
            <Flex vertical gap={Metrics.SPACE_MD}>
              <Button
                type={connectionMode === 'stored' ? 'primary' : 'default'}
                onClick={() => setConnectionMode('stored')}
                style={{ textAlign: 'left', height: 'auto', padding: '12px 16px' }}
              >
                <Flex vertical gap={4}>
                  <Text text="Use Stored Account" weight="semibold" />
                  <Text text="Connect using previously saved AWS credentials" type="footnote" />
                </Flex>
              </Button>
              
              <Button
                type={connectionMode === 'direct' ? 'primary' : 'default'}
                onClick={() => setConnectionMode('direct')}
                style={{ textAlign: 'left', height: 'auto', padding: '12px 16px' }}
              >
                <Flex vertical gap={4}>
                  <Text text="Enter Credentials Manually" weight="semibold" />
                  <Text text="Provide AWS credentials directly (not stored)" type="footnote" />
                </Flex>
              </Button>
            </Flex>
          </div>

          {connectionMode === 'stored' ? (
            /* Stored Account Selection */
            <div style={{ marginBottom: 24 }}>
              <Form.Item
                label={<Text text="AWS Account" weight="semibold" />}
                name="ACCOUNT_SELECTION"
                rules={[{ required: true, message: 'Please select an AWS account' }]}
              >
                <Select
                  loading={listDriftAssistSecretsQuery?.isLoading}
                  placeholder="Select AWS account"
                  options={listDriftAssistSecretsQuery?.data?.map((integration) => ({
                    label: integration.name,
                    value: integration.id,
                  }))}
                  dropdownRender={(menu) => (
                    <Flex vertical gap={Metrics.SPACE_MD} justify="start">
                      {menu}
                      <Button
                        icon={
                          <IconViewer
                            Icon={PlusOutlined}
                            size={15}
                            color={Colors.PRIMARY_BLUE}
                          />
                        }
                        title="Add New Account"
                        type="link"
                        customClass="add-newAccount-btn"
                        onClick={() => setIsOpenAddDriftAssist(true)}
                      />
                    </Flex>
                  )}
                />
              </Form.Item>

              <Form.Item>
                <Flex justify="end">
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={connectToAWSWithIntegrationMutation.isPending}
                    style={{ marginTop: 16 }}
                  >
                    Connect to AWS & Continue
                  </Button>
                </Flex>
              </Form.Item>
            </div>
          ) : (
            /* Direct Credentials Entry */
            <div style={{ marginBottom: 24 }}>
              <Form.Item
                label={<Text text="Cloud Provider" weight="semibold" />}
                name="CLOUD_PROVIDER"
                rules={[{ required: true, message: 'Cloud provider is required' }]}
              >
                <Select
                  placeholder="Select cloud provider"
                  options={[{ label: "Amazon Web Services (AWS)", value: "aws" }]}
                />
              </Form.Item>

              <Form.Item
                label={<Text text="AWS Access Key" weight="semibold" />}
                name="AWS_ACCESS_KEY"
                rules={[
                  { required: true, message: 'AWS Access Key is required' },
                  { pattern: /^AKIA[0-9A-Z]{16}$/, message: 'Invalid AWS Access Key format (should start with AKIA)' }
                ]}
              >
                <Input
                  placeholder="AKIA..."
                  autoComplete="off"
                />
              </Form.Item>

              <Form.Item
                label={<Text text="AWS Secret Key" weight="semibold" />}
                name="AWS_SECRET_KEY"
                rules={[
                  { required: true, message: 'AWS Secret Key is required' },
                  { len: 40, message: 'AWS Secret Key should be exactly 40 characters long' }
                ]}
              >
                <AntInput.Password
                  placeholder="Enter your AWS Secret Access Key"
                  autoComplete="off"
                  iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                />
              </Form.Item>

              <Form.Item
                label={<Text text="AWS Region" weight="semibold" />}
                name="AWS_REGION"
                rules={[{ required: true, message: 'AWS region is required' }]}
              >
                <Select
                  placeholder="Select AWS region"
                  options={AWS_REGIONS}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>

              <Form.Item>
                <Flex justify="end">
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={connectToAWSMutation.isPending}
                    style={{ marginTop: 16 }}
                  >
                    Connect to AWS & Continue
                  </Button>
                </Flex>
              </Form.Item>
            </div>
          )}

          {/* Security Notice */}
          <div style={{ marginTop: 24, padding: '12px', background: '#e7f3ff', border: '1px solid #b3d9ff', borderRadius: '4px' }}>
            <Text 
              text={connectionMode === 'stored' 
                ? "🔒 Security Notice: Your stored credentials are securely encrypted in AWS Secret Manager and only accessible by authorized users." 
                : "🔒 Security Notice: Your credentials are used only for validation and are not stored permanently. They are kept in memory for the duration of your session only."
              }
              type="footnote" 
              style={{ color: '#0066cc' }}
            />
          </div>
        </Form>
      </Flex>

      {/* Drift Assist Sign In Drawer */}
      <DriftAssistSignInDrawer
        projectId={parseInt(project || '0')}
        isOpen={isOpenAddDriftAssist}
        onClose={() => setIsOpenAddDriftAssist(false)}
        onSuccess={async () => {
          await listDriftAssistSecretsQuery.refetch();
          setIsOpenAddDriftAssist(false);
        }}
      />
    </>
  );
};

export default ConfigureDriftAssist;
