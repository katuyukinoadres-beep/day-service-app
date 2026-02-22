import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const session = request.cookies.get("admin_session");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const supabase = createAdminClient();

  switch (type) {
    case "stats": {
      const [
        { count: totalFacilities },
        { count: totalUsers },
        { count: totalChildren },
        { count: totalRecords },
      ] = await Promise.all([
        supabase.from("facilities").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("children").select("*", { count: "exact", head: true }),
        supabase.from("daily_records").select("*", { count: "exact", head: true }),
      ]);

      const today = new Date().toISOString().split("T")[0];
      const { count: recordsToday } = await supabase
        .from("daily_records")
        .select("*", { count: "exact", head: true })
        .eq("date", today);

      const { data: todayRecords } = await supabase
        .from("daily_records")
        .select("facility_id")
        .eq("date", today);
      const facilitiesWithActivityToday = new Set(todayRecords?.map((r) => r.facility_id)).size;

      return NextResponse.json({
        total_facilities: totalFacilities ?? 0,
        total_users: totalUsers ?? 0,
        total_children: totalChildren ?? 0,
        total_records: totalRecords ?? 0,
        records_today: recordsToday ?? 0,
        facilities_with_activity_today: facilitiesWithActivityToday,
      });
    }

    case "recent-records": {
      const { data } = await supabase
        .from("daily_records")
        .select("*, children(name)")
        .order("created_at", { ascending: false })
        .limit(10);
      return NextResponse.json(data ?? []);
    }

    case "facilities": {
      const { data: facilities } = await supabase
        .from("facilities")
        .select("*")
        .order("created_at", { ascending: false });

      if (!facilities) return NextResponse.json([]);

      const withCounts = await Promise.all(
        facilities.map(async (facility) => {
          const [{ count: staffCount }, { count: childrenCount }] = await Promise.all([
            supabase.from("profiles").select("*", { count: "exact", head: true }).eq("facility_id", facility.id),
            supabase.from("children").select("*", { count: "exact", head: true }).eq("facility_id", facility.id),
          ]);
          return { ...facility, staffCount: staffCount ?? 0, childrenCount: childrenCount ?? 0 };
        })
      );
      return NextResponse.json(withCounts);
    }

    case "users": {
      const { data } = await supabase
        .from("profiles")
        .select("*, facilities(name)")
        .order("created_at", { ascending: false });
      return NextResponse.json(data ?? []);
    }

    case "records": {
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");
      let query = supabase.from("daily_records").select("id, child_id, facility_id");
      if (startDate) query = query.gte("date", startDate);
      if (endDate) query = query.lte("date", endDate);
      const { data } = await query;
      return NextResponse.json(data ?? []);
    }

    case "facilities-names": {
      const ids = searchParams.get("ids")?.split(",") ?? [];
      if (ids.length === 0) return NextResponse.json([]);
      const { data } = await supabase.from("facilities").select("id, name").in("id", ids);
      return NextResponse.json(data ?? []);
    }

    case "facility": {
      const id = searchParams.get("id");
      if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

      const [{ data: facility }, { count: staffCount }, { count: childrenCount }, { count: recordsCount }] =
        await Promise.all([
          supabase.from("facilities").select("*").eq("id", id).single(),
          supabase.from("profiles").select("*", { count: "exact", head: true }).eq("facility_id", id),
          supabase.from("children").select("*", { count: "exact", head: true }).eq("facility_id", id),
          supabase.from("daily_records").select("*", { count: "exact", head: true }).eq("facility_id", id),
        ]);

      return NextResponse.json({ facility, staffCount: staffCount ?? 0, childrenCount: childrenCount ?? 0, recordsCount: recordsCount ?? 0 });
    }

    case "facility-children": {
      const facilityId = searchParams.get("facilityId");
      if (!facilityId) return NextResponse.json([]);
      const { data } = await supabase.from("children").select("*").eq("facility_id", facilityId).order("name_kana");
      return NextResponse.json(data ?? []);
    }

    case "facility-records": {
      const facilityId = searchParams.get("facilityId");
      if (!facilityId) return NextResponse.json([]);
      const { data } = await supabase
        .from("daily_records")
        .select("*, children(name)")
        .eq("facility_id", facilityId)
        .order("date", { ascending: false })
        .limit(50);
      return NextResponse.json(data ?? []);
    }

    case "facility-staff": {
      const facilityId = searchParams.get("facilityId");
      if (!facilityId) return NextResponse.json([]);
      const { data } = await supabase.from("profiles").select("*").eq("facility_id", facilityId).order("created_at");
      return NextResponse.json(data ?? []);
    }

    default:
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const session = request.cookies.get("admin_session");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const supabase = createAdminClient();

  switch (type) {
    case "create-facility": {
      const body = await request.json();
      const { data, error } = await supabase.from("facilities").insert({
        name: body.name,
        plan: body.plan ?? "free",
        notes: body.notes ?? null,
      }).select().single();

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json(data);
    }

    case "update-facility": {
      const body = await request.json();
      const { error } = await supabase
        .from("facilities")
        .update({ name: body.name, plan: body.plan, notes: body.notes, is_active: body.is_active })
        .eq("id", body.id);

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    default:
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
}
