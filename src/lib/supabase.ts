import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qmruagjcmkznncjolske.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_pzN7kam4BbGjYP8JdDKodA_Kn_GJUnU';

export const supabase = createClient(supabaseUrl, supabaseKey);
