import Lottie from "lottie-react";
import animationData from "@/assets/paperflight-hero.json";

export function HeroLottie() {
  return (
    <Lottie animationData={animationData} loop autoplay className="h-full w-full" />
  );
}
