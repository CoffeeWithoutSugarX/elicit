"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import WelcomeScreen from "@/features/welcome/welcome-screen";
import { supabase } from "@/db/supabase/supabase";

export default function Home() {
    const router = useRouter();
    const [checking, setChecking] = useState(true);
    const [authed, setAuthed] = useState(false);

    useEffect(() => {
        // 静默检测登录态：已登录则直接跳 /chat，未登录则展示欢迎页
        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                router.replace('/chat');
            } else {
                setAuthed(false);
                setChecking(false);
            }
        })();
    }, [router]);

    if (checking) {
        // 检测中：渲染空白占位，避免 flash
        return null;
    }

    if (authed) {
        return null;
    }

    // 未登录：展示欢迎 / 登录引导页
    // WelcomeScreen 内部调用 toggleWelcome 后会重新触发路由，
    // 这里把 onLoginSuccess 处理为跳转到 /chat
    return <WelcomeScreenWithRedirect />;
}

/**
 * 封装 WelcomeScreen：登录成功后路由到 /chat 而非切换 showWelcome flag。
 * 复用原有 WelcomeScreen + LoginScreen 组合，仅覆盖成功回调。
 */
function WelcomeScreenWithRedirect() {
    const router = useRouter();

    // WelcomeScreen 内部通过 toggleWelcome store 来切换页面，
    // 但新路由体系下应直接跳转到 /chat。
    // 方案：监听 supabase auth 状态变化，登录成功后自动跳转。
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                router.push('/chat');
            }
        });
        return () => subscription.unsubscribe();
    }, [router]);

    return <WelcomeScreen />;
}
