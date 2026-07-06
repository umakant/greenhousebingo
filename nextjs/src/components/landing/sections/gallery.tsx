"use client";

import { useEffect, useMemo, useState } from "react";
import { getImagePath } from "@/components/landing/utils";

const GALLERY_VARIANTS = {
  gallery1: {
    section: "bg-white py-20",
    container: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
    title: "text-3xl md:text-4xl font-bold text-slate-900 mb-6",
    subtitle: "text-lg text-slate-700",
    layout: "slider",
  },
  gallery2: {
    section: "bg-gray-50 py-20",
    container: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
    title: "text-3xl md:text-4xl font-bold text-slate-900 mb-6",
    subtitle: "text-lg text-slate-700",
    layout: "grid",
  },
  gallery3: {
    section: "bg-gradient-to-br from-gray-50 to-white py-20",
    container: "max-w-6xl mx-auto px-4 sm:px-6 lg:px-8",
    title: "text-3xl md:text-4xl font-bold text-slate-900 mb-6",
    subtitle: "text-lg text-slate-700",
    layout: "stacked",
  },
  gallery4: {
    section: "bg-gray-900 py-20",
    container: "max-w-full px-4 sm:px-6 lg:px-8",
    title: "text-3xl md:text-4xl font-bold text-white mb-6",
    subtitle: "text-lg text-gray-300",
    layout: "carousel",
  },
  gallery5: {
    section: "bg-white py-20",
    container: "max-w-5xl mx-auto px-4 sm:px-6 lg:px-8",
    title: "text-3xl md:text-4xl font-bold text-slate-900 mb-6",
    subtitle: "text-lg text-slate-700",
    layout: "lightbox",
  },
} as const;

export default function Gallery({ settings }: { settings?: any }) {
  const sectionData = settings?.config_sections?.sections?.gallery || {};
  const variant = sectionData.variant || "gallery1";
  const config = (GALLERY_VARIANTS as any)[variant] || GALLERY_VARIANTS.gallery1;

  const title = sectionData.title || "See WorkDo Dash in Action";
  const subtitle =
    sectionData.subtitle ||
    "Explore our intuitive interface and powerful features through real screenshots of our platform";
  const colors = settings?.config_sections?.colors || { primary: "#10b981", secondary: "#059669", accent: "#f59e0b" };
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Prevent background scroll when lightbox is open
  useEffect(() => {
    if (config.layout !== "lightbox") return;
    if (lightboxOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [lightboxOpen, config.layout]);

  const defaultImages = useMemo(() => ["/images/login-bg-dark.png"], []);

  const galleryImages: string[] =
    (sectionData.images?.filter((img: string) => img) || []).length > 0
      ? sectionData.images.filter((img: string) => img)
      : defaultImages;

  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % galleryImages.length);
  const previousImage = () => setCurrentImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);

  const srcFor = (img: string) => (img?.startsWith("http") ? img : getImagePath(img || ""));

  const renderSlider = () => (
    <div className="relative max-w-6xl mx-auto">
      <div className="overflow-hidden rounded-xl shadow-2xl bg-white">
        <img
          src={srcFor(galleryImages[currentImageIndex] || "")}
          alt={`Gallery image ${currentImageIndex + 1}`}
          className="w-full h-[500px] md:h-[600px] object-contain"
        />
      </div>

      <button
        onClick={previousImage}
        className="absolute left-6 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-3 rounded-full shadow-xl transition-all hover:scale-110"
        aria-label="Previous image"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={nextImage}
        className="absolute right-6 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-3 rounded-full shadow-xl transition-all hover:scale-110"
        aria-label="Next image"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <div className="flex justify-center mt-8 space-x-3">
        {galleryImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentImageIndex(index)}
            className={`w-4 h-4 rounded-full transition-all duration-300 ${
              index === currentImageIndex ? "scale-125" : "bg-gray-300 hover:bg-gray-500 hover:scale-110"
            }`}
            style={index === currentImageIndex ? { backgroundColor: colors.primary } : {}}
            aria-label={`Go to image ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );

  const renderGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {galleryImages.map((image, index) => (
        <div key={index} className="group relative overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
          <img
            src={srcFor(image || "")}
            alt={`Gallery image ${index + 1}`}
            className="w-full h-64 object-contain group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300" />
        </div>
      ))}
    </div>
  );

  const renderStacked = () => (
    <div className="relative max-w-4xl mx-auto">
      <div className="space-y-8">
        {galleryImages.map((image, index) => (
          <div key={index} className={`relative group ${index % 2 === 0 ? "ml-0 mr-16" : "ml-16 mr-0"}`}>
            <div className="relative overflow-hidden rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-2 bg-white">
              <img
                src={srcFor(image || "")}
                alt={`Gallery image ${index + 1}`}
                className="w-full h-80 object-contain group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
              <div className="absolute bottom-6 left-6 text-white opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0">
                <div className="text-lg font-semibold">Image {index + 1}</div>
              </div>
            </div>
            <div
              className={`absolute top-4 w-24 h-24 rounded-full border-4 border-white shadow-xl transition-all duration-500 group-hover:scale-110 ${
                index % 2 === 0 ? "-right-12" : "-left-12"
              }`}
              style={{ backgroundColor: colors.primary }}
            >
              <div className="flex items-center justify-center h-full text-white font-bold text-lg">{index + 1}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCarousel = () => (
    <div className="relative">
      <div className="flex space-x-8 overflow-x-auto pb-8 px-4 scrollbar-hide snap-x snap-mandatory">
        {galleryImages.map((image, index) => (
          <div key={index} className="flex-shrink-0 w-96 h-80 relative overflow-hidden rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-500 snap-center group bg-white">
            <img
              src={srcFor(image || "")}
              alt={`Gallery image ${index + 1}`}
              className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <div className="text-white text-xl font-bold mb-2">Gallery {index + 1}</div>
              <div className="w-12 h-1 rounded-full transition-all duration-300" style={{ backgroundColor: colors.primary }} />
            </div>
            <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-semibold">
              {index + 1}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center mt-8 space-x-2">
        {galleryImages.map((_, index) => (
          <div key={index} className="w-2 h-2 rounded-full bg-gray-400 transition-all duration-300" style={{ backgroundColor: colors.primary, opacity: 0.6 }} />
        ))}
      </div>
    </div>
  );

  const renderLightbox = () => (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {galleryImages.map((image, index) => (
          <div
            key={index}
            className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer bg-gradient-to-br from-gray-800 to-gray-900 transform hover:-translate-y-2"
            onClick={() => {
              setCurrentImageIndex(index);
              setLightboxOpen(true);
            }}
          >
            <img
              src={srcFor(image || "")}
              alt={`Gallery image ${index + 1}`}
              className="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
              <div className="bg-white/20 backdrop-blur-md rounded-full p-4 transform scale-75 group-hover:scale-100 transition-transform duration-300 shadow-2xl border border-white/30">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
                <p className="text-sm font-semibold text-gray-800">Image {index + 1}</p>
                <p className="text-xs text-gray-600 mt-1">Click to view full size</p>
              </div>
            </div>
            <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs font-medium">
              {index + 1}
            </div>
          </div>
        ))}
      </div>

      {lightboxOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setLightboxOpen(false)}>
          <div className="relative max-w-6xl max-h-full">
            <img
              src={srcFor(galleryImages[currentImageIndex] || "")}
              alt={`Gallery image ${currentImageIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />

            <button
              onClick={(e) => {
                e.stopPropagation();
                previousImage();
              }}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-4 rounded-full backdrop-blur-md transition-all duration-200 hover:scale-110 shadow-xl border border-white/20 group"
              aria-label="Previous"
            >
              <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-4 rounded-full backdrop-blur-md transition-all duration-200 hover:scale-110 shadow-xl border border-white/20 group"
              aria-label="Next"
            >
              <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full backdrop-blur-md transition-all duration-200 hover:scale-110 shadow-xl border border-white/20 group"
              aria-label="Close"
            >
              <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-md rounded-full px-6 py-3 border border-white/20">
              <p className="text-white text-sm font-medium">
                {currentImageIndex + 1} of {galleryImages.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );

  const renderGalleryContent = () => {
    switch (config.layout) {
      case "grid":
        return renderGrid();
      case "stacked":
        return renderStacked();
      case "carousel":
        return renderCarousel();
      case "lightbox":
        return renderLightbox();
      default:
        return renderSlider();
    }
  };

  return (
    <section className={config.section}>
      <div className={config.container}>
        <div className="text-center mb-16">
          <h2 className={config.title}>{title}</h2>
          <p className={config.subtitle}>{subtitle}</p>
        </div>
        {renderGalleryContent()}
      </div>
    </section>
  );
}

