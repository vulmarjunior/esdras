import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getTree } from "@/lib/data";
import { buildReview } from "@/lib/review-core";
import { originalPositions } from "@/lib/review-original";
import { StatuteReview } from "@/components/review/statute-review";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.must_change_password) redirect("/trocar-senha");
  const rows = buildReview(await getTree(), originalPositions);
  return <StatuteReview rows={rows} />;
}
