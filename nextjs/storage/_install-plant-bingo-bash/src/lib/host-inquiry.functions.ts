import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const hostInquirySchema = (data: unknown) => {
  const d = data as Record<string, unknown>;
  const errors: Record<string, string> = {};
  if (!d.name || typeof d.name !== "string" || d.name.trim().length < 2) {
    errors.name = "Name is required";
  }
  if (!d.email || typeof d.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
    errors.email = "Valid email is required";
  }
  if (!d.facilityName || typeof d.facilityName !== "string" || d.facilityName.trim().length < 2) {
    errors.facilityName = "Facility name is required";
  }
  if (!d.facilityType || typeof d.facilityType !== "string" || d.facilityType.trim().length < 1) {
    errors.facilityType = "Facility type is required";
  }
  if (!d.city || typeof d.city !== "string" || d.city.trim().length < 2) {
    errors.city = "City is required";
  }
  if (!d.state || typeof d.state !== "string" || d.state.trim().length < 2) {
    errors.state = "State is required";
  }
  if (d.message && typeof d.message === "string" && d.message.length > 2000) {
    errors.message = "Message must be under 2000 characters";
  }
  if (Object.keys(errors).length > 0) {
    throw new Error(JSON.stringify(errors));
  }
  return data as {
    name: string;
    email: string;
    phone?: string;
    facilityName: string;
    facilityType: string;
    city: string;
    state: string;
    estimatedGuests?: string;
    preferredDate?: string;
    message?: string;
  };
};

export const submitHostInquiry = createServerFn({ method: "POST" })
  .inputValidator(hostInquirySchema)
  .handler(async ({ data }) => {
    const supabasePublic = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { error } = await supabasePublic.from("host_inquiries").insert({
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim() || null,
      facility_name: data.facilityName.trim(),
      facility_type: data.facilityType.trim(),
      city: data.city.trim(),
      state: data.state.trim(),
      estimated_guests: data.estimatedGuests?.trim() || null,
      preferred_date: data.preferredDate?.trim() || null,
      message: data.message?.trim() || null,
    });

    if (error) {
      console.error("Host inquiry insert error:", error);
      throw new Error("Failed to submit inquiry. Please try again.");
    }

    return { success: true };
  });
