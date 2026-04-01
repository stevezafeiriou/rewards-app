import { useEffect, useId, useRef, useState } from 'react'
import { HiOutlineCamera, HiOutlinePauseCircle } from 'react-icons/hi2'
import { Button } from '@/components/ui/button'

type BarcodeScannerProps = {
  disabled?: boolean
  onDetected: (code: string) => void
  title: string
  description: string
  helper: string
  idleLabel: string
  startLabel: string
  startingLabel: string
  stopLabel: string
  activeLabel: string
  unsupportedLabel: string
  errorPrefix: string
}

type ScannerState = 'idle' | 'starting' | 'active' | 'unsupported' | 'error'

export function BarcodeScanner({
  disabled = false,
  onDetected,
  title,
  description,
  helper,
  idleLabel,
  startLabel,
  startingLabel,
  stopLabel,
  activeLabel,
  unsupportedLabel,
  errorPrefix,
}: BarcodeScannerProps) {
  const regionId = useId().replace(/:/g, '')
  const scannerRef = useRef<{
    stop: () => Promise<void>
    clear: () => void | Promise<void>
  } | null>(null)
  const detectedRef = useRef(false)
  const [state, setState] = useState<ScannerState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function stopScanner() {
    const scanner = scannerRef.current
    scannerRef.current = null

    if (!scanner) return

    try {
      await scanner.stop()
    } catch {
      // Scanner may already be stopped; ignore.
    }

    try {
      await Promise.resolve(scanner.clear())
    } catch {
      // Clear can fail if the element was already cleaned up.
    }
  }

  async function startScanner() {
    if (disabled) return

    setErrorMessage(null)
    setState('starting')
    detectedRef.current = false

    try {
      if (!navigator.mediaDevices) {
        setState('unsupported')
        return
      }

      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
      const cameras = await Html5Qrcode.getCameras()
      const preferredCamera = cameras.find((camera) => /back|rear|environment/i.test(camera.label)) ?? cameras[0]

      if (!preferredCamera) {
        setState('unsupported')
        return
      }

      const scanner = new Html5Qrcode(regionId)
      scannerRef.current = scanner

      await scanner.start(
        preferredCamera.id,
        {
          fps: 10,
          qrbox: { width: 280, height: 120 },
          aspectRatio: 1.6,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
          ],
        } as never,
        async (decodedText) => {
          if (detectedRef.current) return

          const cleaned = decodedText.replace(/\D/g, '')

          if (!/^\d{9}$/.test(cleaned)) return

          detectedRef.current = true
          await stopScanner()
          setState('idle')
          onDetected(cleaned)
        },
        () => {
          // Ignore frame-level decode noise; only surface terminal camera errors.
        },
      )

      setState('active')
    } catch (error) {
      await stopScanner()
      setState('error')
      setErrorMessage(error instanceof Error ? error.message : null)
    }
  }

  useEffect(() => {
    return () => {
      void stopScanner()
    }
  }, [])

  const showOverlayText = state !== 'active'

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <div className="relative overflow-hidden rounded-[1.6rem] border border-border bg-[#0b0f1a] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div
          id={regionId}
          className="min-h-[280px] [&>div]:!border-0 [&_canvas]:hidden [&_video]:!h-[280px] [&_video]:!w-full [&_video]:!object-cover"
        />
        {state === 'active' ? (
          <div className="pointer-events-none absolute inset-x-8 top-1/2 h-[2px] -translate-y-1/2 bg-primary shadow-[0_0_18px_color-mix(in_srgb,var(--primary)_55%,transparent)]" />
        ) : null}
        {showOverlayText ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(110,103,248,0.16),transparent_32%),linear-gradient(180deg,rgba(11,15,26,0.46),rgba(11,15,26,0.74))] p-6 text-center">
            <div className="max-w-xs space-y-2">
              <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-[0_0_24px_color-mix(in_srgb,var(--primary)_48%,transparent)]">
                <HiOutlineCamera className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-white">{helper}</p>
              <p className="text-xs leading-5 text-white/70">
                {state === 'unsupported' ? unsupportedLabel : idleLabel}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {state === 'active' ? (
          <Button leftIcon={<HiOutlinePauseCircle className="h-4 w-4" />} type="button" variant="outline" onClick={() => {
            void stopScanner()
            setState('idle')
          }}>
            {stopLabel}
          </Button>
        ) : (
          <Button
            leftIcon={<HiOutlineCamera className="h-4 w-4" />}
            type="button"
            onClick={() => {
              void startScanner()
            }}
            loading={state === 'starting'}
            loadingText={startingLabel}
            disabled={disabled || state === 'unsupported'}
          >
            {startLabel}
          </Button>
        )}
        <p className="text-xs text-muted-foreground">
          {state === 'unsupported'
            ? unsupportedLabel
            : state === 'error' && errorMessage
              ? `${errorPrefix}: ${errorMessage}`
              : state === 'active'
                ? activeLabel
                : helper}
        </p>
      </div>
    </div>
  )
}
