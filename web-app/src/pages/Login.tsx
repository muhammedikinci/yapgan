import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiService } from "../services/api";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        await apiService.login(email, password);
      } else {
        await apiService.register(email, password);
      }
      navigate("/my/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-background-dark dark:text-background-light mb-2">
            Yapgan
          </h1>
          <p className="text-background-dark/60 dark:text-background-light/60">
            Your personal knowledge management system
          </p>
        </div>

        <div className="bg-white dark:bg-background-dark/60 p-8 rounded-xl border border-primary/10 dark:border-primary/20">
          <h2 className="text-2xl font-bold text-background-dark dark:text-background-light mb-6">
            {isLogin ? "Sign In" : "Sign Up"}
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-background-dark dark:text-background-light mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-background-light dark:bg-background-dark text-background-dark dark:text-background-light focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="demo@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-background-dark dark:text-background-light mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-background-light dark:bg-background-dark text-background-dark dark:text-background-light focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 px-4 rounded-lg bg-primary text-white font-bold text-sm tracking-wide hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Sign Up"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="text-sm text-primary hover:underline"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
