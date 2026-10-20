// Capability flag only: all cloud access goes through the server, the browser holds no credentials.
export const hasCloudSync = process.env.NEXT_PUBLIC_OWE_CLOUD === "1";
