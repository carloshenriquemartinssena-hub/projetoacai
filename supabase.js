const SUPABASE_URL = "https://rpupbfuglojzxbzcjkox.supabase.co";

const SUPABASE_KEY = "sb_publishable_I_e7Cz-IprP2wUsPp3Nfcg_7z7WWgoi";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

window.supabaseClient = supabaseClient;