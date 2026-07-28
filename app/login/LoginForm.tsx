"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Invalid credentials.");
        setLoading(false);
        return;
      }

      router.push("/chat");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }
 
  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-2xl shadow-black/40">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border text-accent">
          <Lock size={20} />
        </div>
        <h1 className="text-lg font-semibold text-foreground">Private Access</h1>
        <p className="text-sm text-muted">Enter the password to continue.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent/60"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
  type="submit"
  disabled={false}
  onClick={() => {
    console.log("Botão clicado!");
    console.log({
      password,
      length: password.length,
      loading,
    });
  }}
  className="mt-1 w-full rounded-xl border border-accent/60 bg-canvas px-4 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent hover:text-canvas"
>
  {loading ? "Verifying…" : "Continue"}
</button>
      </form>
    </div>
  );
}
