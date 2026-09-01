import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET || "esdras-dev-secret-nao-use-em-producao"
);
const SESSION_COOKIE = "esdras_session";
const PROTECTED_PREFIXES = ["/dispositivo", "/reunioes", "/pendentes", "/consolidado", "/relatorios", "/auditoria", "/admin"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;

  const isProtected = pathname === "/" || PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isLogin = pathname === "/login";

  let authed = false;
  if (token) {
    try {
      await jwtVerify(token, secret);
      authed = true;
    } catch {
      authed = false;
    }
  }

  if (isProtected && !authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (isLogin && authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/dispositivo/:path*", "/reunioes/:path*", "/pendentes", "/consolidado", "/relatorios", "/auditoria", "/admin"],
};
