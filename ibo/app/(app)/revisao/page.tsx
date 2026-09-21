import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getArvoreDaVersao } from "@/lib/data";
import { aplicarNumeracao, numerarArvore } from "@/lib/numeracao";
import { getVersaoTrabalho } from "@/lib/versao";
import { buildReview } from "@/lib/review-core";
import { originalPositions } from "@/lib/review-original";
import { StatuteReview } from "@/components/review/statute-review";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.must_change_password) redirect("/trocar-senha");

  const versao = await getVersaoTrabalho();
  const tree = await getArvoreDaVersao(versao);
  // Na proposta, os rótulos seguem a numeração derivada da ordem atual.
  const numerada = versao === "proposta" ? aplicarNumeracao(tree, numerarArvore(tree)) : tree;
  const rows = buildReview(numerada, originalPositions);
  return <StatuteReview rows={rows} versao={versao} />;
}
