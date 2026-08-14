import { useAuth0 } from "@auth0/auth0-react";
import { ChartNoAxesColumn, Clock3, ExternalLink, ListChecks } from "lucide-react";
import logo from "../assets/logo.png";

const benefits = [
  {
    title: "Short modules",
    description: "10-15 minute training on real-world AI risks",
    Icon: Clock3,
  },
  {
    title: "Scenario quizzes",
    description: "Test decisions in realistic developer contexts",
    Icon: ListChecks,
  },
  {
    title: "Track progress",
    description: "See completion and scores on your dashboard",
    Icon: ChartNoAxesColumn,
  },
];

export default function Landing() {
  const { loginWithRedirect } = useAuth0();

  const startLogin = () => {
    void loginWithRedirect({
      appState: { returnTo: "/dashboard" },
    });
  };

  return (
    <main className="flex min-h-screen flex-col bg-surface">
      <header className="flex min-h-[69px] shrink-0 items-center justify-between bg-navy px-6 py-4">
        <div className="flex items-center gap-2">
          <img className="h-[26px] w-6" src={logo} alt="" />
          <span className="text-[15px] font-bold leading-[22.5px] text-white">SecureStart</span>
        </div>
        <button
          className="hidden items-center gap-1 rounded-lg bg-cyan px-5 py-2 text-sm font-semibold text-navy transition-colors hover:bg-cyan-dark hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-navy sm:inline-flex"
          onClick={startLogin}
        >
          Log in
          <ExternalLink aria-hidden="true" className="size-3.5" />
        </button>
      </header>

      <section
        className="flex min-h-[clamp(360px,60vh,520px)] shrink-0 flex-col justify-center bg-navy px-6 py-16 text-center"
        aria-labelledby="landing-heading"
      >
        <p className="text-2xs font-bold uppercase tracking-[0.1em] text-cyan">
          A NovaShield Learning product
        </p>
        <h1
          className="mx-auto mt-3 max-w-3xl text-3xl font-bold leading-[1.15] tracking-tight text-white sm:text-5xl sm:leading-[1.25]"
          id="landing-heading"
        >
          Cybersecurity training for AI-assisted work
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-steel sm:text-lg">
          Short scenario-based modules that help developers and non-technical staff identify real cybersecurity risks.
        </p>
        <button
          className="mx-auto mt-8 inline-flex h-14 items-center gap-2 rounded-control bg-cyan px-8 text-base font-bold text-navy transition-colors hover:bg-cyan-dark hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
          onClick={startLogin}
        >
          Get started
          <ExternalLink aria-hidden="true" className="size-4" />
        </button>
        <p className="mt-3 text-xs text-steel">Redirects to Auth0 Universal Login · Free to join</p>
      </section>

      <section
        className="grid flex-1 content-center grid-cols-1 gap-4 bg-surface px-6 py-8 md:grid-cols-3"
        aria-label="SecureStart benefits"
      >
        {benefits.map(({ title, description, Icon }) => (
          <article
            className="min-h-[clamp(152px,16vh,180px)] rounded-xl border border-border bg-surface-muted p-6"
            key={title}
          >
            <div className="grid size-10 place-items-center rounded-xl bg-cyan text-navy">
              <Icon aria-hidden="true" className="size-5" />
            </div>
            <h2 className="mt-2 text-[15px] font-semibold leading-[22.5px] text-ink">{title}</h2>
            <p className="mt-2 text-sm leading-[21px] text-muted">{description}</p>
          </article>
        ))}
      </section>

      <footer className="flex shrink-0 items-center justify-between gap-4 bg-navy px-6 py-4 text-xs leading-[18px] text-steel">
        <span>© 2026 NovaShield Learning · SecureStart</span>
        <span className="text-right">Authentication by Auth0</span>
      </footer>
    </main>
  );
}
