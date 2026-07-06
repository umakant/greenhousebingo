"use client";

import * as React from "react";
import { Image as ImageIcon, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MediaLibraryModal from "@/components/MediaLibraryModal";
import { getImagePath } from "@/utils/image-path";

type MediaPickerProps = {
  label?: string;
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  /** Restrict media library uploads/selection hint (e.g. ["pdf"] for lesson documents). */
  acceptExtensions?: string[];
  showPreview?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  id?: string;
  required?: boolean;
};

export default function MediaPicker({
  label,
  value = "",
  onChange,
  multiple = false,
  placeholder = "Select image...",
  acceptExtensions,
  showPreview = true,
  readOnly = false,
  disabled = false,
  id,
  required,
}: MediaPickerProps) {
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const handleSelect = (selectedUrls: string | string[]) => {
    const extractPath = (url: string): string => {
      if (typeof url !== "string") return url;
      if (url.includes("res.cloudinary.com")) return url;
      if (url.startsWith("http")) {
        try {
          return new URL(url).pathname;
        } catch {
          return url;
        }
      }
      return url;
    };

    if (multiple) {
      const urlArray = Array.isArray(selectedUrls) ? selectedUrls : [selectedUrls];
      onChange(urlArray.map(extractPath));
    } else {
      const url = Array.isArray(selectedUrls) ? selectedUrls[0] : selectedUrls;
      onChange(extractPath(url) || "");
    }
  };

  const handleClear = () => {
    onChange(multiple ? [] : "");
  };

  const safeValue = multiple
    ? Array.isArray(value)
      ? value
      : value
        ? [value]
        : []
    : Array.isArray(value)
      ? value[0] || ""
      : value || "";

  const getDisplayUrl = (url: string) => {
    if (!url || typeof url !== "string") return "";
    if (url.startsWith("http")) return url;
    if (url.startsWith("/")) return getImagePath(url);
    return getImagePath(url);
  };

  const getFileType = (url: string) => {
    const extension = url.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension || "")) return "image";
    if (extension === "pdf") return "pdf";
    if (["mp4", "webm", "ogg", "mov", "avi"].includes(extension || "")) return "video";
    return "file";
  };

  const mediaUrls = multiple
    ? Array.isArray(safeValue)
      ? safeValue.filter(Boolean).map(getDisplayUrl)
      : []
    : safeValue
      ? [getDisplayUrl(safeValue as string)]
      : [];

  return (
    <div>
      {label ? (
        <Label htmlFor={id}>
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </Label>
      ) : null}

      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          id={id}
          value={multiple ? (Array.isArray(safeValue) ? safeValue.join(", ") : "") : (safeValue as string)}
          onChange={(e) => !multiple && onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly || multiple}
          required={required}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsModalOpen(true)}
          disabled={readOnly || disabled}
          className="w-full sm:w-auto"
        >
          <ImageIcon className="h-4 w-4 mr-2" />
          Browse
        </Button>
        {((multiple && Array.isArray(safeValue) && safeValue.length > 0) || (!multiple && safeValue)) && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleClear}
            disabled={readOnly || disabled}
            className="w-full sm:w-10"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showPreview && mediaUrls.length > 0 ? (
        <div className="grid grid-cols-4 gap-2 mt-2">
          {mediaUrls.map((url, index) => {
            const fileType = getFileType(url);
            return (
              <div key={index} className="relative">
                {fileType === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt={`Preview ${index + 1}`} className="w-full h-20 object-cover rounded border" />
                ) : fileType === "pdf" ? (
                  <div className="flex h-20 w-full flex-col items-center justify-center rounded border bg-red-50 text-red-700">
                    <span className="text-xs font-bold">PDF</span>
                  </div>
                ) : fileType === "video" ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video src={url} className="w-full h-20 object-cover rounded border" controls={false} muted />
                ) : (
                  <div className="w-full h-20 flex items-center justify-center bg-gray-100 rounded border">
                    <div className="text-center">
                      <div className="w-6 h-6 mx-auto mb-1 text-gray-400">FILE</div>
                      <span className="text-xs text-gray-500">{url.split(".").pop()?.toUpperCase()}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      <MediaLibraryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleSelect}
        multiple={multiple}
        acceptExtensions={acceptExtensions}
      />
    </div>
  );
}

