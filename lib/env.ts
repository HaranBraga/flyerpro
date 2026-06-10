// Centralized, validated access to environment variables.
// Throws early (at first import on the server) when a required var is missing.

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  appUrl: optional("APP_URL", "http://localhost:3000"),

  storage: {
    // "local" = arquivos num volume do app (padrão). "s3" = MinIO/R2.
    driver: optional("STORAGE_DRIVER", "local"),
    // Pasta onde o driver local grava (deve ser um volume persistente).
    uploadsDir: optional("UPLOADS_DIR", ".uploads"),
  },

  references: {
    // Busca de referências por segmento no Freepik/Behance (best-effort).
    scrape: optional("ENABLE_REFERENCE_SCRAPE", "true") !== "false",
  },

  fal: {
    key: optional("FAL_KEY"),
    modelText: optional("FAL_MODEL_TEXT", "xai/grok-imagine-image"),
    modelEdit: optional("FAL_MODEL_EDIT", "xai/grok-imagine-image/edit"),
  },

  deepseek: {
    apiKey: optional("DEEPSEEK_API_KEY"),
    baseUrl: optional("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
    model: optional("DEEPSEEK_MODEL", "deepseek-chat"),
  },

  s3: {
    endpoint: optional("S3_ENDPOINT"),
    region: optional("S3_REGION", "us-east-1"),
    bucket: optional("S3_BUCKET", "flyerpro"),
    accessKeyId: optional("S3_ACCESS_KEY_ID"),
    secretAccessKey: optional("S3_SECRET_ACCESS_KEY"),
    forcePathStyle: optional("S3_FORCE_PATH_STYLE", "true") === "true",
    publicUrl: optional("S3_PUBLIC_URL"),
  },
};

export { required };
