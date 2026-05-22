"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  PieChart01Icon,
  Invoice01Icon,
  CheckListIcon,
} from "@hugeicons/core-free-icons"
import { PayrollOverview } from "./payroll-overview"
import { PayrollRuns } from "./payroll-runs"
import { PayrollPayslips } from "./payroll-payslips"

export function AdminPayrollSection() {
  const [activeTab, setActiveTab] = useState("overview")
  const [payslipsRunId, setPayslipsRunId] = useState<number | null>(null)

  function handleViewPayslips(runId: number) {
    setPayslipsRunId(runId)
    setActiveTab("payslips")
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[16px] font-bold text-foreground">
          Payroll Management
        </h1>
        <p className="text-[12px] text-muted-foreground">
          Manage payroll runs, process earnings & deductions, and release payslips.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="text-[12px]">
            <HugeiconsIcon icon={PieChart01Icon} size={13} strokeWidth={1.8} />
            Overview
          </TabsTrigger>
          <TabsTrigger value="processing" className="text-[12px]">
            <HugeiconsIcon icon={Invoice01Icon} size={13} strokeWidth={1.8} />
            Payroll Runs
          </TabsTrigger>
          <TabsTrigger value="payslips" className="text-[12px]">
            <HugeiconsIcon icon={CheckListIcon} size={13} strokeWidth={1.8} />
            Payslips
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5">
          <PayrollOverview />
        </TabsContent>

        <TabsContent value="processing" className="mt-5">
          <PayrollRuns onViewPayslips={handleViewPayslips} />
        </TabsContent>

        <TabsContent value="payslips" className="mt-5">
          <PayrollPayslips initialRunId={payslipsRunId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
