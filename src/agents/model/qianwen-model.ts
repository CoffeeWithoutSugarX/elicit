import {ChatOpenAI} from "@langchain/openai";

// 定义提取车票信息的Prompt
const PROMPT_TICKET_EXTRACTION = `
请识别图片中的数学题目并输出题目文字
`;

// 初始化OpenAI客户端
const client = new ChatOpenAI({
    model: "qwen-vl-ocr-latest",
    // 若没有配置环境变量，请用百炼API Key将下行替换为：apiKey: "sk-xxx",
    // 各地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
    apiKey: "sk-95c6a6d9899b497495218b68de7e8f75",
    // 以下为北京地域的 base_url，若使用弗吉尼亚地域模型，需要将base_url换成https://dashscope-us.aliyuncs.com/compatible-mode/v1
    // 若使用新加坡地域的模型，需将base_url替换为：https://dashscope-intl.aliyuncs.com/compatible-mode/v1
    configuration: {
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
    }
});

async function main() {
    try {
        // 创建聊天完成请求
        const completion = await client.invoke([
                {
                    role: "user",
                    content: [
                        // 模型支持在text字段中传入Prompt，若未传入，则会使用默认的Prompt：Please output only the text content from the image without any additional descriptions or formatting.
                        {
                            type: "image_url",
                            image_url: {
                                url: "https://muzi-elicit.oss-cn-shanghai.aliyuncs.com/conversationId/20260205/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260117213607_504_204.jpg?Expires=1770356211&OSSAccessKeyId=TMP.3KsFxMqYSQPbeXitTbCXExZGw4SQ4VM19SHpyCqgpT5c5tC6pViGbHz1haffraKU6dvgKgVQeAAs4fx7x9TZf8iiemTXqo&Signature=cTFvfF6WiVNRn%2F7NOuKApsmNqsQ%3D",
                            },
                            // 输入图像的最小像素阈值，小于该值图像会放大，直到总像素大于min_pixels
                            min_pixels: 32 * 32 * 3,
                            // 输入图像的最大像素阈值，超过该值图像会缩小，直到总像素低于max_pixels
                            max_pixels: 32 * 32 * 8192
                        },
                        {
                            type: "text",
                            text: PROMPT_TICKET_EXTRACTION
                        }
                    ]
                }
            ]
        );

        // 输出结果
        console.log(completion.content);
    } catch (error) {
        console.log(`错误信息: ${error}`);
    }
}

main();