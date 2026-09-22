import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET || "esdras-dev-secret-nao-use-em-producao"
);
const SESSION_COOKIE = "esdras_session";
const PROTECTED_PREFIXES = ["/mesa-trabalho", "/revisao", "/dispositivo", "/reunioes", "/pendentes", "/consolidado", "/comparativo", "/relatorios", "/auditoria", "/admin", "/trocar-senha", "/guia-redacao", "/documentos", "/manual", "/literatura"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;

  const isProtected = pathname === "/" || PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isLogin = pathname === "/login";

  let authed = false;
  let mustChange = false;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret);
      authed = true;
      mustChange = payload.mc === 1;
    } catch {
      authed = false;
    }
  }

  if (isProtected && !authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  // O login deve continuar acessível quando o JWT pertence a uma conta removida.
  if (!isLogin && authed && mustChange && pathname !== "/trocar-senha") {
    const url = req.nextUrl.clone();
    url.pathname = "/trocar-senha";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/mesa-trabalho", "/revisao", "/dispositivo/:path*", "/reunioes/:path*", "/pendentes", "/consolidado", "/comparativo", "/relatorios", "/auditoria", "/admin", "/trocar-senha", "/guia-redacao", "/documentos", "/manual", "/literatura/:path*"],
};
