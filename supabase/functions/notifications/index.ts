import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const API_URL = Deno.env.get("API_URL") || "http://localhost:3001";
const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";

serve(async (_req) => {
  try {
    const response = await fetch(`${API_URL}/api/v1/reminders/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CRON_SECRET}`,
      },
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
      status: response.status,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
