import React, { useState, useEffect, useRef } from "react";
import { Steps, Button, Drawer, Form, Dropdown, Menu, message, Spin, Modal } from "antd";
import {
  CloudDownloadOutlined,
  ToolOutlined,
  RocketOutlined,
  CloseOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  PlusOutlined,
  EllipsisOutlined,
} from "@ant-design/icons";
import { ConfigureTraceAssist } from "components/ConfigureTraceAssist";
import {
  useGetAllDeployments,
  useGetDeploymentDetails,
  useInstrumentDeployment,
  useDeleteDeployment,
} from "react-query/traceAssistQueries";
import moment from "moment-timezone";
import { Empty,IconViewer } from "components";
import "./TraceAssist.styles.scss";

import { useParams } from "react-router-dom"; 

type TraceAssistProps = {
  onClose?: () => void;
};

const MAX_VISIBLE_DEPLOYMENTS = 3;

const TraceAssist: React.FC<TraceAssistProps> = ({ onClose }) => {
  const [showConfigure, setShowConfigure] = useState(false);
  const [current, setCurrent] = useState(0);
  const [configureTraceAssistForm] = Form.useForm();
  const [selectedDeployment, setSelectedDeployment] = useState<string | null>(null);

  const params = useParams();
  const project_id = params.project as string;
  const application_id = params.application as string;

  const {
    data: deployments,
    isLoading: isLoadingDeployments,
    refetch: refetchDeployments,
  } = useGetAllDeployments(project_id, application_id);
 

  const {
    data: deploymentDetails,
    isLoading: isLoadingDeploymentDetails,
    refetch: refetchDeploymentDetails,
  } = useGetDeploymentDetails(selectedDeployment);

  const {
    mutateAsync: instrumentDeploymentAsync,
    isLoading: isInstrumenting,
  } = useInstrumentDeployment();

  const {
    mutateAsync: deleteDeploymentAsync,
    isLoading: isDeleting,
  } = useDeleteDeployment();

  const stepTimerRef = useRef<any>(null);

  const steps = [
    {
      title: "Cloning Repo",
      description: "Cloning repository",
      icon: <CloudDownloadOutlined />,
    },
    {
      title: "Instrumenting",
      description: "Instrumenting application",
      icon: <ToolOutlined />,
    },
    {
      title: "Deployed",
      description: "Deploying into cluster",
      icon: <RocketOutlined />,
    },
  ];

  const formatDateTime = (dateTime: string | undefined) => {
    if (!dateTime) return "N/A";
    return moment(dateTime)
      .tz("Asia/Kolkata")
      .format("ddd, DD MMM YYYY HH:mm:ss [IST]");
  };

  const isDeployed = deploymentDetails?.status?.toLowerCase() === "deployed";

  useEffect(() => {
    if (deployments && deployments.length > 0 && !selectedDeployment) {
      setSelectedDeployment(deployments[0].deployment_name);
    }
  }, [deployments, selectedDeployment]);

  useEffect(() => {
    if (isDeployed) {
      setCurrent(2);
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    }
  }, [deploymentDetails?.status]);

  useEffect(() => {
    if (!isDeployed) {
      setCurrent(0);
      if (stepTimerRef.current) {
        clearTimeout(stepTimerRef.current);
      }
    }
  }, [selectedDeployment, deploymentDetails?.status]);

  useEffect(() => {
    return () => {
      if (stepTimerRef.current) {
        clearTimeout(stepTimerRef.current);
      }
    };
  }, []);

  const handleStartInstrumentation = async () => {
    setCurrent(0);

    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    stepTimerRef.current = setTimeout(() => {
      setCurrent(1);
      stepTimerRef.current = setTimeout(() => {
        setCurrent(2);
      }, 1000);
    }, 3000);

    if (selectedDeployment) {
      try {
        await instrumentDeploymentAsync(selectedDeployment);
        setCurrent(2);
        message.success("Instrumentation started successfully!");
        await refetchDeployments();
        await refetchDeploymentDetails();
      } catch (error) {
        message.error("Failed to start instrumentation.");
        setCurrent(0);
      }
    }
  };

  const handleDeleteDeployment = async () => {
    if (!selectedDeployment) return;
    Modal.confirm({
      title: "Delete Deployment",
      content: `Are you sure you want to delete "${selectedDeployment}"? This action cannot be undone.`,
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      icon: <DeleteOutlined style={{ color: "red" }} />,
      onOk: async () => {
        try {
          await deleteDeploymentAsync(selectedDeployment);
          message.success("Deployment deleted successfully!");
          await refetchDeployments();
          const updatedDeployments = deployments?.filter(
            (d: any) => d.deployment_name !== selectedDeployment
          );
          if (updatedDeployments && updatedDeployments.length > 0) {
            setSelectedDeployment(updatedDeployments[0].deployment_name);
          } else {
            setSelectedDeployment(null);
          }
        } catch (err) {
          message.error("Failed to delete deployment.");
        }
      },
    });
  };

  const getLastUpdated = () => {
    if (deploymentDetails?.last_updated) {
      return deploymentDetails.last_updated;
    }
    return deploymentDetails?.created_at || null;
  };

  const dashboardUrls = React.useMemo(() => {
    if (!deploymentDetails?.grafana_panel_links) return [];
    try {
      const urls = JSON.parse(deploymentDetails.grafana_panel_links);
      return Array.isArray(urls) ? urls : [];
    } catch {
      return [];
    }
  }, [deploymentDetails?.grafana_panel_links]);

  const isAnyLoading = isLoadingDeployments || isLoadingDeploymentDetails;

  const handleConfigureSuccess = async () => {
    setShowConfigure(false);
    const { data: newDeployments } = await refetchDeployments();
    if (newDeployments && newDeployments.length > 0) {
      setSelectedDeployment(newDeployments[0].deployment_name);
    } else {
      setSelectedDeployment(null);
    }
  };

  const handleDashboardClick = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  let deploymentsList = deployments ? [...deployments] : [];
  const selectedIndex = deploymentsList.findIndex(
    (d) => d.deployment_name === selectedDeployment
  );
  if (selectedIndex > -1 && selectedIndex >= MAX_VISIBLE_DEPLOYMENTS) {
    const [selectedItem] = deploymentsList.splice(selectedIndex, 1);
    deploymentsList.splice(MAX_VISIBLE_DEPLOYMENTS - 1, 0, selectedItem);
  }
  const visibleDeployments = deploymentsList.slice(0, MAX_VISIBLE_DEPLOYMENTS);
  const overflowDeployments = deploymentsList.slice(MAX_VISIBLE_DEPLOYMENTS);

  const overflowMenu = (
    <Menu>
      {overflowDeployments.map((deployment: any) => (
        <Menu.Item
          key={deployment.deployment_name}
          onClick={() => setSelectedDeployment(deployment.deployment_name)}
        >
          {deployment.deployment_name}
        </Menu.Item>
      ))}
    </Menu>
  );

  if (!deployments || deployments.length === 0) {
    return (
      <div className="trace-assist-container">
        {/* <Button
          icon={<CloseOutlined />}
          onClick={onClose}
          className="close-button"
        /> */}
        <div className="header">
          <div className="tabs-scroll-wrapper" />
          <Button
            type="primary"
            onClick={() => setShowConfigure(true)}
            className="add-button"
          >
            + Add New Application
          </Button>
        </div>
        <Empty
          title="You have not added any application yet."
          subtitle='Please click “Add New Application” button to get started.'
        >
        </Empty>
        <Drawer
          title="Add New Application"
          placement="right"
          onClose={() => setShowConfigure(false)}
          open={showConfigure}
          width={400}
          closeIcon={<CloseOutlined />}
          destroyOnClose
        >
          <ConfigureTraceAssist
            configureTraceAssistForm={configureTraceAssistForm}
            setDisabledSave={() => {}}
            onSuccess={handleConfigureSuccess}
          />
        </Drawer>
      </div>
    );
  }

  return (
    <div className="trace-assist-container">
      {/* <Button
        icon={<CloseOutlined />}
        onClick={onClose} 
        className="close-button"
      /> */}

      <div className="header" style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
        <div className="deployment-row">
          {visibleDeployments.map((deployment) => (
            <div
              key={deployment.deployment_name}
              className={`deployment-box${selectedDeployment === deployment.deployment_name ? " selected" : ""}`}
              onClick={() => setSelectedDeployment(deployment.deployment_name)}
            >
              {deployment.deployment_name}
            </div>
          ))}
          {overflowDeployments.length > 0 && (
            <Dropdown overlay={overflowMenu} trigger={['click']}>
              <div className="deployment-box ellipsis-box">
                <EllipsisOutlined style={{ fontSize: 20 }} />
              </div>
            </Dropdown>
          )}
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setShowConfigure(true)}
          className="add-button"
          style={{ marginLeft: 16 }}
        >
          Add New Application
        </Button>
      </div>

      <div className="instrumentation-button" style={{ display: "flex", gap: 8 }}>
        <Button
          className="start-button"
          onClick={handleStartInstrumentation}
          loading={isInstrumenting}
          disabled={!selectedDeployment || isDeployed}
        >
          <ToolOutlined className="icon" />
          Start Instrumentation
        </Button>
        <Button
          danger
          icon={<DeleteOutlined />}
          loading={isDeleting}
          disabled={!selectedDeployment}
          onClick={handleDeleteDeployment}
        >
          Delete Deployment
        </Button>
      </div>

      <Spin spinning={isAnyLoading}>
        <div className="data-box">
          <div className="data-row">
            <div className="data-label">ID</div>
            <div className="data-value">{deploymentDetails?.id || "N/A"}</div>
          </div>
          <div className="data-row">
            <div className="data-label">Deployment Name</div>
            <div className="data-value">{deploymentDetails?.deployment_name || "N/A"}</div>
          </div>
          <div className="data-row repo-url-row">
            <div className="data-label">Repository URL</div>
            <div className="data-value">{deploymentDetails?.repo_url || "N/A"}</div>
          </div>
          <div className="data-row">
            <div className="data-label">Language</div>
            <div className="data-value">{deploymentDetails?.language || "N/A"}</div>
          </div>
          <div className="data-row">
            <div className="data-label">Created At</div>
            <div className="data-value">{formatDateTime(deploymentDetails?.created_at)}</div>
          </div>
          <div className="data-row">
            <div className="data-label">Last Updated</div>
            <div className="data-value">{formatDateTime(getLastUpdated())}</div>
          </div>
          <div className="data-row">
            <div className="data-label">Status</div>
            <div className="data-value">
              {isDeployed ? (
                <span className="status-completed">
                  <CheckCircleOutlined /> Deployed
                </span>
              ) : (
                deploymentDetails?.status || "N/A"
              )}
            </div>
          </div>
        </div>

        {!isAnyLoading && (
          <Steps
            current={current}
            size="small"
            className="steps"
            onChange={setCurrent}
            items={steps.map((item) => ({
              key: item.title,
              title: item.title,
              description: item.description,
              icon: item.icon,
            }))}
          />
        )}
      </Spin>

      {isDeployed && (
        <div className="dashboard-grid">
          {dashboardUrls.length > 0 ? (
            dashboardUrls.slice(0, 2).map((url: string, idx: number) => (
              <div
                key={idx}
                style={{ margin: "10px 0", position: "relative", cursor: "pointer" }}
                onClick={() => handleDashboardClick(url)}
                tabIndex={0}
                role="button"
                aria-label={`Open dashboard ${idx + 1} in new tab`}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") handleDashboardClick(url);
                }}
              >
                <iframe
                  src={url}
                  title={`dashboard-${idx + 1}`}
                  frameBorder="0"
                  className="dashboard-iframe"
                  style={{ width: "100%", height: "300px", pointerEvents: "none" }}
                  allowFullScreen
                />
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    cursor: "pointer",
                    zIndex: 2,
                  }}
                />
              </div>
            ))
          ) : (
            <div className="dashboard-placeholder">No dashboards available.</div>
          )}
        </div>
      )}

      <Drawer
        title="Add New Application"
        placement="right"
        onClose={() => setShowConfigure(false)}
        open={showConfigure}
        width={400}
        closeIcon={<CloseOutlined />}
        destroyOnClose
      >
        <ConfigureTraceAssist
          configureTraceAssistForm={configureTraceAssistForm}
          setDisabledSave={() => {}}
          onSuccess={handleConfigureSuccess}
        />
      </Drawer>
    </div>
  );
};

export default TraceAssist;
