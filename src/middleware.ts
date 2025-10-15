export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/agents/:path*",
    "/api/conversations/:path*",
  ],
};
