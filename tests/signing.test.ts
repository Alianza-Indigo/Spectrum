import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-para-firma-de-tokens";
});

describe("Firma de tokens (enlaces firmados y expirables)", () => {
  it("firma y verifica un token vigente", async () => {
    const { signToken, verifyToken } = await import("@/lib/signing");
    const token = await signToken({ objectId: "abc", organizationId: "org1" }, 60);
    const payload = await verifyToken<{ objectId: string; organizationId: string }>(token);
    expect(payload?.objectId).toBe("abc");
    expect(payload?.organizationId).toBe("org1");
  });

  it("rechaza un token expirado", async () => {
    const { signToken, verifyToken } = await import("@/lib/signing");
    const token = await signToken({ objectId: "x" }, -10);
    expect(await verifyToken(token)).toBeNull();
  });

  it("rechaza un token manipulado", async () => {
    const { signToken, verifyToken } = await import("@/lib/signing");
    const token = await signToken({ objectId: "x" }, 60);
    const tampered = token.slice(0, -3) + "abc";
    expect(await verifyToken(tampered)).toBeNull();
  });
});
