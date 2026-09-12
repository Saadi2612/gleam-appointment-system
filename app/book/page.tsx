import { Suspense } from "react";
import { BookClient } from "./book-client";

export default function BookPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>}>
      <BookClient />
    </Suspense>
  );
}
