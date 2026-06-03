import { ElicitGraphState } from "@/agents/schemas/ElicitGraphStateSchema";
import { OcrSchema } from "@/agents/schemas/OcrSchema";
import { visionModel } from "@/agents/models/qwen-vl-model";
import { systemPrompt, userPromptTemplate } from "@/agents/prompts/vision/visionNode.prompt";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getWriter } from "@langchain/langgraph";

export const visionNodeName = 'visionNode';

export const visionNode = async (state: ElicitGraphState) => {
    console.log('VisionNode invoked with', { questionImgUrl: state.questionImgUrl, conversationId: state.conversationId });

    if (!state.questionImgUrl) {
        return {};
    }

    // 失败时返回的 UnsolvableOcrSchema 形状
    const failResult = {
        isSolvable: false as const,
        subject: 'math',
        questions: [] as never[],
        errorReason: 'PARSE_FAIL' as const,
    };

    try {
        // 从最后一条消息取用户文本（作为补充说明）
        const userText = state.messages.length > 0
            ? (state.messages[state.messages.length - 1]?.content?.toString() ?? '')
            : '';

        const userContent = userPromptTemplate({ imgUrl: state.questionImgUrl, userText });

        // 调用 Qwen VL，图片以 image_url 方式传入
        // 加 "langsmith:nostream" tag：让 LangGraph StreamMessagesHandler 跳过本次调用的 token emit，
        // 避免 OCR 输出的机器可读 JSON 被当作妹妹回复推送到前端文本流（参见 @langchain/langgraph StreamMessagesHandler）
        const response = await visionModel.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage({
                content: [
                    { type: "image_url", image_url: { url: state.questionImgUrl } },
                    { type: "text", text: userContent },
                ],
            }),
        ], { tags: ["langsmith:nostream"] });

        // 提取响应文本
        const responseText = typeof response.content === 'string'
            ? response.content
            : '';

        // 从响应中提取 JSON（可能被 ```json``` 围栏包裹）
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/)
            ?? responseText.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            console.log('VisionNode: failed to extract JSON from response');
            // 提取 JSON 失败——主动推妹妹口吻提示，避免前端无限「正在思考…」
            getWriter()?.({ kind: 'assistant_message', text: '这道题我暂时没看清呢～麻烦把题目重新拍一张清晰、完整的照片发给我好吗？' });
            return { ocrResult: failResult, questionImgUrl: undefined };
        }

        const jsonStr = jsonMatch[1] ?? jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        const ocrResult = OcrSchema.parse(parsed);

        // 通过 getWriter() 向客户端推送 questions_detected SSE chunk
        // 使用 kind 字段区分（不用 type），让外层 SSE part 名始终为 data-custom
        if (ocrResult.isSolvable) {
            const writer = getWriter();
            if (writer) {
                writer({
                    kind: 'questions_detected',
                    questions: ocrResult.questions,
                    isMulti: ocrResult.isMulti,
                });
            }
        } else {
            // isSolvable=false——按 errorReason 选话术推妹妹提示
            const text = ocrResult.errorReason === 'BLURRY'
                ? '图片有点模糊，我看不清题目～换一张清晰点的照片再发我吧！'
                : '这道题好像不是初中数学题哦～我目前只擅长初中数学，换道数学题考考我？';
            getWriter()?.({ kind: 'assistant_message', text });
        }

        console.log('VisionNode completed', {
            isSolvable: ocrResult.isSolvable,
            questionCount: ocrResult.isSolvable ? ocrResult.questions.length : 0,
        });

        // 处理完成后清空 questionImgUrl，避免重复触发 OCR
        return { ocrResult, questionImgUrl: undefined };

    } catch (error) {
        console.log('VisionNode error', error);
        // JSON.parse 或 OcrSchema.parse 抛错——主动推妹妹口吻提示，避免前端无限「正在思考…」
        getWriter()?.({ kind: 'assistant_message', text: '这道题我暂时没看清呢～麻烦把题目重新拍一张清晰、完整的照片发给我好吗？' });
        return { ocrResult: failResult, questionImgUrl: undefined };
    }
};
