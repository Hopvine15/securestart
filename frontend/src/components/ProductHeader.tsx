import { useAuth0 } from "@auth0/auth0-react";
import { BookOpen, ChartNoAxesColumn, LayoutDashboard } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

type ProductHeaderProps = {
  active: "dashboard" | "training";
};

export default function ProductHeader({ active }: ProductHeaderProps) {
  const { logout, user } = useAuth0();
  const name = user?.email?.split("@")[0] || "Learner";
  const initials = name.slice(0, 2).toUpperCase();

  const handleLogout = () => {
    logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  };

  return (
    <header className="flex min-h-20 flex-wrap items-center gap-4 rounded-b-xl bg-navy px-5 py-3 text-steel md:flex-nowrap md:gap-8 md:px-8 md:py-4">
      <Link
        className="flex items-center gap-2.5 whitespace-nowrap text-xl font-bold tracking-tight text-white no-underline"
        to="/dashboard"
        aria-label="SecureStart dashboard"
      >
        <img src={logo} alt="SecureStart" />
        <span>SecureStart</span>
        <small className="hidden pl-1 text-2xs font-medium tracking-normal text-steel sm:inline">
          by NovaShield
        </small>
      </Link>

      <nav
        className="order-3 flex basis-full gap-1 overflow-x-auto md:order-none md:flex-1"
        aria-label="Primary navigation"
      >
        <Link
          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-steel no-underline transition-colors hover:bg-white/10 hover:text-white md:px-4 md:py-2.5 ${active === "dashboard" ? "bg-white/10 font-semibold text-white" : ""}`}
          to="/dashboard"
        >
          <LayoutDashboard aria-hidden="true" className="size-4" />
          Dashboard
        </Link>
        <Link
          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-steel no-underline transition-colors hover:bg-white/10 hover:text-white md:px-4 md:py-2.5 ${active === "training" ? "bg-white/10 font-semibold text-white" : ""}`}
          to="/mytraining"
        >
          <BookOpen aria-hidden="true" className="size-4" />
          My training
        </Link>
        <span className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-steel md:px-4 md:py-2.5">
          <ChartNoAxesColumn aria-hidden="true" className="size-4" />
          Progress
        </span>
      </nav>

      <div className="ml-auto flex items-center gap-2 whitespace-nowrap text-sm md:ml-0">
        <span
          className="grid size-7 place-items-center rounded-full bg-violet text-2xs font-bold text-white"
          aria-hidden="true"
        >
          {initials}
        </span>
        <span className="hidden sm:inline">{name}</span>
        <button
          className="rounded-xl border-0 bg-transparent px-3 py-2 text-sm font-medium text-steel transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
          onClick={handleLogout}
        >
          Log out
        </button>
      </div>
    </header>
  );
}
