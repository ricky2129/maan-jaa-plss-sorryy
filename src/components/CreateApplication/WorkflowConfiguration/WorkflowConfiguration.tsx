import { useState } from "react";
import { useCloneRepo, useGetServiceList } from "react-query";
import {
  useAddServiceToApplication,
  useGetApplicationDetails,
} from "react-query";
import {
  useCreateEnvironment,
  useCreateInfraSchedule,
} from "react-query/infraQueries";
import { Flex, Form, message } from "antd";
import {
  ConfigureRepositoriesConstants,
  RouteUrl,
  configureInfraFormContants,
} from "constant";
import { Dayjs } from "dayjs";
import {
  AppServiceMap,
  AppServiceType,
  CloneRepoRequest,
  ConfigureInfraFormFields,
  ConfigureRepositoriesFormField,
  CreateEnvironmentRequest,
  CreateInfraScheduleRequest,
  Environment,
} from "interfaces";
import { CodescanIcon, DiagnosticsIcon, PipelineIcon, ToilAssistIcon, TraceAssistIcon, DriftAssistIcon, DashboardAssistIcon, SLOSLIIcon, ExperimentIcon } from "assets";
import {
  ConfigureGremlin,
  ConfigureInfra,
  ConfigureRepositories,
  Drawer,
  IntegrationManager,
} from "components";
import { ConfigureToilAssist } from "components/ConfigureToilAssist";
import { useCreateApplication } from "context";
import { Metrics } from "themes";
import ConfigureTraceAssist from "components/ConfigureTraceAssist/ConfigureTraceAssist";
import ConfigureSloSli from "components/ConfigureSloSli/ConfigureSloSli";
 
import { ConfigureDriftAssist } from "components/ConfigureDriftAssist"; // <--- NEW
 
const servicePriorityMap: Record<number, number> = {
  1: 1,
  3: 2,
  2: 3,
};
 
const serviceMenuMap = {
  TraceAssist: {
    name: "Trace Assist",
    desc: "Auto-Instrumentation",
    icon: TraceAssistIcon,
  },
  DashboardAssist: {
    name: "Dashboard Assist",
    desc: "Custom Dashboard",
    icon: DashboardAssistIcon,
  },
  ToilAssist: {
    name: "Toil Assist",
    desc: "For SelfHealing",
    icon: ToilAssistIcon,
  },
  Infrastructure: {
    name: "Resiliency Index",
    desc: "Continuous Resiliency",
    icon: DiagnosticsIcon,
    route: RouteUrl.APPLICATIONS.RESILIENCY_INDEX,
  },
  Repositories: {
    name: "Code Hygiene",
    desc: "Code level Resiliency posture",
    icon: CodescanIcon,
    route: RouteUrl.APPLICATIONS.CODE_HYGIENCE_STANDARDS,
  },
  Experiments: {
    name: "Chaos Experiments",
    desc: "Validate Resiliency",
    icon: ExperimentIcon,
    route: RouteUrl.APPLICATIONS.CHAOS_EXPERIMENT,
  },
  SLOSLI: {
    name: "SLO/SLI",
    desc: "Service Level Objectives and Indicators",
    icon: SLOSLIIcon,
  },
  DriftAssist: {
    name: "Drift Assist",
    desc: "Detecting and Analyzing infrastructure drift",
    icon: DriftAssistIcon,
  },
};
 
const ALL_SERVICE_NAMES = [
  "TraceAssist",        
  "DashboardAssist",    
  "ToilAssist",        
  "Infrastructure",    
  "Repositories",      
  "Experiments",        
  "SLOSLI",            
  "DriftAssist",       
];
 
function ServiceDescriptions() {
  return (
    <div>
      {Object.entries(serviceMenuMap).map(([key, value]) => (
        <div key={key}>
          <strong>{value.name}</strong>
          <p>{value.desc}</p>
        </div>
      ))}
    </div>
  );
}
 
const WorkFlowConfiguration: React.FC = () => {
  //config repository constants
  const { REPOSITORY_URL, BRANCH_NAME, AWS_ACCOUNT, NAME } =
    ConfigureRepositoriesConstants;
 
  const {
    ENVIRONMENT_NAME,
    AWS_ACCOUNT: CLOUDFORMATION_AWS_ACCOUNT,
    CLOUDFORMATION_STACK,
    RESILIENCY_POLICY,
    SCHEDULE_ASSESMENT,
  } = configureInfraFormContants;
 
  const { applicationId } = useCreateApplication();
  const [isRepositoryDrawerOpen, setIsRepositoryDrawerOpen] =
    useState<boolean>(false);
 
  const [isOpenConfigureGremlin, setIsOpenConfigureGremlin] =
    useState<boolean>(false);
 
  const [isEnvironmentDrawerOpen, setIsEnvironmentDrawerOpen] =
    useState<boolean>(false);
  const [disabledSave, setDisabledSave] = useState<boolean>(false);
  const [configureRepositoriesForm] =
    Form.useForm<ConfigureRepositoriesFormField>();
 
  const [repoDrawerType, setRepoDrawerType] = useState<"add" | "edit">("add");
 
  const [configureInfraForm] = Form.useForm<ConfigureInfraFormFields>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
 
  const [isToilAssistDrawerOpen, setIsToilAssistDrawerOpen] = useState<boolean>(false);
  const [configureToilAssistForm] = Form.useForm();
 
  const [isTraceAssistDrawerOpen, setIsTraceAssistDrawerOpen] = useState<boolean>(false);
  const [configureTraceAssistForm] = Form.useForm();
 
  const [isSloSliDrawerOpen, setIsSloSliDrawerOpen] = useState<boolean>(false);
 
  const [isDriftAssistDrawerOpen, setIsDriftAssistDrawerOpen] = useState<boolean>(false); // <--- NEW
  const [configureDriftAssistForm] = Form.useForm(); // <--- NEW
 
  const applicationDetailsQuery = useGetApplicationDetails(
    applicationId?.toString(),
  );
  const serviceList = useGetServiceList();
  const addServiceToApplicationQuery = useAddServiceToApplication();
  const cloneRepoQuery = useCloneRepo();
  const createEnvironmentQuery = useCreateEnvironment();
  const createInfraScheduleQuery = useCreateInfraSchedule();
 
  const [messageApi, contextHolder] = message.useMessage();
 
  const error = () => {
    messageApi.open({
      type: "error",
      content: "Error: Something went wrong",
    });
  };
 
  const handleAddNewRepository = async () => {
    try {
      await configureRepositoriesForm.validateFields();
 
      const req: CloneRepoRequest = {
        name: configureRepositoriesForm.getFieldValue(NAME.NAME),
        app_service_id: await getServiceId("Repositories"),
        branch: configureRepositoriesForm.getFieldValue(BRANCH_NAME.NAME),
        github_integration_id: configureRepositoriesForm.getFieldValue(
          REPOSITORY_URL.NAME,
        ),
        aws_integration_id: configureRepositoriesForm.getFieldValue(
          AWS_ACCOUNT.NAME,
        ),
      };
 
      setIsLoading(true);
 
      await cloneRepoQuery.mutateAsync(req);
 
      applicationDetailsQuery.refetch();
 
      setIsRepositoryDrawerOpen(false);
    } catch (err) {
      error();
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
 
  const onEnvironmentCreateSubmit = async () => {
    try {
      await configureInfraForm.validateFields();
 
      setIsLoading(true);
 
      const serviceId = await getServiceId("Infrastructure");
      const envRequest: CreateEnvironmentRequest = {
        app_service_id: serviceId,
        environment: configureInfraForm.getFieldValue(ENVIRONMENT_NAME.NAME),
        integration_id: configureInfraForm.getFieldValue(
          CLOUDFORMATION_AWS_ACCOUNT.NAME,
        ),
        resiliency_policy_arn: configureInfraForm.getFieldValue(
          RESILIENCY_POLICY.NAME,
        ),
        resource_group_arns: configureInfraForm
          ?.getFieldValue(CLOUDFORMATION_STACK.NAME)
          ?.map((resource) => {
            return {
              id: resource.value,
              name: resource.label,
              description: resource.description,
            };
          }),
      };
 
      const envResponse = await createEnvironmentQuery.mutateAsync(envRequest);
 
      const { frequency, date, time } = configureInfraForm.getFieldsValue([
        [SCHEDULE_ASSESMENT.FREQUENCY.NAME],
        [SCHEDULE_ASSESMENT.DATE.NAME],
        [SCHEDULE_ASSESMENT.TIME.NAME],
      ]) as { frequency: string; date: Dayjs; time: Dayjs };
 
      if (frequency && date && time) {
        const scheduleRequest: CreateInfraScheduleRequest = {
          service_env_id: envResponse.service_env_id,
          frequency: configureInfraForm
            .getFieldValue(SCHEDULE_ASSESMENT.FREQUENCY.NAME)
            .toLowerCase(),
          date: configureInfraForm
            .getFieldValue(SCHEDULE_ASSESMENT.DATE.NAME)
            .format("YYYY-MM-DD"),
          time: configureInfraForm
            .getFieldValue(SCHEDULE_ASSESMENT.TIME.NAME)
            .format("HH:mm:ss"),
        };
 
        await createInfraScheduleQuery.mutateAsync(scheduleRequest);
      }
 
      setIsEnvironmentDrawerOpen(false);
 
      await applicationDetailsQuery.refetch();
    } catch (error) {
      console.error(error);
      error();
    } finally {
      setIsLoading(false);
    }
  };
 
  const getServiceId = async (service: AppServiceType) => {
    const application = applicationDetailsQuery?.data;
    const existingService = application?.services?.find(
      (s) => s.service == service,
    );
    if (application && existingService) {
      return existingService.id;
    }
 
    const res = await addServiceToApplicationQuery.mutateAsync({
      application_id: application.id,
      service_id: AppServiceMap[service],
    });
 
    await applicationDetailsQuery?.refetch();
 
    return res.app_service_id;
  };
 
  const handleAddNew = (serviceName: string) => {
    if (serviceName === "Infrastructure") setIsEnvironmentDrawerOpen(true);
    else if (serviceName === "Repositories") {
      configureRepositoriesForm.resetFields();
      setRepoDrawerType("add");
      setIsRepositoryDrawerOpen(true);
    } else if (serviceName === "Experiments") {
      setIsOpenConfigureGremlin(true);
    } else if (serviceName === "ToilAssist") {
      configureToilAssistForm.resetFields();
      setIsToilAssistDrawerOpen(true);
    } else if (serviceName === "TraceAssist") {
      configureTraceAssistForm.resetFields();
      setIsTraceAssistDrawerOpen(true);
    } else if (serviceName === "SLOSLI") {
      setIsSloSliDrawerOpen(true);
    }
    else if (serviceName === "DriftAssist") {
      configureDriftAssistForm.resetFields();
      setIsDriftAssistDrawerOpen(true);
    }
  };
 
  const getIntegrations = (name: string) => {
    return applicationDetailsQuery?.data?.services?.find(
      (service_app) => service_app.service === name,
    )?.environments;
  };
 
  return (
    <Flex vertical gap={Metrics.SPACE_LG}>
      {contextHolder}
      {ALL_SERVICE_NAMES.map((serviceName, idx) => {
        const found = serviceList?.data?.find((s) => s.name === serviceName);
        const serviceId: number = typeof found?.id === "number" ? found.id : idx + 1;
        return (
          <IntegrationManager
            key={serviceId}
            name={serviceMenuMap[serviceName]?.name}
            description={
              serviceName === "Experiments"
                ? `Configure your gremlin / AWS FIS account`
                : serviceMenuMap[serviceName]?.desc
            }
            integrations={getIntegrations(serviceName)}
            onClickAddNew={() => handleAddNew(serviceName)}
            icon={serviceMenuMap[serviceName]?.icon}
            onEdit={(_, record) => {
              const environments = getIntegrations(serviceName)?.find(
                (env) => env?.id === record?.id
              );
              configureRepositoriesForm.resetFields();
              configureInfraForm.resetFields();
              if (serviceName === "Repositories") {
                configureRepositoriesForm.setFieldsValue({
                  name: environments?.name,
                });
                setIsRepositoryDrawerOpen(true);
                setRepoDrawerType("edit");
              }
            }}
            addNewText={serviceMenuMap[serviceName]?.name}
          />
        );
      })}
      <Drawer
        title={
          repoDrawerType === "add" ? "Add New Repositories" : "Edit Repository"
        }
        open={isRepositoryDrawerOpen}
        onClose={() => setIsRepositoryDrawerOpen(false)}
        onSubmit={
          repoDrawerType === "add"
            ? () => handleAddNewRepository()
            : //TODO: integrate API for edit
              () => console.log("edit")
        }
        onCancel={() => setIsRepositoryDrawerOpen(false)}
        disabled={disabledSave}
        loading={isLoading}
      >
        <ConfigureRepositories
          setDisabledSave={setDisabledSave}
          configureRepositoriesForm={configureRepositoriesForm}
          application_id={applicationId?.toString()}
        />
      </Drawer>
      <Drawer
        //TODO: configure edit for environments
        title="Add New Environment"
        open={isEnvironmentDrawerOpen}
        onClose={() => setIsEnvironmentDrawerOpen(false)}
        onSubmit={onEnvironmentCreateSubmit}
        onCancel={() => setIsEnvironmentDrawerOpen(false)}
        disabled={disabledSave}
        loading={isLoading}
      >
        <ConfigureInfra
          setDisabledSave={setDisabledSave}
          configureInfraForm={configureInfraForm}
          application_id={applicationId?.toString()}
        />
      </Drawer>
      <Drawer
        title="Configure Toil Assist"
        open={isToilAssistDrawerOpen}
        onClose={() => setIsToilAssistDrawerOpen(false)}
        onSubmit={() => {
          // TODO: handle ToilAssist form submit
          setIsToilAssistDrawerOpen(false);
        }}
        onCancel={() => setIsToilAssistDrawerOpen(false)}
        disabled={disabledSave}
        loading={isLoading}
      >
        <ConfigureToilAssist
          setDisabledSave={setDisabledSave}
          configureToilAssistForm={configureToilAssistForm}
        />
      </Drawer>
      <Drawer
        title="Configure Trace Assist"
        open={isTraceAssistDrawerOpen}
        hideFooter={true}
        onClose={() => setIsTraceAssistDrawerOpen(false)}
        onCancel={() => setIsTraceAssistDrawerOpen(false)}
        disabled={disabledSave}
        loading={isLoading}
      >
        <ConfigureTraceAssist
          setDisabledSave={setDisabledSave}
          configureTraceAssistForm={configureTraceAssistForm}
          onSuccess={() => setIsTraceAssistDrawerOpen(false)}
        />
      </Drawer>
      <Drawer
        title="Configure SLO/SLI"
        open={isSloSliDrawerOpen}
        onClose={() => setIsSloSliDrawerOpen(false)}
        onCancel={() => setIsSloSliDrawerOpen(false)}
        disabled={disabledSave}
        loading={isLoading}
        hideFooter={true}
      >
        <ConfigureSloSli
          application_id={applicationId}
          project_slo_id={applicationDetailsQuery?.data?.project_id}
          onSuccess={() => setIsSloSliDrawerOpen(false)}
        />
      </Drawer>
      <ConfigureGremlin
        isOpen={isOpenConfigureGremlin}
        onSuccess={async () => {
          await applicationDetailsQuery.refetch();
          setIsOpenConfigureGremlin(false);
        }}
        onClose={() => setIsOpenConfigureGremlin(false)}
        applicationId={applicationId?.toString()}
      />
      
      <Drawer
  title="Configure Drift Assist"
  open={isDriftAssistDrawerOpen}
  onClose={() => setIsDriftAssistDrawerOpen(false)}
  onCancel={() => setIsDriftAssistDrawerOpen(false)}
  disabled={disabledSave}
  loading={isLoading}
  hideFooter={true}
>
  <ConfigureDriftAssist
    setDisabledSave={setDisabledSave}
    configureDriftAssistForm={configureDriftAssistForm}
    onFinish={() => setIsDriftAssistDrawerOpen(false)}
  />
</Drawer>
      
    </Flex>
  );
};
 
export default WorkFlowConfiguration;