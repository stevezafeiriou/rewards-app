import { createClient } from "npm:@supabase/supabase-js@2";
import { handleOptions, jsonResponse } from "../_shared/http.ts";

type PurchaseType = "subscription" | "card_fee" | "tx_pack";
type Audience = "end_user" | "business";

interface CheckoutRequest {
  target_code: string;
  purchase_type: PurchaseType;
  redirect_url: string;
  business_id?: string;
}

interface CheckoutTarget {
  audience: Audience;
  variantId: string;
  custom: Record<string, string>;
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
  if (!body.target_code) {
    throw new Error("target_code is required");
  }

  if (!["subscription", "card_fee", "tx_pack"].includes(body.purchase_type)) {
    throw new Error("purchase_type is invalid");
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
    throw new Error("business_id is required");
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

async function resolveSubscriptionTarget(
  supabase: ReturnType<typeof getServiceClient>,
  targetCode: string,
) {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("plan_code,audience,lemon_squeezy_variant_id,is_active")
    .eq("plan_code", targetCode)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Subscription plan not found");

  return {
    audience: data.audience as Audience,
    variantId: data.lemon_squeezy_variant_id,
  };
}

async function resolveBillingProductTarget(
  supabase: ReturnType<typeof getServiceClient>,
  request: CheckoutRequest,
) {
  const expectedKind = request.purchase_type === "card_fee" ? "card_fee" : "tx_pack";
  const { data: product, error } = await supabase
    .from("billing_products")
    .select("product_code,audience,kind,linked_plan_code,lemon_squeezy_variant_id,is_active")
    .eq("kind", expectedKind)
    .eq("product_code", request.target_code)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!product) throw new Error("One-time product not found");

  return {
    audience: product.audience as Audience,
    variantId: product.lemon_squeezy_variant_id,
  };
}

async function assertCardFeeEligibility(
  supabase: ReturnType<typeof getServiceClient>,
  userId: string,
) {
  const { data: profile, error } = await supabase
    .from("end_user_profiles")
    .select("subscription_tier,card_fee_paid_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!profile) throw new Error("Member profile not found");
  if (profile.subscription_tier !== "end_user_plus") {
    throw new Error("Physical card fee is available only for end-user Plus");
  }
  if (profile.card_fee_paid_at) {
    throw new Error("Physical card fee has already been paid");
  }
}

async function resolveTarget(
  supabase: ReturnType<typeof getServiceClient>,
  userId: string,
  body: CheckoutRequest,
): Promise<CheckoutTarget> {
  if (body.purchase_type === "subscription") {
    const plan = await resolveSubscriptionTarget(supabase, body.target_code);
    if (plan.audience === "business") {
      await assertBusinessAccess(supabase, userId, body.business_id);
    }

    return {
      audience: plan.audience,
      variantId: plan.variantId,
      custom: {
        target_code: body.target_code,
        purchase_type: body.purchase_type,
        audience: plan.audience,
      },
    };
  }

  const product = await resolveBillingProductTarget(supabase, body);

  if (product.audience === "business") {
    await assertBusinessAccess(supabase, userId, body.business_id);
  }

  if (body.purchase_type === "card_fee") {
    await assertCardFeeEligibility(supabase, userId);
  }

  return {
    audience: product.audience,
    variantId: product.variantId,
    custom: {
      target_code: body.target_code,
      purchase_type: body.purchase_type,
      audience: product.audience,
    },
  };
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

    const target = await resolveTarget(supabase, user.id, body);
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
                business_id: body.business_id ?? "",
                ...target.custom,
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
              data: { type: "variants", id: target.variantId },
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

    return jsonResponse(
      {
        checkout_url: checkoutUrl,
        purchase_type: body.purchase_type,
        target_code: body.target_code,
      },
      200,
    );
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      400,
    );
  }
});
