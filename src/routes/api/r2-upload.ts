import { createFileRoute } from "@tanstack/react-router";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const Route = createFileRoute("/api/r2-upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json() as {
            eventId?: string;
            fileName?: string;
            contentType?: string;
          };

          const eventId = body.eventId || "general";
          const fileName = body.fileName || `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`;
          const contentType = body.contentType || "image/jpeg";

          // Read Cloudflare R2 credentials from environment variables
          const accountId = process.env.R2_ACCOUNT_ID || "";
          const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
          const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
          const bucketName = process.env.R2_BUCKET_NAME || "snapix-memories";
          const publicUrl = process.env.R2_PUBLIC_URL || "";

          if (!accountId || !accessKeyId || !secretAccessKey) {
            return new Response(
              JSON.stringify({
                error: "R2 credentials are not configured in environment.",
              }),
              { status: 500, headers: { "Content-Type": "application/json" } }
            );
          }

          // Initialize S3 Client configured for Cloudflare R2
          const s3 = new S3Client({
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
              accessKeyId,
              secretAccessKey,
            },
            region: "auto",
          });

          // Define R2 object key (path)
          const objectKey = `events/${eventId}/${fileName}`;

          const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: objectKey,
            ContentType: contentType,
          });

          // Generate a presigned URL valid for 15 minutes (900 seconds)
          const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

          // Determine public URL for displaying the image later
          const displayUrl = publicUrl 
            ? `${publicUrl.replace(/\/$/, "")}/${objectKey}`
            : `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${objectKey}`;

          return new Response(
            JSON.stringify({
              uploadUrl,
              displayUrl,
              objectKey,
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
              },
            }
          );
        } catch (error: any) {
          return new Response(
            JSON.stringify({ error: error.message || "Failed to generate presigned upload URL" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      },
      // Handle CORS preflight options request
      OPTIONS: async () => {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      },
    },
  },
});
