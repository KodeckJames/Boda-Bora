import Link from "next/link";

// For staff who work across several SACCOs or insurers (and platform admins): switch with ?org=.
export function OrgSwitcher({ orgs, current, basePath }: { orgs: { id: string; name: string }[]; current: string; basePath: string }) {
  if (orgs.length < 2) return null;
  return (
    <nav className="mb-6 flex flex-wrap gap-1.5 text-sm">
      {orgs.map((o) => (
        <Link
          key={o.id}
          href={`${basePath}?org=${o.id}`}
          className={`rounded-full px-3 py-1.5 font-medium ${o.id === current ? "bg-ink text-white" : "border border-line text-muted hover:text-foreground"}`}
        >
          {o.name}
        </Link>
      ))}
    </nav>
  );
}
