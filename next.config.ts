import type {NextConfig} from "next";

const nextConfig: NextConfig = {
    /* config options here */
    reactCompiler: true,
    // 强制将 ali-oss 视为服务端外部包，不进行打包处理
    serverExternalPackages: ['ali-oss'],
    allowedDevOrigins: ['local-origin.dev', '*.local-origin.dev', 'http://172.40.0.141:3000'],
};

export default nextConfig;
