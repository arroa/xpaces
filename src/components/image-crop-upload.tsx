"use client";

import Cropper, { type Area } from "react-easy-crop";
import { forwardRef, useCallback, useImperativeHandle, useState } from "react";

import { getCroppedImageFile, loadImagePreview } from "@/lib/crop-image";

type ImageCropUploadProps = {
  label?: string;
  currentImageUrl?: string;
  onImageChange?: (hasImage: boolean) => void;
};

export type ImageCropUploadHandle = {
  applyCrop: () => Promise<File | null>;
  getRawFile: () => File | null;
  getCroppedFile: () => File | null;
  hasImage: () => boolean;
  isCropApplied: () => boolean;
};

export const ImageCropUpload = forwardRef<ImageCropUploadHandle, ImageCropUploadProps>(
  function ImageCropUpload({ label = "Imagen de planta", currentImageUrl, onImageChange }, ref) {
    const [preview, setPreview] = useState<string | null>(null);
    const [rawFile, setRawFile] = useState<File | null>(null);
    const [croppedFile, setCroppedFile] = useState<File | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [fileName, setFileName] = useState("planta.jpg");

    const onCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
      setCroppedAreaPixels(croppedPixels);
    }, []);

    async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      setFileName(file.name.replace(/\.[^.]+$/, "") + ".jpg");
      setRawFile(file);
      setCroppedFile(null);
      onImageChange?.(true);
      const dataUrl = await loadImagePreview(file);
      setPreview(dataUrl);
    }

    async function applyCrop() {
      if (!preview || !croppedAreaPixels) {
        return null;
      }
      const cropped = await getCroppedImageFile(preview, croppedAreaPixels, fileName);
      setCroppedFile(cropped);
      return cropped;
    }

    useImperativeHandle(ref, () => ({
      applyCrop,
      getRawFile: () => rawFile,
      getCroppedFile: () => croppedFile,
      hasImage: () => Boolean(rawFile),
      isCropApplied: () => Boolean(croppedFile),
    }));

    return (
      <div className="space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-[var(--muted)]">{label}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => void handleFileChange(e)}
            className="mt-1 block w-full text-sm text-[var(--muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--field)] file:px-3 file:py-2 file:text-sm file:text-[var(--foreground)]"
          />
        </label>

        {currentImageUrl && !preview && (
          <div className="overflow-hidden rounded-xl border border-[var(--border-strong)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentImageUrl}
              alt="Planta actual"
              className="max-h-48 w-full bg-black/20 object-contain"
            />
          </div>
        )}

        {preview && (
          <div className="space-y-3">
            <div className="relative h-64 overflow-hidden rounded-xl border border-[var(--border-strong)] bg-black">
              <Cropper
                image={preview}
                crop={crop}
                zoom={zoom}
                aspect={undefined}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <label className="block">
              <span className="text-xs text-[var(--muted)]">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="mt-1 w-full"
              />
            </label>
            {croppedFile && (
              <p className="text-xs text-emerald-300">Recorte aplicado. Puedes guardar la planta.</p>
            )}
          </div>
        )}
      </div>
    );
  },
);
