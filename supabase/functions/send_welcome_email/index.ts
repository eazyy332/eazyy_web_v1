import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Mustache from "https://esm.sh/mustache@4.2.0";

const supabase = createClient(
  "https://jamgmyljyydryxaonbgk.supabase.co",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    const body = await req.json();
    const record = body?.record || body;

    console.log("📥 Received input:", record);

    const userEmail = record?.email;
    const userName = record?.user_metadata?.name || record?.name || "Eazyy klant";

    if (!userEmail) {
      throw new Error("Missing email field in payload.");
    }

    console.log("👤 User:", userName, "| 📧 Email:", userEmail);

    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .eq("name", "welcome_email")
      .single();

    if (error) {
      console.error("❌ Database error:", error);
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      throw new Error("Email template 'welcome_email' not found in database.");
    }

    const renderedHtml = Mustache.render(data.body_html, {
      name: userName,
      cta_url: "https://eazyy.app/schedule"
    });

    console.log("📤 Sending email with template subject:", data.subject);
    console.log("🔐 RESEND_API_KEY present:", !!Deno.env.get("RESEND_API_KEY"));

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "omar@eazyy.app",
        to: userEmail,
        subject: data.subject,
        html: renderedHtml
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("❌ Resend API error:", result);
      throw new Error(`Failed to send email: ${result.message}`);
    }

    console.log("✅ Email sent:", result);
    return new Response("✅ Welcome email sent", { status: 200 });

  } catch (err) {
    console.error("❌ Function error:", err);
    return new Response(`❌ Failed to send welcome email: ${err.message}`, { status: 500 });
  }
});
