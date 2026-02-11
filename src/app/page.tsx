"use client"

import {useShowWelcome} from "@/stores/useShowWelcome";
import WelcomeScreen from "@/features/welcome/welcome-screen";
import ChatScreen from "@/features/chat/chat-screen";

export default function Home() {
    const showWelcome = useShowWelcome(state => state.showWelcome);
    return (
        showWelcome ? <WelcomeScreen/> : <ChatScreen/>
    )
}
