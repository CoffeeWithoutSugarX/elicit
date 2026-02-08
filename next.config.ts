import type {NextConfig} from "next";

const nextConfig: NextConfig = {
    /* config options here */
    reactCompiler: true,
    // 强制将 ali-oss 视为服务端外部包，不进行打包处理
    serverExternalPackages: ['ali-oss']
};

export default nextConfig;
