import { createClient } from '@supabase/supabase-js'
import {conversations} from "@/db/po/ElicitConversations";

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseKey = process.env.SUPABASE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)


const { data, error } = await supabase
    .from('elicit_conversations')
    .insert([
        { conversation: 'someValue', other_column: 'otherValue' },
    ])
    .select()