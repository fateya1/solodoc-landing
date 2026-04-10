import { withSentryConfig } from "@sentry/nextjs";

/** @type {import("next").NextConfig} */
const nextConfig = {
  images: { domains: ["solo-doctor-emedicine-platform.onrender.com"] },
};

export default withSentryConfig(nextConfig, {
  org: "solo-doctor",
  project: "javascript-nextjs",
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
});
