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
        const response = await visionModel.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage({
                content: [
                    { type: "image_url", image_url: { url: state.questionImgUrl } },
                    { type: "text", text: userContent },
                ],
            }),
        ]);

        // 提取响应文本
        const responseText = typeof response.content === 'string'
            ? response.content
            : '';

        // 从响应中提取 JSON（可能被 ```json``` 围栏包裹）
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/)
            ?? responseText.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            console.log('VisionNode: failed to extract JSON from response');
            return { ocrResult: failResult, questionImgUrl: undefined };
        }

        const jsonStr = jsonMatch[1] ?? jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        const ocrResult = OcrSchema.parse(parsed);

        // 通过 getWriter() 向客户端推送 questions_detected SSE chunk
        if (ocrResult.isSolvable) {
            const writer = getWriter();
            if (writer) {
                writer({
                    type: 'questions_detected',
                    questions: ocrResult.questions,
                    isMulti: ocrResult.isMulti,
                });
            }
        }

        console.log('VisionNode completed', {
            isSolvable: ocrResult.isSolvable,
            questionCount: ocrResult.isSolvable ? ocrResult.questions.length : 0,
        });

        // 处理完成后清空 questionImgUrl，避免重复触发 OCR
        return { ocrResult, questionImgUrl: undefined };

    } catch (error) {
        console.log('VisionNode error', error);
        return { ocrResult: failResult, questionImgUrl: undefined };
    }
};
