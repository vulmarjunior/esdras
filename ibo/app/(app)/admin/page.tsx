import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateUserForm, UserRow } from "@/components/admin/users-admin";
import type { User } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/");

  const users = await all<User>("SELECT id, name, email, role, phone, must_change_password, created_at FROM users ORDER BY name");
  const adminCount = users.filter((u) => u.role === "admin").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Administração</h2>
        <p className="text-sm text-muted-foreground">
          Usuários da comissão ({users.length}). Sem cadastro público — usuários são cadastrados aqui.
        </p>
      </div>

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
