import LightRays from "./ui/light-rays";
import TextPressure from "./ui/text-pressure";

export default function HeroSection() {
  return (
    <section className="relative flex min-h-screen w-screen items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <LightRays
          raysOrigin="top-center"
          raysColor="#f75000"
          raysSpeed={1}
          lightSpread={0.5}
          rayLength={3}
          followMouse={true}
          mouseInfluence={0.1}
          noiseAmount={0}
          distortion={0}
          className="custom-rays"
          pulsating={false}
          fadeDistance={1}
          saturation={1}
        />
      </div>
      <div className="relative z-10 flex w-[70vw] items-center justify-center px-6 text-center">
        <div className="relative inline-flex w-full max-w-220 flex-col items-center pb-6">
          <TextPressure
            text="NourishAI"
            flex
            alpha={false}
            stroke={false}
            width
            weight
            italic
            textColor="#f6f9fc"
            strokeColor="#f75000"
            minFontSize={32}
          />
          <svg
            className="pointer-events-none absolute -bottom-3 left-0 h-6 w-full"
            viewBox="0 0 500 40"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M5 25 C 110 17, 210 33, 305 22 S 420 30, 495 22"
              pathLength="1"
              className="fill-none stroke-(--primary-color) stroke-[14px] [stroke-linecap:round] [stroke-linejoin:round]"
              strokeDasharray="1"
              strokeDashoffset="1"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="1"
                to="0"
                dur="1.1s"
                begin="0s"
                fill="freeze"
              />
            </path>
          </svg>
        </div>
      </div>
    </section>
  );
}