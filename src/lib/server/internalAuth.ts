import { cookies } from "next/headers";

export async function getApiRole() {
  try {
    const store = await cookies();
    const cookieRole = String(store.get("role")?.value || "").trim().toLowerCase();
    if (cookieRole) return cookieRole;
  } catch {}

  // Development fallback
  return "admin";
}

function canAccess(role: string, allowedRoles: string[]) {
  if (allowedRoles.includes(role)) return true;
  // Admin can perform ops actions too.
  if (role === "admin" && allowedRoles.includes("ops")) return true;
  return false;
}

export async function requireRole(allowedRoles: string | string[]) {
  const allowed = (Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles])
    .map((r) => String(r || "").trim().toLowerCase())
    .filter(Boolean);
  const role = await getApiRole();
  if (!role || !canAccess(String(role).toLowerCase(), allowed)) {
    return Response.json(
      {
        success: false,
        error: { message: "Unauthorized", code: "UNAUTHORIZED" },
      },
      { status: 401 }
    );
  }
  return null;
}
