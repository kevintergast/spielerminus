"use client";

import { useFormStatus } from "react-dom";

export type FormState = { error?: string; ok?: string } | undefined;

export function SubmitButton({
  children,
  className = "btn-primary w-full",
  pendingText,
  name,
  value,
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} name={name} value={value}>
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (state?.error)
    return (
      <p role="alert" className="rounded-xl bg-no-bg px-4 py-3 text-sm font-medium text-no">
        {state.error}
      </p>
    );
  if (state?.ok)
    return (
      <p role="status" className="rounded-xl bg-yes-bg px-4 py-3 text-sm font-medium text-yes">
        {state.ok}
      </p>
    );
  return null;
}
