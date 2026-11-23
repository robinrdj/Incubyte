import { APP_NAME } from "@salary/shared";

/** Name reported by the API service, for logs and health checks. */
export function getServiceName(): string {
  return `${APP_NAME}-api`;
}
