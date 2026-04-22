import { getCurrentUser } from "@/lib/auth";
import { jsonNoStore } from "@/lib/http";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return jsonNoStore({ user: null }, { status: 401 });
  }
  return jsonNoStore({
    user: {
      id: user.id,
      displayName: user.displayName,
      role: user.role
    }
  });
}
