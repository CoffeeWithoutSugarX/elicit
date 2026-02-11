import ChatConversationProps from "@/features/chat/props/ChatConversationProps";
import {useConversation} from "@/stores/useConversation";
import {Button} from "@/components/ui/button";


export default function ChatConversation(props: ChatConversationProps) {

    const {currentConversationId, setCurrentConversationId} = useConversation(state => state);

    return (
        <div className={"pr-4 pl-4"}>
            <Button
                className={"w-full flex justify-between pl-4 pt-2 pb-2 rounded-4xl hover:bg-muted-foreground/50 cursor-pointer" + (props.id === currentConversationId ? " bg-foreground text-background" : " bg-background text-foreground")}
                onClick={() => setCurrentConversationId(props.id)}>
                {props.title}
            </Button>
        </div>
    )
}
