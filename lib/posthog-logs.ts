import { SeverityNumber } from "@opentelemetry/api-logs";
import { loggerProvider } from "@/instrumentation";

const logger = loggerProvider?.getLogger("posthog-exporter");

type LogAttributes = Record<string, string | number | boolean>;

export function logPostHogInfo(message: string, attributes: LogAttributes): void {
  logger?.emit({
    body: message,
    severityNumber: SeverityNumber.INFO,
    attributes,
  });
}

export async function flushPostHogLogs(): Promise<void> {
  if (loggerProvider) {
    await loggerProvider.forceFlush().catch(() => {});
  }
}
