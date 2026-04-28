import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const DEMO_ACCOUNTS = [
  { username: "camila", label: "Camila Restrepo" },
  { username: "daniel", label: "Daniel Park" },
  { username: "sara",   label: "Sara Gómez" },
];

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate("/");
    } catch {
      setError("Usuario o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  }

  async function loginAs(alias: string) {
    setError(null);
    setLoading(true);
    try {
      await login(alias, alias);
      navigate("/");
    } catch {
      setError("Error al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "#FAF6F0" }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div
            className="w-10 h-10 rounded-md flex items-center justify-center"
            style={{ background: "#1C1917" }}
          >
            <span className="font-serif text-[22px] leading-none" style={{ color: "#FAF6F0", fontStyle: "italic" }}>
              l
            </span>
          </div>
          <div>
            <div className="font-serif text-[22px] font-medium" style={{ color: "#1C1917", letterSpacing: "-0.01em" }}>
              Lantern
            </div>
            <div className="font-sans text-[11px] uppercase tracking-[0.14em]" style={{ color: "#78716C" }}>
              Philadelphia
            </div>
          </div>
        </div>

        <h1 className="font-serif text-[32px] leading-tight mb-1" style={{ color: "#1C1917", letterSpacing: "-0.025em" }}>
          Sign in
        </h1>
        <p className="font-sans text-[14px] mb-8" style={{ color: "#78716C" }}>
          A good recommendation is one you can argue with.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-6">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            className="w-full font-sans text-[15px] px-4 py-3 rounded-lg outline-none"
            style={{
              background: "#FFFFFF",
              border: "1px solid #E7E5E4",
              color: "#1C1917",
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full font-sans text-[15px] px-4 py-3 rounded-lg outline-none"
            style={{
              background: "#FFFFFF",
              border: "1px solid #E7E5E4",
              color: "#1C1917",
            }}
          />
          {error && (
            <p className="font-sans text-[13px]" style={{ color: "#E7000B" }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full font-sans text-[15px] font-medium py-3 rounded-lg transition-opacity"
            style={{
              background: "#1C1917",
              color: "#FAF6F0",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {/* Demo accounts */}
        <div className="mb-6">
          <div
            className="font-sans text-[11px] uppercase tracking-[0.12em] mb-3 text-center"
            style={{ color: "#A8A29E" }}
          >
            Demo accounts
          </div>
          <div className="flex gap-2">
            {DEMO_ACCOUNTS.map(({ username: alias, label }) => (
              <button
                key={alias}
                onClick={() => loginAs(alias)}
                disabled={loading}
                className="flex-1 font-sans text-[13px] py-2 rounded-lg transition-colors"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E7E5E4",
                  color: "#1C1917",
                }}
              >
                {label.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Guest */}
        <div className="text-center">
          <Link
            to="/"
            className="font-sans text-[13px] underline"
            style={{ color: "#78716C" }}
          >
            Continue as guest
          </Link>
        </div>
      </div>
    </div>
  );
}
