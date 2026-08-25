import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";

export function OAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const access = params.get("access");
    const refresh = params.get("refresh");
    const userRaw = params.get("user");

    if (access && refresh && userRaw) {
      try {
        const user = JSON.parse(userRaw);
        setAuth(user, access, refresh);
      } catch {
        // ignore parse error
      }
    }

    navigate("/", { replace: true });
  }, [params, navigate, setAuth]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-neutral-500">Авторизація...</p>
    </div>
  );
}
