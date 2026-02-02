"use client"
import {BookOpen, Camera, Lightbulb, Sparkles} from "lucide-react";
import {Button} from "@/components/ui/button";


export default function WelcomeScreen() {

    const features = [
        {
            icon: Camera,
            title: "拍照上传",
            description: "拍摄或选择不会的题目",
        },
        {
            icon: Lightbulb,
            title: "引导思考",
            description: "启发式问答，培养解题能力",
        },
        {
            icon: BookOpen,
            title: "知识点梳理",
            description: "关联相关知识，举一反三",
        },
    ];
    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <div
                className="w-20 h-20 mb-3 rounded-full  flex justify-center items-center bg-foreground text-background">
                <Sparkles className="w-10 h-10"></Sparkles>
            </div>
            <h1 className="text-2xl font-semibold mb-3">引思助手</h1>
            <p className="text-muted-foreground text-sm mb-5">你的智能学习伙伴，陪你一起思考</p>
            {/*Feature cards*/}
            <div className="w-full max-w-sm space-y-3 mb-8">
                {features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-4 bg-background p-4 rounded-md shadow-md">
                        <feature.icon className="w-5 h-5 text-primary"/>
                        <div>
                            <h3 className="text-lg font-semibold">{feature.title}</h3>
                            <p className="text-muted-foreground text-sm">{feature.description}</p>
                        </div>
                    </div>
                ))}
            </div>
            {/*CTA*/}
            <Button className="w-full max-w-sm py-3 px-6
            rounded-2xl bg-primary
            text-primary-foreground font-medium
            text-sm hover:bg-primary/90
            transition-colors shadow-lg shadow-primary/20
            ">开始学习</Button>
            {/* Tip */}
            <p className="mt-6 text-xs text-muted-foreground text-center max-w-xs">
                上传题目后，我会通过提问的方式引导你思考，帮助你真正理解解题思路
            </p>
        </div>
    );

}