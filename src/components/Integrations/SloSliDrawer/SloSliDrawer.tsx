
import { useEffect, useRef, useState } from "react";
import { Form, message, Tooltip } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { Drawer, Input, Text } from "components";
import { useCreateProjectSLO } from "react-query/sloQueries";
import type { ProjectSlo } from "interfaces/slo";

interface SloSliDrawerFormFields {
  name: string;
  release_namespace: string;
  release_name: string;
  grafana_url: string;
  graf_pat: string;
  integration_id?: string | number;
}

interface SloSliDrawerProps {
  projectId: number;
  isOpen: boolean;
  initalValues?: Partial<SloSliDrawerFormFields>;
  type?: "add" | "edit";
  onClose: () => void;
  onSuccess: (projectSloId?: number) => void;
}

// Centralized field definitions including tooltip text
const FIELD_CONSTANTS = {
  name: {
    LABEL: "Name",
    PLACEHOLDER: "Enter Name",
    ERROR: "Name is required",
    TYPE: "text",
  },
  release_namespace: {
    LABEL: "Release Namespace",
    PLACEHOLDER: "Enter Release Namespace",
    ERROR: "Release Namespace is required",
    TYPE: "text",
    TOOLTIP: "Namespace where your release is deployed.",
  },
  release_name: {
    LABEL: "Release Name",
    PLACEHOLDER: "Enter Release Name",
    ERROR: "Release Name is required",
    TYPE: "text",
    TOOLTIP: "Name of the release you want to monitor.",
  },
  grafana_url: {
    LABEL: "Grafana URL",
    PLACEHOLDER: "Enter Grafana URL",
    ERROR: "Grafana URL is required",
    TYPE: "text",
    TOOLTIP: "URL to your Grafana dashboard.",
  },
  graf_pat: {
    LABEL: "Grafana PAT",
    PLACEHOLDER: "Enter Grafana PAT",
    ERROR: "Grafana PAT is required",
    TYPE: "text",
    TOOLTIP: 'Navigate to "/org/serviceaccounts" in Grafana to create a PAT token.',
  },  
};

const SloSliDrawer: React.FC<SloSliDrawerProps> = ({
  projectId,
  isOpen = false,
  initalValues = {},
  type = "add",
  onClose,
  onSuccess,
}) => {
  const [disabledSave, setDisabledSave] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [form] = Form.useForm<SloSliDrawerFormFields>();
  const [messageApi, contextHolder] = message.useMessage();

  const { mutateAsync: createProjectSLO, isLoading: isCreating } = useCreateProjectSLO();

  const error = (msg?: string) => {
    messageApi.open({
      type: "error",
      content: msg ? msg : "Error: Something went wrong",
    });
  };

  // Track previous isOpen value to only reset when opening
  const prevIsOpen = useRef(isOpen);

  useEffect(() => {
    if (!prevIsOpen.current && isOpen) {
      form.resetFields();
      setDisabledSave(false);
      if (initalValues) {
        form.setFieldsValue(initalValues);
      }
    }
    prevIsOpen.current = isOpen;
    // eslint-disable-next-line
  }, [isOpen, form, initalValues]);

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      setIsLoading(true);

      const values = form.getFieldsValue();

      // Ensure Grafana URL includes scheme
      if (!/^https?:\/\//i.test(values.grafana_url)) {
        values.grafana_url = `https://${values.grafana_url}`;
      }

      if (type === "add") {
        const response = await createProjectSLO({
          ...values,
          project_id: projectId,
        } as Omit<ProjectSlo, "id">);

        onSuccess(response?.project_id);
      } else if (type === "edit" && values.integration_id) {
        error("Edit functionality not implemented yet.");
        return;
      }
      onClose();
    } catch (err: any) {
      error(
        err?.response?.data?.detail ||
        err?.message ||
        "Error: Something went wrong"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormChange = () => {
    const hasErrors =
      form?.getFieldsError().filter(({ errors }) => errors.length).length > 0;
    setDisabledSave(hasErrors);
  };

  return (
    <Drawer
      open={isOpen}
      onClose={onClose}
      title={
        type === "edit"
          ? "Edit SLO/SLI Connection"
          : "Add New SLO/SLI Connection"
      }
      onCancel={onClose}
      onSubmit={handleSubmit}
      disabled={disabledSave}
      loading={isLoading || isCreating}
    >
      {contextHolder}
      <Form
        form={form}
        onFieldsChange={handleFormChange}
        layout="vertical"
        initialValues={{
          ...initalValues,
        }}
      >
        {Object.keys(FIELD_CONSTANTS).map((field) => (
          <Form.Item
            key={field}
            label={
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Text weight="semibold" text={FIELD_CONSTANTS[field].LABEL} />
                {FIELD_CONSTANTS[field].TOOLTIP && (
                  <Tooltip
                    title={FIELD_CONSTANTS[field].TOOLTIP}
                    placement="bottom"
                    overlayStyle={{ maxWidth: "300px" }}
                    showArrow
                    trigger="hover"
                  >
                    <InfoCircleOutlined style={{ color: "#8c8c8c", cursor: "pointer" }} />
                  </Tooltip>
                )}
              </span>
            }
            name={field}
            rules={[
              { required: true, message: FIELD_CONSTANTS[field].ERROR },
              field === "grafana_url" ? { type: "url", message: "Please enter a valid URL" } : {},
            ]}
          >
            <Input
              placeholder={FIELD_CONSTANTS[field].PLACEHOLDER}
              type={FIELD_CONSTANTS[field].TYPE}
            />
          </Form.Item>
        ))}
      </Form>
    </Drawer>
  );
};

export default SloSliDrawer;
