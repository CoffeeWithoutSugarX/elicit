import {create} from "zustand";

// MVP 阶段仅支持简约白（minimal）主题，无需主题切换
type ThemeFlag = {
    isDark: boolean,
    themeToggle: () => void
}

export const useThemeFlag = create<ThemeFlag>(() => ({
    isDark: false,
    // MVP 光模式固定，themeToggle 为空操作
    themeToggle: () => {},
}))
