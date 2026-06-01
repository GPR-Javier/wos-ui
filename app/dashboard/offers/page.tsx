import type { Metadata } from "next"
import { ComingSoon } from "@/components/custom/coming-soon"
import { ScreenOnboarding } from "@/components/onboarding/screen-onboarding"

export const metadata: Metadata = { title: "Offers" }

export default function OffersPage() {
  return (
    <>
      <ScreenOnboarding screenKey="offers" />
      <ComingSoon
        title="Offers"
        description="Review job offers and respond to them."
      />
    </>
  )
}
