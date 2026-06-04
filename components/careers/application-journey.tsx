"use client"

import { Fragment } from "react"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle01Icon,
  Cancel01Icon,
  Video01Icon,
} from "@hugeicons/core-free-icons"
import { type JobApplication } from "@/lib/application-api"
import {
  pipelineApi,
  type PipelineStage,
  type PipelineStageStatus,
} from "@/lib/pipeline-api"

/**
 * The candidate's hiring-pipeline stepper — Applied → Assessment → HR AI → Technical AI → Human →
 * Final → Shortlisted → Offer → Hired — driven entirely by the server-composed pipeline read-model.
 * Stages not configured for the job are omitted; the Assessment stage expands into its sub-parts;
 * human stages surface their meeting link. Rejected/withdrawn show where the candidate stopped.
 */
export function ApplicationJourney({
  application,
}: {
  application: JobApplication
}) {
  const { data: pipeline } = useQuery({
    queryKey: ["pipeline", "mine", application.id],
    queryFn: () => pipelineApi.mine(application.id),
  })

  const stages = pipeline?.stages ?? []
  if (stages.length === 0) return null

  const currentIndex = stages.findIndex(
    (s) => !isTerminal(s.status) && s.status !== "PASSED"
  )
  const assessment = stages.find((s) => s.subSteps && s.subSteps.length > 0)

  return (
    <div className="rounded-2xl border border-border bg-card px-6 py-4">
      <p className="mb-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        Application status
      </p>

      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max items-start justify-center">
          {stages.map((s, i) => (
            <Fragment key={s.key}>
              {i > 0 && (
                <div
                  className={cn(
                    "mt-3.5 h-0.5 w-6 shrink-0 sm:w-10",
                    stages[i - 1].status === "PASSED"
                      ? "bg-green-500"
                      : "bg-border"
                  )}
                />
              )}
              <StageNode
                stage={s}
                index={i}
                current={i === currentIndex}
              />
            </Fragment>
          ))}
        </div>
      </div>

      {/* Assessment sub-parts */}
      {assessment?.subSteps && assessment.subSteps.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 border-t border-border/60 pt-3">
          <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
            Assessment:
          </span>
          {assessment.subSteps.map((sub) => {
            const done = sub.status === "PASSED"
            return (
              <span
                key={sub.key}
                className={cn(
                  "flex items-center gap-1 text-[11px] font-medium",
                  done
                    ? "text-green-600 dark:text-green-400"
                    : "text-muted-foreground"
                )}
              >
                {done ? (
                  <HugeiconsIcon
                    icon={CheckmarkCircle01Icon}
                    size={13}
                    strokeWidth={2.5}
                  />
                ) : (
                  <span className="size-2 rounded-full bg-muted-foreground/40" />
                )}
                {sub.label}
              </span>
            )
          })}
        </div>
      )}

      {/* Scheduled human interviews: meeting link + details for the candidate. */}
      {stages
        .filter((s) => (s.meetingLink || s.notes) && !isTerminal(s.status))
        .map((s) => (
          <div
            key={`link-${s.key}`}
            className="mt-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2"
          >
            {s.meetingLink && (
              <a
                href={s.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-fit items-center gap-2 text-[12px] font-medium text-primary transition-colors hover:underline"
              >
                <HugeiconsIcon icon={Video01Icon} size={14} strokeWidth={1.8} />
                Join your {s.label.toLowerCase()}
                {s.scheduledAt
                  ? ` · ${new Date(s.scheduledAt).toLocaleString()}`
                  : ""}
              </a>
            )}
            {s.notes && (
              <p className="mt-1 text-[11px] whitespace-pre-line text-muted-foreground">
                {s.notes}
              </p>
            )}
          </div>
        ))}
    </div>
  )
}

function isTerminal(status: PipelineStageStatus) {
  return status === "REJECTED" || status === "SKIPPED"
}

function StageNode({
  stage,
  index,
  current,
}: {
  stage: PipelineStage
  index: number
  current: boolean
}) {
  const done = stage.status === "PASSED"
  const rejected = stage.status === "REJECTED"
  const skipped = stage.status === "SKIPPED"
  const review = stage.status === "UNDER_REVIEW"
  const active = review || current

  return (
    <div className="flex w-16 shrink-0 flex-col items-center gap-1.5 sm:w-20">
      <div
        className={cn(
          "flex size-7 items-center justify-center rounded-full border-2 text-[11px] font-semibold transition-colors",
          done
            ? "border-green-500 bg-green-500 text-white"
            : rejected
              ? "border-red-500 bg-red-500 text-white"
              : skipped
                ? "border-muted-foreground/30 bg-muted text-muted-foreground"
                : active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground"
        )}
      >
        {done ? (
          <HugeiconsIcon
            icon={CheckmarkCircle01Icon}
            size={14}
            strokeWidth={2.5}
          />
        ) : rejected ? (
          <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2.5} />
        ) : (
          index + 1
        )}
      </div>
      <span
        className={cn(
          "text-center text-[10px] leading-tight font-medium",
          done || active || rejected
            ? "text-foreground"
            : "text-muted-foreground"
        )}
      >
        {stage.label}
      </span>
      {review && (
        <span className="text-[9px] font-medium text-amber-600 dark:text-amber-400">
          Under review
        </span>
      )}
      {skipped && (
        <span className="text-[9px] text-muted-foreground">Skipped</span>
      )}
    </div>
  )
}
