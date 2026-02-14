import { StoreProvider } from "@/lib/store"
import { PortalShell } from "@/components/portal-shell"

export default function Page() {
  return (
    <StoreProvider>
      <PortalShell />
    </StoreProvider>
  )
}
