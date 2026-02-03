"use client"
import ChatScreen from "@/components/chat/chat-screen";
import WelcomeScreen from "@/components/welcome/welcome-screen";
import {useShowWelcome} from "@/stores/useShowWelcome";

export default function Home() {
    const showWelcome = useShowWelcome(state => state.showWelcome);
    return (
        showWelcome ? <WelcomeScreen/> : <ChatScreen/>
    )
}
