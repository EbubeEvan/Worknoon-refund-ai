import type { ReactNode } from "react";

export function Label({
  children,
  htmlFor,
}: Readonly<{
  children: ReactNode;
  htmlFor?: string;
}>) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-[13px] font-medium text-foreground">
      {children}
    </label>
  );
}
