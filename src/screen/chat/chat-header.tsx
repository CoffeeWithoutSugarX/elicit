"use client"
import {House, Menu, Moon, Plus, Sparkles, Sun} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useThemeFlag} from "@/stores/useThemeFlag";
import {useShowWelcome} from "@/stores/useShowWelcome";


export default function ChatHeader() {
    const {isDark, themeToggle} = useThemeFlag(state => state);
    const toggleWelcomeScreen = useShowWelcome(state => state.toggleWelcome);
    return (
        <header className="w-full h-15 pl-5 flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex justify-between items-center gap-4">
                <Button
                    className="icon-button">
                    <Menu className="small-icon"/>
                </Button>
                <Button className="icon-button" onClick={toggleWelcomeScreen}>
                    <House className={"small-icon"}/>
                </Button>
                <div className="flex items-center gap-2">
                    <div className="flex justify-center items-center h-8 w-8 rounded-full bg-primary">
                        <Sparkles className="small-icon text-primary-foreground"/>
                    </div>
                    <div>
                        <p className="text-sm font-bold">引思助手</p>
                        <p className="text-xs text-muted-foreground">在线 - 随时为你解答</p>
                    </div>
                </div>
            </div>

            <div className="flex justify-end items-center">
                <Button className="icon-button" onClick={themeToggle}>
                    {isDark ? <Moon className="small-icon"/> : <Sun className="small-icon"/>}
                </Button>
                <Button className="icon-button">
                    <Plus className="small-icon"/>
                </Button>
            </div>
        </header>
    )
}