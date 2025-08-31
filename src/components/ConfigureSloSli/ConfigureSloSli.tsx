import React, { useState, useEffect, useCallback } from "react";
import { Form, Button, message, Flex, Select, Spin, Divider } from "antd";
import { Input, Text } from "components";
import { Metrics } from "themes";
import type { ApplicationSlo } from "interfaces/slo";
import { useCreateApplicationSLO } from "react-query/sloQueries";
import SloSliDrawer from "components/Integrations/SloSliDrawer/SloSliDrawer";

const SLO_TYPES = [
  { value: "HTTP_AVAILABILITY", label: "HTTP_AVAILABILITY" },
  { value: "CPU", label: "CPU" },
  { value: "MEMORY", label: "MEMORY" },
];

type ConfigureSloSliFormField = Omit<ApplicationSlo, "id" | "panelurl" | "project_slo_id"> & {
  grafana_Environment?: number; 
};

interface ConfigureSloSliProps {
  application_id: number;
  project_slo_id: number; 
  onSuccess?: (result: any) => void;
}

const ConfigureSloSli: React.FC<ConfigureSloSliProps> = ({
  application_id,
  project_slo_id,
  onSuccess,
}) => {
  const [form] = Form.useForm<ConfigureSloSliFormField>();
  const [status, setStatus] = useState<string>("");
  const { mutateAsync: createApplicationSLO, isLoading } = useCreateApplicationSLO();

  const showPodAndSli = Form.useWatch("slo_type", form) !== "HTTP_AVAILABILITY";

  // State for environments
  const [environments, setEnvironments] = useState<{ value: number; label: string }[]>([]);
  const [envLoading, setEnvLoading] = useState<boolean>(false);

  const [drawerOpen, setDrawerOpen] = useState(false);

  // Use VITE_BASE_URL from environment variables
  const baseUrl = import.meta.env.VITE_BASE_URL;

  const fetchEnvironments = useCallback(async () => {
    setEnvLoading(true);
    try {
      const response = await fetch(
        `${baseUrl}/slo/get_project_slos?project_id=${project_slo_id}`
      );
      const data = await response.json();
      const envOptions = Array.isArray(data)
        ? data.map((env: { id: number; name: string }) => ({
            value: env.id,
            label: env.name,
          }))
        : [];
      setEnvironments(envOptions);
    } catch (error) {
      setEnvironments([]);
      message.error("Failed to load Grafana environments");gi
    } finally {
      setEnvLoading(false);
    }
  }, [project_slo_id, baseUrl]);

  // Fetch environments on project_slo_id change
  useEffect(() => {
    fetchEnvironments();
  }, [fetchEnvironments]);

  const handleFinish = async (values: ConfigureSloSliFormField) => {
    setStatus("Submitting...");

    // Use the selected environment's id as project_slo_id
    const selectedProjectSloId = values.grafana_Environment;

    if (!selectedProjectSloId) {
      message.error("Please select a valid Grafana Environment.");
      setStatus("No valid environment selected.");
      return;
    }

    try {
      const payload: Omit<ApplicationSlo, "id" | "panelurl"> = {
        ...values,
        application_id,
        project_slo_id: selectedProjectSloId,
        pod_name: showPodAndSli ? values.pod_name || null : null,
        sli: showPodAndSli ? values.sli || null : null,
      };

      await createApplicationSLO(payload);
      message.success("SLO/SLI created successfully!");
      setStatus("Form submitted successfully!");
      form.resetFields();
      if (onSuccess) onSuccess(values.name);
    } catch (err: any) {
      setStatus(err.message || "Submission failed.");
      message.error(err.message || "Submission failed.");
    }
  };

  return (
    <Flex vertical gap={Metrics.SPACE_LG}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{
          slo_type: "HTTP_AVAILABILITY",
        }}
      >
        <Form.Item
          label={<Text text="Name" weight="semibold" />}
          name="name"
          rules={[{ required: true, message: "Name is required" }]}
        >
          <Input placeholder="Enter SLO Name" />
        </Form.Item>

        <Form.Item
          label={<Text text="Target Value" weight="semibold" />}
          name="target_value"
          rules={[{ required: true, message: "Target Value is required" }]}
        >
          <Input placeholder="Enter Target Value (e.g., 99.9)" />
        </Form.Item>

        <Form.Item
          label={<Text text="Service Name" weight="semibold" />}
          name="service_name"
          rules={[{ required: true, message: "Service Name is required" }]}
        >
          <Input placeholder="Enter Service Name" />
        </Form.Item>

        <Form.Item
          label={<Text text="Alert Name" weight="semibold" />}
          name="alert_name"
          rules={[{ required: true, message: "Alert Name is required" }]}
        >
          <Input placeholder="Enter Alert Name" />
        </Form.Item>

        <Form.Item
          label={<Text text="SLO Type" weight="semibold" />}
          name="slo_type"
          rules={[{ required: true, message: "SLO Type is required" }]}
        >
          <select style={{ width: "100%", height: 32 }}>
            {SLO_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </Form.Item>

        <Form.Item
          label={<Text text="Grafana Environment" weight="semibold" />}
          name="grafana_Environment"
          rules={[{ required: true, message: "Grafana Environment is required" }]}
        >
          {envLoading ? (
            <Spin />
          ) : (
            <Select
              placeholder="Select Grafana Environment"
              allowClear
              showSearch
              optionFilterProp="children"
              dropdownRender={menu => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <Button
                    type="link"
                    style={{ width: "100%", textAlign: "left", paddingLeft: 8 }}
                    onClick={e => {
                      e.preventDefault();
                      setDrawerOpen(true);
                    }}
                  >
                    + Add Environment
                  </Button>
                </>
              )}
            >
              {environments.map((env) => (
                <Select.Option key={env.value} value={env.value}>
                  {env.label}
                </Select.Option>
              ))}
            </Select>
          )}
        </Form.Item>

        {showPodAndSli && (
          <>
            <Form.Item
              label={<Text text="Pod Name" weight="semibold" />}
              name="pod_name"
              rules={[{ required: false }]}
            >
              <Input placeholder="Enter Pod Name" />
            </Form.Item>

            <Form.Item
              label={<Text text="SLI" weight="semibold" />}
              name="sli"
              rules={[{ required: false }]}
            >
              <Input placeholder="Enter SLI" />
            </Form.Item>
          </>
        )}

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            style={{ marginTop: 16 }}
            loading={isLoading}
          >
            Add SLO/SLI
          </Button>
        </Form.Item>
      </Form>

      <SloSliDrawer
        projectId={project_slo_id}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => {
          fetchEnvironments();
          setDrawerOpen(false);
        }}
      />
    </Flex>
  );
};

export default ConfigureSloSli;
