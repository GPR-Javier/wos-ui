import { redirect } from "next/navigation"

// Every page lives under a company slug; the company-less / public default is "guest".
export default function RootPage() {
  redirect("/guest")
}
