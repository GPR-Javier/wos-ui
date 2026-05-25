"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  PieChart01Icon,
  CheckListIcon,
} from "@hugeicons/core-free-icons"
import { PayrollOverview } from "./payroll-overview"
import { PayrollPayslips } from "./payroll-payslips"

export function AdminPayrollSection() {
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

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" className="text-[12px]">
            <HugeiconsIcon icon={PieChart01Icon} size={13} strokeWidth={1.8} />
            Overview
          </TabsTrigger>
          <TabsTrigger value="payslips" className="text-[12px]">
            <HugeiconsIcon icon={CheckListIcon} size={13} strokeWidth={1.8} />
            Payslips
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5">
          <PayrollOverview />
        </TabsContent>

        <TabsContent value="payslips" className="mt-5">
          <PayrollPayslips initialRunId={null} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
