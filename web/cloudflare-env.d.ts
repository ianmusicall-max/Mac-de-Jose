declare namespace Cloudflare {
  interface Env {
    YOUTUBE_AGENT_TOKEN?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
