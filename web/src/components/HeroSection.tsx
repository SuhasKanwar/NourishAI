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
                    minFontSize={18}
                />
            </div>
        </section>
    );
}