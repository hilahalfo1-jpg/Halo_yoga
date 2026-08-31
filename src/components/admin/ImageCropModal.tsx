"use client";

import { useState, useEffect, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

interface ImageCropModalProps {
  isOpen: boolean;
  /** Object URL of a freshly picked file, or an https URL of an existing image (re-crop) */
  imageSrc: string | null;
  onClose: () => void;
  /** Called with the uploaded (cropped) image URL */
  onCropped: (url: string) => void;
}

const MAX_WIDTH = 1600;
const MAX_HEIGHT = 900;
const ASPECT = 16 / 9;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Needed so the canvas isn't tainted when re-cropping a remote blob URL
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

export default function ImageCropModal({
  isOpen,
  imageSrc,
  onClose,
  onCropped,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Reset position/zoom whenever a new image opens
  useEffect(() => {
    if (isOpen) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
  }, [isOpen, imageSrc]);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsUploading(true);
    try {
      const img = await loadImage(imageSrc);

      // Cap output at 1600x900 while keeping the 16:9 crop
      const outWidth = Math.min(MAX_WIDTH, Math.round(croppedAreaPixels.width));
      const outHeight = Math.min(
        MAX_HEIGHT,
        Math.round(outWidth / ASPECT)
      );

      const canvas = document.createElement("canvas");
      canvas.width = outWidth;
      canvas.height = outHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas not supported");

      // Flatten transparency onto white — JPEG has no alpha channel
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        img,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        outWidth,
        outHeight
      );

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.85)
      );
      if (!blob) throw new Error("crop failed");

      const formData = new FormData();
      formData.append("file", blob, `cover-${Date.now()}.jpg`);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "שגיאה בהעלאת התמונה");
        return;
      }

      onCropped(json.path);
      toast.success("התמונה נחתכה והועלתה בהצלחה");
    } catch {
      toast.error("שגיאה בחיתוך התמונה");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isUploading ? () => {} : onClose}
      title="חיתוך תמונת קאבר"
      size="lg"
    >
      <div className="space-y-4">
        {/* Crop area */}
        <div className="relative w-full h-[300px] sm:h-[380px] rounded-lg overflow-hidden bg-black">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={ASPECT}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              mediaProps={{ crossOrigin: "anonymous" }}
            />
          )}
        </div>

        {/* Zoom slider */}
        <div className="flex items-center gap-3">
          <label
            htmlFor="crop-zoom"
            className="text-sm font-medium text-text flex-shrink-0"
          >
            זום
          </label>
          <input
            id="crop-zoom"
            type="range"
            dir="ltr"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isUploading}
          >
            ביטול
          </Button>
          <Button size="sm" isLoading={isUploading} onClick={handleConfirm}>
            אישור
          </Button>
        </div>
      </div>
    </Modal>
  );
}
