import { create } from "zustand";

type ShowWelcomeStore = {
    showWelcome: boolean,
    toggleWelcome: () => void
}

export const useShowWelcome = create<ShowWelcomeStore>((set)=> {
    return {
        showWelcome: false,
        toggleWelcome: () => set(state => ({showWelcome: !state.showWelcome}))
    }
})