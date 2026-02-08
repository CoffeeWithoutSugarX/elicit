import {create} from "zustand";
import {supabase} from "@/db/supabase/supabase";
import {User} from "@supabase/auth-js";

type UserInfoStore = {
    userInfo: User | null,
    login: (email: string, password: string) => void,
    logout: () => void,
    whoAmI: () => Promise<User | null>
}

export const useUserInfo = create<UserInfoStore>((set,get) => {

    const userInfo = null;

    const login = async (email: string, password: string) => {
        const {data, error} = await supabase.auth.signInWithPassword({email, password})
        if (error) {
            console.error('Login error:', error.message);
            return;
        }
        console.log('Login successful:', data.user);
        set({userInfo: data.user})
    }

    const logout = async () => {
        const {error} = await supabase.auth.signOut()
        if (error) {
            console.error('Logout error:', error.message);
            return;
        }
        console.log('Logout successful');
        set({userInfo: null})
    }

    const whoAmI = async () => {
        const {data, error} = await supabase.auth.getUser()
        if (error) {
            console.error('Whoami error:', error.message);
            return null;
        }
        set({userInfo: data.user})
        return get().userInfo;
    }

    return {userInfo, login, logout, whoAmI}
})