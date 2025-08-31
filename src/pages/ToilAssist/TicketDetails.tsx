import React, { useState, useRef, useEffect } from "react";
import {
  useGetTicket,
  useGetTicketRunbook,
  useApproveRemediation,
  useDeclineRemediation,
} from "react-query/toilAssistQueries";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faTimes } from "@fortawesome/free-solid-svg-icons";
import "./TicketDetails.styles.scss";

type TicketDetailsProps = {
  ticketKey: any;
  onBack: () => void;
  onTicketUpdate: (updatedTicket: any) => void;
};

const POLL_INTERVAL_MS = 60000; 

const TicketDetails: React.FC<TicketDetailsProps> = ({
  ticketKey,
  onBack,
  onTicketUpdate,
}) => {
  const {
    data: ticketData,
    isLoading: isTicketLoading,
    error: ticketError,
    refetch: refetchTicket,
  } = useGetTicket(ticketKey);

  const {
    data: runbookData,
    isLoading: isRunbookLoading,
    error: runbookError,
    refetch: refetchRunbook,
  } = useGetTicketRunbook(ticketKey);

  const {
    mutateAsync: approveAsync,
    isLoading: isApproveLoading,
  } = useApproveRemediation();

  const {
    mutateAsync: declineAsync,
    isLoading: isDeclineLoading,
  } = useDeclineRemediation();

  const [actionMessage, setActionMessage] = useState("");
  const [actionType, setActionType] = useState("");
  const [approveTempDisabled, setApproveTempDisabled] = useState(false);
  const [pollAttempt, setPollAttempt] = useState(0);
  const [showApprovedUI, setShowApprovedUI] = useState(false);
  const approveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  
  useEffect(() => {
    setActionMessage("");
    setActionType("");
    setApproveTempDisabled(false);
    setPollAttempt(0);
    setShowApprovedUI(false);
    if (approveTimeoutRef.current) clearTimeout(approveTimeoutRef.current);
  }, [ticketKey]);

  useEffect(() => {
    return () => {
      if (approveTimeoutRef.current) clearTimeout(approveTimeoutRef.current);
    };
  }, []);

  if (isTicketLoading || isRunbookLoading) {
    return <div className="ticketdetails-container">Loading...</div>;
  }

  if (ticketError || runbookError) {
    return (
      <div className="ticketdetails-container">
        Error loading ticket details.
      </div>
    );
  }

  if (!ticketData || !ticketData.fields) {
    return (
      <div className="ticketdetails-container">No ticket data found.</div>
    );
  }

  function removeCurlyBraces(str: string) {
    if (!str) return "";
    return str.replace(/\{[^{}]*\}/g, "").replace(/\s+/g, " ").trim();
  }

  const fields = ticketData.fields;
  const comments = fields.comment?.comments || [];
  const statusName = fields.status?.name?.toLowerCase();
  const isDone = statusName === "done";
  const isToDo = statusName === "to do";

  const showApprovedButton = isDone || showApprovedUI;

  const renderRunbook = (runbook: any) => {
    if (!runbook || Object.keys(runbook).length === 0) {
      return "No runbook available";
    }
    return (
      <div className="ticketdetails-card">
        {runbook.verification_explanation && (
          <div style={{ marginBottom: 8 }}>
            <strong>Verification Explanation:</strong>
            <div>{runbook.verification_explanation}</div>
          </div>
        )}
        {runbook.verification_commands && (
          <div style={{ marginBottom: 8 }}>
            <strong>Verification Commands:</strong>
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {runbook.verification_commands}
            </pre>
          </div>
        )}
        {runbook.remediation_explanation && (
          <div style={{ marginBottom: 8 }}>
            <strong>Remediation Explanation:</strong>
            <div>{runbook.remediation_explanation}</div>
          </div>
        )}
        {runbook.remediation_command && (
          <div style={{ marginBottom: 8 }}>
            <strong>Remediation Command:</strong>
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {runbook.remediation_command}
            </pre>
          </div>
        )}
        {runbook.post_check_explanation && (
          <div style={{ marginBottom: 8 }}>
            <strong>Post Check Explanation:</strong>
            <div>{runbook.post_check_explanation}</div>
          </div>
        )}
        {runbook.post_check_command && (
          <div style={{ marginBottom: 8 }}>
            <strong>Post Check Command:</strong>
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {runbook.post_check_command}
            </pre>
          </div>
        )}
      </div>
    );
  };


  const pollForDoneStatus = async (attempt: number) => {
    if (approveTimeoutRef.current) clearTimeout(approveTimeoutRef.current);

    approveTimeoutRef.current = setTimeout(async () => {
      const { data: latestTicket } = await refetchTicket();
      const latestStatus = latestTicket?.fields?.status?.name?.toLowerCase();

      if (latestStatus === "done") {
        setShowApprovedUI(true);
        setApproveTempDisabled(false);
        setPollAttempt(0);
        if (onTicketUpdate && latestTicket) {
          onTicketUpdate(latestTicket);
        }
      } else if (attempt < 2) {
        setPollAttempt(attempt + 1);
        pollForDoneStatus(attempt + 1);
      } else {
        setApproveTempDisabled(false);
        setShowApprovedUI(false);
        setPollAttempt(0);
        if (onTicketUpdate && latestTicket) {
          onTicketUpdate(latestTicket);
        }
      }
    }, POLL_INTERVAL_MS);
  };

  const handleApprove = async () => {
    setActionMessage("");
    setActionType("");
    setApproveTempDisabled(true);
    setPollAttempt(1);
    setShowApprovedUI(false);

    try {
      await approveAsync(ticketKey);
      setActionType("approve");

      const { data: updatedTicket } = await refetchTicket();
      refetchRunbook();
      const comments = updatedTicket?.fields?.comment?.comments || [];
      const remediationComment = comments.slice().reverse().find(
        (comment: any) =>
          comment.body.includes("Remediation has been APPROVED") ||
          comment.body.includes("Remediation FAILED")
      );

      if (remediationComment) {
        if (remediationComment.body.includes("Remediation FAILED")) {
          setActionMessage("Remediation failed.");
        } else if (remediationComment.body.includes("Remediation has been APPROVED")) {
          setActionMessage("Remediation approved successfully.");
        } else {
          setActionMessage("Remediation status unknown.");
        }
      } else {
        setActionMessage("Remediation status unknown.");
      }

      if (onTicketUpdate && updatedTicket) {
        onTicketUpdate(updatedTicket);
      }
      pollForDoneStatus(1);
    } catch (err) {
      setActionType("approve");
      setActionMessage("Failed to approve remediation");
      setApproveTempDisabled(false);
      setPollAttempt(0);
      setShowApprovedUI(false);
    }
  };

  const handleDecline = async () => {
    setActionMessage("");
    setActionType("");
    setShowApprovedUI(false);
    setPollAttempt(0);
    try {
      await declineAsync(ticketKey);
      setActionType("decline");
      setActionMessage("Remediation declined successfully.");
      const { data: updatedTicket } = await refetchTicket();
      refetchRunbook();
      if (onTicketUpdate && updatedTicket) {
        onTicketUpdate(updatedTicket);
      }
    } catch (err) {
      setActionType("decline");
      setActionMessage("Failed to decline remediation");
    }
  };

  function extractAlertSummary(description: string) {
    if (!description) return "N/A";
    const match = description.match(/\*Alert Summary:\*\s*(.*)/);
    return match ? match[1].trim() : "N/A";
  }

  return (
    <div className="ticketdetails-container" style={{ position: "relative" }}>
      <div className="ticketdetails-header">
        <div className="ticketdetails-title">{ticketData.key || "No Key"}</div>
        <div className="ticketdetails-buttons">
          {showApprovedButton ? (
            <button className="ticketdetails-button approved" disabled>
              <FontAwesomeIcon icon={faCheck} /> Approved
            </button>
          ) : isToDo ? (
            <>
              <button
                className="ticketdetails-button approve"
                onClick={handleApprove}
                disabled={
                  isApproveLoading ||
                  isDeclineLoading ||
                  approveTempDisabled
                }
                title="Approve Remediation"
              >
                {isApproveLoading
                  ? "Approving..."
                  : approveTempDisabled
                  ? pollAttempt === 1
                    ? "Checking status in 1 min..."
                    : pollAttempt === 2
                    ? "Checking status in 2 min..."
                    : "Please wait..."
                  : (
                    <>
                      <FontAwesomeIcon icon={faCheck} /> Approve
                    </>
                  )}
              </button>
              <button
                className="ticketdetails-button decline"
                onClick={handleDecline}
                disabled={isApproveLoading || isDeclineLoading || approveTempDisabled}
                title="Decline Remediation"
              >
                {isDeclineLoading ? (
                  "Declining..."
                ) : (
                  <>
                    <FontAwesomeIcon icon={faTimes} /> Decline
                  </>
                )}
              </button>
            </>
          ) : null}
        </div>
      </div>
      {actionMessage && (
        <div
          style={{
            margin: "12px 0",
            color: actionMessage.includes("successfully")
              ? actionType === "approve"
                ? "green"
                : "orange"
              : "red",
            fontWeight: "bold",
          }}
        >
          {actionMessage}
        </div>
      )}
      <div className="ticketdetails-content">
        <div className="ticketdetails-section">
          <div className="ticketdetails-label">Summary:</div>
          <div className="ticketdetails-value">{fields.summary || "N/A"}</div>
        </div>
        <div className="ticketdetails-section">
          <div className="ticketdetails-label">Description:</div>
          <div className="ticketdetails-value">
            {extractAlertSummary(fields.description)}
          </div>
        </div>
        <div className="ticketdetails-section">
          <div className="ticketdetails-label">Status:</div>
          <div className="ticketdetails-value">
            {fields.status?.name || "N/A"}
          </div>
        </div>
        <div className="ticketdetails-section">
          <div className="ticketdetails-label">Priority:</div>
          <div className="ticketdetails-value">
            {fields.priority?.name || "N/A"}
          </div>
        </div>
        <div className="ticketdetails-section">
          <div className="ticketdetails-label">Issue Type:</div>
          <div className="ticketdetails-value">
            {fields.issuetype?.name || "N/A"}
          </div>
        </div>
        <div className="ticketdetails-section">
          <div className="ticketdetails-label">Project:</div>
          <div className="ticketdetails-value">
            {fields.project?.name || "N/A"}
          </div>
        </div>
        <div className="ticketdetails-section">
          <div className="ticketdetails-label">Creator:</div>
          <div className="ticketdetails-value">
            {fields.creator?.displayName || "N/A"}
          </div>
        </div>
        <div className="ticketdetails-section">
          <div className="ticketdetails-label">Reporter:</div>
          <div className="ticketdetails-value">
            {fields.reporter?.displayName || "N/A"}
          </div>
        </div>
        <div className="ticketdetails-section">
          <div className="ticketdetails-label">Runbook:</div>
          <div className="ticketdetails-value">{renderRunbook(runbookData)}</div>
        </div>
        <div className="ticketdetails-section">
          <div className="ticketdetails-label">Comments:</div>
          <div className="ticketdetails-value">
            <div className="ticketdetails-card">
              {comments.length > 0 ? (
                comments.map((comment: any, idx: number) => (
                  <div key={idx} style={{ marginBottom: 12 }}>
                    <strong>
                      {comment.author?.displayName || "Unknown"}:
                    </strong>{" "}
                    {removeCurlyBraces(comment.body) || "No comment"}{" "}
                    <em>
                      (
                      {comment.created
                        ? new Date(comment.created).toLocaleString()
                        : "N/A"}
                      )
                    </em>
                  </div>
                ))
              ) : (
                "No comments"
              )}
            </div>
          </div>
        </div>
      </div>
      <button
        onClick={onBack}
        className="ticketdetails-button back"
        style={{ marginTop: 24 }}
      >
        Back
      </button>
    </div>
  );
};

export default TicketDetails;
