/// <reference lib="deno.ns" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

// Ambient declaration to help IDEs when editing edge function files in a Node project.
// Supabase Edge Functions run on Deno. These types ensure names like `Deno` resolve.
declare const Deno: typeof globalThis extends { Deno: infer T } ? T : any;