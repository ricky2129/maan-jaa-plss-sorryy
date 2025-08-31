import React, { useRef, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  useGenerateDashboard,
  useUploadDashboard,
  useGetDashboardHistory,
  useGetDeployments,
} from "react-query/dashboardAssistQueries";

import "./DashboardAssist.styles.scss";
import { HistoryItem } from "interfaces/dashboardAssist";
import {
  CloseOutlined,
  EyeOutlined,
  ArrowLeftOutlined,
  LinkOutlined,
  DownOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";

interface DashboardAssistProps {
  onClose?: () => void;
}

const Loader: React.FC<{ message?: string }> = ({ message }) => (
  <div className="dashboard-loader">
    <span className="loader-spinner" />
    {message && <span style={{ marginLeft: 12 }}>{message}</span>}
  </div>
);

const GrowingTextarea: React.FC<{
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}> = ({ value, onChange, placeholder, disabled, onKeyDown }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      className="dashboard-textarea"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      onKeyDown={onKeyDown}
      rows={1}
      style={{ resize: "none", overflow: "hidden" }}
    />
  );
};

const getPanelGridStyle = (count: number) => {
  if (count === 1) {
    return { display: "flex", justifyContent: "center" };
  }
  if (count === 2) {
    return { display: "flex", gap: 16, justifyContent: "center" };
  }
  if (count === 3 || count === 4) {
    return {
      display: "grid",
      gridTemplateColumns: "repeat(2, 400px)",
      gridAutoRows: "300px",
      gap: 16,
      justifyContent: "center",
      alignItems: "center",
    };
  }
  return {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 16,
    justifyContent: "center",
    alignItems: "center",
  };
};

const PanelIframes: React.FC<{ panelLinks: string[] }> = ({ panelLinks }) => (
  <div style={getPanelGridStyle(panelLinks.length)}>
    {panelLinks.map(
      (panelUrl, idx) =>
        panelUrl && (
          <div
            key={idx}
            className="panel-iframe-container"
            onClick={() => window.open(panelUrl, "_blank", "noopener,noreferrer")}
            tabIndex={0}
            role="button"
            aria-label={`Open panel ${idx + 1} in new tab`}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === " ") window.open(panelUrl, "_blank", "noopener,noreferrer");
            }}
          >
            <iframe
              src={panelUrl}
              title={`Panel-${idx + 1}`}
              width="100%"
              height="100%"
            />
            <div className="panel-overlay" />
          </div>
        )
    )}
  </div>
);

const DashboardView: React.FC<{
  item: HistoryItem;
  onBack: () => void;
}> = ({ item, onBack }) => (
  <div className="dashboard-view-container">
    <button className="dashboard-view-back-btn" onClick={onBack}>
      <ArrowLeftOutlined style={{ fontSize: 18, marginRight: 8 }} />
      Back to History
    </button>
    <div className="dashboard-view-prompt">
      <span className="dashboard-view-label">Prompt:</span>
      <span className="dashboard-view-prompt-text">{item.prompt}</span>
    </div>
    <div className="dashboard-view-iframe-wrapper">
      <div className="dashboard-view-iframe-header-row">
        <div className="dashboard-view-iframe-header-label">
          Dashboard generated:
        </div>
        <button
          className="dashboard-grafana-btn"
          onClick={() =>
            window.open(item.dashboard_url || item.grafana_url, "_blank", "noopener,noreferrer")
          }
        >
          <LinkOutlined />
          Open in Grafana
        </button>
      </div>
    </div>
    {item.panel_links && item.panel_links.length > 0 && (
      <div>
        <div className="dashboard-view-panels-label">Panels:</div>
        <PanelIframes panelLinks={item.panel_links} />
      </div>
    )}
  </div>
);

const DashboardAssist: React.FC<DashboardAssistProps> = ({ onClose }) => {
  const { project, application } = useParams<{ project: string; application: string }>();

  const [prompt, setPrompt] = useState("");
  const [dashboardUrl, setDashboardUrl] = useState<string | null>(null);
  const [grafanaUrl, setGrafanaUrl] = useState<string | null>(null);
  const [panelLinks, setPanelLinks] = useState<string[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<HistoryItem | null>(null);

  const [selectedPod, setSelectedPod] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [showInfo, setShowInfo] = useState<boolean>(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const {
    data: deployments,
    isLoading: isDeploymentsLoading,
    isError: isDeploymentsError,
    error: deploymentsError,
    refetch: refetchDeployments,
  } = useGetDeployments({
    project_id: project ?? "",
    application_id: application ?? ""
  });

  const {
    mutateAsync: generateDashboard,
    isLoading: isGenerating,
    isError: isGenError,
    error: genError,
  } = useGenerateDashboard();

  const {
    mutateAsync: uploadDashboard,
    isLoading: isUploading,
    isError: isUploadError,
    error: uploadError,
  } = useUploadDashboard();

  const {
    data: historyData,
    isLoading: isHistoryLoading,
    isError: isHistoryError,
    error: historyError,
    refetch: refetchHistory,
  } = useGetDashboardHistory({
    project_id: project ?? "",
    application_id: application ?? "",
  });

  const handlePromptSent = async () => {
    if (!prompt.trim()) return;
    setDashboardUrl(null);
    setGrafanaUrl(null);
    setPanelLinks([]);
    try {
      const genResponse = await generateDashboard({
        prompt,
        preview: false,
        pod_name: selectedPod || null,
      });
      const uploadResponse = await uploadDashboard({
        prompt,
        dashboard: genResponse.dashboard,
        project_id: project ?? "",
        application_id: application ?? "",
      });
      setDashboardUrl(uploadResponse.dashboard_url || null);
      setGrafanaUrl(uploadResponse.grafana_url || uploadResponse.dashboard_url || null);
      setPanelLinks(Array.isArray(uploadResponse.panel_links) ? uploadResponse.panel_links : []);
      setPrompt("");
      setSelectedPod(null);
      refetchHistory();
    } catch (e) {}
  };

  const HistoryCard: React.FC<{ item: HistoryItem }> = ({ item }) => (
    <div className="history-card">
      <div className="history-card-header">
        <span className="history-card-id">#{item.id}</span>
        <span className="history-card-date">
          {new Date(item.created_at).toLocaleString()}
        </span>
      </div>
      <div className="history-card-prompt">{item.prompt}</div>
      <button
        className="history-card-view-btn"
        title="View Dashboard"
        onClick={() => setSelectedHistory(item)}
      >
        <EyeOutlined style={{ fontSize: 18 }} />
        <span style={{ marginLeft: 8 }}>View</span>
      </button>
    </div>
  );

  const dropdownLabel = selectedPod
    ? selectedPod
    : "Select application";

  return (
    <div
      className="dashboard-assist-container"
      style={{ minHeight: "100vh", overflowY: "auto" }}
    >
      {onClose && (
        <button
          className="dashboard-assist-close-btn"
          onClick={onClose}
          aria-label="Close"
        >
          <CloseOutlined style={{ fontSize: 20 }} />
        </button>
      )}

      {selectedHistory ? (
        <DashboardView
          item={selectedHistory}
          onBack={() => setSelectedHistory(null)}
        />
      ) : (
        <>
          <div className="dashboard-input-row">
            <div className="growing-textarea-wrapper">
              <GrowingTextarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Enter your prompt"
                disabled={isGenerating || isUploading}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handlePromptSent();
                  }
                }}
              />
            </div>
            <div className="dropdown-info-group">
              <div
                className="dashboard-deployment-dropdown-wrapper"
                ref={dropdownRef}
                tabIndex={0}
              >
                <button
                  type="button"
                  className={`dashboard-deployment-dropdown-label${dropdownOpen ? " open" : ""}`}
                  disabled={isGenerating || isUploading}
                  onClick={() => {
                    setDropdownOpen((open) => {
                      if (!open) refetchDeployments();
                      return !open;
                    });
                  }}
                >
                  <span className="dashboard-deployment-dropdown-label-text">
                    {dropdownLabel}
                  </span>
                  <DownOutlined style={{ fontSize: 14, marginLeft: 8 }} />
                </button>
                {dropdownOpen && (
                  <div className="dashboard-deployment-dropdown-list">
                    {isDeploymentsLoading ? (
                      <div className="dashboard-deployment-dropdown-list-loader">
                        <Loader />
                      </div>
                    ) : isDeploymentsError ? (
                      <div className="dashboard-deployment-dropdown-list-error">
                        Error loading applications
                      </div>
                    ) : deployments && Array.isArray(deployments.pods) && deployments.pods.length > 0 ? (
                      <div className="dashboard-deployment-dropdown-list-scroll">
                        {deployments.pods.map((pod: string) => (
                          <div
                            key={pod}
                            className={`dashboard-deployment-dropdown-list-item${selectedPod === pod ? " selected" : ""}`}
                            onClick={() => {
                              setSelectedPod(pod);
                              setDropdownOpen(false);
                            }}
                            tabIndex={0}
                            role="button"
                            aria-label={`Select application ${pod}`}
                            onKeyDown={e => {
                              if (e.key === "Enter" || e.key === " ") {
                                setSelectedPod(pod);
                                setDropdownOpen(false);
                              }
                            }}
                          >
                            {pod}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="dashboard-deployment-dropdown-list-empty">
                        No applications found
                      </div>
                    )}
                  </div>
                )}
              </div>
              <span
                className="dashboard-dropdown-info-icon"
                tabIndex={0}
                onMouseEnter={() => setShowInfo(true)}
                onMouseLeave={() => setShowInfo(false)}
                onFocus={() => setShowInfo(true)}
                onBlur={() => setShowInfo(false)}
                aria-label="Info"
              >
                <InfoCircleOutlined style={{ color: "#1976d2", fontSize: 16 }} />
                {showInfo && (
                  <div className="dashboard-dropdown-info-tooltip">
                    If you don’t select any application, graphs will be generated for all applications by default.
                  </div>
                )}
              </span>
            </div>
            <button
              className="send-btn"
              onClick={handlePromptSent}
              disabled={isGenerating || isUploading || !prompt.trim()}
            >
              {isGenerating || isUploading ? <Loader /> : "Send Prompt"}
            </button>
          </div>

          {isDeploymentsError && (
            <div className="dashboard-error">
              {typeof deploymentsError === "string"
                ? deploymentsError
                : "Failed to load applications."}
            </div>
          )}

          {isGenError && (
            <div className="dashboard-error">
              {typeof genError === "string"
                ? genError
                : "Failed to generate dashboard."}
            </div>
          )}
          {isUploadError && (
            <div className="dashboard-error">
              {typeof uploadError === "string"
                ? uploadError
                : "Failed to upload dashboard."}
            </div>
          )}

          {(isGenerating || isUploading) && (
            <Loader
              message={
                isGenerating
                  ? "Generating dashboard..."
                  : "Uploading dashboard..."
              }
            />
          )}

          {grafanaUrl && (
            <div style={{ marginTop: 32 }}>
              <div className="dashboard-view-iframe-header-row">
                <div className="dashboard-view-iframe-header-label">
                  Dashboard generated:
                </div>
                <button
                  className="dashboard-grafana-btn"
                  onClick={() =>
                    window.open(grafanaUrl, "_blank", "noopener,noreferrer")
                  }
                >
                  <LinkOutlined />
                  Open in Grafana
                </button>
              </div>
              {panelLinks.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div className="dashboard-view-panels-label">
                    Panels:
                  </div>
                  <PanelIframes panelLinks={panelLinks} />
                </div>
              )}
            </div>
          )}

          <div className="history-section" style={{ marginTop: 40 }}>
            <h3 style={{ textAlign: "center" }}>Dashboard History</h3>
            {isHistoryLoading && <Loader message="Loading history..." />}
            {isHistoryError && (
              <div className="dashboard-error">
                {typeof historyError === "string"
                  ? historyError
                  : "Failed to load history."}
              </div>
            )}
            {Array.isArray(historyData) && historyData.length > 0 ? (
              <div className="history-card-list">
                {historyData.map((item: HistoryItem) => (
                  <HistoryCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              !isHistoryLoading && (
                <div
                  className="dashboard-empty"
                  style={{ textAlign: "center" }}
                >
                  No history found.
                </div>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardAssist;
