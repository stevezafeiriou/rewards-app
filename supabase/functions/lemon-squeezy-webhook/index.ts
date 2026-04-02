import { createClient } from "npm:@supabase/supabase-js@2";
import { handleOptions, jsonResponse } from "../_shared/http.ts";

const WEBHOOK_SECRET = Deno.env.get("LEMON_SQUEEZY_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

type SubscriptionStatus =
  | "none"
  | "active"
  | "past_due"
  | "paused"
  | "cancelled"
  | "expired";

type PurchaseType = "subscription" | "card_fee" | "tx_pack";

function getServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function assertEnv() {
  const missing = [
    ["LEMON_SQUEEZY_WEBHOOK_SECRET", WEBHOOK_SECRET],
    ["SUPABASE_URL", SUPABASE_URL],
    ["SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY],
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    throw new Error(`Missing function secrets: ${missing.map(([name]) => name).join(", ")}`);
  }
}

async function signPayload(payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function verifySignature(payload: string, signature: string) {
  return (await signPayload(payload)) === signature;
}

async function hashPayload(payload: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function mapLsStatus(lsStatus: string): SubscriptionStatus {
  const mapping: Record<string, SubscriptionStatus> = {
    active: "active",
    past_due: "past_due",
    paused: "paused",
    cancelled: "cancelled",
    expired: "expired",
    unpaid: "past_due",
  };

  return mapping[lsStatus] ?? "active";
}

function getCustomData(event: any) {
  return event?.meta?.custom_data ?? event?.meta?.custom ?? {};
}

async function markEventProcessed(
  supabase: ReturnType<typeof getServiceClient>,
  eventId: string,
  eventName: string,
  resourceId: string | null,
  payload: unknown,
) {
  const { error } = await supabase.from("lemon_squeezy_webhook_events").insert({
    event_id: eventId,
    event_name: eventName,
    resource_id: resourceId,
    payload,
  });

  if (!error) {
    return true;
  }

  if (error.code === "23505") {
    return false;
  }

  throw new Error(error.message);
}

async function createMembershipCardIfNeeded(
  supabase: ReturnType<typeof getServiceClient>,
  userId: string,
) {
  const { data: existingCard, error: existingCardError } = await supabase
    .from("membership_cards")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["pending_production", "printed", "shipped", "active"])
    .limit(1)
    .maybeSingle();

  if (existingCardError) {
    throw new Error(existingCardError.message);
  }

  if (existingCard?.id) return;

  const { error } = await supabase.rpc("create_membership_card", {
    p_user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function syncBusinessActivationState(
  supabase: ReturnType<typeof getServiceClient>,
  businessId: string,
) {
  const { data: business, error } = await supabase
    .from("businesses")
    .select("subscription_status,setup_fee_paid_at")
    .eq("id", businessId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!business) return;

  const shouldBeActive =
    business.subscription_status === "active" && business.setup_fee_paid_at !== null;

  const { error: updateError } = await supabase
    .from("businesses")
    .update({ is_active: shouldBeActive })
    .eq("id", businessId);

  if (updateError) throw new Error(updateError.message);
}

async function createNotificationIfEnabled(
  supabase: ReturnType<typeof getServiceClient>,
  userId: string,
  category: "billing" | "support" | "product",
  title: string,
  body: string,
  metadata: Record<string, unknown> = {},
) {
  const { data: prefs, error: prefsError } = await supabase
    .from("user_notification_preferences")
    .select("in_app_support_updates,in_app_billing_updates,in_app_product_updates")
    .eq("user_id", userId)
    .maybeSingle();

  if (prefsError) {
    throw new Error(prefsError.message);
  }

  const enabled =
    category === "support"
      ? (prefs?.in_app_support_updates ?? true)
      : category === "billing"
        ? (prefs?.in_app_billing_updates ?? true)
        : (prefs?.in_app_product_updates ?? true);

  if (!enabled) return;

  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    title,
    body,
    type: "system",
    metadata: {
      ...metadata,
      notification_category: category,
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function notifyBusinessOwnerBilling(
  supabase: ReturnType<typeof getServiceClient>,
  businessId: string,
  title: string,
  body: string,
  metadata: Record<string, unknown> = {},
) {
  const { data: business, error } = await supabase
    .from("businesses")
    .select("owner_id")
    .eq("id", businessId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!business?.owner_id) return;

  await createNotificationIfEnabled(
    supabase,
    business.owner_id,
    "billing",
    title,
    body,
    metadata,
  );
}

async function handleOrderCreated(
  supabase: ReturnType<typeof getServiceClient>,
  attrs: Record<string, unknown>,
  resourceId: string | null,
  customData: Record<string, string>,
) {
  const purchaseType = String(customData.purchase_type ?? "") as PurchaseType;
  const targetCode = String(customData.target_code ?? "");
  const userId = String(customData.user_id ?? "");
  const businessId = String(customData.business_id ?? "");
  const orderId = resourceId ?? String(attrs.identifier ?? "");

  if (purchaseType === "card_fee") {
    if (!userId) throw new Error("user_id missing from card fee order");

    const { error } = await supabase
      .from("end_user_profiles")
      .update({
        card_fee_paid_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) throw new Error(error.message);

    await createMembershipCardIfNeeded(supabase, userId);
    return;
  }

  if (purchaseType === "tx_pack") {
    if (!businessId) throw new Error("business_id missing from TX pack order");

    const { data: product, error: productError } = await supabase
      .from("billing_products")
      .select("credit_amount")
      .eq("product_code", targetCode)
      .maybeSingle();

    if (productError) throw new Error(productError.message);
    if (!product) throw new Error("Billing product not found");

    const { error } = await supabase.from("business_tx_credit_ledger").insert({
      business_id: businessId,
      credits_delta: product.credit_amount,
      source_type: "purchase",
      source_ref: orderId,
      metadata: {
        target_code: targetCode,
        order_id: orderId,
      },
    });

    if (error) throw new Error(error.message);

    await notifyBusinessOwnerBilling(
      supabase,
      businessId,
      "Extra transaction pack added",
      `An extra transaction pack was added to your business balance.`,
      { business_id: businessId, order_id: orderId, target_code: targetCode },
    );
  }
}

async function updateEndUserSubscription(
  supabase: ReturnType<typeof getServiceClient>,
  userId: string,
  targetCode: string,
  customerId: string,
  subscriptionId: string,
  endsAt: string | null,
  status: SubscriptionStatus,
) {
  const tier = targetCode || "end_user_plus";
  const isPro = tier === "end_user_pro";

  const { error } = await supabase
    .from("end_user_profiles")
    .update({
      subscription_tier: tier,
      subscription_status: status,
      lemon_squeezy_customer_id: customerId,
      lemon_squeezy_subscription_id: subscriptionId,
      subscription_started_at: new Date().toISOString(),
      subscription_ends_at: endsAt,
      card_included_by_plan: isPro,
    })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }

  if (isPro && status === "active") {
    await createMembershipCardIfNeeded(supabase, userId);
  }
}

async function updateBusinessSubscription(
  supabase: ReturnType<typeof getServiceClient>,
  businessId: string,
  targetCode: string,
  customerId: string,
  subscriptionId: string,
  endsAt: string | null,
  status: SubscriptionStatus,
) {
  const { data: existingBusiness, error: existingBusinessError } = await supabase
    .from("businesses")
    .select("setup_fee_paid_at")
    .eq("id", businessId)
    .maybeSingle();

  if (existingBusinessError) {
    throw new Error(existingBusinessError.message);
  }

  const { error } = await supabase
    .from("businesses")
    .update({
      subscription_tier: targetCode || "business_plus",
      subscription_status: status,
      setup_fee_paid_at: existingBusiness?.setup_fee_paid_at ?? new Date().toISOString(),
      lemon_squeezy_customer_id: customerId,
      lemon_squeezy_subscription_id: subscriptionId,
      subscription_started_at: new Date().toISOString(),
      subscription_ends_at: endsAt,
    })
    .eq("id", businessId);

  if (error) {
    throw new Error(error.message);
  }

  await syncBusinessActivationState(supabase, businessId);
}

async function handleSubscriptionCreatedOrUpdated(
  supabase: ReturnType<typeof getServiceClient>,
  attrs: Record<string, any>,
  resourceId: string | null,
  customData: Record<string, string>,
  overrideStatus?: SubscriptionStatus,
) {
  const purchaseType = String(customData.purchase_type ?? "subscription") as PurchaseType;
  if (purchaseType !== "subscription") return;

  const audience = String(customData.audience ?? "");
  const targetCode = String(customData.target_code ?? "");
  const userId = String(customData.user_id ?? "");
  const businessId = String(customData.business_id ?? "");
  const customerId = String(attrs.customer_id ?? "");
  const subscriptionId = resourceId ?? String(attrs.subscription_id ?? "");
  const endsAt = (attrs.ends_at ?? attrs.renews_at ?? null) as string | null;
  const status = overrideStatus ?? mapLsStatus(String(attrs.status ?? "active"));

  if (audience === "end_user") {
    if (!userId) throw new Error("user_id missing from end-user subscription");
    await updateEndUserSubscription(
      supabase,
      userId,
      targetCode,
      customerId,
      subscriptionId,
      endsAt,
      status,
    );
    return;
  }

  if (!businessId) throw new Error("business_id missing from business subscription");

  await updateBusinessSubscription(
    supabase,
    businessId,
    targetCode,
    customerId,
    subscriptionId,
    endsAt,
    status,
  );

  const title =
    status === "active" ? "Business subscription activated" : "Business subscription updated";
  const body =
    status === "active"
      ? "Your business subscription is now active."
      : `Your business subscription status is now ${status}.`;

  await notifyBusinessOwnerBilling(
    supabase,
    businessId,
    title,
    body,
    { business_id: businessId, status, target_code: targetCode },
  );
}

async function handleSubscriptionPaymentSuccess(
  supabase: ReturnType<typeof getServiceClient>,
  attrs: Record<string, any>,
) {
  const subscriptionId = String(attrs.subscription_id ?? attrs.id ?? "");
  const endsAt = (attrs.renews_at ?? null) as string | null;

  const { data: endUser } = await supabase
    .from("end_user_profiles")
    .select("id,subscription_tier")
    .eq("lemon_squeezy_subscription_id", subscriptionId)
    .maybeSingle();

  if (endUser?.id) {
    const { error } = await supabase
      .from("end_user_profiles")
      .update({
        subscription_status: "active",
        subscription_ends_at: endsAt,
        card_included_by_plan: endUser.subscription_tier === "end_user_pro",
      })
      .eq("id", endUser.id);

    if (error) throw new Error(error.message);

    if (endUser.subscription_tier === "end_user_pro") {
      await createMembershipCardIfNeeded(supabase, endUser.id);
    }
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("lemon_squeezy_subscription_id", subscriptionId)
    .maybeSingle();

  if (business?.id) {
    const { data: existingBusiness, error: existingBusinessError } = await supabase
      .from("businesses")
      .select("setup_fee_paid_at")
      .eq("id", business.id)
      .maybeSingle();

    if (existingBusinessError) throw new Error(existingBusinessError.message);

    const { error } = await supabase
      .from("businesses")
      .update({
        subscription_status: "active",
        setup_fee_paid_at: existingBusiness?.setup_fee_paid_at ?? new Date().toISOString(),
        subscription_ends_at: endsAt,
      })
      .eq("id", business.id);

    if (error) throw new Error(error.message);

    await syncBusinessActivationState(supabase, business.id);
    await notifyBusinessOwnerBilling(
      supabase,
      business.id,
      "Payment received",
      "Your business subscription payment was received successfully.",
      { business_id: business.id, status: "active" },
    );
  }
}

async function handleSubscriptionPaymentFailed(
  supabase: ReturnType<typeof getServiceClient>,
  attrs: Record<string, any>,
) {
  const subscriptionId = String(attrs.subscription_id ?? attrs.id ?? "");

  const { error: userError } = await supabase
    .from("end_user_profiles")
    .update({ subscription_status: "past_due" })
    .eq("lemon_squeezy_subscription_id", subscriptionId);

  if (userError) throw new Error(userError.message);

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("lemon_squeezy_subscription_id", subscriptionId)
    .maybeSingle();

  if (business?.id) {
    const { error } = await supabase
      .from("businesses")
      .update({ subscription_status: "past_due", is_active: false })
      .eq("id", business.id);

    if (error) throw new Error(error.message);

    await notifyBusinessOwnerBilling(
      supabase,
      business.id,
      "Payment failed",
      "Your latest business subscription payment failed and needs attention.",
      { business_id: business.id, status: "past_due" },
    );
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

    const rawBody = await req.text();
    const signature = req.headers.get("x-signature") ?? "";
    const isValid = await verifySignature(rawBody, signature);

    if (!isValid) {
      return jsonResponse({ error: "Invalid signature" }, 401);
    }

    const event = JSON.parse(rawBody);
    const eventName = String(event?.meta?.event_name ?? "");
    const attrs = (event?.data?.attributes ?? {}) as Record<string, any>;
    const resourceId = event?.data?.id ? String(event.data.id) : null;
    const customData = getCustomData(event) as Record<string, string>;

    if (!eventName) {
      return jsonResponse({ error: "event_name missing from webhook payload" }, 400);
    }

    const eventHash = await hashPayload(rawBody);
    const derivedEventId =
      event?.meta?.event_id ??
      event?.meta?.webhook_event_id ??
      `${eventName}:${resourceId ?? "unknown"}:${attrs.updated_at ?? attrs.created_at ?? eventHash}`;

    const supabase = getServiceClient();
    const inserted = await markEventProcessed(supabase, derivedEventId, eventName, resourceId, event);

    if (!inserted) {
      return jsonResponse({ received: true, duplicate: true }, 200);
    }

    switch (eventName) {
      case "order_created":
        await handleOrderCreated(supabase, attrs, resourceId, customData);
        break;
      case "subscription_created":
        await handleSubscriptionCreatedOrUpdated(supabase, attrs, resourceId, customData, "active");
        break;
      case "subscription_updated":
        await handleSubscriptionCreatedOrUpdated(supabase, attrs, resourceId, customData);
        break;
      case "subscription_expired":
        await handleSubscriptionCreatedOrUpdated(supabase, attrs, resourceId, customData, "expired");
        break;
      case "subscription_payment_success":
        await handleSubscriptionPaymentSuccess(supabase, attrs);
        break;
      case "subscription_payment_failed":
        await handleSubscriptionPaymentFailed(supabase, attrs);
        break;
      default:
        break;
    }

    return jsonResponse({ received: true }, 200);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      500,
    );
  }
});
