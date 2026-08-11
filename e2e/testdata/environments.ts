export interface Environment {
  appBaseURL: string;
  classroomApiBaseURL: string;
}

const DEFAULT_ENVIRONMENT: Environment = {
  appBaseURL: 'https://aixmy.miaobi.cn',
  classroomApiBaseURL: 'https://maliang.miaobi.cn',
};

export function getEnvironment(): Environment {
  return {
    appBaseURL: process.env.MIABI_APP_BASE_URL || DEFAULT_ENVIRONMENT.appBaseURL,
    classroomApiBaseURL:
      process.env.MIABI_CLASSROOM_API_BASE_URL || DEFAULT_ENVIRONMENT.classroomApiBaseURL,
  };
}
