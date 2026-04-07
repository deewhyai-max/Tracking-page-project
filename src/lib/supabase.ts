import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qmruagjcmkznncjolske.supabase.co';
const supabaseKey = 'sb_publishable_pzN7kam4BbGjYP8JdDKodA_Kn_GJUnU';

// Standard initialization without extra headers to avoid CORS/Load failed issues
export const supabase = createClient(supabaseUrl, supabaseKey);
