import { NextResponse } from "next/server";
import { compiledElicitGraph } from "@/agents/graphs/ChatGraph";
import { withAuth } from "@/lib/auth";

export const GET = withAuth(async (_request, { params, user }) => {
    const { conversationId } = await params as { conversationId: string };

    console.log('State route invoked', { conversationId, userId: user.id });

    try {
        const snapshot = await compiledElicitGraph.getState({
            configurable: { thread_id: conversationId },
        });

        const values = snapshot?.values ?? {};

        // 无 checkpoint（新会话或尚无对话记录）时返回默认值
        if (!values || Object.keys(values).length === 0 || values.currentPhase === undefined) {
            return NextResponse.json({
                currentPhase: 0,
                currentSubProblemIndex: 0,
                totalSubProblems: 0,
                insightPoints: [],
                hasResolved: false,
            });
        }

        // 归属校验（fail-closed）：userId 缺失或不匹配均拒绝
        // 注意：前面"无 checkpoint/currentPhase 未写入"的早返回分支返回的是全常量默认值，
        // 不含任何用户数据，因此不在此处校验——此处只处理 checkpoint 有实际数据的情况。
        if (!values.userId || values.userId !== user.id) {
            return NextResponse.json({ error: '无权访问该会话' }, { status: 403 });
        }

        const currentSubProblemIndex: number = values.currentSubProblemIndex ?? 0;
        const subProblems = values.subProblems ?? [];
        const totalSubProblems: number = subProblems.length;
        const insightPoints: string[] = subProblems[currentSubProblemIndex]?.insightPoints ?? [];

        return NextResponse.json({
            currentPhase: values.currentPhase ?? 0,
            currentSubProblemIndex,
            totalSubProblems,
            insightPoints,
            hasResolved: !!values.hasResolved,
        });
    } catch (err) {
        console.error('State route error', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : '获取会话状态失败，请重试' },
            { status: 500 },
        );
    }
});
