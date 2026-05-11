import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name,     setName]     = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 4) {
      setError("La contraseña debe tener al menos 4 caracteres.");
      return;
    }
    setLoading(true);
    try {
      await register(username.trim(), password, name.trim());
      navigate("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg.includes("409") ? "Ese nombre de usuario ya existe." : "Error al crear la cuenta.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    background: "#FFFFFF",
    border: "1px solid #E7E5E4",
    color: "#1C1917",
  };

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
          Create account
        </h1>
        <p className="font-sans text-[14px] mb-8" style={{ color: "#78716C" }}>
          Join Lantern and get personalized picks.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-6">
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="w-full font-sans text-[15px] px-4 py-3 rounded-lg outline-none"
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            autoComplete="username"
            className="w-full font-sans text-[15px] px-4 py-3 rounded-lg outline-none"
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="w-full font-sans text-[15px] px-4 py-3 rounded-lg outline-none"
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            className="w-full font-sans text-[15px] px-4 py-3 rounded-lg outline-none"
            style={inputStyle}
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
            style={{ background: "#1C1917", color: "#FAF6F0", opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <div className="text-center">
          <Link
            to="/login"
            className="font-sans text-[13px] underline"
            style={{ color: "#78716C" }}
          >
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
