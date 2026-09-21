import { redirect } from "next/navigation";
import Link from "next/link";
import { BookMarked, ChevronRight } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateUserForm, UserRow } from "@/components/admin/users-admin";
import type { User } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/");

  const users = await all<User>("SELECT id, name, email, role, phone, must_change_password, created_at FROM users WHERE deleted_at IS NULL ORDER BY name");
  const adminCount = users.filter((u) => u.role === "admin").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Administração</h2>
        <p className="text-sm text-muted-foreground">
          Usuários da comissão ({users.length}). Sem cadastro público — usuários são cadastrados aqui.
        </p>
      </div>

      <Link href="/admin/literatura" className="block">
        <Card className="transition-colors hover:bg-muted/50">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookMarked className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Biblioteca de literatura</p>
              <p className="text-xs text-muted-foreground">
                Adicionar, editar e reimportar livros doutrinários (MD, TXT, EPUB) usados na consulta e na IA.
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cadastrar usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateUserForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {users.map((u) => (
              <UserRow key={u.id} u={u} canDelete={adminCount > 1 || u.role !== "admin"} />
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
