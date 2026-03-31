import { createClient } from "npm:@supabase/supabase-js@2";
import { handleOptions, jsonResponse } from "../_shared/http.ts";

type PlanType = "end_user" | "business";

interface CheckoutRequest {
  variant_id: string;
  plan_type: PlanType;
  redirect_url: string;
  custom_data?: Record<string, string>;
}

const LEMON_SQUEEZY_API_KEY = Deno.env.get("LEMON_SQUEEZY_API_KEY") ?? "";
const LEMON_SQUEEZY_STORE_ID = Deno.env.get("LEMON_SQUEEZY_STORE_ID") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function getServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function assertEnv() {
  const missing = [
    ["LEMON_SQUEEZY_API_KEY", LEMON_SQUEEZY_API_KEY],
    ["LEMON_SQUEEZY_STORE_ID", LEMON_SQUEEZY_STORE_ID],
    ["SUPABASE_URL", SUPABASE_URL],
    ["SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY],
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    throw new Error(`Missing function secrets: ${missing.map(([name]) => name).join(", ")}`);
  }
}

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const supabase = getServiceClient();
  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  return { supabase, user };
}

function assertValidBody(body: CheckoutRequest) {
  if (!body.variant_id) {
    throw new Error("variant_id is required");
  }

  if (body.plan_type !== "end_user" && body.plan_type !== "business") {
    throw new Error("plan_type must be end_user or business");
  }

  if (!body.redirect_url) {
    throw new Error("redirect_url is required");
  }
}

async function assertBusinessAccess(
  supabase: ReturnType<typeof getServiceClient>,
  userId: string,
  businessId?: string,
) {
  if (!businessId) {
    throw new Error("business_id is required for business checkouts");
  }

  const { data, error } = await supabase
    .from("business_staff")
    .select("id")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Unauthorized for requested business");
  }
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) {
    return preflight;
  }

  try {
    assertEnv();

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const { supabase, user } = await getAuthenticatedUser(req);
    const body = (await req.json()) as CheckoutRequest;

    assertValidBody(body);

    const customData = body.custom_data ?? {};
    if (body.plan_type === "business") {
      await assertBusinessAccess(supabase, user.id, customData.business_id);
    }

    const profileName =
      `${user.user_metadata?.first_name ?? ""} ${user.user_metadata?.last_name ?? ""}`.trim() ||
      user.user_metadata?.full_name ||
      user.email ||
      "Rewards App User";

    const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${LEMON_SQUEEZY_API_KEY}`,
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              email: user.email,
              name: profileName,
              custom: {
                user_id: user.id,
                plan_type: body.plan_type,
                ...customData,
              },
            },
            product_options: {
              redirect_url: body.redirect_url,
            },
          },
          relationships: {
            store: {
              data: { type: "stores", id: LEMON_SQUEEZY_STORE_ID },
            },
            variant: {
              data: { type: "variants", id: body.variant_id },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      return jsonResponse({ error: "Failed to create checkout", details }, 502);
    }

    const payload = await response.json();
    const checkoutUrl = payload?.data?.attributes?.url;

    if (!checkoutUrl) {
      return jsonResponse({ error: "Checkout URL missing from Lemon Squeezy response" }, 502);
    }

    return jsonResponse({ checkout_url: checkoutUrl }, 200);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      400,
    );
  }
});
