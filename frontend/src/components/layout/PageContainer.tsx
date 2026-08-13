import type { PropsWithChildren } from "react";

type PageContainerProps = PropsWithChildren<{
  width?: "page" | "content";
  className?: string;
}>;

const widths = {
  page: "max-w-7xl",
  content: "max-w-7xl",
};

export default function PageContainer({
  children,
  width = "page",
  className = "",
}: PageContainerProps) {
  return (
    <main className={`mx-auto w-full ${widths[width]} px-4 py-6 md:px-6 md:py-8 lg:pb-12 ${className}`}>
      {children}
    </main>
  );
}
