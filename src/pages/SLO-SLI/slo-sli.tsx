import React, { useState, useEffect, useMemo } from "react";
import { Button, Drawer, Tabs, message, Spin } from "antd";
import { DownloadOutlined, CloseOutlined, PlusOutlined } from "@ant-design/icons";
import { useGetApplicationSLO, useGeneratePrometheusRules } from "react-query/sloQueries";
import { Empty } from "components";
import ConfigureSloSli from "components/ConfigureSloSli/ConfigureSloSli";
import "./SloSli.styles.scss";
import { ApplicationSlo } from "interfaces/slo";

interface SloSliComponentProps {
  onClose: () => void;
  applicationId: number;
  projectSloId: number;
}

const PANEL_CONFIG = [
  { panelId: 3, label: "Objective" },
  { panelId: 4, label: "SLI Left" },
  { panelId: 1, label: "SLI Graph" },
];

const SloSliComponent: React.FC<SloSliComponentProps> = ({
  onClose,
  applicationId,
  projectSloId,
}) => {
  const [showConfigure, setShowConfigure] = useState(false);
  const [selectedSloId, setSelectedSloId] = useState<number | null>(null);

  const { data: sloData, isLoading: isLoadingSlos, refetch: refetchSlos } = useGetApplicationSLO(
    projectSloId,
    applicationId
  );
  const { mutateAsync: downloadSloAsync, isLoading: isDownloading } = useGeneratePrometheusRules();

  const isSloArray = (data: any): data is ApplicationSlo[] => Array.isArray(data);
  const slos: ApplicationSlo[] = isSloArray(sloData) ? sloData : [];

  useEffect(() => {
    if (slos.length > 0 && !selectedSloId) {
      setSelectedSloId(slos[0].id);
    }
    if (slos.length === 0) {
      setSelectedSloId(null);
    }
  }, [slos, selectedSloId]);

  const selectedSlo = useMemo(() => slos.find((slo) => slo.id === selectedSloId), [
    slos,
    selectedSloId,
  ]);

  const handleDownloadSlo = async () => {
    if (!selectedSlo) return;
    try {
      const result = await downloadSloAsync(selectedSlo.id);
      if (!result || !(result as any).blob) {
        throw new Error("No file received");
      }
      const { blob, filename } = result as { blob: Blob; filename: string };
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "slo_rules.yaml";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      message.success("SLO downloaded successfully!");
    } catch (error) {
      message.error("Failed to download SLO.");
    }
  };

  const handleConfigureSuccess = async () => {
    setShowConfigure(false);
    await refetchSlos();
    if (slos.length > 0) {
      setSelectedSloId(slos[0].id);
    } else {
      setSelectedSloId(null);
    }
  };

  const panelUrl = selectedSlo?.panelurl;

  if (!isSloArray(sloData) || slos.length === 0) {
    return (
      <div className="slo-sli-container">
        <div className="header">
          <div className="tabs-scroll-wrapper" />
          <Button
            type="primary"
            onClick={() => setShowConfigure(true)}
            className="add-button"
            icon={<PlusOutlined />}
          >
            Add SLO
          </Button>
        </div>
        <Empty
          title="You have not added any SLOs yet."
          subtitle='Please click “Add SLO” button to get started.'
        />
        <Drawer
          title="Add SLO"
          placement="right"
          onClose={() => setShowConfigure(false)}
          open={showConfigure}
          width={400}
          closeIcon={<CloseOutlined />}
          destroyOnClose
        >
          {applicationId && projectSloId ? (
            <ConfigureSloSli
              application_id={applicationId}
              project_slo_id={projectSloId}
              onSuccess={handleConfigureSuccess}
            />
          ) : (
            <div style={{ padding: 24 }}>Loading SLO prerequisites...</div>
          )}
        </Drawer>
      </div>
    );
  }

  const getPanelUrl = (panelId: number) => {
    if (!panelUrl) return "";
    let url = panelUrl.replace(/&panelId=\d+/, "") + `&panelId=${panelId}`;
    if (panelId === 1) {
      // SLI Graph: force theme=light
      url = url.replace(/([&?])theme=[^&]*/, ""); 
      url += (url.includes("?") ? "&" : "?") + "theme=light";
    }
    return url;
  };

  return (
    <div className="slo-sli-container">

      <div className="header">
        <div className="tabs-scroll-wrapper">
          <Tabs
            activeKey={selectedSloId?.toString() || ""}
            onChange={(key) => setSelectedSloId(Number(key))}
            className="tabs"
            tabBarGutter={8}
            tabBarStyle={{ marginBottom: 0 }}
          >
            {slos.map((slo) => (
              <Tabs.TabPane tab={slo.name} key={slo.id.toString()} />
            ))}
          </Tabs>
        </div>
        <Button
          type="primary"
          onClick={() => setShowConfigure(true)}
          className="add-button"
          icon={<PlusOutlined />}
        >
          Add SLO
        </Button>
      </div>

      <Spin spinning={isLoadingSlos || isDownloading}>
        <div className="data-box">
          <div className="data-row">
            <div className="data-label">Name</div>
            <div className="data-value">{selectedSlo?.name || "N/A"}</div>
          </div>
          <div className="data-row">
            <div className="data-label">Type</div>
            <div className="data-value">{selectedSlo?.slo_type || "N/A"}</div>
          </div>
          <div className="data-row">
            <div className="data-label">Target</div>
            <div className="data-value">{selectedSlo?.target_value || "N/A"}</div>
          </div>
          <div className="data-row">
            <div className="data-label">SLI</div>
            <div className="data-value">{selectedSlo?.sli || "N/A"}</div>
          </div>
          <div className="data-row" style={{ gridColumn: "1 / -1" }}>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownloadSlo}
              className="download-button"
              style={{ marginTop: 12 }}
              loading={isDownloading}
            >
              Download SLO
            </Button>
          </div>
        </div>

        <div className="dashboard-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          {panelUrl ? (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 12,
                  marginBottom: 8,
                }}
              >
                {PANEL_CONFIG.slice(0, 2).map(({ panelId, label }) => (
                  <div className="dashboard-item" key={panelId}>
                    <div className="dashboard-label">{label}</div>
                    <iframe
                      src={getPanelUrl(panelId)}
                      title={label}
                      frameBorder="0"
                      className="dashboard-iframe"
                      allowFullScreen
                      style={{
                        width: "100%",
                        height: "80px", 
                        pointerEvents: "none",
                        background: "#fafbfc",
                        borderRadius: "4px",
                      }}
                    />
                  </div>
                ))}
              </div>
              <div>
                <div>
                <div className="dashboard-item">
                  <div className="dashboard-label">{PANEL_CONFIG[2].label}</div>
                  <iframe
                    src={getPanelUrl(PANEL_CONFIG[2].panelId)}
                    title={PANEL_CONFIG[2].label}
                    frameBorder="0"
                    className="dashboard-iframe"
                    allowFullScreen
                    style={{
                      width: "100%",
                      height: "180px", 
                      pointerEvents: "none",
                      background: "#fafbfc",
                      borderRadius: "4px",
                    }}
                  />
                </div>
              </div>
              </div>
            </>
          ) : (
            <div className="dashboard-placeholder">No dashboards available.</div>
          )}
        </div>
      </Spin>

      <Drawer
        title="Add SLO"
        placement="right"
        onClose={() => setShowConfigure(false)}
        open={showConfigure}
        width={400}
        closeIcon={<CloseOutlined />}
        destroyOnClose
      >
        {applicationId && projectSloId ? (
          <ConfigureSloSli
            application_id={applicationId}
            project_slo_id={projectSloId}
            onSuccess={handleConfigureSuccess}
          />
        ) : (
          <div style={{ padding: 24 }}>Loading SLO prerequisites...</div>
        )}
      </Drawer>
    </div>
  );
};

export default SloSliComponent;
