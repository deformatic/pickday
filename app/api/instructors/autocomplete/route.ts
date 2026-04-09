import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { instructorAutocompleteQuerySchema } from "@/lib/validation/routes";

type InstructorSuggestion = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsedQuery = instructorAutocompleteQuerySchema.safeParse({
      q: searchParams.get("q") ?? "",
    });

    if (!parsedQuery.success) {
      return NextResponse.json({ error: "Invalid autocomplete query" }, { status: 400 });
    }

    const { q: query } = parsedQuery.data;

    if (query.length < 2) {
      return NextResponse.json([]);
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("instructor_identities")
      .select("id, name, email, phone")
      .ilike("name", `%${query}%`)
      .limit(5)
      .returns<InstructorSuggestion[]>();

    if (error) {
      return NextResponse.json({ error: "Failed to load instructor suggestions" }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
