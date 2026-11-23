import { youtubeAgentRequest } from "../lib/youtube-jobs";
import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

const worker = {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    if (new URL(request.url).pathname === "/api/youtube-agent") return youtubeAgentRequest(request);
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    return runWithConnectorBinding(binding, async () => {
      const response = await handler.fetch(request, env, ctx);
      if (request.method !== "GET" || new URL(request.url).pathname !== "/api/download") return response;

      const length = Number(response.headers.get("Content-Length"));
      if (!response.ok || !response.body || !Number.isSafeInteger(length) || length <= 0) return response;

      // Vinext wraps route bodies. Apply the fixed length at the Worker boundary.
      const body = response.body.pipeThrough(new FixedLengthStream(length));
      return new Response(body, response);
    });
  },
};

export default worker;
