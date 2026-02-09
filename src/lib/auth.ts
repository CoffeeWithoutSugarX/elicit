import {createClient, User} from '@supabase/supabase-js';
import {NextRequest, NextResponse} from 'next/server';

// 定义业务处理函数的类型，增加 user 参数
type AuthenticatedHandler = (
    req: NextRequest,
    context: { params: unknown; user: User }
) => Promise<Response>;

export function withAuth(handler: AuthenticatedHandler) {
    return async (req: NextRequest, segmentData: { params: unknown }) => {
        try {
            const authHeader = req.headers.get('Authorization');
            const token = authHeader?.replace('Bearer ', '');

            if (!token) {
                return NextResponse.json({error: '未授权'}, {status: 401});
            }

            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                {
                    global: {headers: {Authorization: `Bearer ${token}`}}
                }
            );

            const {data: {user}, error} = await supabase.auth.getUser();

            if (error || !user) {
                return NextResponse.json({error: '身份校验失败'}, {status: 401});
            }

            // AOP 核心：将获取到的 user 注入到 context 中传递给业务逻辑
            return await handler(req, {...segmentData, user});
        } catch (e) {
            return NextResponse.json({error: '服务器错误'}, {status: 500});
        }
    };
}