"use client"

import type { CardComponentProps } from "nextstepjs"
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useOnboardingContext } from "./onboarding-context"

/**
 * shadcn-styled card NextStep renders for every step. Keeps the tour visually aligned
 * with the rest of the app (Card + Button primitives) instead of the library default.
 */
export function ShadcnTourCard({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
  arrow,
}: CardComponentProps) {
  const { skipAll } = useOnboardingContext()
  const isFirst = currentStep === 0
  const isLast = currentStep === totalSteps - 1

  return (
    <Card
      size="sm"
      className="pointer-events-auto w-[320px] max-w-[90vw] gap-3 shadow-xl"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {step.icon ? (
            <span className="text-base leading-none">{step.icon}</span>
          ) : null}
          <span>{step.title}</span>
        </CardTitle>
        {step.showSkip !== false ? (
          <CardAction>
            <button
              type="button"
              onClick={skipAll}
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Skip all
            </button>
          </CardAction>
        ) : null}
      </CardHeader>

      <CardContent className="text-sm text-muted-foreground">
        {step.content}
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {totalSteps > 1 ? (
            <span className="text-xs text-muted-foreground tabular-nums">
              {currentStep + 1} / {totalSteps}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {!isFirst ? (
            <Button variant="ghost" size="sm" onClick={prevStep}>
              Back
            </Button>
          ) : null}
          {step.showControls === false ? (
            // Interactive step — advancing requires clicking the spotlighted element,
            // so we show a hint instead of a Next button.
            <span className="text-xs font-medium text-primary">
              Click the highlighted button ↗
            </span>
          ) : isLast ? (
            <Button size="sm" onClick={nextStep}>
              Done
            </Button>
          ) : (
            <Button size="sm" onClick={nextStep}>
              Next
            </Button>
          )}
        </div>
      </CardFooter>

      {arrow}
    </Card>
  )
}
