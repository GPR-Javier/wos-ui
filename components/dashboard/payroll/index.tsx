"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  PieChart01Icon,
  CheckListIcon,
  Calendar03Icon,
  MoneyBag02Icon,
} from "@hugeicons/core-free-icons"
import { PayrollOverview } from "./payroll-overview"
import { PayrollPayslips } from "./payroll-payslips"
import { PayrollRuns } from "./payroll-runs"
import { PayrollSchedule } from "./payroll-schedule"

export function AdminPayrollSection() {
  const [tab, setTab] = useState("overview")
  // Set when jumping from a run to its payslips, so the Payslips tab opens filtered to that run.
  const [payslipRunId, setPayslipRunId] = useState<number | null>(null)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[16px] font-bold text-foreground">
          Payroll Management
        </h1>
        <p className="text-[12px] text-muted-foreground">
          Manage payroll runs, process earnings & deductions, and release
          payslips.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview" className="text-[12px]">
            <HugeiconsIcon icon={PieChart01Icon} size={13} strokeWidth={1.8} />
            Overview
          </TabsTrigger>
          <TabsTrigger value="runs" className="text-[12px]">
            <HugeiconsIcon icon={MoneyBag02Icon} size={13} strokeWidth={1.8} />
            Runs
          </TabsTrigger>
          <TabsTrigger value="payslips" className="text-[12px]">
            <HugeiconsIcon icon={CheckListIcon} size={13} strokeWidth={1.8} />
            Payslips
          </TabsTrigger>
          <TabsTrigger value="schedule" className="text-[12px]">
            <HugeiconsIcon icon={Calendar03Icon} size={13} strokeWidth={1.8} />
            Schedule
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5">
          <PayrollOverview />
        </TabsContent>

        <TabsContent value="runs" className="mt-5">
          <PayrollRuns
            onViewPayslips={(runId) => {
              setPayslipRunId(runId)
              setTab("payslips")
            }}
          />
        </TabsContent>

        <TabsContent value="payslips" className="mt-5">
          <PayrollPayslips initialRunId={payslipRunId} />
        </TabsContent>

        <TabsContent value="schedule" className="mt-5">
          <PayrollSchedule />
        </TabsContent>
      </Tabs>
    </div>
  )
}
