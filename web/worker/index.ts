import { youtubeAgentRequest } from "../lib/youtube-jobs";
import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";
import { localeForCountry } from "../lib/i18n/locale";

const GEO_LOCALE_COOKIE = "snapreel-geo-locale";

/**
 * Cloudflare sets `cf-ipcountry` on every request it proxies, so this needs
 * no extra config. The cookie is a hint only: it's non-httpOnly so the
 * client-side LocaleProvider can read it as a fallback when no explicit
 * choice is stored in localStorage yet. Only set once per browser (if the
 * cookie is already there, leave it — an explicit later choice still lives
 * in localStorage and takes priority regardless).
 */
function withGeoLocaleHint(request: Request, response: Response): Response {
  if (request.headers.get("Cookie")?.includes(`${GEO_LOCALE_COOKIE}=`)) return response;
  const locale = localeForCountry(request.headers.get("cf-ipcountry"));
  const next = new Response(response.body, response);
  next.headers.append(
    "Set-Cookie",
    `${GEO_LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`,
  );
  return next;
}

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
      const pathname = new URL(request.url).pathname;

      if (request.method === "GET" && pathname === "/api/download") {
        const length = Number(response.headers.get("Content-Length"));
        if (response.ok && response.body && Number.isSafeInteger(length) && length > 0) {
          // Vinext wraps route bodies. Apply the fixed length at the Worker boundary.
          const body = response.body.pipeThrough(new FixedLengthStream(length));
          return new Response(body, response);
        }
      }

      if (request.method === "GET" && !pathname.startsWith("/api/")) {
        return withGeoLocaleHint(request, response);
      }

      return response;
    });
  },
};

export default worker;
