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

async function updateEndUserSubscription(
  supabase: ReturnType<typeof getServiceClient>,
  userId: string,
  customerId: string,
  subscriptionId: string,
  endsAt: string | null,
) {
  const { error } = await supabase
    .from("end_user_profiles")
    .update({
      subscription_plan: "paid",
      subscription_status: "active",
      lemon_squeezy_customer_id: customerId,
      lemon_squeezy_subscription_id: subscriptionId,
      subscription_started_at: new Date().toISOString(),
      subscription_ends_at: endsAt,
    })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }

  const { error: cardError } = await supabase.rpc("create_membership_card", {
    p_user_id: userId,
  });

  if (cardError) {
    throw new Error(cardError.message);
  }
}

async function updateBusinessSubscription(
  supabase: ReturnType<typeof getServiceClient>,
  businessId: string,
  customerId: string,
  subscriptionId: string,
  endsAt: string | null,
) {
  const { error } = await supabase
    .from("businesses")
    .update({
      subscription_status: "active",
      is_active: true,
      one_time_fee_paid: true,
      lemon_squeezy_customer_id: customerId,
      lemon_squeezy_subscription_id: subscriptionId,
      subscription_started_at: new Date().toISOString(),
      subscription_ends_at: endsAt,
    })
    .eq("id", businessId);

  if (error) {
    throw new Error(error.message);
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
    const attrs = event?.data?.attributes ?? {};
    const resourceId = event?.data?.id ? String(event.data.id) : null;
    const customData = event?.meta?.custom_data ?? {};

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
      case "subscription_created": {
        const userId = String(customData.user_id ?? "");
        const planType = String(customData.plan_type ?? "");
        const customerId = String(attrs.customer_id ?? "");
        const subscriptionId = resourceId ?? "";
        const endsAt = attrs.renews_at ?? null;

        if (planType === "end_user" && userId) {
          await updateEndUserSubscription(supabase, userId, customerId, subscriptionId, endsAt);
        } else if (planType === "business") {
          const businessId = String(customData.business_id ?? "");
          if (!businessId) {
            throw new Error("business_id missing from custom_data");
          }

          await updateBusinessSubscription(
            supabase,
            businessId,
            customerId,
            subscriptionId,
            endsAt,
          );
        }
        break;
      }

      case "subscription_updated": {
        const status = mapLsStatus(String(attrs.status ?? "active"));
        const endsAt = attrs.ends_at ?? attrs.renews_at ?? null;
        const subscriptionId = resourceId ?? "";

        const { data: endUser } = await supabase
          .from("end_user_profiles")
          .select("id")
          .eq("lemon_squeezy_subscription_id", subscriptionId)
          .maybeSingle();

        if (endUser) {
          const updates: Record<string, unknown> = {
            subscription_status: status,
            subscription_ends_at: endsAt,
          };

          if (status === "cancelled" || status === "expired") {
            updates.subscription_plan = "free";
          }

          const { error } = await supabase
            .from("end_user_profiles")
            .update(updates)
            .eq("id", endUser.id);

          if (error) {
            throw new Error(error.message);
          }
        } else {
          const { data: business } = await supabase
            .from("businesses")
            .select("id")
            .eq("lemon_squeezy_subscription_id", subscriptionId)
            .maybeSingle();

          if (business) {
            const updates: Record<string, unknown> = {
              subscription_status: status,
              subscription_ends_at: endsAt,
            };

            if (status === "expired") {
              updates.is_active = false;
            }

            const { error } = await supabase
              .from("businesses")
              .update(updates)
              .eq("id", business.id);

            if (error) {
              throw new Error(error.message);
            }
          }
        }
        break;
      }

      case "subscription_payment_success": {
        const subscriptionId = String(attrs.subscription_id ?? resourceId ?? "");
        const endsAt = attrs.renews_at ?? null;

        const { error: userError } = await supabase
          .from("end_user_profiles")
          .update({
            subscription_status: "active",
            subscription_ends_at: endsAt,
          })
          .eq("lemon_squeezy_subscription_id", subscriptionId);

        if (userError) {
          throw new Error(userError.message);
        }

        const { error: businessError } = await supabase
          .from("businesses")
          .update({
            subscription_status: "active",
            subscription_ends_at: endsAt,
          })
          .eq("lemon_squeezy_subscription_id", subscriptionId);

        if (businessError) {
          throw new Error(businessError.message);
        }
        break;
      }

      case "subscription_payment_failed": {
        const subscriptionId = String(attrs.subscription_id ?? resourceId ?? "");

        const { error: userError } = await supabase
          .from("end_user_profiles")
          .update({ subscription_status: "past_due" })
          .eq("lemon_squeezy_subscription_id", subscriptionId);

        if (userError) {
          throw new Error(userError.message);
        }

        const { error: businessError } = await supabase
          .from("businesses")
          .update({ subscription_status: "past_due" })
          .eq("lemon_squeezy_subscription_id", subscriptionId);

        if (businessError) {
          throw new Error(businessError.message);
        }
        break;
      }

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
