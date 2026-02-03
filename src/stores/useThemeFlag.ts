import {create} from "zustand";

type ThemeFlag = {
    isDark: boolean,
    themeToggle: () => void
}

export const useThemeFlag = create<ThemeFlag>((set) => ({
    isDark: false,
    themeToggle: () => set((state) => {
        document.documentElement.classList.toggle("dark", !state.isDark);
        return {isDark: !state.isDark}
    })
}))