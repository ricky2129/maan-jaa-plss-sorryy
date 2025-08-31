import { ApiUrl } from "constant";
import { resolveUrlParams } from "helpers";
import {
  SecretResponse,
  AWSSignInRequest,
  CloudResponse,
  GremlinResponse,
  GremlinSignInRequest,
  RepositorySignInRequest,
  UpdateIntegrationRequest,
} from "interfaces";
import { get, post, put } from "network/query";

/**
 * A collection of functions to interact with the integration endpoints.
 *
 * @returns An object with the following methods:
 *   - getSecretKeysByProjectId: Fetches a list of AWS secrets for a given project id.
 *   - getSecretKeysByApplicationId: Fetches a list of AWS secrets for a given application id.
 *   - createAwsSecret: Creates an AWS secret.
 *   - createGithubSecret: Creates a Github secret.
 *   - updateIntegration: Updates an existing integration.
 *   - createGremlinSecret: Creates a Gremlin secret.
 *   - getSecretValues: Fetches secret values for a given integration id.
 */
const useIntegrationService = () => {
  /**
   * Fetches a list of secrets for a given project id.
   *
   * @param id - The infrastructure id to fetch the AWS secrets for.
   * @param project_id - The project id to fetch the AWS secrets for.
   * @returns A promise that resolves to an array of SecretResponse objects.
   */
  const getSecretKeysByProjectId = async (
    id: number,
    project_id: string,
  ): Promise<Array<SecretResponse>> => {
    const res = await get(
      resolveUrlParams(ApiUrl.GET_SECRETS_PROJECTID, {
        infrastructure_id: id.toString(),
        project_id,
      }),
    );
    return res || "";
  };

  /**
   * Fetches a list of secrets for a given application id.
   *
   * @param id The id of the infrastructure
   * @param application_id The application id to fetch the AWS secrets for
   * @returns A list of secrets
   */
  const getSecretKeysByApplicationId = async (
    id: number,
    application_id: string,
  ): Promise<Array<SecretResponse>> => {
    
    const url = resolveUrlParams(ApiUrl.GET_SECRETS_APPLICATIONID, {
      infrastructure_id: id.toString(),
      application_id,
    });
    const res = await get(url);
    return res || "";
  };

  /**
   * Creates an AWS secret.
   * @param obj AWSSignInRequest
   * @returns Promise<SecretResponse>
   */
  const createAwsSecret = async (
    obj: AWSSignInRequest,
  ): Promise<SecretResponse> => {
    const res = await post(ApiUrl.CREATE_AWS_SECRET, obj);
    return res || "";
  };

  /**
   * Creates a Github secret.
   * @param obj RepositorySignInRequest
   * @returns Promise<string>
   */
  const createGithubSecret = async (
    obj: RepositorySignInRequest,
  ): Promise<string> => {
    const res = await post(`${ApiUrl.CREATE_GITHUB_SECRET}`, obj);
    return res || "";
  };

  /**
   * Creates a Gremlin secret.
   * @param obj GremlinSignInRequest
   * @returns Promise<string>
   */
  const createGremlinSecret = async (
    obj: GremlinSignInRequest,
  ): Promise<string> => {
    const res = await post(ApiUrl.CREATE_GREMLIN_SECRET, obj);
    return res || "";
  };

  /**
   * Updates an integration.
   * @param obj UpdateIntegrationRequest
   * @returns Promise<SecretResponse>
   */
  const updateIntegration = async (
    obj: UpdateIntegrationRequest,
  ): Promise<SecretResponse> => {
    const res = await put(ApiUrl.UPDATE_INTEGRATION, obj);
    return res || "";
  };

  /**
   * Fetches the secret values for a given integration id.
   * @param integration_id string
   * @returns Promise<SecretResponse | GremlinResponse | CloudResponse>
   */
  const getSecretValues = async (
    integration_id: string,
  ): Promise<SecretResponse | GremlinResponse | CloudResponse> => {
    const res = await get(
      resolveUrlParams(ApiUrl.GET_SECRET_VALUES, { integration_id }),
    );
    return res || "";
  };

  /**
   * Creates a Drift Assist secret.
   * @param obj DriftAssistIntegrationRequest
   * @returns Promise<any>
   */
  const createDriftAssistSecret = async (obj: any): Promise<any> => {
    const res = await post(ApiUrl.CREATE_DRIFT_ASSIST_SECRET, obj);
    return res || "";
  };

  /**
   * Fetches a Drift Assist secret by integration id.
   * @param integration_id string
   * @returns Promise<any>
   */
  const getDriftAssistSecret = async (integration_id: string): Promise<any> => {
    const res = await get(
      resolveUrlParams(ApiUrl.GET_DRIFT_ASSIST_SECRET, { integration_id }),
    );
    return res || "";
  };

  return {
    getSecretKeysByProjectId,
    getSecretKeysByApplicationId,
    createAwsSecret,
    createGithubSecret,
    updateIntegration,
    createGremlinSecret,
    getSecretValues,
    createDriftAssistSecret,
    getDriftAssistSecret,
  };
};

export default useIntegrationService;
