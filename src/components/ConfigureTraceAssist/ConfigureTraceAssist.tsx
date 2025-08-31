import React, { useEffect, useState, useRef } from "react";
import { Form, FormInstance, Radio, Button, message, Flex, Modal } from "antd";
import { Input, Text } from "components";
import { Metrics } from "themes";
import { useCreateDeployment, useAnalyzeRepo } from "react-query/traceAssistQueries";

import { useParams } from "react-router-dom"; 

const FIELD_KEYS = [
  "GITHUB_REPO_URL",
  "GITHUB_AUTH_TOKEN",
  "MONITORING_TOOL",
  "DEPLOYMENT_NAME",
] as const;

type FieldKey = typeof FIELD_KEYS[number];

interface ConfigureTraceAssistFormField {
  GITHUB_REPO_URL: string;
  GITHUB_AUTH_TOKEN?: string;
  MONITORING_TOOL: string;
  DEPLOYMENT_NAME: string;
}

const FIELD_CONSTANTS: Record<
  FieldKey,
  {
    LABEL: string;
    PLACEHOLDER: string;
    ERROR: string;
    TYPE?: "text" | "password";
  }
> = {
  GITHUB_REPO_URL: {
    LABEL: "GitHub Repo URL",
    PLACEHOLDER: "Enter the GitHub repository URL",
    ERROR: "Repository URL is required",
    TYPE: "text",
  },
  GITHUB_AUTH_TOKEN: {
    LABEL: "GitHub Auth Token",
    PLACEHOLDER: "Enter your GitHub Auth Token (optional)",
    ERROR: "",
    TYPE: "password",
  },
  MONITORING_TOOL: {
    LABEL: "Monitoring Tools",
    PLACEHOLDER: "",
    ERROR: "Monitoring tool is required",
  },
  DEPLOYMENT_NAME: {
    LABEL: "Custom Deployment Name",
    PLACEHOLDER: "Enter a deployment name",
    ERROR: "Deployment name is required",
    TYPE: "text",
  },
};

const MONITORING_TOOLS = [
  { label: "OpenTelemetry", value: "opentelemetry", disabled: false },
  { label: "Jaeger", value: "jaeger", disabled: true },
];

interface ConfigureTraceAssistProps {
  configureTraceAssistForm: FormInstance<ConfigureTraceAssistFormField>;
  setDisabledSave: (disabled: boolean) => void;
  onSuccess?: (traceName?: string) => void;
}

const urlValidator = (_: any, value: string) => {
  if (!value) return Promise.resolve();
  const trimmedValue = value.trim();
  if (!trimmedValue) return Promise.reject("Please enter a valid URL");
  try {
    new URL(trimmedValue);
    return Promise.resolve();
  } catch {
    return Promise.reject("Please enter a valid URL");
  }
};

const ConfigureTraceAssist: React.FC<ConfigureTraceAssistProps> = ({
  configureTraceAssistForm,
  setDisabledSave,
  onSuccess,
}) => {
  const { mutateAsync: createDeploymentAsync, isLoading: isCreating } = useCreateDeployment();
  const { mutateAsync: analyzeRepoAsync, isLoading: isAnalyzing } = useAnalyzeRepo();

  const params = useParams();
  const project_id = params.project as string;
  const application_id = params.application as string;

  const [modalType, setModalType] = useState<
    null | "public-push-required" | "private-push-required" | "no-changes-needed" | "push-confirm"
  >(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [formValues, setFormValues] = useState<ConfigureTraceAssistFormField | null>(null);
  const patInputRef = useRef<any>(null);

  useEffect(() => {
    if (!configureTraceAssistForm.getFieldValue("MONITORING_TOOL")) {
      configureTraceAssistForm.setFieldsValue({ MONITORING_TOOL: "opentelemetry" });
    }
    handleFormChange();
  }, []);

  const handleFormChange = () => {
    const hasErrors =
      configureTraceAssistForm
        ?.getFieldsError()
        .filter(({ errors }) => errors.length).length > 0;
    setDisabledSave(hasErrors);
  };

  const handleSubmit = async () => {
    try {
      const values = await configureTraceAssistForm.validateFields();
      setFormValues(values);

      const analyzePayload = {
        repo_url: values.GITHUB_REPO_URL,
        pat_token: values.GITHUB_AUTH_TOKEN,
      };

      let analysis;
      try {
        analysis = await analyzeRepoAsync(analyzePayload);
      } catch (err: any) {
        Modal.error({
          title: "Repository Analysis Failed",
          content: err?.message || "Failed to analyze repository.",
        });
        return;
      }

      setAnalysisResult(analysis);

      if (analysis.push_required) {
        if (!values.GITHUB_AUTH_TOKEN) {
          // If no PAT token, ask user to provide one
          setModalType(analysis.is_public ? "public-push-required" : "private-push-required");
          return;
        } else {
          // If PAT token is provided, ask for confirmation before pushing (for both public and private)
          setModalType("push-confirm");
          return;
        }
      }

      setModalType("no-changes-needed");
      return;
    } catch (err: any) {
      Modal.error({
        title: "Error",
        content: err?.message || "Failed to create deployment.",
      });
    }
  };

  const handleFinalSubmit = async ({
    push_to_git,
    useEmptyToken = false,
  }: { push_to_git: boolean; useEmptyToken?: boolean }) => {
    const values = formValues || (await configureTraceAssistForm.getFieldsValue());
    if (!values) return;
    try {
      await createDeployment({
        ...values,
        push_to_git,
        pat_token: useEmptyToken ? "" : values.GITHUB_AUTH_TOKEN,
      });
      setModalType(null);
    } catch (err: any) {
      Modal.error({
        title: "Deployment Failed",
        content: err?.message || "Failed to create deployment.",
      });
    }
  };


  const createDeployment = async (params: any) => {
    const payload = {
      repo_url: params.GITHUB_REPO_URL,
      deployment_name: params.DEPLOYMENT_NAME,
      pat_token: params.pat_token ?? "",
      push_to_git: params.push_to_git,
      project_id,       
      application_id,   
    };
    await createDeploymentAsync(payload);
    message.success("Deployment created successfully!");
    setModalType(null);
    if (onSuccess) onSuccess(params.DEPLOYMENT_NAME); 
  };

  const handleCloseModalAndFocus = () => {
    setModalType(null);
    setTimeout(() => {
      patInputRef.current?.focus?.();
    }, 100);
  };

  return (
    <>
      <Flex vertical gap={Metrics.SPACE_LG}>
        <Form
          form={configureTraceAssistForm}
          layout="vertical"
          onFieldsChange={handleFormChange}
          onFinish={handleSubmit}
          initialValues={{ MONITORING_TOOL: "opentelemetry" }}
        >
          <Form.Item<ConfigureTraceAssistFormField>
            key="DEPLOYMENT_NAME"
            label={
              <Text
                text={FIELD_CONSTANTS.DEPLOYMENT_NAME.LABEL} 
                weight="semibold" 
                />
              }
            name="DEPLOYMENT_NAME"
            rules={[
              { required: true, message: FIELD_CONSTANTS.DEPLOYMENT_NAME.ERROR },
            ]}
          >
            <Input
              placeholder={FIELD_CONSTANTS.DEPLOYMENT_NAME.PLACEHOLDER}
              type={FIELD_CONSTANTS.DEPLOYMENT_NAME.TYPE}
              autoComplete="off"
            />
          </Form.Item>

          <Form.Item<ConfigureTraceAssistFormField>
            key="GITHUB_REPO_URL"
            label={
              <Text
                text={FIELD_CONSTANTS.GITHUB_REPO_URL.LABEL}
                weight="semibold"
              />
            }
            name="GITHUB_REPO_URL"
            rules={[
              { required: true, message: FIELD_CONSTANTS.GITHUB_REPO_URL.ERROR },
              { validator: urlValidator },
            ]}
          >
            <Input
              placeholder={FIELD_CONSTANTS.GITHUB_REPO_URL.PLACEHOLDER}
              type={FIELD_CONSTANTS.GITHUB_REPO_URL.TYPE}
              autoComplete="off"
            />
          </Form.Item>

          <Form.Item<ConfigureTraceAssistFormField>
            key="GITHUB_AUTH_TOKEN"
            label={
              <Text
                text={FIELD_CONSTANTS.GITHUB_AUTH_TOKEN.LABEL}
                weight="semibold"
              />
            }
            name="GITHUB_AUTH_TOKEN"
          >
            <Input
              ref={patInputRef}
              placeholder={FIELD_CONSTANTS.GITHUB_AUTH_TOKEN.PLACEHOLDER}
              type={FIELD_CONSTANTS.GITHUB_AUTH_TOKEN.TYPE}
              autoComplete="off"
            />
          </Form.Item>

          <Form.Item<ConfigureTraceAssistFormField>
            key="MONITORING_TOOL"
            label={
              <Text 
                text={FIELD_CONSTANTS.MONITORING_TOOL.LABEL}
                weight="semibold" 
              />
            }
            name="MONITORING_TOOL"
            rules={[
              { required: true, message: FIELD_CONSTANTS.MONITORING_TOOL.ERROR },
            ]}
          >
            <Radio.Group style={{ width: "100%" }}>
              <Flex vertical gap={Metrics.SPACE_SM}>
                {MONITORING_TOOLS.map((tool) => (
                  <Radio 
                    key={tool.value} 
                    value={tool.value}
                    disabled={tool.disabled}
                  >
                    {tool.label}
                  </Radio>
                ))}
              </Flex>
            </Radio.Group>
          </Form.Item>

          <div style={{ marginTop: 8, color: "#888" }}>
            <Text text="By default, using 'Main' branch." type="footnote" />
          </div>

          <Form.Item>
            <Flex justify="end">
              <Button
                type="primary"
                htmlType="submit"
                loading={isCreating || isAnalyzing}
                style={{ marginTop: 16 }}
              >
                Create Deployment
              </Button>
            </Flex>
          </Form.Item>
        </Form>
      </Flex>

      {/* Modal for PUBLIC repos when push is required and NO PAT */}
      <Modal
        open={modalType === "public-push-required"}
        onCancel={() => setModalType(null)}
        title="Instrumentation Changes Required"
        footer={[
          <Button key="no-push" onClick={() => handleFinalSubmit({ push_to_git: false })}>
            Proceed without Pushing
          </Button>,
          <Button key="add-pat" type="primary" onClick={handleCloseModalAndFocus}>
            OK, I'll add a PAT
          </Button>,
        ]}
      >
        This public repository's manifests need updates. To save these changes to GitHub, please provide a PAT token in the form.
        <br />
        <br />
        Alternatively, you can proceed without pushing the changes to your repository.
      </Modal>

      {/* Modal for PRIVATE repos when push is required and NO PAT */}
      <Modal
        open={modalType === "private-push-required"}
        onCancel={() => setModalType(null)}
        title="Push Changes to Private Repository?"
        footer={[
          <Button key="no-push" onClick={() => handleFinalSubmit({ push_to_git: false })}>
            No, Proceed without Pushing
          </Button>,
          <Button key="yes-push" type="primary" onClick={() => handleFinalSubmit({ push_to_git: true })}>
            Yes, Push Changes
          </Button>,
        ]}
      >
        This private repository's manifests need updates for instrumentation. Do you want to push these changes to your repository?
      </Modal>

      {/* Modal for confirmation before pushing (for BOTH public and private repos with PAT) */}
      <Modal
        open={modalType === "push-confirm"}
        onCancel={() => setModalType(null)}
        title="Push Permissions Required"
        footer={[
          <Button key="no-push" onClick={() => handleFinalSubmit({ push_to_git: false })}>
            Proceed without Pushing
          </Button>,
          <Button
            key="confirm"
            type="primary"
            loading={isCreating}
            onClick={() => handleFinalSubmit({ push_to_git: true })}
          >
            Yes, Push Changes
          </Button>,
        ]}
      >
        <div>
          <p>
            You have provided a Personal Access Token (PAT). This will be used to push annotations in your manifest for Instrumentation to your {analysisResult?.is_public ? "public" : "private"} repository.
          </p>
          <p>
            Please confirm you wish to proceed. Make sure your PAT has the necessary <b>repo</b> permissions.
          </p>
        </div>
      </Modal>

      {/* Modal for when no changes are needed (works for public and private) */}
      <Modal
        open={modalType === "no-changes-needed"}
        onCancel={() => setModalType(null)}
        title="Manifests Already Instrumented"
        footer={[
          <Button
            key="proceed"
            type="primary"
            onClick={() => {
              const isPublicRepo = analysisResult ? analysisResult.is_public : false;
              handleFinalSubmit({ push_to_git: false, useEmptyToken: isPublicRepo });
            }}
          >
            Proceed
          </Button>,
        ]}
      >
        This repository's manifests are already up-to-date. A Git push will not be performed.
      </Modal>
    </>
  );
};

export default ConfigureTraceAssist;
