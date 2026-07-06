import { createNextAppEnv, sharedServerEnvShape } from "@repo/config/env";
import { z } from "zod";
import "server-only";

export const env = createNextAppEnv({
  server: {
    ...sharedServerEnvShape,
  },
  client: {
    NEXT_PUBLIC_APP_NAME: z.string().min(1).default("Merchant admin"),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  },
});
