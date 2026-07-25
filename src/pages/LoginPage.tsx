import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Lock, Shield, User, Wifi } from "lucide-react";
import Button from "@components/ui/Button";
import { api, type AuthUser } from "@lib/api";
import logo from "/images/toko-empati.png";

export default function LoginPage({
  onLoginSuccess,
}: {
  onLoginSuccess: (user: AuthUser) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // First-run setup mode
  const [setupMode, setSetupMode] = useState(false);
  const [setupName, setSetupName] = useState("");
  const [setupUsername, setSetupUsername] = useState("");
  const [setupPassword, setSetupPassword] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await api.login({ username, password });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      onLoginSuccess(result.user);
    } catch {
      setError("Gagal terhubung ke server. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await api.setup({
        name: setupName,
        username: setupUsername,
        password: setupPassword,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      onLoginSuccess(result.user);
    } catch {
      setError("Gagal terhubung ke server. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      {/* Background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-40">
        <div className="absolute -top-1/4 -right-1/4 h-[600px] w-[600px] rounded-full bg-emerald-500 opacity-20 blur-[120px]" />
        <div className="absolute -bottom-1/4 -left-1/4 h-[600px] w-[600px] rounded-full bg-blue-500 opacity-10 blur-[120px]" />
      </div>

      {/* Main container */}
      <div className="relative z-10 w-full max-w-[440px]">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <img src={logo} alt="Toko Empati" className="h-32 w-auto object-contain" />
        </div>

        {/* Login / Setup card */}
        <div className="shadow-level-2 relative overflow-hidden rounded-xl border border-slate-200 bg-white p-8">
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 h-1.5 w-full bg-emerald-700" />

          {setupMode ? (
            /* ── Setup Administrator Form ── */
            <form onSubmit={handleSetup} className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">Setup Administrator</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Buat akun administrator pertama untuk terminal POS.
                </p>
              </div>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label htmlFor="setup-name" className="label-sm">
                    Nama
                  </label>
                  <div className="relative mt-1">
                    <User
                      size={18}
                      className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="setup-name"
                      value={setupName}
                      onChange={(event) => setSetupName(event.target.value)}
                      placeholder="Nama administrator"
                      className="input-base pl-12"
                      required
                    />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label htmlFor="setup-username" className="label-sm">
                    Nama Pengguna
                  </label>
                  <div className="relative mt-1">
                    <User
                      size={18}
                      className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="setup-username"
                      value={setupUsername}
                      onChange={(event) => setSetupUsername(event.target.value)}
                      placeholder="admin"
                      className="input-base pl-12"
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="setup-password" className="label-sm">
                    Kata Sandi
                  </label>
                  <div className="relative mt-1">
                    <Lock
                      size={18}
                      className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="setup-password"
                      type={showPassword ? "text" : "password"}
                      value={setupPassword}
                      onChange={(event) => setSetupPassword(event.target.value)}
                      placeholder="••••••••"
                      className="input-base pr-12 pl-12"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                      aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              {error ? (
                <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
              ) : null}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                rightIcon={<ArrowRight size={18} />}
                fullWidth
              >
                Buat Akun & Masuk
              </Button>

              <p className="text-center text-sm text-slate-500">
                Sudah punya akun?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setSetupMode(false);
                    setError(null);
                  }}
                  className="font-medium text-emerald-700 hover:text-emerald-800"
                >
                  Masuk di sini
                </button>
              </p>
            </form>
          ) : (
            /* ── Login Form ── */
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">Selamat Datang</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Masukkan kredensial Anda untuk mengakses terminal.
                </p>
              </div>

              {/* Input fields */}
              <div className="space-y-4">
                {/* Username */}
                <div>
                  <label htmlFor="username" className="label-sm">
                    Nama Pengguna
                  </label>
                  <div className="relative mt-1">
                    <User
                      size={18}
                      className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="username"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder="admin"
                      className="input-base pl-12"
                      autoComplete="username"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="label-sm">
                    Kata Sandi
                  </label>
                  <div className="relative mt-1">
                    <Lock
                      size={18}
                      className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••••••"
                      className="input-base pr-12 pl-12"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                      aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              {error ? (
                <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
              ) : null}

              {/* Submit button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                rightIcon={<ArrowRight size={18} />}
                fullWidth
              >
                Masuk
              </Button>

              {/* First-run setup link */}
              <p className="text-center text-sm text-slate-500">
                Belum punya akun?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setSetupMode(true);
                    setError(null);
                  }}
                  className="font-medium text-emerald-700 hover:text-emerald-800"
                >
                  Setup administrator
                </button>
              </p>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Shield size={12} />
              POS Empati v1.0
            </span>
            <span className="flex items-center gap-1">
              <Wifi size={12} />
              Offline-ready
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
