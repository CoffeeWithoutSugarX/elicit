"use client"

/**
 * 登录弹窗 — 真模态，通过 open/onClose/onSuccess 受控。
 * 已迁移至 shadcn Dialog（DialogContent 提供遮罩与居中，DialogHeader/Title/Footer 规范布局）。
 * 去除手写 fixed inset-0 遮罩，全灰阶 token。
 */
import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type LoginScreenProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function LoginScreen({ open, onClose, onSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({
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

  const handleOpenChange = (nextOpen: boolean) => {
    // Dialog 关闭时（点击遮罩或按 Esc）同步清错误并触发 onClose
    if (!nextOpen) {
      setLoginError("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-sm" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle>登录</DialogTitle>
          <DialogDescription className="sr-only">
            请输入邮箱和密码以登录引思助手
          </DialogDescription>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  );
}
