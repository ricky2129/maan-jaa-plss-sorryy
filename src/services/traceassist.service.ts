import { TraceAssistUrl } from "constant";
import { resolveUrlParams } from "helpers";
import { get, post, delete_ } from "../network/query";
import {
  CreateDeploymentRequest,
  DeploymentResponse,
  InstrumentResponse,
  Deployment,
  AnalyzeRepoRequest,
  AnalyzeRepoResponse,
} from "../interfaces/traceAssist";

const useTraceAssistService = () => {
  const createDeployment = async (
    req: CreateDeploymentRequest
  ): Promise<DeploymentResponse> => {
    const response = await post(TraceAssistUrl.CREATE_DEPLOYMENT, req);
    return response || {};
  };

  const getDeploymentDetails = async (
    deploymentName: string
  ): Promise<DeploymentResponse> => {
    const url = resolveUrlParams(TraceAssistUrl.GET_DEPLOYMENT_DETAILS, { deployment_name: deploymentName });
    const response = await get(url);
    return response || {};
  };

  const instrumentDeployment = async (
    deploymentName: string
  ): Promise<InstrumentResponse> => {
    const url = resolveUrlParams(TraceAssistUrl.INSTRUMENT_DEPLOYMENT, { deployment_name: deploymentName });
    const response = await post(url, {});
    return response || {};
  };

  const getAllDeployments = async (
    project_id: string,
    application_id: string
  ): Promise<Deployment[]> => {
    const url = resolveUrlParams(
      TraceAssistUrl.GET_ALL_DEPLOYMENTS,
      {},
      { project_id, application_id }
    );
    const response = await get(url);
    return response || [];
  };

  const analyzeRepo = async (
    req: AnalyzeRepoRequest
  ): Promise<AnalyzeRepoResponse> => {
    const response = await post(TraceAssistUrl.ANALYZE_REPO, req);
    return response || {};
  };

  const deleteDeployment = async (
    deploymentName: string
  ): Promise<any> => {
    const url = resolveUrlParams(TraceAssistUrl.DELETE_DEPLOYMENT, { deployment_name: deploymentName });
    const response = await delete_(url);
    return response || {};
  };

  return {
    createDeployment,
    getDeploymentDetails,
    instrumentDeployment,
    getAllDeployments,
    analyzeRepo,
    deleteDeployment, 
  };
};

export default useTraceAssistService;
