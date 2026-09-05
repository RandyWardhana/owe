/* Client-side capability flag only. All cloud access goes through the server
   (/api/bill, /api/sync), so the browser never talks to the database and holds
   no credentials — this just tells the UI whether sharing and history backup
   are available at all. Storage is Cloudflare D1 behind the owe-db Worker. */
export const hasCloudSync = process.env.NEXT_PUBLIC_OWE_CLOUD === "1";
