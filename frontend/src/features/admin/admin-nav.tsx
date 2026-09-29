import { NavLink } from "@/components/app-shell.js";

/** Navigation shared by every admin page; `active` marks the current one. */
export function AdminNav({ active }: Readonly<{ active: "dashboard" | "policies" | "audit" }>) {
  return (
    <>
      <NavLink to="/admin" active={active === "dashboard"}>
        Dashboard
      </NavLink>
      <NavLink to="/admin/policies" active={active === "policies"}>
        Policies
      </NavLink>
      <NavLink to="/admin/audit" active={active === "audit"}>
        Audit
      </NavLink>
    </>
  );
}
