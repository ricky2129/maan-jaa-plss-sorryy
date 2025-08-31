import React, { useState, useMemo } from "react";
import { useGetProjectTickets } from "react-query/toilAssistQueries";
import TicketDetails from "./TicketDetails";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye } from "@fortawesome/free-solid-svg-icons";
import { Spin } from "antd";
import "./TicketList.styles.scss";

const STATUS_COLORS = {
  Done: "#3bb273",
  "To Do": "#5c6f82",
  "In Progress": "#f7b801",
  default: "#bfc0c0",
};

const STATUS_KEYS = [
  { label: "All", value: "all" },
  { label: "New", value: "To Do" },
  { label: "In Progress", value: "In Progress" },
  { label: "Done", value: "Done" },
];

const getStatusName = (ticket: any) =>
  ticket.fields?.status?.name || "Unknown";

const getStatusCount = (issues: any[], statusValue: string) => {
  if (statusValue === "all") return issues.length;
  if (statusValue === "New") return issues.filter(i => getStatusName(i) === "To Do").length;
  return issues.filter(i => getStatusName(i) === statusValue).length;
};

const getStatusLabel = (statusValue: string) => {
  if (statusValue === "To Do") return "New";
  if (statusValue === "New") return "New";
  if (statusValue === "Done") return "Done";
  if (statusValue === "In Progress") return "In Progress";
  if (statusValue === "all") return "All";
  return statusValue;
};

const TicketList: React.FC<{ onClose?: React.ReactNode }> = ({ onClose }) => {
  const [projectKey, setProjectKey] = useState<string>("");
  const [submittedKey, setSubmittedKey] = useState<string>("");
  const [selectedTicketKey, setSelectedTicketKey] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading, error, refetch } = useGetProjectTickets(submittedKey);
  const [localIssues, setLocalIssues] = useState<any[] | null>(null);

  React.useEffect(() => {
    if (data?.issues) {
      setLocalIssues(data.issues);
    }
  }, [data]);

  React.useEffect(() => {
    if (!submittedKey) return;
    const interval = setInterval(() => {
      refetch();
    }, 10000);
    return () => clearInterval(interval);
  }, [submittedKey, refetch]);

  const issues = localIssues ?? [];

  const filteredIssues = useMemo(() => {
    if (statusFilter === "all") return issues;
    if (statusFilter === "New") return issues.filter(i => getStatusName(i) === "To Do");
    return issues.filter(i => getStatusName(i) === statusFilter);
  }, [issues, statusFilter]);

  const statusCounts = useMemo(() => {
    return STATUS_KEYS.map(s => ({
      ...s,
      count: getStatusCount(issues, s.value),
    }));
  }, [issues]);

  const handleTicketUpdate = (updatedTicket: any) => {
    setLocalIssues(prev =>
      prev
        ? prev.map(ticket =>
            ticket.key === updatedTicket.key ? updatedTicket : ticket
          )
        : [updatedTicket]
    );
  };

  if (selectedTicketKey) {
    return (
      <TicketDetails
        ticketKey={selectedTicketKey}
        onBack={() => setSelectedTicketKey(null)}
        onTicketUpdate={handleTicketUpdate}
      />
    );
  }

  return (
    <div className="ticketlist-container" style={{ position: "relative" }}>
      {onClose}
      <h1 className="ticketlist-header">Toil Assist</h1>
      <form
        onSubmit={e => {
          e.preventDefault();
          setSubmittedKey(projectKey.trim());
          setSelectedTicketKey(null);
        }}
        className="ticketlist-form"
      >
        <label>
          Enter Project Key:{" "}
          
          <select
  value={projectKey}
  onChange={e => setProjectKey(e.target.value)}
  style={{ marginRight: 8, padding: "8px 12px", borderRadius: 5, border: "1px solid #bfc0c0" }}
>
  <option value="">--Select--</option>
  <option value="SCRUM">SCRUM</option>
</select>
<input
  type="text"
  value={projectKey}
  onChange={e => setProjectKey(e.target.value)}
  required
  className="ticketlist-input"
  style={{ marginLeft: 8 }}
  placeholder="Type or select project key"
/>

        </label>
        <button type="submit" className="ticketlist-button">
          Load Tickets
        </button>
      </form>
      {submittedKey && (
        <>
          <div className="ticketlist-filters">
            {statusCounts.map(({ label, value, count }) => (
              <button
                key={value}
                className={`ticketlist-filter-pill${statusFilter === value ? " active" : ""}`}
                style={{
                  borderColor: statusFilter === value ? "#000" : "#bfc0c0",
                  background: STATUS_COLORS[label === "New" ? "To Do" : label] || STATUS_COLORS.default,
                  color: "#fff",
                }}
                onClick={() => setStatusFilter(value)}
                type="button"
              >
                {label} - {count}
              </button>
            ))}
          </div>
          {isLoading && (
            <div className="ticketlist-loading">
              <Spin size="large" tip="Loading tickets..." />
            </div>
          )}
          {error && <div>Error loading tickets.</div>}
          {!isLoading && !error && filteredIssues.length === 0 && (
            <div className="ticketlist-no-tickets">
              No tickets found under "{getStatusLabel(statusFilter)}" category.
            </div>
          )}
          {!isLoading && !error && filteredIssues.length > 0 && (
            <div className="ticketlist-list">
              {filteredIssues.map((ticket: any) => {
                const statusName = getStatusName(ticket);
                let statusLabel = statusName === "To Do" ? "New" : statusName;
                const statusColor =
                  STATUS_COLORS[statusName] || STATUS_COLORS.default;
                return (
                  <div key={ticket.key} className="ticketlist-card">
                    <div
                      className="ticketlist-status-rect"
                      style={{
                        background: statusColor,
                        color: "#fff",
                        minWidth: 70,
                        padding: "3px 14px",
                        borderRadius: "18px",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        marginRight: 18,
                        textAlign: "center",
                        boxShadow: "0 0 4px #e0e0e0",
                        letterSpacing: "0.5px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: 28,
                      }}
                    >
                      {statusLabel}
                    </div>
                    <div className="ticketlist-summary">
                      <div className="ticketlist-key">{ticket.key}</div>
                      <div className="ticketlist-title">{ticket.fields?.summary || "No summary"}</div>
                    </div>
                    <button
                      onClick={() => setSelectedTicketKey(ticket.key)}
                      className="ticketlist-openbtn"
                    >
                      <FontAwesomeIcon icon={faEye} className="ticketlist-openbtn-icon" />
                      View
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TicketList;
