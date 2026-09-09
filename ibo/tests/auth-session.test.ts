import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn(), cookies: vi.fn() }));
vi.mock("../lib/db", () => ({ get: mocks.get }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
import { createSession, getSessionUser } from "../lib/auth";

describe("sessões de usuários removidos", () => {
  beforeEach(() => vi.resetAllMocks());

  it("rejeita JWT válido quando a conta não está mais ativa", async () => {
    const token = await createSession(11);
    mocks.cookies.mockResolvedValue({ get: () => ({ value: token }) });
    mocks.get.mockResolvedValue(undefined);
    expect(await getSessionUser()).toBeNull();
    expect(mocks.get).toHaveBeenCalledWith(expect.stringContaining("deleted_at IS NULL"), [11]);
  });

  it("mantém a sessão de uma conta ativa", async () => {
    const token = await createSession(1);
    mocks.cookies.mockResolvedValue({ get: () => ({ value: token }) });
    const user = { id: 1, role: "admin" };
    mocks.get.mockResolvedValue(user);
    expect(await getSessionUser()).toEqual(user);
  });
});
