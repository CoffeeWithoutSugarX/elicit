"use client"

import React, {useState} from "react";
import {createClient} from "@supabase/supabase-js";
import {X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type LoginScreenProps = {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
};

export default function LoginScreen({open, onClose, onSuccess}: LoginScreenProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [loginError, setLoginError] = useState("");

    if (!open) {
        return null;
    }

    const handleLogin = async (event: React.SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoggingIn(true);
        setLoginError("");
        const {error} = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });
        if (error) {
            setLoginError(error.message);
            setIsLoggingIn(false);
            return;
        }
        setIsLoggingIn(false);
        setLoginError("");
        onSuccess();
    };

    const handleClose = () => {
        setLoginError("");
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-sm rounded-xl border border-border bg-background p-5 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">登录</h2>
                    <Button className="icon-button" onClick={handleClose} aria-label="关闭登录窗口">
                        <X className="small-icon"/>
                    </Button>
                </div>
                <form className="space-y-3" onSubmit={handleLogin}>
                    <Input
                        type="email"
                        placeholder="邮箱"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                    />
                    <Input
                        type="password"
                        placeholder="密码"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                    />
                    {loginError && (
                        <p className="text-xs text-destructive">{loginError}</p>
                    )}
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoggingIn}
                    >
                        {isLoggingIn ? "登录中...." : "登录"}
                    </Button>
                </form>
            </div>
        </div>
    );
}
