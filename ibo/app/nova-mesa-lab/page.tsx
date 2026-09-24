import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import ContinuousEditorLab from "@/components/nova-mesa-poc/continuous-editor-lab";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getSessionUser();
  if (!user || user.must_change_password) redirect("/login");
  return <ContinuousEditorLab />;
}
