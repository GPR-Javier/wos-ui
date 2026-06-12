import { EmployeeDetailView } from "@/components/dashboard/hr/employee-detail"

interface Props {
  params: Promise<{ id: string }>
}

export default async function EmployeeDetailPage({ params }: Props) {
  const { id } = await params
  return (
    <div className="animate-in p-6 duration-300 fade-in">
      <EmployeeDetailView employeeId={id} />
    </div>
  )
}
