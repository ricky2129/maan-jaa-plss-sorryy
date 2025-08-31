import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import SloSliComponent from "./slo-sli";

const SloSliRouteWrapper: React.FC = () => {
  const { project, application } = useParams<{ project: string; application: string }>();
  const navigate = useNavigate();

  const projectId = Number(project);
  const applicationId = Number(application);


  const projectSloId = projectId;

  if (!project || isNaN(projectId) || !application || isNaN(applicationId)) {
    return <div>Invalid or missing project/application ID</div>;
  }

  return (
    <SloSliComponent
      onClose={() => navigate(-1)}
      applicationId={applicationId}
      projectSloId={projectSloId}
    />
  );
};

export default SloSliRouteWrapper;
