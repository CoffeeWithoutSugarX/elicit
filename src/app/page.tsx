"use client"

import {useShowWelcome} from "@/stores/useShowWelcome";
import WelcomeScreen from "@/screen/welcome/welcome-screen";
import ChatScreen from "@/screen/chat/chat-screen";

export default function Home() {
    const showWelcome = useShowWelcome(state => state.showWelcome);
    return (
        showWelcome ? <WelcomeScreen/> : <ChatScreen/>
    )
}
