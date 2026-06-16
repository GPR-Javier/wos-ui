"use client"

import { useState, useCallback } from "react"
import Cropper, { type Area } from "react-easy-crop"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { HugeiconsIcon } from "@hugeicons/react"
import { ZoomInAreaIcon, ZoomOutAreaIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"

// ── Canvas crop helper ─────────────────────────────────────────────────────────

async function cropImageToUrl(src: string, pixelCrop: Area): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      const size = Math.min(pixelCrop.width, pixelCrop.height)
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, pixelCrop.x, pixelCrop.y, size, size, 0, 0, size, size)
      // Emit a base64 data URL (not a blob: object URL) so the result can be
      // persisted to the backend and survives a reload.
      try {
        resolve(canvas.toDataURL("image/jpeg", 0.92))
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Canvas export failed"))
      }
    }
    img.onerror = reject
    img.src = src
  })
}

// ── PhotoCropModal ─────────────────────────────────────────────────────────────

interface Props {
  imageSrc: string | null
  onDone: (croppedUrl: string) => void
  onCancel: () => void
}

export function PhotoCropModal({ imageSrc, onDone, onCancel }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return
    const url = await cropImageToUrl(imageSrc, croppedAreaPixels)
    onDone(url)
  }

  return (
    <Dialog open={!!imageSrc} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-sm gap-0 overflow-hidden p-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle>Crop photo</DialogTitle>
          <p className="text-[12px] text-muted-foreground">
            Drag to reposition · scroll or pinch to zoom
          </p>
        </DialogHeader>

        {/* Crop area */}
        <div className="relative mx-5 h-72 overflow-hidden rounded-xl bg-muted">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              style={{
                containerStyle: { borderRadius: "0.75rem" },
                cropAreaStyle: {
                  border: "2px solid white",
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
                },
              }}
            />
          )}
        </div>

        {/* Zoom slider */}
        <div className="flex items-center gap-3 px-5 pt-4 pb-1">
          <HugeiconsIcon
            icon={ZoomOutAreaIcon}
            size={13}
            strokeWidth={2}
            className="shrink-0 text-muted-foreground"
          />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-1 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary"
          />
          <HugeiconsIcon
            icon={ZoomInAreaIcon}
            size={13}
            strokeWidth={2}
            className="shrink-0 text-muted-foreground"
          />
        </div>

        <DialogFooter className="px-5 py-4">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            Apply crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
