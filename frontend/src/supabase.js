import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ucuuelohmkeesibevlfh.supabase.co';
const supabaseKey = 'sb_publishable_MPhN2hbDLUB0r9ZQwCEO3w_BYNU0Jg4';

export const supabase = createClient(supabaseUrl, supabaseKey);
