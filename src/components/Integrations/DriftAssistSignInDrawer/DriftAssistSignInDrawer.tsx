import { useState } from "react";
import { useCreateDriftAssistSecret } from "react-query/driftAssistQueries";

import { InfoCircleOutlined } from "@ant-design/icons";
import { Flex, Form, Tooltip, message, Select } from "antd";

import { Drawer, Input, Text } from "components";

import { Colors, Metrics } from "themes";

// AWS Regions
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

interface DriftAssistSignInFormFields {
  name: string;
  cloud_provider: string;
  access_key: string;
  secret_access_key: string;
  region: string;
}

interface DriftAssistSignInDrawerProps {
  projectId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  type?: "add" | "edit";
  initialValues?: DriftAssistSignInFormFields;
}

/**
 * A Drawer component for configuring Drift Assist AWS connection into an application.
 */
const DriftAssistSignInDrawer: React.FC<DriftAssistSignInDrawerProps> = ({
  projectId,
  isOpen,
  type = "add",
  initialValues = {},
  onClose,
  onSuccess,
}) => {
  const [disabledSave, setDisabledSave] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [driftAssistForm] = Form.useForm<DriftAssistSignInFormFields>();

  const createDriftAssistSecretMutation = useCreateDriftAssistSecret();


  const [messageApi, contextHolder] = message.useMessage();

  const error = (message?: string) => {
    messageApi.open({
      type: "error",
      content: message ? message : "Error: Something went wrong",
    });
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      await driftAssistForm.validateFields();

      if (type === "add") {
        const req = {
          name: driftAssistForm.getFieldValue("name"),
          project_id: projectId,
          secret: {
            cloud_provider: "aws",
            access_key: driftAssistForm.getFieldValue("access_key"),
            secret_access_key: driftAssistForm.getFieldValue("secret_access_key"),
            region: driftAssistForm.getFieldValue("region"),
          },
          access: "Internal", // Default to Internal since access type is not required
        };

        await createDriftAssistSecretMutation.mutateAsync(req);
      }

      onSuccess();
    } catch (err) {
      console.error("DriftAssistSignInDrawer: Error creating secret:", err);
      error(err?.response?.data?.detail || "Failed to create Drift Assist connection");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormChange = () => {
    const hasErrors =
      driftAssistForm?.getFieldsError().filter(({ errors }) => errors.length)
        .length > 0;

    setDisabledSave(hasErrors);
  };

  return (
    <>
      {contextHolder}
      <Drawer
        open={isOpen}
        onClose={onClose}
        title={`${type === "edit" ? "Edit" : "Add New"} AWS Connection`}
        onCancel={onClose}
        onSubmit={handleSubmit}
        disabled={disabledSave || isLoading}
        loading={isLoading}
      >
        <Form
          layout="vertical"
          onFieldsChange={handleFormChange}
          form={driftAssistForm}
          initialValues={{
            region: "us-east-1",
            ...initialValues,
          }}
        >
          <Form.Item<DriftAssistSignInFormFields>
            name="name"
            label={<Text weight="semibold" text="Connection Name" />}
            rules={[{ required: true, message: "Connection name is required" }]}
          >
            <Input placeholder="Enter connection name" type="text" />
          </Form.Item>

          <Form.Item<DriftAssistSignInFormFields>
            name="access_key"
            label={
              <Flex align="center" gap={Metrics.SPACE_XS}>
                <Text weight="semibold" text="AWS Access Key" />
                <Tooltip
                  overlayStyle={{ maxWidth: "400px" }}
                  showArrow
                  title={
                    <>
                      Your AWS Access Key ID. This should start with "AKIA" for IAM users. <br />
                      <a
                        href="https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Learn more about AWS Access Keys
                      </a>
                    </>
                  }
                  trigger="hover"
                  placement="bottom"
                >
                  <InfoCircleOutlined
                    className="cursor-pointer"
                    style={{ color: Colors.COOL_GRAY_7 }}
                  />
                </Tooltip>
              </Flex>
            }
            rules={[
              { required: true, message: "AWS Access Key is required" },
              { pattern: /^AKIA[0-9A-Z]{16}$/, message: "Invalid AWS Access Key format (should start with AKIA)" }
            ]}
          >
            <Input
              placeholder="AKIA..."
              type="password"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item<DriftAssistSignInFormFields>
            name="secret_access_key"
            label={
              <Flex align="center" gap={Metrics.SPACE_XS}>
                <Text weight="semibold" text="AWS Secret Key" />
                <Tooltip
                  overlayStyle={{ maxWidth: "400px" }}
                  showArrow
                  title="Your AWS Secret Access Key. This is a 40-character string that pairs with your Access Key ID."
                  trigger="hover"
                  placement="bottom"
                >
                  <InfoCircleOutlined
                    className="cursor-pointer"
                    style={{ color: Colors.COOL_GRAY_7 }}
                  />
                </Tooltip>
              </Flex>
            }
            rules={[
              { required: true, message: "AWS Secret Key is required" },
              { len: 40, message: "AWS Secret Key should be exactly 40 characters long" }
            ]}
          >
            <Input
              placeholder="Enter your AWS Secret Access Key"
              type="password"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item<DriftAssistSignInFormFields>
            name="region"
            label={<Text weight="semibold" text="AWS Region" />}
            rules={[{ required: true, message: "AWS region is required" }]}
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

        </Form>

        {/* Security Notice */}
        <div style={{ marginTop: 24, padding: '12px', background: '#e7f3ff', border: '1px solid #b3d9ff', borderRadius: '4px' }}>
          <Text 
            text="🔒 Security Notice: Your AWS credentials will be securely stored in AWS Secret Manager and encrypted. They are only accessible by authorized users within your project." 
            type="footnote" 
            style={{ color: '#0066cc' }}
          />
        </div>
      </Drawer>
    </>
  );
};

export default DriftAssistSignInDrawer;
