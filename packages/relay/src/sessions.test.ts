import { describe, it, expect } from "vitest";
import { createSession, getSession, updateSession } from "./sessions.js";

function makeSession() {
  return createSession({
    providerId: "openai",
    deviceAuthId: `device-${Math.random()}`,
    userCode: "ABCD-1234",
    pollIntervalMs: 1000,
    expiresInMs: 5 * 60 * 1000,
  });
}

describe("updateSession terminal-state guard", () => {
  it("applies non-terminal patches while pending", () => {
    const s = makeSession();
    const ok = updateSession(s.id, { error: "transient" });
    expect(ok).toBe(true);
    expect(getSession(s.id)?.error).toBe("transient");
    expect(getSession(s.id)?.status).toBe("pending");
  });

  it("applies the first terminal transition", () => {
    const s = makeSession();
    const ok = updateSession(s.id, { status: "complete", jwt: "first" });
    expect(ok).toBe(true);
    expect(getSession(s.id)?.status).toBe("complete");
    expect(getSession(s.id)?.jwt).toBe("first");
  });

  it("refuses a second terminal patch once complete", () => {
    const s = makeSession();
    updateSession(s.id, { status: "complete", jwt: "first" });
    const ok = updateSession(s.id, { status: "error", error: "lost the race" });
    expect(ok).toBe(false);
    expect(getSession(s.id)?.status).toBe("complete");
    expect(getSession(s.id)?.jwt).toBe("first");
    expect(getSession(s.id)?.error).toBeUndefined();
  });

  it("refuses a complete patch after an error", () => {
    const s = makeSession();
    updateSession(s.id, { status: "error", error: "device denied" });
    const ok = updateSession(s.id, { status: "complete", jwt: "late-arrival" });
    expect(ok).toBe(false);
    expect(getSession(s.id)?.status).toBe("error");
    expect(getSession(s.id)?.error).toBe("device denied");
  });

  it("returns false for an unknown session id", () => {
    const ok = updateSession("does-not-exist", { status: "complete", jwt: "x" });
    expect(ok).toBe(false);
  });
});

describe("getSession expiry transition", () => {
  it("flips pending → expired when the deadline has passed", () => {
    const s = makeSession();
    // Backdate the session's expiry to the past — the next getSession call
    // should observe the pending-→-expired transition.
    const cur = getSession(s.id)!;
    cur.expiresAt = Date.now() - 1;
    const observed = getSession(s.id)!;
    expect(observed.status).toBe("expired");
  });

  it("does not flip a complete session to expired", () => {
    const s = makeSession();
    updateSession(s.id, { status: "complete", jwt: "ok" });
    const cur = getSession(s.id)!;
    cur.expiresAt = Date.now() - 1;
    const observed = getSession(s.id)!;
    expect(observed.status).toBe("complete");
  });
});
