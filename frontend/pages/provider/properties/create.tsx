import { useEffect } from "react";
import { useRouter } from "next/router";

/**
 * Redirect to the Provider Dashboard shell with the "create" view active.
 * This page is kept so that old links / bookmarks still work.
 */
export default function CreateRedirect() {
  const router = useRouter();

  useEffect(() => {
    void router.replace("/provider/dashboard?view=create");
  }, [router]);

  return null;
}