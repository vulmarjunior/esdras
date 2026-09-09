import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { SignJWT } from "jose";
import { proxy } from "../proxy";

describe("recuperação de sessão removida", () => {
  it.each([0, 1])("permite acessar login com cookie antigo mc=%s", async (mc) => {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "esdras-dev-secret-nao-use-em-producao");
    const token = await new SignJWT({ sub: "11", mc }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("1h").sign(secret);
    const res = await proxy(new NextRequest("https://example.com/login", { headers: { cookie: `esdras_session=${token}` } }));
    expect(res.headers.get("location")).toBeNull();
  });

  it("continua protegendo páginas sem sessão", async () => {
    const res = await proxy(new NextRequest("https://example.com/admin"));
    expect(res.headers.get("location")).toBe("https://example.com/login");
  });
});
